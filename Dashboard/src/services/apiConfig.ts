// API key for authorization
export const API_KEY = import.meta.env.VITE_API_KEY;

// API endpoint for fetching data
export const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

// GuardDuty API endpoint (using the same base URL)
export const GUARDDUTY_API_ENDPOINT = import.meta.env.VITE_GUARDDUTY_API_ENDPOINT;

// Helper to get a specific finding by key - using the full path format
export const getDetailedFindingUrl = (key: string) => {
  return `${GUARDDUTY_API_ENDPOINT}/findings/${key}`;
};

// Type definition for the GuardDuty finding summary from the API
export interface GuardDutyFindingSummary {
  key: string;
  severity: string;
  date: string;
  accountId: string;
  findingId: string;
  lastModified: string;
}

// GuardDuty finding to SecurityEvent mapper
export const mapGuardDutyFindingSummaryToSecurityEvent = (finding: GuardDutyFindingSummary) => {
  // Map severity from string to our severity levels
  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
  switch (finding.severity.toLowerCase()) {
    case 'critical':
      severity = 'critical';
      break;
    case 'high':
      severity = 'high';
      break;
    case 'medium':
      severity = 'medium';
      break;
    default:
      severity = 'low';
  }
  
  // Create security event from GuardDuty finding summary
  return {
    id: finding.findingId,
    clientId: finding.accountId,
    clientName: `AWS Account ${finding.accountId}`,
    timestamp: finding.lastModified,
    eventType: 'GuardDuty Finding', // Default event type, will be updated with type field when full details are retrieved
    description: `GuardDuty finding detected in account ${finding.accountId}`,
    severity,
    sourceIp: 'N/A',
    destinationIp: 'N/A',
    remediated: false,
    remediationApproved: undefined,
    metadata: { key: finding.key }, // Store the key for later API calls
  };
};

// Keep the original mapper for backward compatibility
export const mapGuardDutyToSecurityEvent = (finding: any) => {
  // Map severity from 0-10 scale to our severity levels
  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (finding.severity >= 7.0) {
    severity = 'critical';
  } else if (finding.severity >= 5.0) {
    severity = 'high';
  } else if (finding.severity >= 3.0) {
    severity = 'medium';
  }

  // Get the type and description from the finding
  const eventType = finding.type || finding.detail?.type || finding['detail-type'] || 'GuardDuty Finding';
  const description = finding.description || finding.title || finding.detail?.description || finding.detail?.title;
  
  // Create security event from GuardDuty finding
  return {
    id: finding.detail?.id || finding.id,
    clientId: finding.detail?.accountId || finding.accountId,
    clientName: `AWS Account ${finding.detail?.accountId || finding.accountId}`,
    timestamp: finding.detail?.createdAt || finding.createdAt || finding.time,
    eventType: eventType, // Use type field as event source name
    description: description, // Use description field directly
    severity,
    sourceIp: finding.detail?.service?.action?.networkConnectionAction?.remoteIpDetails?.ipAddressV4 || 'N/A',
    destinationIp: finding.detail?.service?.action?.networkConnectionAction?.localIpDetails?.ipAddressV4 || 'N/A',
    remediated: false,
    remediationApproved: undefined,
    metadata: { key: finding.id },  // Add metadata here too for consistency
  };
};
