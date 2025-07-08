# SOARCERY
by Mohammad Alsaadi, Nabeel Mazyed, and Saleh Huneidi

SOARCERY is a comprehensive AWS-based security orchestration, automation, and response platform designed to monitor, analyze, and automatically remediate security threats across AWS environments. The platform integrates with AWS GuardDuty, Security Hub, and other AWS services to provide real-time threat detection and automated incident response.

## Architecture Overview

SOARCERY consists of three main components:

### 1. **Dashboard** (Frontend)
- **Technology**: React + TypeScript + Vite
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Features**: 
  - Role-based access control (Admin/Client)
  - Real-time security event monitoring
  - Interactive charts and visualizations
  - Event management and remediation approval
  - Report generation interface

### 2. **API Gateway** (Backend API)
- **Technology**: AWS API Gateway with OpenAPI 3.0 specification
- **Authentication**: JWT-based authentication
- **Endpoints**:
  - `/findings` - List and filter security findings
  - `/finding/{accountId}` - Account-specific findings
  - `/approve/{key}` - Approve remediation actions
  - `/reject/{key}` - Reject remediation actions
  - `/auth` - User authentication
  - `/generate/{accountId}` - Generate security reports

### 3. **Lambda Functions** (Backend Processing)
- **Language**: Python 3.x
- **Functions**:
  - `GuardDutyLogs` - Process GuardDuty findings
  - `DashboardFindings` - API for dashboard data
  - `ApproveRemediation` - Handle remediation approvals
  - `RejectRemediation` - Handle remediation rejections
  - `Authentication` - User authentication logic
  - `GenerateReport` - Create and email security reports

## Key Features

### Security Event Processing
- **Real-time Detection**: Automatically processes GuardDuty findings via EventBridge
- **Threat Classification**: Categorizes threats by severity (Critical, High, Medium, Low)
- **Automated Filtering**: Focuses on specific attack types like:
  - Malicious IP caller detection
  - Reverse shell execution
  - Unauthorized access attempts

### Intelligent Remediation
- **Automatic Response**: Low and medium severity threats are automatically remediated
- **Approval Workflow**: High and critical severity threats require manual approval
- **Cross-Account Support**: Handles security incidents across multiple AWS accounts
- **Remediation Actions**:
  - Network ACL modifications to block malicious IPs
  - Security group isolation for compromised instances
  - Process termination for suspicious activities
  - Instance tagging for incident tracking

### Dashboard & Reporting
- **Admin Dashboard**: 
  - Organization-wide security overview
  - Client management and monitoring
  - Pending approval queue
  - Comprehensive analytics
  
- **Client Dashboard**:
  - Account-specific security events
  - Remediation status tracking
  - Report generation capabilities
  - Historical event analysis

### Report Generation
- **Automated Reports**: PDF security reports generated on-demand
- **Email Delivery**: Reports automatically emailed to account administrators
- **Multi-Account Support**: Consolidated reporting across AWS Organizations
- **Professional Formatting**: Styled HTML emails with attached PDF reports

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **TanStack Query** for state management
- **Recharts** for data visualization

### Backend
- **AWS Lambda** (Python 3.x)
- **AWS API Gateway** (REST API)
- **AWS S3** for findings storage
- **AWS Secrets Manager** for credentials
- **AWS SES** for email delivery
- **AWS SSM** for instance management
- **AWS EventBridge** for event processing

### Security & Authentication
- **Role-based access control**
- **AWS IAM** for service permissions
- **Cross-account role assumption**
- **Encrypted storage** in S3

## Installation & Setup

### Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js 16+ for frontend development
- Python 3.x for Lambda functions
- AWS Organizations setup (for multi-account features)

### Dashboard Setup
```bash
cd Dashboard
npm install
npm run dev
```

### Lambda Deployment
Each Lambda function includes:
- Python source code
- IAM policy documents
- Resource-based policy statements

Deploy using AWS CLI, CloudFormation, or your preferred IaC tool.

### API Gateway Configuration
- Import the OpenAPI specification from `API Gateway/Api config.yaml`
- Configure Lambda integrations
- Set up authentication and CORS

## Configuration

### Environment Variables
- `FINDINGS_BUCKET`: S3 bucket for storing security findings
- `ORGANIZATION_ID`: AWS Organization ID for multi-account support
- `REMEDIATION_ROLE_NAME`: IAM role for cross-account remediation

### Secrets Manager
- `soarcery/ec2-credentials`: SSH credentials for report generation
- `soarcery-user-{username}`: User authentication credentials

### Supported Attack Types
The system currently monitors and responds to:
- `UnauthorizedAccess:EC2/MaliciousIPCaller.Custom`
- `TTPs/Command and Control/UnauthorizedAccess: EC2-MaliciousIPCaller.Custom`
- `TTPs/Execution/Execution:Runtime-ReverseShell`

## Security Features

### Threat Detection
- **GuardDuty Integration**: Real-time threat detection
- **Security Hub Aggregation**: Centralized finding management
- **Custom Threat Intelligence**: Configurable attack type filtering

### Automated Response
- **Network Isolation**: Automatic blocking of malicious IPs
- **Instance Quarantine**: Security group modifications for compromised resources
- **Process Termination**: Automated killing of suspicious processes
- **Forensic Collection**: Gathering of system information for analysis

### Compliance & Audit
- **Event Logging**: Comprehensive audit trail
- **Remediation Tracking**: Full history of security actions
- **Multi-Account Visibility**: Organization-wide security posture
- **Reporting**: Regular security reports and metrics

## Data Flow

1. **Detection**: GuardDuty identifies security threats
2. **Processing**: EventBridge triggers Lambda for finding processing
3. **Storage**: Findings stored in S3 with metadata
4. **Classification**: Automatic severity and threat type classification
5. **Remediation**: Automated response for low/medium threats
6. **Approval**: Manual approval workflow for high/critical threats
7. **Reporting**: Dashboard updates and email notifications
