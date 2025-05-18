import { SecurityEvent } from '@/types';
import { 
  API_KEY,
  API_ENDPOINT, 
  GUARDDUTY_API_ENDPOINT, 
  GuardDutyFindingSummary
} from './apiConfig';

export const getAllEvents = async (): Promise<SecurityEvent[]> => {
  try {
    const response = await fetch(`${API_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    const data = await response.json() as GuardDutyFindingSummary[];
    // Map GuardDuty findings to our SecurityEvent format and include original key in metadata
    return data.map(finding => {
      const event = mapGuardDutyFindingSummaryToSecurityEvent(finding);
      // Add metadata with the original key for detailed lookup
      event.metadata = { key: finding.key };
      return event;
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

export const getClientEvents = async (clientId: string): Promise<SecurityEvent[]> => {
  try {
    // Fetch all events and filter for the specific client
    const response = await fetch(`${API_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch client events');
    }
    const data = await response.json() as GuardDutyFindingSummary[];
    
    // Filter by accountId (clientId) and map to SecurityEvents
    const clientEvents = data
      .filter(finding => finding.accountId === clientId)
      .map(finding => {
        const event = mapGuardDutyFindingSummaryToSecurityEvent(finding);
        // Add metadata with the original key for detailed lookup
        event.metadata = { key: finding.key };
        return event;
      });
    
    return clientEvents;
  } catch (error) {
    console.error('Error fetching client events:', error);
    throw error;
  }
};

export const getEventById = async (eventId: string): Promise<SecurityEvent | undefined> => {
  try {
    // Fetch all events and find the specific one
    const response = await fetch(`${API_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    const data = await response.json() as GuardDutyFindingSummary[];
    
    // Find the event with the matching ID
    const finding = data.find(finding => finding.findingId === eventId);
    
    if (!finding) {
      return undefined;
    }
    
    // Map to SecurityEvent format
    const event = mapGuardDutyFindingSummaryToSecurityEvent(finding);
    // Add metadata with the original key for detailed lookup
    event.metadata = { key: finding.key };
    return event;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
};

export const mapGuardDutyFindingSummaryToSecurityEvent = (finding: GuardDutyFindingSummary) => {
  const remediationStatus = finding.remediationStatus || {};
  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
  switch (finding.severity.toLowerCase()) {
    case 'critical': severity = 'critical'; break;
    case 'high': severity = 'high'; break;
    case 'medium': severity = 'medium'; break;
    default: severity = 'low';
  }
  return {
    id: finding.findingId,
    clientId: finding.accountId,
    clientName: `AWS Account ${finding.accountId}`,
    timestamp: finding.lastModified,
    eventType: 'GuardDuty Finding',
    description: `GuardDuty finding detected in account ${finding.accountId}`,
    severity,
    sourceIp: 'N/A',
    destinationIp: 'N/A',
    remediated: remediationStatus.remediated ?? false,
    remediationApproved: undefined,
    remediationTimestamp: remediationStatus.remediationTimestamp,
    remediationDetails: remediationStatus.remediationAction,
    metadata: { key: finding.key },
  };
};
