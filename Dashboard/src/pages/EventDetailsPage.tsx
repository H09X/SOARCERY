import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getEventById, approveRemediation } from '@/services/securityService';
import { SecurityEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import SeverityBadge from '@/components/SeverityBadge';
import RemediationBadge from '@/components/RemediationBadge';
import { toast } from 'sonner';
import { API_KEY, getDetailedFindingUrl } from '@/services/apiConfig';

const EventDetailsPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<SecurityEvent | null>(null);
  const [findingDetails, setFindingDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      try {
        const eventData = await getEventById(eventId);
        
        if (eventData) {
          setEvent(eventData);
          
          // Fetch detailed finding data if metadata key exists
          if (eventData.metadata?.key) {
            try {
              const response = await fetch(getDetailedFindingUrl(eventData.metadata.key), {
                method: 'GET',
                headers: {
                  'x-api-key': API_KEY
                }
              });
              if (response.ok) {
                const finding = await response.json();
                setFindingDetails(finding);
                
                // Update the event with more detailed information from the finding
                if (finding) {
                  setEvent(prev => prev ? {
                    ...prev,
                    eventType: finding.Types?.[0] || prev.eventType,
                    description: finding.Description || prev.description,
                    // Extract source and destination IPs from the finding
                    sourceIp: finding.Action?.NetworkConnectionAction?.RemoteIpDetails?.IpAddressV4 || prev.sourceIp,
                    destinationIp: finding.Resources?.[0]?.Details?.AwsEc2Instance?.IpV4Addresses?.[0] || prev.destinationIp,
                    // Extract remediation status
                    remediated: finding.remediationStatus?.remediated || prev.remediated,
                    remediationTimestamp: finding.remediationStatus?.remediationTimestamp || prev.remediationTimestamp,
                    remediationDetails: finding.remediationStatus?.remediationAction || prev.remediationDetails,
                    // Add additional finding details
                    severity: finding.Severity?.Label?.toLowerCase() || prev.severity,
                    firstObserved: finding.FirstObservedAt || prev.firstObserved,
                    lastObserved: finding.LastObservedAt || prev.lastObserved,
                    updatedAt: finding.UpdatedAt || prev.updatedAt,
                    // Add source location information
                    sourceLocation: {
                      country: finding.Action?.NetworkConnectionAction?.RemoteIpDetails?.Country?.CountryName,
                      city: finding.Action?.NetworkConnectionAction?.RemoteIpDetails?.City?.CityName
                    },
                    // Add protocol information
                    protocol: finding.Action?.NetworkConnectionAction?.Protocol
                  } : prev);
                }
              }
            } catch (error) {
              console.error('Error fetching detailed finding:', error);
            }
          }
        } else {
          toast.error('Event not found');
          navigate(-1);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId, navigate]);
  
  const handleApprove = async () => {
    if (!event) return;
    
    setIsApproving(true);
    try {
      const updatedEvent = await approveRemediation(event.id);
      setEvent(updatedEvent);
      toast.success('Remediation approved successfully');
    } catch (error) {
      console.error('Error approving remediation:', error);
      toast.error('Failed to approve remediation');
    } finally {
      setIsApproving(false);
    }
  };
  
  const goBack = () => {
    navigate(-1);
  };

  const openGuardDutyLog = async () => {
    if (!event || !event.metadata?.key) {
      toast.error("Cannot find GuardDuty finding details");
      return;
    }
    
    try {
      // Show loading toast
      toast.loading("Fetching GuardDuty finding details...");
      
      // If we already have the finding details, just display them
      if (findingDetails) {
        toast.dismiss();
        const jsonBlob = new Blob([JSON.stringify(findingDetails, null, 2)], {type: 'application/json'});
        const blobUrl = URL.createObjectURL(jsonBlob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        return;
      }
      
      // Otherwise fetch the detailed finding
      const response = await fetch(getDetailedFindingUrl(event.metadata.key), {
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
      setFindingDetails(finding);
      
      // Update the event type and description with the type field from the finding
      if (finding.type && event) {
        const updatedEvent = { 
          ...event, 
          eventType: finding.types[0],
          description: finding.description
        };
        setEvent(updatedEvent);
      }
      
      // Dismiss loading toast
      toast.dismiss();
      
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
  
  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Button variant="outline" onClick={goBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="text-center p-12">
          <h2 className="text-2xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground">
            The event you're looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }
  
  const isAdmin = user?.role === 'admin';
  const isHighSeverity = event?.severity === 'critical' || event?.severity === 'high';
  const needsApproval = 
    isHighSeverity && 
    !event?.remediated &&
    !event?.remediationApproved;
  
  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Button variant="outline" onClick={goBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      {event && (
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <CardTitle className="text-2xl">{event.eventType}</CardTitle>
                <CardDescription>{event.clientName}</CardDescription>
              </div>
              <SeverityBadge severity={event.severity} className="text-sm" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Finding Overview */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-base">{event.description}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Severity</p>
                  <p className="text-base">{event.severity}</p>
                </div>
              </div>
              
              {/* IP Information */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Source IP (Malicious Caller)</p>
                  <p className="text-base">{event.sourceIp || 'N/A'}</p>
                  {event.sourceLocation && (
                    <p className="text-sm text-muted-foreground">
                      {[event.sourceLocation.country, event.sourceLocation.city]
                        .filter(Boolean)
                        .join(', ') || 'N/A'}
                    </p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Destination IP (EC2 Instance)</p>
                  <p className="text-base">{event.destinationIp || 'N/A'}</p>
                </div>
                
                {event.protocol && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Protocol</p>
                    <p className="text-base">{event.protocol}</p>
                  </div>
                )}
              </div>
              
              {/* Timeline */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">First Observed</p>
                  <p className="text-base">{event.firstObserved ? format(parseISO(event.firstObserved), 'PPp') : 'N/A'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Last Observed</p>
                  <p className="text-base">{event.lastObserved ? format(parseISO(event.lastObserved), 'PPp') : 'N/A'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Updated At</p>
                  <p className="text-base">{event.updatedAt ? format(parseISO(event.updatedAt), 'PPp') : 'N/A'}</p>
                </div>
              </div>
              
              {/* Remediation Status */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Remediation Status</p>
                  <RemediationBadge remediated={event.remediated} pending={needsApproval} />
                </div>
                
                {event.remediationTimestamp && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Remediation Date</p>
                    <p className="text-base">{format(parseISO(event.remediationTimestamp), 'PPp')}</p>
                  </div>
                )}
                
                {event.remediationDetails && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Remediation Action</p>
                    <p className="text-base">{event.remediationDetails}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t flex flex-wrap gap-3">
              {isAdmin && isHighSeverity && (
                <Button 
                  variant="outline"
                  onClick={openGuardDutyLog}
                  className="w-full md:w-auto"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in GuardDuty
                </Button>
              )}
              
              {isAdmin && needsApproval && (
                <Button 
                  onClick={handleApprove} 
                  disabled={isApproving}
                  className="w-full md:w-auto"
                >
                  {isApproving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block animate-spin"></span>
                      Approving...
                    </span>
                  ) : (
                    'Approve Remediation'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventDetailsPage;
