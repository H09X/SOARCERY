# SOARCERY - by Mohammad Alsaadi, Nabeel Mazyed, and Saleh Huneidi

## Project Description

Developed a cutting-edge Cloud-Based Security Orchestration, Automation, and Response (SOAR) Platform leveraging AWS. The solution aims to enhance cloud infrastructure security through advanced threat detection and automated response mechanisms. The project creates a scalable, proactive security system that minimizes manual intervention, demonstrating the practical application of cloud technologies in addressing modern cybersecurity challenges.

## Main Features

### Dashboard Features
- **Real-time Security Monitoring**: View and monitor GuardDuty findings across multiple AWS accounts
- **Advanced Filtering**: Filter findings by severity level (high, medium, low), date, and AWS account ID
- **Detailed Finding Analysis**: Access comprehensive information about each security finding
- **Remediation Workflow**: Approve or reject remediation actions with audit trail
- **Report Generation**: Generate detailed security reports for specific AWS accounts
- **User Authentication**: Secure login system with role-based access control
- **Password Management**: Built-in password reset functionality

### Backend Capabilities
- **Automated Data Processing**: Lambda functions handle finding ingestion and processing
- **Scalable Storage**: S3-based storage for efficient handling of large volumes of security data
- **RESTful API**: Well-structured API endpoints for seamless frontend-backend communication
- **Cross-Origin Support**: CORS-enabled endpoints for web application compatibility

## Technologies Used

### Main AWS Services
- **AWS Lambda**: Serverless compute for backend processing
- **Amazon API Gateway**: RESTful API management and routing
- **Amazon S3**: Object storage for GuardDuty findings data
- **AWS GuardDuty**: Threat detection and security monitoring
- **AWS IAM**: Identity and access management

## Prerequisites

Before setting up the SOAR system, ensure you have:

- **AWS Account**: Active AWS account with appropriate permissions
- **AWS CLI**: Configured with credentials for deployment
- **AWS SAM CLI**: For serverless application deployment (optional)
- **GuardDuty**: Enabled in your AWS accounts for finding generation
- **S3 Bucket**: Created for storing findings data

### Required AWS Permissions
- Lambda: Create, update, and invoke functions
- API Gateway: Create and manage APIs
- S3: Read/write access to findings bucket
- IAM: Create roles and policies for Lambda functions
- GuardDuty: Read access to findings

## Setup Instructions

### 1. Deploy Lambda Functions

#### Deploy DashboardFindings Function

#### Deploy Authentication Function

#### Deploy Remediation Functions

### 2. Deploy API Gateway

### 3. Deploy Web Dashboard

## Configuration

## Usage Instructions

### Managing Findings
1. **View All Findings**: Access the main dashboard to see all findings
2. **Filter Findings**: Use the filter options to narrow down results:
   - Severity: `high`, `medium`, `low`
   - Date: Format `YYYY/MM/DD`
   - Account ID: Specific AWS account
3. **View Details**: Click on any finding to see comprehensive details
4. **Remediation Actions**:
   - Click "Approve" to approve remediation
   - Click "Reject" to reject remediation

### Generating Reports
1. Navigate to the Reports section
2. Select the desired AWS account ID
3. Click "Generate Report"

### API Endpoints

#### GET /findings
List all findings with optional filters
```bash
curl -X GET "https://your-api-url/findings?severity=high&date=2024/01/15"
```

#### GET /findings/{key+}
Get detailed information about a specific finding
```bash
curl -X GET "https://your-api-url/findings/2024/01/15/finding-12345.json"
```

#### POST /auth
Authenticate user
```bash
curl -X POST "https://your-api-url/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'
```

#### GET /approve/{key+}
Approve remediation for a finding
```bash
curl -X GET "https://your-api-url/approve/2024/01/15/finding-12345.json"
```

#### GET /reject/{key+}
Reject remediation for a finding
```bash
curl -X GET "https://your-api-url/reject/2024/01/15/finding-12345.json"
```

## API Response Examples

### Findings List Response
```json
[
  {
    "id": "finding-12345",
    "title": "Unusual API call from suspicious IP",
    "severity": "high",
    "type": "UnauthorizedAPICall",
    "accountId": "123456789012",
    "region": "eu-north-1",
    "createdAt": "2024-01-15T10:30:00Z",
    "s3Key": "2024/01/15/finding-12345.json",
    "remediationStatus": "pending"
  }
]
```

### Authentication Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "username": "security-analyst",
    "roles": ["analyst", "approver"]
  }
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your API Gateway has CORS properly configured
2. **Lambda Timeouts**: Increase timeout settings for functions processing large datasets
3. **S3 Access Denied**: Check IAM roles and bucket policies
