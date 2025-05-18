import json
import boto3
import os
import logging
from botocore.exceptions import ClientError

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize S3 client
s3_client = boto3.client('s3')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'soarcery')

def lambda_handler(event, context):
    """
    Lambda function to delete an S3 object based on the key provided in the path parameter.
    
    Expected API Gateway input: 
    - Path parameter 'key' or 'key+' containing the S3 object key to delete
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Check for path parameters - handle both 'key' and 'key+' formats
        if 'pathParameters' in event and event['pathParameters']:
            # Try to get the object key with either format
            object_key = None
            if 'key+' in event['pathParameters']:
                object_key = event['pathParameters']['key+']
            elif 'key' in event['pathParameters']:
                object_key = event['pathParameters']['key']
            
            if not object_key:
                logger.error("Path parameter 'key' or 'key+' not found in event")
                return build_response(400, {
                    'error': "Missing required path parameter 'key'"
                })
            
            logger.info(f"Attempting to delete S3 object with key: {object_key}")
            
            try:
                # First, check if the S3 object exists
                s3_client.head_object(Bucket=S3_BUCKET_NAME, Key=object_key)
                
                # Delete the S3 object
                s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=object_key)
                logger.info(f"Successfully deleted object {object_key} from bucket {S3_BUCKET_NAME}")
                
                return build_response(200, {
                    'message': 'S3 object successfully deleted',
                    'objectKey': object_key
                })
                
            except ClientError as e:
                if e.response['Error']['Code'] == '404' or e.response['Error']['Code'] == 'NoSuchKey':
                    logger.error(f"Object {object_key} not found in bucket {S3_BUCKET_NAME}")
                    return build_response(404, {
                        'error': f"S3 object with key {object_key} not found"
                    })
                else:
                    raise
        else:
            logger.error("Missing path parameters in event")
            return build_response(400, {
                'error': "Missing required path parameter for object key"
            })
            
    except ClientError as e:
        logger.error(f"AWS API error: {e}")
        return build_response(500, {
            'error': f"Error deleting S3 object: {str(e)}"
        })
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return build_response(500, {
            'error': f"Unexpected error: {str(e)}"
        })

def build_response(status_code, body):
    """Helper function to build the API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key'
        },
        'body': json.dumps(body)
    }
