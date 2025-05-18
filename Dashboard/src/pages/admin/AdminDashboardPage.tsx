
import { useState, useEffect } from 'react';
import { getAllEvents, getAllClients } from '@/services/securityService';
import { SecurityEvent, Client } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SeverityDonutChart from '@/components/SeverityDonutChart';
import ClientsTable from '@/components/ClientsTable';
import EventCard from '@/components/EventCard';
import { format } from 'date-fns';

const AdminDashboardPage = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsData, clientsData] = await Promise.all([
          getAllEvents(),
          getAllClients()
        ]);
        setEvents(eventsData);
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Calculate summary statistics
  const totalEvents = events.length;
  const remediatedEvents = events.filter(e => e.remediated).length;
  const pendingApprovalEvents = events.filter(
    e => (e.severity === 'critical' || e.severity === 'high') && !e.remediated
  ).length;
  
  // Count by severity
  const severityCounts = events.reduce(
    (acc, event) => {
      acc[event.severity]++;
      return acc;
    }, 
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  
  // Recent critical/high events requiring approval (last 3)
  const pendingEvents = events
    .filter(e => (e.severity === 'critical' || e.severity === 'high') && !e.remediated)
    .slice(0, 3);
  
  if (isLoading) {
    return (
      <div className="w-full p-8 flex justify-center">
        <div className="animate-pulse flex flex-col w-full space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  // Get the current date
  const today = format(new Date(), 'MMMM d, yyyy');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">{today}</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remediated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{remediatedEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingApprovalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Event Severity</CardTitle>
            <CardDescription>
              Distribution of security events by severity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeverityDonutChart data={severityCounts} />
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Events Pending Approval</CardTitle>
            <CardDescription>
              Critical and high severity events that require approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingEvents.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">
                No events pending approval.
              </p>
            ) : (
              pendingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
          <CardDescription>
            Overview of all clients and their security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientsTable clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
