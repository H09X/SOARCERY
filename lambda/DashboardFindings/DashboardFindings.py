import json
import boto3
import os
from urllib.parse import parse_qs
import re

s3_client = boto3.client('s3')
bucket_name = "soarcery"

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }
    
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({})
        }
    
    try:
        path = event['path']
        
        if path == '/findings':
            query_params = event.get('queryStringParameters', {}) or {}
            severity = query_params.get('severity', None)
            date = query_params.get('date', None)
            account_id = query_params.get('accountId', None)
            
            if not severity and not date and not account_id:
                return get_all_findings(headers)
            else:
                return get_findings_list(severity, date, account_id, headers)
        

        elif re.match(r'^/finding/\d+$', path):
            account_id = event['pathParameters']['accountId']
            return get_account_findings(account_id, headers)
            

        elif path.startswith('/findings/'):
            key = event['pathParameters']['key']
            # Check if it's not a numeric account ID (to avoid overlap with case 2)
            if not key.isdigit():
                return get_finding_detail(key, headers)
            else:
                # Handle as account ID
                return get_account_findings(key, headers)
            
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Not found'})
            }
            
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Error processing request: {str(e)}'})
        }

def get_all_findings(headers):
    findings = []
    
    prefix = "security-hub-findings/"
    
    paginator = s3_client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
    
    for page in pages:
        if 'Contents' not in page:
            continue

        for obj in page['Contents']:
            key = obj['Key']
            parts = key.split('/')
            
            if len(parts) >= 4:
                severity = parts[1]
                
                filename = parts[-1]
                file_parts = filename.split('_')
                finding_account = extract_account_number(key)
                if len(file_parts) >= 2:
                    finding_id = file_parts[1]
                    
                    # Get remediation status
                    remediation_status = get_remediation_status(key)
                    
                    finding_summary = {
                        'key': key,
                        'severity': severity,
                        'date': parts[2],
                        'accountId': finding_account,
                        'findingId': finding_id,
                        'source': 'Security Hub',
                        'lastModified': obj['LastModified'].isoformat(),
                        'remediationStatus': remediation_status
                    }
                    
                    findings.append(finding_summary)
    
    findings.sort(key=lambda x: x['lastModified'], reverse=True)
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps(findings)
    }

def get_account_findings(account_id, headers):
    """Get all findings for a specific AWS account ID"""
    findings = []
    
    # Updated prefix to match the new Security Hub findings path
    prefix = "security-hub-findings/"
    
    paginator = s3_client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
    
    for page in pages:
        if 'Contents' not in page:
            continue

        for obj in page['Contents']:
            key = obj['Key']
            parts = key.split('/')
            
            if len(parts) >= 4:
                severity = parts[1]
                
                filename = parts[-1]
                file_parts = filename.split('_')
                if len(file_parts) >= 2:
                    finding_account = extract_account_number(key)
                    
                    # Filter by account ID
                    if finding_account == account_id:
                        finding_id = file_parts[1]
                        
                        # Get remediation status
                        remediation_status = get_remediation_status(key)
                        
                        finding_summary = {
                            'key': key,
                            'severity': severity,
                            'date': parts[2],
                            'accountId': finding_account,
                            'findingId': finding_id,
                            'source': 'Security Hub',
                            'lastModified': obj['LastModified'].isoformat(),
                            'remediationStatus': remediation_status
                        }
                        
                        findings.append(finding_summary)
    
    findings.sort(key=lambda x: x['lastModified'], reverse=True)
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps(findings)
    }

def get_findings_list(severity=None, date=None, account_id=None, headers=None):
    # Updated prefix to match the new Security Hub findings path
    prefix = "security-hub-findings/"
    
    if severity:
        prefix += f"{severity}/"
        if date:
            prefix += f"{date}/"
    elif date:
        findings = []
        for sev in ["critical", "high", "medium", "low", "unknown"]:
            sev_prefix = f"security-hub-findings/{sev}/{date}/"
            findings.extend(list_findings_with_prefix(sev_prefix, account_id))
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(findings)
        }
    
    findings = list_findings_with_prefix(prefix, account_id)
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps(findings)
    }

def list_findings_with_prefix(prefix, account_id=None):
    findings = []
    
    paginator = s3_client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket_name, Prefix=prefix)
    
    for page in pages:
        if 'Contents' not in page:
            continue
            
        for obj in page['Contents']:
            key = obj['Key']

            if account_id and account_id not in key:
                continue
                
            parts = key.split('/')
            if len(parts) >= 4:
                severity = parts[1]
                
                filename = parts[-1]
                file_parts = filename.split('_')
                finding_account = extract_account_number(key)
                if len(file_parts) >= 3:
                    finding_id = file_parts[1]
                    
                    # Get remediation status
                    remediation_status = get_remediation_status(key)
                    
                    finding_summary = {
                        'key': key,
                        'severity': severity,
                        'date': parts[2],
                        'accountId': finding_account,
                        'findingId': finding_id,
                        'source': 'Security Hub',
                        'lastModified': obj['LastModified'].isoformat(),
                        'remediationStatus': remediation_status
                    }
                    
                    findings.append(finding_summary)

    findings.sort(key=lambda x: x['lastModified'], reverse=True)
    return findings

def get_finding_detail(key, headers):
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        finding_content = response['Body'].read().decode('utf-8')
        
        # Parse the JSON to include a source field
        try:
            finding_json = json.loads(finding_content)
            finding_json['source'] = 'Security Hub'
            
            # We don't need to extract remediation status here since
            # it should already be included in the full finding JSON
            
            finding_content = json.dumps(finding_json)
        except json.JSONDecodeError:
            # If we can't parse the JSON, just return the original content
            pass
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': finding_content
        }
    except s3_client.exceptions.NoSuchKey:
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'error': 'Finding not found'})
        }

def extract_account_number(finding_path):
    parts = finding_path.replace('/', '_').split('_')
    
    for part in parts:
        if part.isdigit() and len(part) == 12:
            return part
    
    return None

def get_remediation_status(key):
    """Extract remediation status from the finding file"""
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        finding_content = response['Body'].read().decode('utf-8')
        
        finding_json = json.loads(finding_content)
        
        # Check if remediationStatus exists in the JSON
        if 'remediationStatus' in finding_json:
            return finding_json['remediationStatus']
        
        # Return a default status if not found
        return {
            'remediated': False,
            'remediationAction': None,
            'remediationTimestamp': None
        }
    except Exception as e:
        print(f"Error getting remediation status for {key}: {str(e)}")
        # Return a default status if there's an error
        return {
            'remediated': False,
            'remediationAction': None,
            'remediationTimestamp': None
        }
