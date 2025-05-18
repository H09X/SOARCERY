
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { SecurityEvent } from '@/types';
import { format, parseISO } from 'date-fns';
import SeverityBadge from '../SeverityBadge';
import RemediationBadge from '../RemediationBadge';
import EventActions from './EventActions';

interface EventTableRowProps {
  event: SecurityEvent;
  showClient?: boolean;
  onApprove?: (eventId: string) => void;
  onReject?: (eventId: string) => void;
  approvingIds?: Set<string>;
  rejectingIds?: Set<string>;
  isAdmin?: boolean;
}

const EventTableRow = ({
  event,
  showClient = false,
  onApprove,
  onReject,
  approvingIds = new Set(),
  rejectingIds = new Set(),
  isAdmin = false
}: EventTableRowProps) => {
  const needsApproval = 
    (event.severity === 'critical' || event.severity === 'high') && 
    !event.remediated && 
    !event.remediationApproved;
  
  // Safely format the date, providing a fallback for invalid/undefined timestamps
  const formattedDate = event.timestamp ? 
    format(parseISO(event.timestamp), 'PP p') : 
    'Date unavailable';
  
  return (
    <TableRow key={event.id} data-event-id={event.id}>
      <TableCell className="whitespace-nowrap">
        {formattedDate}
      </TableCell>
      {showClient && (
        <TableCell className="font-medium">{event.clientName || 'Unknown Client'}</TableCell>
      )}
      <TableCell data-event-type>{event.eventType || 'Unknown Event'}</TableCell>
      <TableCell>
        <SeverityBadge severity={event.severity} />
      </TableCell>
      <TableCell>
        <RemediationBadge 
          remediated={event.remediated} 
          pending={needsApproval}
        />
      </TableCell>
      <TableCell>
        <EventActions 
          event={event}
          onApprove={onApprove}
          onReject={onReject}
          approvingId={approvingIds?.has(event.id)}
          rejectingId={rejectingIds?.has(event.id)}
          isAdmin={isAdmin}
        />
      </TableCell>
    </TableRow>
  );
};

export default EventTableRow;