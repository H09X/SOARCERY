
import { Client } from '@/types';
import {API_KEY, API_ENDPOINT, GuardDutyFindingSummary } from './apiConfig';

export const getAllClients = async (): Promise<Client[]> => {
  try {
    // Fetch all GuardDuty findings
    const response = await fetch(`${API_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }
    const data = await response.json() as GuardDutyFindingSummary[];
    
    // Extract unique client IDs and generate client objects
    const clientMap = new Map<string, Client>();
    
    data.forEach(finding => {
      const accountId = finding.accountId;
      
      if (!clientMap.has(accountId)) {
        // Initialize a new client
        clientMap.set(accountId, {
          id: accountId,
          name: `AWS Account ${accountId}`,
          eventCount: {
            critical: 0,
            high: 0, 
            medium: 0,
            low: 0,
            total: 0
          }
        });
      }
      
      // Update event counts
      const client = clientMap.get(accountId)!;
      client.eventCount.total += 1;
      
      // Update severity counts
      switch(finding.severity.toLowerCase()) {
        case 'critical':
          client.eventCount.critical += 1;
          break;
        case 'high':
          client.eventCount.high += 1;
          break;
        case 'medium':
          client.eventCount.medium += 1;
          break;
        case 'low':
          client.eventCount.low += 1;
          break;
      }
    });
    
    return Array.from(clientMap.values());
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

export const getClient = async (clientId: string): Promise<Client | undefined> => {
  try {
    // Fetch all clients and find the specific one
    const clients = await getAllClients();
    return clients.find(client => client.id === clientId);
  } catch (error) {
    console.error('Error fetching client:', error);
    throw error;
  }
};
