import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClientEvents } from '@/services/eventService';
import { generateClientReport } from '@/services/securityService';
import { SecurityEvent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EventCard from '@/components/EventCard';
import SeverityDonutChart from '@/components/SeverityDonutChart';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

const ClientDashboardPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const accountId = user.username;
        const data = await getClientEvents(accountId);
        setEvents(data);
      } catch (error) {
        toast.error('Failed to load security events');
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, [user]);
  
  const handleGenerateReport = async () => {
    if (!user) return;
    
    setIsGeneratingReport(true);
    try {
      const success = await generateClientReport(user.username);
      if (success) {
        toast.success('Security report generated successfully. Check your email.');
      } else {
        toast.error('Failed to generate report. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  // Sort events by timestamp descending (most recent first)
  const sortedEvents = [...events].sort((a, b) =>
    (b.timestamp && a.timestamp)
      ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      : 0
  );
  
  // Calculate summary statistics
  const totalEvents = events.length;
  const remediatedEvents = events.filter(e => e.remediated).length;
  const pendingEvents = events.filter(e => !e.remediated).length;
  
  // Count by severity
  const severityCounts = events.reduce(
    (acc, event) => {
      acc[event.severity]++;
      return acc;
    }, 
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  
  // Recent events (last 5, most recent first)
  const recentEvents = sortedEvents.slice(0, 5);
  
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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <Button 
          onClick={handleGenerateReport} 
          disabled={isGeneratingReport}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          {isGeneratingReport ? 'Generating...' : 'Generate Security Report'}
        </Button>
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-severity-critical">{severityCounts.critical}</div>
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
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>
              Latest security events for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">
                No recent events found.
              </p>
            ) : (
              recentEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
      
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: "fixed",
            top: 20,
            left: 20,
            zIndex: 2000,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
          aria-label="Open sidebar"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ClientDashboardPage;
