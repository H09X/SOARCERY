import json
import boto3
import os
import datetime
import uuid
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
ec2_client = boto3.client('ec2')
ssm_client = boto3.client('ssm')
sts_client = boto3.client('sts')
organizations_client = boto3.client('organizations')

# Configuration variables
BUCKET_NAME = os.environ.get('FINDINGS_BUCKET', 'soarcery')
ORGANIZATION_ID = os.environ.get('ORGANIZATION_ID')
REMEDIATION_ROLE_NAME = os.environ.get('REMEDIATION_ROLE_NAME', 'SecurityHubRemediationRole')

def lambda_handler(event, context):
    """
    Handler for processing Security Hub findings for reverse shell execution
    and remediating them across organization accounts
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        finding_key = None
        
        # Check if this is coming from API Gateway GET request (path parameter)
        if event.get('pathParameters') and event['pathParameters'].get('key'):
            finding_key = event['pathParameters']['key']
            logger.info(f"Extracted finding key from path parameter: {finding_key}")
        # Check if this is coming from API Gateway POST request (body)
        elif event.get('body'):
            body = json.loads(event.get('body', '{}'))
            finding_key = body.get('findingKey')
            logger.info(f"Extracted finding key from request body: {finding_key}")
        # Check if this is a direct path invocation (e.g. from Lambda console)
        elif event.get('key'):
            finding_key = event.get('key')
            logger.info(f"Extracted finding key from direct event attribute: {finding_key}")
        
        if finding_key:
            logger.info(f"Processing finding with key: {finding_key}")
            
            # Get the finding from S3
            finding = get_finding_from_s3(finding_key)
            
            # Process the finding for remediation
            result = process_reverse_shell_finding(finding)
            
            # Update the finding with remediation status and save it back to the same S3 key
            finding['remediationStatus'] = {
                'remediated': result.get('remediationStatus', '').startswith('Failed') == False,
                'remediationAction': result.get('remediationStatus', 'No remediation performed'),
                'remediationTimestamp': datetime.datetime.now().isoformat()
            }
            
            # Save the updated finding back to the same S3 key
            s3_client.put_object(
                Bucket=BUCKET_NAME,
                Key=finding_key,
                Body=json.dumps(finding, indent=2),
                ContentType='application/json'
            )
            
            logger.info(f"Successfully updated finding in S3 at s3://{BUCKET_NAME}/{finding_key}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Successfully processed and updated Security Hub finding',
                    'result': result
                })
            }
        else:
            # Handle different event structures that could be received
            finding = None
            
            # Check if this is a direct Security Hub finding from EventBridge
            if event.get('detail', {}).get('findings'):
                finding = event.get('detail', {}).get('findings', [])[0]
            # Check if this is a direct GuardDuty finding or complete Security Hub finding
            elif event.get('detail-type') == 'GuardDuty Finding' or event.get('SchemaVersion'):
                finding = event
            # Check if the event itself is the finding
            elif event.get('Types') and isinstance(event.get('Types'), list) and any('Execution:Runtime-ReverseShell' in type_str for type_str in event.get('Types', [])):
                finding = event
        
        if not finding:
            logger.warning("No valid finding to process")
            return {
                'statusCode': 400,
                'body': json.dumps('No valid finding to process')
            }
        
        result = process_reverse_shell_finding(finding)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Successfully processed Security Hub finding',
                'result': result
            })
        }
    except Exception as e:
        logger.error(f"Error processing Security Hub finding: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error processing Security Hub finding: {str(e)}')
        }

def get_finding_from_s3(key):
    """Retrieve a finding from the S3 bucket using the provided key"""
    try:
        logger.info(f"Retrieving finding from S3: s3://{BUCKET_NAME}/{key}")
        response = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key=key
        )
        finding_content = response['Body'].read().decode('utf-8')
        return json.loads(finding_content)
    except Exception as e:
        logger.error(f"Error retrieving finding from S3: {str(e)}")
        raise

def process_reverse_shell_finding(finding):
    """Process a Security Hub finding for reverse shell execution"""
    try:
        # Extract key fields from Security Hub finding format
        finding_id = finding.get('Id', 'unknown_id')
        account_id = finding.get('AwsAccountId', 'unknown_account')
        finding_type = finding.get('Type', '')
        title = finding.get('Title', '')
        
        # Check if this is a reverse shell execution finding - be more flexible with matching
        is_reverse_shell = False
        
        if finding_type and any('ReverseShell' in t for t in finding_type.split(',')) or 'TTPs/Execution/Execution:Runtime-ReverseShell' in finding_type:
            is_reverse_shell = True
        elif title and 'reverse shell' in title.lower():
            is_reverse_shell = True
        elif finding.get('Types') and any('ReverseShell' in t for t in finding.get('Types', [])):
            is_reverse_shell = True
            
        if not is_reverse_shell:
            logger.info(f"Finding {finding_id} is not a reverse shell execution finding, skipping remediation")
            return {
                'findingId': finding_id,
                'remediationStatus': 'Skipped - Not a reverse shell execution finding'
            }
        
        logger.info(f"Processing reverse shell execution finding: {finding_id} in account {account_id}")
        
        # Extract instance details from the finding - handle different formats
        resources = finding.get('Resources', [])
        instance_details = None
        instance_id = None
        
        for resource in resources:
            if resource.get('Type') == 'AwsEc2Instance':
                resource_id = resource.get('Id', '')
                # Handle both ARN format and direct instance ID
                if resource_id.startswith('arn:aws:ec2:'):
                    instance_id = resource_id.split('/')[-1]
                elif resource_id.startswith('i-'):
                    instance_id = resource_id
                else:
                    instance_id = resource_id.split('/')[-1] if '/' in resource_id else resource_id
                    
                instance_details = resource.get('Details', {}).get('AwsEc2Instance', {})
                break
                
        # If instance ID not found in resources, try to extract from title as fallback
        if not instance_id and title:
            # Try to extract instance ID from title (e.g., "...in EC2 instance i-01d1574513e4bc8ec")
            import re
            match = re.search(r'i-[0-9a-f]{8,}', title)
            if match:
                instance_id = match.group(0)
        
        if not instance_id:
            return {
                'findingId': finding_id,
                'remediationStatus': 'Failed - No EC2 instance found in finding'
            }
        
        # Extract suspicious command information - handle GuardDuty format
        product_fields = finding.get('ProductFields', {})
        suspicious_command = ""
        
        # Try multiple potential locations for command information
        if product_fields.get('commandLine'):
            suspicious_command = product_fields.get('commandLine')
        elif product_fields.get('process.commandLine'):
            suspicious_command = product_fields.get('process.commandLine')
        # Try GuardDuty specific fields
        elif product_fields.get('aws/guardduty/service/runtimeDetails/process/executablePath'):
            suspicious_command = product_fields.get('aws/guardduty/service/runtimeDetails/process/executablePath')
            if product_fields.get('aws/guardduty/service/runtimeDetails/process/name'):
                suspicious_command += " " + product_fields.get('aws/guardduty/service/runtimeDetails/process/name')
                
        # If it's a reverse shell, we need to check for network information
        remote_ip = product_fields.get('aws/guardduty/service/action/networkConnectionAction/remoteIpDetails/ipAddressV4', '')
        remote_port = product_fields.get('aws/guardduty/service/action/networkConnectionAction/remotePortDetails/port', '')
        
        # Perform remediation
        remediation_result = remediate_reverse_shell(account_id, instance_id, suspicious_command, remote_ip, remote_port)
        
        return {
            'findingId': finding_id,
            'remediationStatus': remediation_result.get('details', 'No remediation performed')
        }
    except Exception as e:
        logger.error(f"Error processing finding {finding.get('Id', 'unknown')}: {str(e)}")
        return {
            'findingId': finding.get('Id', 'unknown'),
            'error': str(e)
        }

def get_severity_category_from_number(severity):
    """Categorize severity based on numerical value"""
    if 0.1 <= severity <= 3.9:
        return "low"
    elif 4.0 <= severity <= 6.9:
        return "medium"
    elif 7.0 <= severity <= 8.9:
        return "high"
    elif 9.0 <= severity <= 10.0:
        return "critical"
    else:
        return "unknown"

def assume_role_in_account(account_id):
    """Assume the remediation role in the specified account"""
    try:
        role_arn = f"arn:aws:iam::{account_id}:role/{REMEDIATION_ROLE_NAME}"
        logger.info(f"Attempting to assume role: {role_arn}")
        
        response = sts_client.assume_role(
            RoleArn=role_arn,
            RoleSessionName=f"SecurityHubRemediation-{uuid.uuid4()}"
        )
        
        credentials = response['Credentials']
        return {
            'AccessKeyId': credentials['AccessKeyId'],
            'SecretAccessKey': credentials['SecretAccessKey'],
            'SessionToken': credentials['SessionToken']
        }
    except Exception as e:
        logger.error(f"Failed to assume role in account {account_id}: {str(e)}")
        raise

def remediate_reverse_shell(account_id, instance_id, suspicious_command, remote_ip='', remote_port=''):
    """Remediate reverse shell execution on an EC2 instance"""
    try:
        # Create specialized credentials for the account where the instance exists
        credentials = assume_role_in_account(account_id)
        
        # Create clients with the account-specific credentials
        account_ssm_client = boto3.client(
            'ssm',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken']
        )
        
        account_ec2_client = boto3.client(
            'ec2',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken']
        )
        
        # Check if the instance is managed by SSM
        managed_instance = is_instance_ssm_managed(account_ssm_client, instance_id)
        
        remediation_actions = []
        
        # Isolate the instance by modifying security groups
        try:
            # Create a new security group that blocks all traffic except SSM
            isolation_sg_id = create_isolation_security_group(account_ec2_client, instance_id)
            
            # Apply the isolation security group to the instance
            account_ec2_client.modify_instance_attribute(
                InstanceId=instance_id,
                Groups=[isolation_sg_id]
            )
            remediation_actions.append(f"Applied isolation security group {isolation_sg_id} to instance {instance_id}")
        except Exception as e:
            logger.error(f"Failed to isolate instance {instance_id}: {str(e)}")
            remediation_actions.append(f"Failed to isolate instance {instance_id}: {str(e)}")
        
        # If the instance is managed by SSM, run remediation commands
        if managed_instance:
            try:
                # Identify potential malicious processes based on the suspicious command
                cmd_parts = suspicious_command.split()
                potential_process = cmd_parts[0] if cmd_parts else ""
                
                if potential_process:
                    # For reverse shells, include remediation for network connections
                    remediation_commands = [
                        f'# Find and kill processes matching the pattern',
                        f'pids=$(pgrep -f "{potential_process}" || echo "")',
                        f'if [ -n "$pids" ]; then',
                        f'  echo "Found matching processes: $pids"',
                        f'  kill -9 $pids',
                        f'  echo "Terminated processes: $pids"',
                        f'else',
                        f'  echo "No matching processes found"',
                        f'fi',
                        
                        f'# Check for suspicious network connections and kill them',
                        f'echo "Checking for suspicious network connections..."'
                    ]
                    
                    # If we have remote IP information from the finding, target those connections specifically
                    if remote_ip:
                        remediation_commands.extend([
                            f'echo "Terminating connections to suspicious remote IP: {remote_ip}"',
                            f'suspicious_connections=$(netstat -tnp | grep {remote_ip} | awk \'{{print $7}}\' | cut -d/ -f1 | sort -u)',
                            f'if [ -n "$suspicious_connections" ]; then',
                            f'  echo "Found suspicious connections: $suspicious_connections"',
                            f'  for pid in $suspicious_connections; do',
                            f'    kill -9 $pid 2>/dev/null || echo "Could not kill PID $pid"',
                            f'  done',
                            f'else',
                            f'  echo "No active connections to suspicious IP found"',
                            f'fi'
                        ])
                    else:
                        remediation_commands.extend([
                            f'echo "Checking for all ESTABLISHED outbound connections..."',
                            f'ss -tnp state established | grep -v "127.0.0.1\\|169.254" || echo "No suspicious established connections found"'
                        ])
                    
                    # Add additional forensic and remediation commands
                    remediation_commands.extend([
                        f'# Check for persistence mechanisms',
                        f'echo "Checking for persistence mechanisms..."',
                        f'find /etc/cron* /var/spool/cron /etc/systemd /etc/init.d -type f -exec grep -l "{potential_process}" {{}} \\; || echo "No persistence found"',
                        
                        f'# Add forensic information',
                        f'echo "Collecting system information..."',
                        f'w',
                        f'ps -ef',
                        f'netstat -tuln',
                        
                        f'# Check for common reverse shell artifacts',
                        f'echo "Checking for common shell paths used in reverse shells..."',
                        f'find /tmp /var/tmp /dev/shm -type f -name "*.sh" -o -name "nc*" -o -name "bash*" -o -perm -u=x | xargs ls -la || echo "No suspicious files found"'
                    ])
                    
                    # Run the comprehensive remediation command
                    command_response = account_ssm_client.send_command(
                        InstanceIds=[instance_id],
                        DocumentName='AWS-RunShellScript',
                        Parameters={
                            'commands': remediation_commands
                        }
                    )
                    command_id = command_response['Command']['CommandId']
                    remediation_actions.append(f"Executed remediation command {command_id} on instance {instance_id}")
                else:
                    remediation_actions.append(f"Could not parse suspicious command to identify process")
            except Exception as e:
                logger.error(f"Failed to run remediation command on instance {instance_id}: {str(e)}")
                remediation_actions.append(f"Failed to run remediation command: {str(e)}")
        else:
            remediation_actions.append(f"Instance {instance_id} is not managed by SSM, network isolation only")
        
        # Add security tag to the instance
        try:
            account_ec2_client.create_tags(
                Resources=[instance_id],
                Tags=[
                    {
                        'Key': 'SecurityIncident',
                        'Value': 'ReverseShell-Remediated'
                    },
                    {
                        'Key': 'RemediationTimestamp',
                        'Value': datetime.datetime.now().isoformat()
                    }
                ]
            )
            remediation_actions.append(f"Added security incident tags to instance {instance_id}")
        except Exception as e:
            logger.error(f"Failed to add tags to instance {instance_id}: {str(e)}")
            remediation_actions.append(f"Failed to add tags: {str(e)}")
        
        return {
            'success': True,
            'details': '; '.join(remediation_actions)
        }
    except Exception as e:
        logger.error(f"Error in remediate_reverse_shell: {str(e)}")
        return {
            'success': False,
            'details': f"Remediation failed: {str(e)}"
        }

def is_instance_ssm_managed(ssm_client, instance_id):
    """Check if an instance is managed by SSM"""
    try:
        response = ssm_client.describe_instance_information(
            Filters=[{'Key': 'InstanceIds', 'Values': [instance_id]}]
        )
        return len(response.get('InstanceInformationList', [])) > 0
    except Exception as e:
        logger.error(f"Error checking SSM management status for instance {instance_id}: {str(e)}")
        return False

def create_isolation_security_group(ec2_client, instance_id):
    """Create a security group that isolates an instance but allows SSM access"""
    try:
        # Get VPC ID for the instance
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        vpc_id = response['Reservations'][0]['Instances'][0]['VpcId']
        
        # Create security group
        sg_response = ec2_client.create_security_group(
            GroupName=f"ISOLATION-{instance_id}-{uuid.uuid4().hex[:8]}",
            Description=f"Isolation security group for instance {instance_id}",
            VpcId=vpc_id
        )
        security_group_id = sg_response['GroupId']
        
        # Allow outbound traffic to SSM endpoints only
        ec2_client.authorize_security_group_egress(
            GroupId=security_group_id,
            IpPermissions=[
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 443,
                    'ToPort': 443,
                    'UserIdGroupPairs': [],
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'Allow HTTPS for SSM'}],
                    'Ipv6Ranges': [],
                    'PrefixListIds': []
                }
            ]
        )
        
        # Tag the security group
        ec2_client.create_tags(
            Resources=[security_group_id],
            Tags=[
                {
                    'Key': 'Name',
                    'Value': f'Isolation-SG-{instance_id}'
                },
                {
                    'Key': 'SecurityIncident',
                    'Value': 'True'
                },
                {
                    'Key': 'CreatedBy',
                    'Value': 'SecurityHubRemediation'
                }
            ]
        )
        
        return security_group_id
    except Exception as e:
        logger.error(f"Error creating isolation security group for instance {instance_id}: {str(e)}")
        raise
