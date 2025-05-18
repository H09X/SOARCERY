
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClientEvents, getClient, approveRemediation } from '@/services/securityService';
import { SecurityEvent, Client } from '@/types';
import { Button } from '@/components/ui/button';
import EventsTable from '@/components/EventsTable';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AdminClientEventsPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) return;
      
      try {
        const [clientData, eventsData] = await Promise.all([
          getClient(clientId),
          getClientEvents(clientId)
        ]);
        
        if (clientData) {
          setClient(clientData);
        } else {
          toast.error('Client not found');
          navigate('/admin/clients');
        }
        
        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching client data:', error);
        toast.error('Error loading client data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [clientId, navigate]);
  
  const handleApprove = async (eventId: string) => {
    setApprovingIds(prev => new Set(prev).add(eventId));
    
    try {
      const updatedEvent = await approveRemediation(eventId);
      
      // Update the events list with the updated event
      setEvents(prev => 
        prev.map(event => 
          event.id === eventId ? updatedEvent : event
        )
      );
      
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
  
  if (isLoading) {
    return (
      <div className="w-full p-8 flex justify-center">
        <div className="animate-pulse flex flex-col w-full space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/admin/clients')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Clients
      </Button>
      
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight">
          {client?.name} Events
        </h2>
        <p className="text-muted-foreground">
          {client?.eventCount.total} total security events
        </p>
      </div>
      
      <EventsTable
        events={events}
        isLoading={isLoading}
        onApprove={handleApprove}
        approvingIds={approvingIds}
        isAdmin={true}
      />
    </div>
  );
};

export default AdminClientEventsPage;
