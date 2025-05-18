
import { SecurityEvent } from '@/types';
import { format, parseISO } from 'date-fns';
import SeverityBadge from './SeverityBadge';
import RemediationBadge from './RemediationBadge';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface EventCardProps {
  event: SecurityEvent;
}

const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate();
  
  const needsApproval = 
    (event.severity === 'critical' || event.severity === 'high') && 
    !event.remediated && 
    !event.remediationApproved;
  
  // Safely format the date, providing a fallback for invalid/undefined timestamps
  const formattedDate = event.timestamp ? 
    format(parseISO(event.timestamp), 'PPp') : 
    'Date unavailable';
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-4 bg-card border-b flex flex-row justify-between items-start">
        <div>
          <h4 className="text-sm font-medium">{event.eventType || 'Unknown Event'}</h4>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
        <SeverityBadge severity={event.severity} />
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-sm line-clamp-2 mb-2">{event.description || 'No description available'}</p>
        {event.sourceIp && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{event.sourceIp}</span>
            <ArrowRight className="h-3 w-3" />
            <span>{event.destinationIp || 'Unknown'}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <RemediationBadge 
          remediated={event.remediated} 
          pending={needsApproval}
        />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/event/${event.id}`)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
