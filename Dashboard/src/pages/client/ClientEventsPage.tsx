import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClientEvents } from '@/services/eventService';
import { SecurityEvent } from '@/types';
import EventsTable from '@/components/EventsTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

const ClientEventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Use the accountId from the user object
        const accountId = user.username;
        console.log('Fetching findings for client:', accountId);
        
        const data = await getClientEvents(accountId);
        console.log('Findings data received:', data);
        
        if (Array.isArray(data)) {
          setEvents(data);
          setFilteredEvents(data);
          toast.success(`Loaded ${data.length} security events`);
        } else {
          console.error('Unexpected data format:', data);
          toast.info('No security events found');
          setEvents([]);
          setFilteredEvents([]);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load security events');
        setEvents([]);
        setFilteredEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, [user]);
  
  // Apply filters when they change
  useEffect(() => {
    if (!events.length) {
      setFilteredEvents([]);
      return;
    }
    
    let filtered = [...events];
    
    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(
        event => 
          event.eventType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.sourceIp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.destinationIp?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(
        event => event.severity === severityFilter
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'remediated') {
        filtered = filtered.filter(event => event.remediated);
      } else if (statusFilter === 'not-remediated') {
        filtered = filtered.filter(event => !event.remediated);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(
          event => 
            !event.remediated && 
            (event.severity === 'critical' || event.severity === 'high') &&
            !event.remediationApproved
        );
      }
    }
    
    setFilteredEvents(filtered);
  }, [events, searchTerm, severityFilter, statusFilter]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="search" className="text-sm font-medium">Search Events</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              id="search"
              type="text" 
              placeholder="Search by event type, description, or IP..." 
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="w-full md:w-48 space-y-1">
          <label htmlFor="severity" className="text-sm font-medium">Severity</label>
          <Select 
            value={severityFilter}
            onValueChange={setSeverityFilter}
          >
            <SelectTrigger id="severity">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-48 space-y-1">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="remediated">Remediated</SelectItem>
              <SelectItem value="not-remediated">Not Remediated</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm('');
            setSeverityFilter('all');
            setStatusFilter('all');
          }}
        >
          Reset Filters
        </Button>
      </div>
      
      <EventsTable
        events={filteredEvents}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ClientEventsPage;
