export type UserRole = 'client' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  clientName?: string; // Only applies to clients
}

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityEvent {
  id: string;
  clientId: string;
  clientName: string;
  timestamp: string;
  eventType: string;
  description: string;
  severity: SeverityLevel;
  sourceIp?: string;
  destinationIp?: string;
  remediated: boolean;
  remediationApproved?: boolean; // For high/critical events
  remediationTimestamp?: string;
  remediationDetails?: string;
  protocol?: string;
  sourceLocation?: {
    country?: string;
    city?: string;
  };
  firstObserved?: string;
  lastObserved?: string;
  updatedAt?: string;
  metadata?: {
    key?: string;
    [key: string]: any;
  }
}

export interface Client {
  id: string;
  name: string;
  contactEmail?: string;
  eventCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}
