import json
import boto3
import os
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secretsmanager = boto3.client('secretsmanager')

def lambda_handler(event, context):
    try:
        logger.info(f"Event received: {json.dumps(event)}")
        
        http_method = event.get('httpMethod')
        path = event.get('path', '')
        path_params = event.get('pathParameters', {}) or {}
        
        # Safer parsing of body
        try:
            body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing request body: {str(e)}")
            return build_response(400, {"message": "Invalid request body format"})
        
        logger.info(f"Parsed body: {json.dumps(body)}")
        logger.info(f"Path: {path}, Method: {http_method}")
        
        if path.endswith('/auth') and http_method == 'POST':
            return handle_authentication(body)
        elif '/reset/' in path and http_method == 'POST':
            username = path_params.get('accountId')
            if not username:
                logger.error("No username provided in path parameters")
                return build_response(400, {"message": "Username is required"})
            return handle_password_reset(username, body)
        else:
            logger.error(f"Unsupported path: {path}")
            return build_response(404, {"message": "Not found"})
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return build_response(500, {"message": f"Internal server error: {str(e)}"})

def handle_authentication(body):
    username = body.get('username')
    password = body.get('password')
    role = body.get('role')

    if not username or not password:
        logger.error("Missing username or password")
        return build_response(400, {"message": "Username and password are required"})
    
    try:
        secret_name = f"soarcery-user-{username}"
        logger.info(f"Retrieving secret for user: {username}")
        
        try:
            secret_response = secretsmanager.get_secret_value(SecretId=secret_name)
            secret_string = secret_response.get('SecretString', '{}')
            secret_data = json.loads(secret_string)
        except json.JSONDecodeError:
            logger.error(f"Error parsing secret data for user: {username}")
            return build_response(500, {"message": "Error retrieving user information"})
        
        # Validate credentials
        if secret_data.get('password') == password and secret_data.get('role') == role:
            logger.info(f"Authentication successful for user: {username}")
            return build_response(200, {
                "message": "Authentication successful",
                "username": username,
                "role": secret_data.get('role')
            })
        else:
            logger.info(f"Invalid password for user: {username}")
            return build_response(401, {"message": "Invalid credentials"})
            
    except secretsmanager.exceptions.ResourceNotFoundException:
        logger.error(f"User secret not found: {username}")
        return build_response(401, {"message": "Invalid credentials"})
    except ClientError as e:
        logger.error(f"AWS client error during authentication: {str(e)}")
        return build_response(500, {"message": f"Authentication error: {e.response['Error']['Code']}"})
    except Exception as e:
        logger.error(f"Error during authentication: {str(e)}")
        return build_response(500, {"message": "Authentication error"})

def handle_password_reset(username, body):
    current_password = body.get('currentPassword')
    new_password = body.get('newPassword')
    
    if not current_password or not new_password:
        return build_response(400, {"message": "Current and new passwords are required"})
        
    if new_password == current_password:
        return build_response(400, {"message": "New password must be different from current password"})
    
    try:
        secret_name = f"soarcery-user-{username}"
        secret_response = secretsmanager.get_secret_value(SecretId=secret_name)
        secret_data = json.loads(secret_response['SecretString'])
        
        if secret_data.get('password') != current_password:
            return build_response(401, {"message": "Current password is incorrect"})
            
        secret_data['password'] = new_password
        secretsmanager.update_secret(
            SecretId=secret_name,
            SecretString=json.dumps(secret_data)
        )
        
        return build_response(200, {"message": "Password updated successfully"})
        
    except secretsmanager.exceptions.ResourceNotFoundException:
        logger.error(f"User secret not found: {username}")
        return build_response(404, {"message": "User not found"})
    except Exception as e:
        logger.error(f"Error during password reset: {str(e)}")
        return build_response(500, {"message": "Password reset error"})

def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': True
        },
        'body': json.dumps(body)
    }
