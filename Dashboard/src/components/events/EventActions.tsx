
import React from 'react';
import { Button } from '@/components/ui/button';
import { SecurityEvent } from '@/types';
import { useNavigate } from 'react-router-dom';
import GuardDutyLink from './GuardDutyLink';
import { toast } from 'sonner';
import { API_KEY, GUARDDUTY_API_ENDPOINT } from '@/services/apiConfig';

interface EventActionsProps {
  event: SecurityEvent;
  onApprove?: (eventId: string) => void;
  onReject?: (eventId: string) => void;
  approvingId?: boolean;
  rejectingId?: boolean;
  isAdmin?: boolean;
}

const EventActions = ({ 
  event, 
  onApprove, 
  onReject, 
  approvingId = false, 
  rejectingId = false,
  isAdmin = false
}: EventActionsProps) => {
  const navigate = useNavigate();
  
  // Only show approval buttons if:
  // 1. Event is high/critical severity
  // 2. NOT yet remediated 
  // 3. NOT yet approved for remediation
  const needsApproval = 
    (event.severity === 'critical' || event.severity === 'high') && 
    !event.remediated && 
    !event.remediationApproved;
    
  const isHighSeverity = event.severity === 'critical' || event.severity === 'high';

  // Handle approval using the simplified /approve/{key} endpoint
  const handleApprove = async () => {
    if (onApprove) {
      // Call the provided onApprove function
      onApprove(event.id);
      
      // Also fetch the GuardDuty finding details like the GuardDuty link button does
      const eventKey = event.metadata?.key;
      if (!eventKey) {
        toast.error("Cannot find GuardDuty finding details for approval");
        return;
      }
      
      try {
        toast.loading("Processing approval...");
        
        // Simple /approve/{key} pattern
        const approveUrl = `${GUARDDUTY_API_ENDPOINT}/approve/${eventKey}`;
        const response = await fetch(approveUrl, {
          method: 'GET',
          headers: {
            'x-api-key': API_KEY
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error approving finding: ${response.statusText}`);
        }
        
        toast.dismiss();
        toast.success("Finding approved successfully");
      } catch (error) {
        console.error('Error processing approval:', error);
        toast.dismiss();
        toast.error("Failed to process approval");
      }
    }
  };

  // Handle rejection using the simplified /reject/{key} endpoint
  const handleReject = async () => {
    if (onReject) {
      // Call the provided onReject function
      onReject(event.id);
      
      // Also fetch the GuardDuty finding details like the GuardDuty link button does
      const eventKey = event.metadata?.key;
      if (!eventKey) {
        toast.error("Cannot find GuardDuty finding details for rejection");
        return;
      }
      
      try {
        toast.loading("Processing rejection...");
        
        // Simple /reject/{key} pattern
        const rejectUrl = `${GUARDDUTY_API_ENDPOINT}/reject/${eventKey}`;
        const response = await fetch(rejectUrl, {
          method: 'GET',
          headers: {
            'x-api-key': API_KEY
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error rejecting finding: ${response.statusText}`);
        }
        
        toast.dismiss();
        toast.success("Finding rejected successfully");
      } catch (error) {
        console.error('Error processing rejection:', error);
        toast.dismiss();
        toast.error("Failed to process rejection");
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate(`/event/${event.id}`)}
      >
        Details
      </Button>
      {isAdmin && isHighSeverity && (
        <GuardDutyLink event={event} />
      )}
      {needsApproval && onApprove && (
        <Button
          size="sm"
          variant="default"
          onClick={handleApprove}
          disabled={approvingId}
        >
          {approvingId ? "Approving..." : "Approve"}
        </Button>
      )}
      {needsApproval && onReject && (
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReject}
          disabled={rejectingId}
        >
          {rejectingId ? "Rejecting..." : "Reject"}
        </Button>
      )}
    </div>
  );
};

export default EventActions;
