
import { SecurityEvent } from '@/types';
import { API_KEY, API_ENDPOINT, GUARDDUTY_API_ENDPOINT, getDetailedFindingUrl } from './apiConfig';

// Since we don't have specific remediation endpoints in the provided API,
// we'll keep the function signatures but modify the implementation to match our app's needs
export const approveRemediation = async (eventId: string): Promise<SecurityEvent> => {
  try {
    // For now, we'll log the approval but return a mocked response
    console.log(`Approving remediation for event ID: ${eventId}`);

    const getAllEventsResponse = await fetch(`${API_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });
    const allEvents = await getAllEventsResponse.json();
    const foundEvent = allEvents.find((e: any) => e.findingId === eventId);
    
    if (!foundEvent) {
      throw new Error('Event not found');
    }
    
    // Return modified event with remediation approved and remediated set to true
    return {
      id: eventId,
      clientId: foundEvent.accountId,
      clientName: `AWS Account ${foundEvent.accountId}`,
      timestamp: foundEvent.lastModified,
      eventType: 'GuardDuty Finding',
      description: `GuardDuty finding detected in account ${foundEvent.accountId}`,
      severity: foundEvent.severity.toLowerCase(),
      sourceIp: 'N/A',
      destinationIp: 'N/A',
      remediated: true,
      remediationApproved: true,
      remediationTimestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error approving remediation:', error);
    throw error;
  }
};

export const rejectRemediation = async (eventId: string): Promise<SecurityEvent> => {
  try {
    // For now, we'll log the rejection but use the same endpoint as GuardDuty link button
    console.log(`Rejecting remediation for event ID: ${eventId}`);
    
    // First, get the event to find its metadata key
    const getAllEventsResponse = await fetch(`${API_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });
    const allEvents = await getAllEventsResponse.json();
    const foundEvent = allEvents.find((e: any) => e.findingId === eventId);
    
    if (!foundEvent) {
      throw new Error('Event not found');
    }
    
    // Use the same endpoint as the GuardDuty link button to fetch detailed finding
    // but add /reject to the URL
    try {
      const rejectUrl = getDetailedFindingUrl(foundEvent.key).replace('/findings/', '/reject/');
      const response = await fetch(rejectUrl, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching finding: ${response.statusText}`);
      }
      
      // Process the detailed finding data - in a real app this might do more
      const finding = await response.json();
      console.log('Detailed finding for rejection:', finding);
      
      // You could log this rejection event to another system here
    } catch (detailedError) {
      console.error('Error fetching GuardDuty finding details for rejection:', detailedError);
    }
    
    // Return modified event with remediation rejected
    return {
      id: eventId,
      clientId: foundEvent.accountId,
      clientName: `AWS Account ${foundEvent.accountId}`,
      timestamp: foundEvent.lastModified,
      eventType: 'GuardDuty Finding',
      description: `GuardDuty finding detected in account ${foundEvent.accountId}`,
      severity: foundEvent.severity.toLowerCase(),
      sourceIp: 'N/A',
      destinationIp: 'N/A',
      remediated: false,
      remediationApproved: false,
      remediationTimestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error rejecting remediation:', error);
    throw error;
  }
};
