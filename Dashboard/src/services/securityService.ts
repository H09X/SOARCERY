// Export all services from a single entry point
export * from './clientService';
export * from './eventService';
export * from './remediationService';
import { API_KEY, GUARDDUTY_API_ENDPOINT } from '@/services/apiConfig';
import { UserRole } from '@/types';

// Authentication service
export const authenticateUser = async (username: string, password: string , role:UserRole): Promise<boolean> => {
  try {
    ;
    const response = await fetch(`${GUARDDUTY_API_ENDPOINT}/auth`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        username,
        password,
        role,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    // If successful, return true
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
};

// Service to get client-specific findings
export const getClientFindings = async (accountId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${GUARDDUTY_API_ENDPOINT}/finding/${accountId}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch client findings');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching client findings:', error);
    return [];
  }
};

// Service to generate a report for a client
export const generateClientReport = async (accountId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${GUARDDUTY_API_ENDPOINT}/generate/${accountId}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      },
    });
    console.log(response);
    if (!response.ok) {
    
      throw new Error('Failed to generate report');

    }
    
    return true;
  } catch (error) {    
    console.error('Error generating report:', error);
    return false;
  }
};

// Service to request a password change
export const requestPasswordChange = async (accountId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
  try {
    const response = await fetch(`${GUARDDUTY_API_ENDPOINT}/reset/${accountId}`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      }),
    });
    
    if (!response.ok) {
      throw new Error('Password change failed');
    }
    
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    return false;
  }
};
