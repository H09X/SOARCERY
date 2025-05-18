import json
import boto3
import paramiko
import os
import logging
import base64
from botocore.exceptions import ClientError
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# EC2 connection details - these will be retrieved from AWS Secrets Manager
EC2_KEY_PATH = '/tmp/ec2_key.pem'  # Temporary local path to store the key

# Secret name in AWS Secrets Manager
SECRET_NAME = 'soarcery/ec2-credentials'

# S3 configuration
SOURCE_BUCKET = 'soarcery'
DESTINATION_BUCKET = 'soarcery-emails'

# EC2 directories
EC2_INPUT_DIR = '/home/ubuntu/input_files'
EC2_SCRIPT_PATH = '/home/ubuntu/script.py'
EC2_OUTPUT_FILE = '/home/ubuntu/security_report.pdf'

# SES Configuration
EMAIL_FROM = 'support@soarcery.net'  # Replace with your verified SES sender address
EMAIL_SUBJECT = 'Soarcery Security Report'
CHARSET = 'utf-8'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
}


def lambda_handler(event, context):
    try:
        # Extract accountId from path parameters
        account_id = event['pathParameters']['accountid']
        logger.info(f"Processing request for account: {account_id}")
        
        # Get EC2 credentials from Secrets Manager
        ec2_creds = get_ec2_credentials()
        ec2_host = ec2_creds['host']
        ec2_username = ec2_creds['username']
        
        # Save the private key to a temporary file and ensure proper formatting
        private_key = ec2_creds['private_key']
        # Check if we need to normalize line endings (replace \n with actual newlines)
        if '\\n' in private_key and '\n' not in private_key:
            private_key = private_key.replace('\\n', '\n')
        
        # Write the key to a file
        with open(EC2_KEY_PATH, 'w') as key_file:
            key_file.write(private_key)
        
        # Set proper permissions for the key file
        os.chmod(EC2_KEY_PATH, 0o400)
        
        # Validate key file format
        validate_key_file()
        
        # Get findings from S3 for the specified account
        findings = get_account_findings(account_id)
        
        # Connect to EC2 instance
        ssh_client = connect_to_ec2(ec2_host, ec2_username)
        
        # Clear the input directory on EC2
        clear_ec2_input_directory(ssh_client)
        
        # Upload findings to EC2
        upload_findings_to_ec2(ssh_client, findings)
        
        # Run the Python script on EC2
        run_ec2_script(ssh_client)
        
        # Download the generated PDF file
        download_report_from_ec2(ssh_client)
        
        # Close SSH connection
        ssh_client.close()
        
        # Upload the PDF to the destination S3 bucket
        s3_report_url = upload_report_to_s3(account_id)
        
        # Get account email from AWS Organizations
        recipient_email = get_account_email(account_id)
        
        # Send the email with the report attached
        email_response = send_email_with_report(account_id, recipient_email, '/tmp/security_report.pdf')
        
        # Clean up temporary files
        cleanup_temp_files()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                **CORS_HEADERS
            },
            'body': json.dumps({
                'message': 'Security report generated and emailed successfully',
                'account_id': account_id,
                'report_url': s3_report_url,
                'email_sent_to': recipient_email,
                'email_message_id': email_response.get('MessageId', 'Unknown')
            })
        }
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json'
                **CORS_HEADERS
            },
            'body': json.dumps({
                'message': f'Error generating security report: {str(e)}'
            })
        }

def validate_key_file():
    """Validate the private key file format"""
    try:
        # Read the key file content
        with open(EC2_KEY_PATH, 'r') as key_file:
            content = key_file.read()
        
        # Check for common issues
        if not content.startswith('-----BEGIN'):
            raise ValueError("Private key doesn't have proper header. Should start with '-----BEGIN'")
        
        if not content.strip().endswith('-----'):
            raise ValueError("Private key doesn't have proper footer. Should end with '-----'")
        
        # Log key file format info (redacted for security)
        first_line = content.split('\n')[0] if '\n' in content else content[:20] + '...'
        logger.info(f"Key file header: {first_line}")
        logger.info(f"Key file size: {len(content)} bytes")
        
        # Attempt to load the key with paramiko to verify it's valid
        try:
            key = paramiko.RSAKey.from_private_key_file(EC2_KEY_PATH)
            logger.info("Successfully validated private key with paramiko")
        except paramiko.ssh_exception.SSHException as e:
            # If RSA fails, try other key types
            try:
                key = paramiko.Ed25519Key.from_private_key_file(EC2_KEY_PATH)
                logger.info("Successfully validated Ed25519 private key with paramiko")
            except:
                # If that fails too, try ECDSA
                try:
                    key = paramiko.ECDSAKey.from_private_key_file(EC2_KEY_PATH)
                    logger.info("Successfully validated ECDSA private key with paramiko")
                except:
                    # If all attempts fail, raise the original error
                    raise ValueError(f"Invalid private key format: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error validating key file: {str(e)}")
        raise

def get_ec2_credentials():
    """Retrieve EC2 credentials from AWS Secrets Manager"""
    secrets_client = boto3.client('secretsmanager')
    try:
        logger.info(f"Retrieving EC2 credentials from Secrets Manager: {SECRET_NAME}")
        response = secrets_client.get_secret_value(SecretId=SECRET_NAME)
        
        # The secret can be either a string or binary
        if 'SecretString' in response:
            secret = response['SecretString']
            return json.loads(secret)
        else:
            # If the secret is binary, decode it
            decoded_binary = base64.b64decode(response['SecretBinary'])
            return json.loads(decoded_binary)
            
    except ClientError as e:
        logger.error(f"Error retrieving EC2 credentials from Secrets Manager: {str(e)}")
        raise

def get_account_findings(account_id):
    """Retrieve all findings for the specified account from S3"""
    s3 = boto3.client('s3')
    findings = []
    
    try:
        # List all objects in the source bucket
        paginator = s3.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=SOURCE_BUCKET)
        
        # Create a directory to store findings temporarily
        os.makedirs('/tmp/findings', exist_ok=True)
        
        # Counter for findings
        finding_count = 0
        
        # Iterate through all objects and download those related to the account ID
        for page in pages:
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                key = obj['Key']
                
                # Check if the object contains the account ID (you might want to adjust this logic)
                if account_id in key:
                    # Download the finding
                    local_file_path = f"/tmp/findings/finding_{finding_count}.json"
                    s3.download_file(SOURCE_BUCKET, key, local_file_path)
                    findings.append(local_file_path)
                    finding_count += 1
        
        logger.info(f"Found {finding_count} findings for account {account_id}")
        return findings
    
    except ClientError as e:
        logger.error(f"Error retrieving findings from S3: {str(e)}")
        raise

def connect_to_ec2(host, username):
    """Establish SSH connection to the EC2 instance"""
    try:
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        logger.info(f"Connecting to EC2 instance at {host}")
        ssh_client.connect(
            hostname=host,
            username=username,
            key_filename=EC2_KEY_PATH
        )
        
        return ssh_client
    
    except Exception as e:
        logger.error(f"Error connecting to EC2 instance: {str(e)}")
        raise

def clear_ec2_input_directory(ssh_client):
    """Clear the input directory on the EC2 instance"""
    try:
        logger.info(f"Clearing directory: {EC2_INPUT_DIR}")
        ssh_client.exec_command(f"rm -rf {EC2_INPUT_DIR}/*")
        # Ensure the directory exists
        ssh_client.exec_command(f"mkdir -p {EC2_INPUT_DIR}")
    except Exception as e:
        logger.error(f"Error clearing EC2 input directory: {str(e)}")
        raise

def upload_findings_to_ec2(ssh_client, finding_files):
    """Upload the findings to the EC2 instance"""
    try:
        # Create SFTP session
        sftp = ssh_client.open_sftp()
        
        # Upload each finding file
        for i, local_file_path in enumerate(finding_files):
            remote_file_path = f"{EC2_INPUT_DIR}/finding_{i}.json"
            logger.info(f"Uploading finding to EC2: {remote_file_path}")
            sftp.put(local_file_path, remote_file_path)
        
        sftp.close()
    except Exception as e:
        logger.error(f"Error uploading findings to EC2: {str(e)}")
        raise

def run_ec2_script(ssh_client):
    """Run the Python script on the EC2 instance"""
    try:
        logger.info(f"Running script: {EC2_SCRIPT_PATH}")
        stdin, stdout, stderr = ssh_client.exec_command(f"python3 {EC2_SCRIPT_PATH}")
        
        # Log script output and errors
        script_output = stdout.read().decode('utf-8')
        script_errors = stderr.read().decode('utf-8')
        
        if script_errors:
            logger.error(f"Script errors: {script_errors}")
        
        logger.info(f"Script output: {script_output}")
        
        # Check the exit status
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            raise Exception(f"Script execution failed with status {exit_status}")
        
    except Exception as e:
        logger.error(f"Error running EC2 script: {str(e)}")
        raise

def download_report_from_ec2(ssh_client):
    """Download the generated report from the EC2 instance"""
    try:
        # Create SFTP session
        sftp = ssh_client.open_sftp()
        
        local_report_path = '/tmp/security_report.pdf'
        logger.info(f"Downloading report from EC2: {EC2_OUTPUT_FILE} to {local_report_path}")
        
        # Download the report file
        sftp.get(EC2_OUTPUT_FILE, local_report_path)
        
        sftp.close()
    except Exception as e:
        logger.error(f"Error downloading report from EC2: {str(e)}")
        raise

def upload_report_to_s3(account_id):
    """Upload the report to the destination S3 bucket"""
    s3 = boto3.client('s3')
    local_report_path = '/tmp/security_report.pdf'
    
    try:
        # Create a unique key for the report using the requested path structure
        report_key = f"{account_id}/security_report_{account_id}.pdf"
        
        logger.info(f"Uploading report to S3: {DESTINATION_BUCKET}/{report_key}")
        s3.upload_file(local_report_path, DESTINATION_BUCKET, report_key)
        
        # Generate a URL for the uploaded file (this is a non-presigned URL)
        report_url = f"s3://{DESTINATION_BUCKET}/{report_key}"
        return report_url
    
    except ClientError as e:
        logger.error(f"Error uploading report to S3: {str(e)}")
        raise

def cleanup_temp_files():
    """Clean up temporary files created during execution"""
    try:
        # Remove the findings directory
        os.system('rm -rf /tmp/findings')
        
        # Remove the downloaded report
        if os.path.exists('/tmp/security_report.pdf'):
            os.remove('/tmp/security_report.pdf')
        
        # Remove the EC2 key
        if os.path.exists(EC2_KEY_PATH):
            os.remove(EC2_KEY_PATH)
    
    except Exception as e:
        logger.error(f"Error cleaning up temporary files: {str(e)}")
        # We don't want to fail the function if cleanup fails
        pass

def get_account_email(account_id):
    """Retrieve the account's email address from AWS Organizations"""
    try:
        # Create an AWS Organizations client
        organizations_client = boto3.client('organizations')
        
        # Describe the account to get its details
        response = organizations_client.describe_account(AccountId=account_id)
        
        # Extract the email address
        email = response['Account']['Email']
        logger.info(f"Retrieved email {email} for account {account_id}")
        
        return email
    
    except ClientError as e:
        logger.error(f"Error retrieving account email from Organizations: {str(e)}")
        # If we can't get the email from Organizations, fallback to a default or raise an error
        if e.response['Error']['Code'] == 'AccessDeniedException':
            logger.warning("Lambda role doesn't have permission to access Organizations API. Check IAM permissions.")
        
        # Try to get email from Parameter Store as a fallback
        try:
            ssm = boto3.client('ssm')
            parameter = ssm.get_parameter(Name=f"/soarcery/account-emails/{account_id}")
            email = parameter['Parameter']['Value']
            logger.info(f"Using fallback email {email} from Parameter Store for account {account_id}")
            return email
        except Exception as ssm_error:
            logger.error(f"Failed to get fallback email from Parameter Store: {str(ssm_error)}")
            # Last resort - return a default email address
            default_email = "security-team@soarcery.com"
            logger.warning(f"Using default email address: {default_email}")
            return default_email

def send_email_with_report(account_id, recipient_email, report_path):
    """Send the security report via email with SES"""
    try:
        # Create SES client
        ses_client = boto3.client('ses')
        
        # Get account name (optional, for personalization)
        account_name = get_account_name(account_id)
        
        # Current date for the email
        current_date = datetime.now().strftime("%B %d, %Y")
        
        # Create a multipart/mixed message
        msg = MIMEMultipart('mixed')
        msg['Subject'] = f"{EMAIL_SUBJECT} - {account_name} - {current_date}"
        msg['From'] = EMAIL_FROM
        msg['To'] = recipient_email
        
        # Create a multipart/alternative part for the email body (HTML and plain text)
        body_part = MIMEMultipart('alternative')
        
        # Create plain text version of the email
        text_part = MIMEText(
            f"""
Soarcery Security Report - {current_date}

Dear {account_name} Administrator,

Please find attached your latest security findings report. This report contains important security information about your AWS account.

Summary:
- Account ID: {account_id}
- Report Date: {current_date}

Please review the attached PDF report for detailed findings and recommendations.

If you have any questions about this report, please contact our security team at support@soarcery.com.

Best regards,
The Soarcery Security Team
            """, 
            'plain', 
            CHARSET
        )
        
        # Create HTML version of the email with Open Sans font and proper formatting
        html_part = MIMEText(
            f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
        body {{
            font-family: 'Open Sans', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background-color: #0066cc;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }}
        .content {{
            background-color: #ffffff;
            padding: 20px;
            border: 1px solid #dddddd;
            border-top: none;
            border-radius: 0 0 5px 5px;
        }}
        .footer {{
            text-align: center;
            padding-top: 20px;
            font-size: 12px;
            color: #666666;
        }}
        h1 {{
            color: #0066cc;
            font-weight: 700;
        }}
        .summary {{
            background-color: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #0066cc;
            margin: 20px 0;
        }}
        .button {{
            display: inline-block;
            background-color: #0066cc;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: white; margin: 0;">Soarcery Security Report</h1>
        <p>{current_date}</p>
    </div>
    <div class="content">
        <p>Dear {account_name} Administrator,</p>
        
        <p>Please find attached your latest security findings report. This report contains important security information about your AWS account.</p>
        
        <div class="summary">
            <p><strong>Summary:</strong></p>
            <ul>
                <li>Account ID: {account_id}</li>
                <li>Report Date: {current_date}</li>
            </ul>
        </div>
        
        <p>Please review the attached PDF report for detailed findings and recommendations.</p>
        
        <p>If you have any questions about this report, please contact our security team at <a href="mailto:support@soarcery.com">support@soarcery.com</a>.</p>
        
        <p>Best regards,<br>
        The Soarcery Security Team</p>
    </div>
    <div class="footer">
        <p>&copy; {datetime.now().year} Soarcery. All rights reserved.</p>
    </div>
</body>
</html>
            """, 
            'html', 
            CHARSET
        )
        
        # Attach the text and HTML parts to the body part
        body_part.attach(text_part)
        body_part.attach(html_part)
        
        # Attach the body to the message
        msg.attach(body_part)
        
        # Attach the PDF report
        with open(report_path, 'rb') as f:
            attachment = MIMEApplication(f.read())
            attachment.add_header('Content-Disposition', 'attachment', 
                                  filename=f"security_report_{account_id}.pdf")
            msg.attach(attachment)
        
        # Send the email
        response = ses_client.send_raw_email(
            Source=EMAIL_FROM,
            Destinations=[recipient_email],
            RawMessage={'Data': msg.as_string()}
        )
        
        logger.info(f"Email sent successfully to {recipient_email}, MessageId: {response['MessageId']}")
        return response
    
    except ClientError as e:
        logger.error(f"Error sending email via SES: {str(e)}")
        raise

def get_account_name(account_id):
    """Get account name from AWS Organizations"""
    try:
        # Create Organizations client
        organizations_client = boto3.client('organizations')
        
        # Describe the account
        response = organizations_client.describe_account(AccountId=account_id)
        
        # Extract account name
        account_name = response['Account']['Name']
        return account_name
    
    except Exception as e:
        logger.warning(f"Could not retrieve account name: {str(e)}")
        # Return account ID as fallback
        return f"AWS Account {account_id}"
