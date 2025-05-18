import { useState, useEffect } from 'react';
import { getAllEvents, approveRemediation, rejectRemediation } from '@/services/securityService';
import { SecurityEvent } from '@/types';
import EventsTable from '@/components/EventsTable';
import { toast } from 'sonner';

const AdminPendingEventsPage = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const allEvents = await getAllEvents();
        
        // Filter for critical and high severity events that need approval
        const pendingEvents = allEvents.filter(
          event => 
            (event.severity === 'critical' || event.severity === 'high') && 
            !event.remediated && 
            !event.remediationApproved
        );
        
        setEvents(pendingEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events. Please try again later.');
        toast.error('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, []);
  
  const handleApprove = async (eventId: string) => {
    setApprovingIds(prev => new Set(prev).add(eventId));
    
    try {
      // Approve remediation and get updated event
      const updatedEvent = await approveRemediation(eventId);
      
      // Update the event in the list with the new data
      setEvents(prev => prev.map(event => 
        event.id === eventId ? {
          ...event,
          ...updatedEvent,
          remediated: true,
          remediationApproved: true,
          remediationTimestamp: new Date().toISOString()
        } : event
      ));
      
      toast.success('Remediation approved successfully');
    } catch (error) {
      console.error('Error approving remediation:', error);
      toast.error('Failed to approve remediation');
    } finally {
      setApprovingIds(prev => {
        const updated = new Set(prev);
        updated.delete(eventId);
        return updated;
      });
    }
  };
  
  const handleReject = async (eventId: string) => {
    setRejectingIds(prev => new Set(prev).add(eventId));
    
    try {
      // Reject remediation and get updated event
      const updatedEvent = await rejectRemediation(eventId);
      
      // Update the event in the list with the new data
      setEvents(prev => prev.map(event => 
        event.id === eventId ? {
          ...event,
          ...updatedEvent,
          remediated: false,
          remediationApproved: false,
          remediationTimestamp: new Date().toISOString()
        } : event
      ));
      
      toast.success('Remediation rejected successfully');
    } catch (error) {
      console.error('Error rejecting remediation:', error);
      toast.error('Failed to reject remediation');
    } finally {
      setRejectingIds(prev => {
        const updated = new Set(prev);
        updated.delete(eventId);
        return updated;
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight">
          Pending Approval
        </h2>
        <p className="text-muted-foreground">
          Critical and high severity AWS GuardDuty findings requiring admin approval for remediation
        </p>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
          {error}
        </div>
      )}
      
      <EventsTable
        events={events}
        isLoading={isLoading}
        showClient={true}
        onApprove={handleApprove}
        onReject={handleReject}
        approvingIds={approvingIds}
        rejectingIds={rejectingIds}
        isAdmin={true}
      />
      
      {!isLoading && !error && events.length === 0 && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">
            No AWS GuardDuty findings currently pending approval.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminPendingEventsPage;
