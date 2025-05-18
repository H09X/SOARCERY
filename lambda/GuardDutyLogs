import json
import boto3
import datetime
import uuid
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')
sts_client = boto3.client('sts')

# Configuration
bucket_name = 'soarcery'  # Replace with your actual bucket name

# List of attack types to store in S3
ALLOWED_ATTACK_TYPES = [
    "UnauthorizedAccess:EC2/MaliciousIPCaller.Custom",
    "TTPs/Command and Control/UnauthorizedAccess:EC2-MaliciousIPCaller.Custom",
    "TTPs/Execution/Execution:Runtime-ReverseShell"
]

def get_severity_category_from_label(severity_label):
    """
    Map Security Hub severity labels to severity categories.
    """
    severity_mapping = {
        'CRITICAL': 'critical',
        'HIGH': 'high',
        'MEDIUM': 'medium',
        'LOW': 'low',
        'INFORMATIONAL': 'informational',
        'UNKNOWN': 'unknown'
    }
    return severity_mapping.get(severity_label, 'unknown')

def convert_guardduty_to_finding_format(guardduty_event):
    # Extract relevant fields from GuardDuty event
    detail = guardduty_event.get('detail', {})
    
    # Get instance ID if available
    instance_id = 'unknown'
    if 'resource' in detail and 'instanceDetails' in detail['resource']:
        instance_id = detail['resource']['instanceDetails'].get('instanceId', 'unknown')
    elif 'service' in detail and 'action' in detail['service'] and 'awsApiCallAction' in detail['service']['action']:
        # Try to get affected resource from API call action
        instance_id = detail['service']['action']['awsApiCallAction'].get('affectedResources', {}).get('AWS::EC2::Instance', 'unknown')
    
    finding = {
        'Id': detail.get('id', str(uuid.uuid4())),
        'Title': detail.get('title', 'GuardDuty Finding'),
        'AwsAccountId': detail.get('accountId', guardduty_event.get('account')),
        'Severity': {
            'Normalized': detail.get('severity', 0),
            'Label': 'MEDIUM'  # Default to MEDIUM if not specified
        },
        'Types': [detail.get('type', 'unknown_type')],
        'Resources': [
            {
                'Type': 'AwsEc2Instance',
                'Id': instance_id,
                'Region': detail.get('region', guardduty_event.get('region', 'us-east-1'))
            }
        ],
        'ProductFields': detail
    }
    
    # Try to set severity label based on normalized value
    normalized = finding['Severity']['Normalized']
    if normalized >= 80:
        finding['Severity']['Label'] = 'CRITICAL'
    elif normalized >= 60:
        finding['Severity']['Label'] = 'HIGH'
    elif normalized >= 40:
        finding['Severity']['Label'] = 'MEDIUM'
    elif normalized >= 20:
        finding['Severity']['Label'] = 'LOW'
    else:
        finding['Severity']['Label'] = 'INFORMATIONAL'
    
    return finding

def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract region from context or use default
        region = context.invoked_function_arn.split(':')[3] if hasattr(context, 'invoked_function_arn') else 'us-east-1'
        logger.info(f"Lambda running in region: {region}")
        
        # Re-initialize S3 client with specific region to avoid cross-region issues
        global s3_client
        s3_client = boto3.client('s3', region_name=region)
        
        # Get current account ID - ALWAYS retrieve fresh to ensure accuracy
        try:
            current_account_id = sts_client.get_caller_identity()['Account']
            logger.info(f"Lambda running in account: {current_account_id}")
        except Exception as e:
            current_account_id = None
            logger.warning(f"Could not determine current account ID: {str(e)}")
        
        # Extract findings from the event
        findings = []
        
        # Check if event is in Security Hub format
        if 'detail' in event and 'findings' in event['detail']:
            findings = event['detail']['findings']
        # Check if the event itself is a single finding or has a direct findings array
        elif 'Id' in event and 'Title' in event and 'Resources' in event:
            findings = [event]  # Single finding directly in event
        elif 'findings' in event:
            findings = event['findings']
        # If it's a GuardDuty format (detect by source or detail-type)
        elif ('source' in event and event['source'] == 'aws.guardduty') or \
             ('detail-type' in event and event['detail-type'] == 'GuardDuty Finding'):
            # Convert GuardDuty format to a format compatible with our processing
            findings = [convert_guardduty_to_finding_format(event)]
        else:
            logger.error("Event does not contain Security Hub findings in the expected format")
            logger.error(f"Available keys in event: {list(event.keys() if isinstance(event, dict) else [])}")
            return {
                'statusCode': 400,
                'body': json.dumps('Event does not contain Security Hub findings in the expected format')
            }
        
        if not findings:
            logger.warning("No findings found in the event")
            return {
                'statusCode': 200,
                'body': json.dumps('No findings to process')
            }
        
        processed_count = 0
        filtered_count = 0
            
        for finding in findings:
            finding_id = finding.get('Id', 'unknown_id')
            account_id = finding.get('AwsAccountId', 'unknown_account')
            
            # Get finding type
            finding_type = None
            if finding.get('Types'):
                finding_type = finding.get('Types')[0]
            
            # Skip findings that are not in our allowed list
            if not finding_type or not any(allowed_type in finding_type for allowed_type in ALLOWED_ATTACK_TYPES):
                logger.info(f"Skipping finding {finding_id} with type {finding_type} as it's not in allowed attack types")
                filtered_count += 1
                continue
            
            # Log the account IDs for debugging
            logger.info(f"Finding Account ID: {account_id}, Lambda Account ID: {current_account_id}")
            
            severity = finding.get('Severity', {}).get('Normalized', 0)
            severity_label = finding.get('Severity', {}).get('Label', 'UNKNOWN')
            
            logger.info(f"Processing finding: {finding_id}, Type: {finding_type}, Severity: {severity_label}")
            
            severity_category = get_severity_category_from_label(severity_label)
            
            current_date = datetime.datetime.now().strftime('%Y/%m/%d')
            unique_id = str(uuid.uuid4())
            key = f"security-hub-findings/{severity_category}/{current_date}/{account_id}_{finding_id}_{unique_id}.json"
            
            # Determine if this is a cross-account finding and handle appropriately
            is_cross_account = False
            if account_id and current_account_id and account_id != current_account_id:
                is_cross_account = True
                logger.info(f"Cross-account scenario detected: finding from {account_id}, Lambda in {current_account_id}")
            
            # Special handling for SuspiciousCommand - always set remediation to false
            if "Execution:Runtime/SuspiciousCommand" in finding_type:
                finding['remediationStatus'] = {
                    'remediated': False,
                    'remediationAction': "No remediation applied for SuspiciousCommand findings",
                    'remediationTimestamp': datetime.datetime.now().isoformat()
                }
            else:
                # Apply remediation for other allowed attack types
                remediation_result = "No automatic remediation applied"
                if severity_category in ["low", "medium"]:
                    logger.info(f"Applying remediation for severity {severity_category}")
                    remediation_result = auto_remediate_finding(finding, current_account_id)
                
                finding['remediationStatus'] = {
                    'remediated': remediation_result != "No automatic remediation applied",
                    'remediationAction': remediation_result,
                    'remediationTimestamp': datetime.datetime.now().isoformat()
                }
            
            try:
                # Try to put the object without KMS encryption first
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=key,
                    Body=json.dumps(finding, indent=2),
                    ContentType='application/json',
                    # Explicitly disable KMS by setting ServerSideEncryption to AES256 (Amazon S3-managed encryption)
                    ServerSideEncryption='AES256'
                )
                processed_count += 1
            except Exception as s3_error:
                logger.warning(f"Error putting object to S3 with AES256 encryption: {str(s3_error)}")
                # If putting to main bucket fails, try a fallback approach
                try:
                    # Try with a different path in the same bucket
                    fallback_key = f"unencrypted-findings/{severity_category}/{current_date}/{account_id}_{finding_id}_{unique_id}.json"
                    s3_client.put_object(
                        Bucket=bucket_name,
                        Key=fallback_key,
                        Body=json.dumps(finding, indent=2),
                        ContentType='application/json'
                    )
                    logger.info(f"Used fallback path for S3 storage: {fallback_key}")
                    key = fallback_key
                    processed_count += 1
                except Exception as fallback_error:
                    logger.error(f"Fallback S3 storage also failed: {str(fallback_error)}")
                    # Continue execution without failing the entire function
            
            logger.info(f"Successfully exported finding {finding_id} to s3://{bucket_name}/{key}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Successfully processed findings',
                'findingsProcessed': processed_count,
                'findingsFiltered': filtered_count
            })
        }
    except Exception as e:
        logger.error(f"Error processing findings: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error processing findings: {str(e)}')
        }

def auto_remediate_finding(finding, current_account_id=None):
    finding_type = finding.get('Types', ['unknown_type'])[0] if finding.get('Types') else 'unknown_type'
    account_id = finding.get('AwsAccountId', 'unknown_account')
    
    remediation_functions = {
        "UnauthorizedAccess:EC2/MaliciousIPCaller.Custom": remediate_malicious_ip_caller,
        "TTPs/Command and Control/UnauthorizedAccess:EC2-MaliciousIPCaller.Custom" : remediate_malicious_ip_caller
    }
    
    severity_label = finding.get('Severity', {}).get('Label', 'UNKNOWN')
    severity_category = get_severity_category_from_label(severity_label)
    
    logger.info(f"Finding type {finding_type} categorized as {severity_category} severity")
    
    # First check if this is a SuspiciousCommand type - we should never remediate these
    if "Execution:Runtime/SuspiciousCommand" in finding_type:
        logger.info(f"No remediation attempted for SuspiciousCommand finding type")
        return "No remediation for SuspiciousCommand findings"
    
    # For other finding types, check if we have a remediation function
    for finding_type_pattern, remediation_function in remediation_functions.items():
        if finding_type_pattern in finding_type and severity_category in ["low", "medium"]:
            logger.info(f"Applying automatic remediation for {severity_category} severity finding: {finding_type}")
            
            # Check if this is a cross-account scenario
            is_cross_account = False
            if account_id and current_account_id and account_id != current_account_id:
                is_cross_account = True
                logger.info(f"Cross-account remediation for finding from {account_id}")
            
            # We'll always attempt remediation regardless of account
            return remediation_function(finding, current_account_id)
    
    logger.info(f"No automatic remediation configured for finding type: {finding_type} with severity: {severity_category}")
    return f"No automatic remediation for finding type: {finding_type}"

def remediate_malicious_ip_caller(finding, current_account_id=None):
    """
    Remediate EC2 instance by adding deny rules to the subnet's Network ACL for malicious IP.
    """
    try:
        resources = finding.get('Resources', [])
        if not resources:
            return "No resources found in the finding"

        for resource in resources:
            if resource.get('Type') != 'AwsEc2Instance':
                continue

            instance_id = resource.get('Id', '').split('/')[-1]
            region = resource.get('Region', 'us-east-1')
            account_id = finding.get('AwsAccountId')

            # Extract malicious IP - checking multiple possible locations
            malicious_ip = None
            if 'ProductFields' in finding:
                # Try multiple paths for the IP address
                product_fields = finding['ProductFields']
                if 'aws/guardduty/service/action/networkConnectionAction/remoteIpDetails/ipAddressV4' in product_fields:
                    malicious_ip = product_fields['aws/guardduty/service/action/networkConnectionAction/remoteIpDetails/ipAddressV4']
                elif 'service' in product_fields and 'action' in product_fields['service']:
                    action = product_fields['service']['action']
                    if 'networkConnectionAction' in action and 'remoteIpDetails' in action['networkConnectionAction']:
                        malicious_ip = action['networkConnectionAction']['remoteIpDetails'].get('ipAddressV4')
                    
                # If normal paths fail, do a recursive dictionary search for 'ipAddressV4'
                if not malicious_ip:
                    def find_ip_in_dict(d):
                        if not isinstance(d, dict):
                            return None
                        for k, v in d.items():
                            if k == 'ipAddressV4' and isinstance(v, str):
                                return v
                            elif isinstance(v, dict):
                                result = find_ip_in_dict(v)
                                if result:
                                    return result
                            elif isinstance(v, list):
                                for item in v:
                                    if isinstance(item, dict):
                                        result = find_ip_in_dict(item)
                                        if result:
                                            return result
                        return None
                    
                    malicious_ip = find_ip_in_dict(product_fields)

            if not malicious_ip:
                return "No malicious IP found in the finding"

            # Assume role if cross-account
            is_cross_account = account_id and current_account_id and account_id != current_account_id
            if is_cross_account:
                role_arn = f"arn:aws:iam::{account_id}:role/SecurityHubRemediationRole"
                try:
                    creds = sts_client.assume_role(
                        RoleArn=role_arn,
                        RoleSessionName=f"RemediationSession-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
                    )['Credentials']
                    ec2_client = boto3.client(
                        'ec2',
                        region_name=region,
                        aws_access_key_id=creds['AccessKeyId'],
                        aws_secret_access_key=creds['SecretAccessKey'],
                        aws_session_token=creds['SessionToken']
                    )
                except Exception as e:
                    return f"Could not assume role in account {account_id}: {str(e)}"
            else:
                ec2_client = boto3.client('ec2', region_name=region)

            # Get instance details
            instance_resp = ec2_client.describe_instances(InstanceIds=[instance_id])
            reservations = instance_resp.get('Reservations', [])
            if not reservations:
                return f"Instance {instance_id} not found"

            instance = reservations[0]['Instances'][0]
            subnet_id = instance.get('SubnetId')

            if not subnet_id:
                return f"No subnet found for instance {instance_id}"

            # Get subnet's NACL
            nacls_resp = ec2_client.describe_network_acls(
                Filters=[{'Name': 'association.subnet-id', 'Values': [subnet_id]}]
            )
            nacls = nacls_resp.get('NetworkAcls', [])
            if not nacls:
                return f"No NACL associated with subnet {subnet_id}"

            nacl_id = nacls[0]['NetworkAclId']

            # Determine next available rule number
            existing_rules = nacls[0].get('Entries', [])
            rule_numbers = [entry['RuleNumber'] for entry in existing_rules if entry['RuleNumber'] < 32766]
            next_rule_number = max(rule_numbers, default=100) + 1

            # Add ingress and egress deny rules
            for direction, egress in [('ingress', False), ('egress', True)]:
                ec2_client.create_network_acl_entry(
                    NetworkAclId=nacl_id,
                    RuleNumber=10,
                    Protocol='-1',
                    RuleAction='deny',
                    Egress=egress,
                    CidrBlock=f"{malicious_ip}/32",
                    PortRange={'From': 0, 'To': 65535}
                )
                logger.info(f"Added {direction} DENY rule to NACL {nacl_id} for IP {malicious_ip}")

            return f"Added DENY rules in NACL {nacl_id} for malicious IP {malicious_ip} on subnet {subnet_id}"

    except Exception as e:
        logger.error(f"Error remediating using NACL: {str(e)}")
        return f"Error remediating using NACL: {str(e)}"


def create_remediation_document(finding, instance_id, region, malicious_ip, account_id):
    """
    Create a document with remediation instructions when direct remediation is not possible
    """
    try:
        finding_id = finding.get('Id', 'unknown_id')
        finding_type = finding.get('Types', ['unknown_type'])[0] if finding.get('Types') else 'unknown_type'
        severity_label = finding.get('Severity', {}).get('Label', 'UNKNOWN')
        
        remediation_details = {
            "finding_id": finding_id,
            "account_id": account_id,
            "instance_id": instance_id,
            "region": region,
            "malicious_ip": malicious_ip,
            "finding_type": finding_type,
            "severity": severity_label,
            "recommended_action": "Block outbound traffic to malicious IP",
            "remediation_steps": [
                f"1. Create security group in VPC for instance {instance_id}",
                f"2. Add egress rule to block traffic to {malicious_ip}/32",
                f"3. Apply security group to instance {instance_id}"
            ],
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        # Save to S3 bucket for later handling
        remediation_key = f"cross-account-remediation/{account_id}/{region}/{instance_id}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        s3_client.put_object(
            Bucket=bucket_name,
            Key=remediation_key,
            Body=json.dumps(remediation_details, indent=2),
            ContentType='application/json',
            ServerSideEncryption='AES256'
        )
        
        return f"s3://{bucket_name}/{remediation_key}"
    except Exception as e:
        logger.error(f"Error creating remediation document: {str(e)}")
        return f"Error creating remediation document: {str(e)}"
