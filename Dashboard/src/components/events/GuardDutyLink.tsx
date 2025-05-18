
import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SecurityEvent } from '@/types';
import { API_KEY, getDetailedFindingUrl } from '@/services/apiConfig';

interface GuardDutyLinkProps {
  event: SecurityEvent;
}

const GuardDutyLink = ({ event }: GuardDutyLinkProps) => {
  const openGuardDutyLog = async () => {
    // Find the original key from the event metadata if available
    const eventKey = event.metadata?.key;
    
    if (!eventKey) {
      toast.error("Cannot find GuardDuty finding details");
      return;
    }
    
    try {
      // Show loading toast
      toast.loading("Fetching GuardDuty finding details...");
      
      // Fetch the detailed finding with the direct URL format
      const response = await fetch(getDetailedFindingUrl(eventKey), {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching finding: ${response.statusText}`);
      }
      
      // Get the detailed finding data
      const finding = await response.json();
      
      // Dismiss loading toast
      toast.dismiss();
      
      // Update event type and description from the finding in the row
      if (finding.type) {
        const tableRow = document.querySelector(`[data-event-id="${event.id}"]`) as HTMLElement;
        if (tableRow) {
          const typeCell = tableRow.querySelector('[data-event-type]');
          if (typeCell) {
            typeCell.textContent = finding.type;
          }
          
          // Also update the event object for subsequent operations
          event.eventType = finding.type;
          event.description = finding.description || finding.title || event.description;
        }
      }
      
      // Open the finding in a new tab or handle it as needed
      const jsonBlob = new Blob([JSON.stringify(finding, null, 2)], {type: 'application/json'});
      const blobUrl = URL.createObjectURL(jsonBlob);
      window.open(blobUrl, '_blank');
      
      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Error fetching GuardDuty finding:', error);
      toast.dismiss();
      toast.error("Failed to fetch GuardDuty finding details");
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={openGuardDutyLog}
    >
      <ExternalLink className="mr-1 h-3.5 w-3.5" />
      GuardDuty
    </Button>
  );
};

export default GuardDutyLink;
