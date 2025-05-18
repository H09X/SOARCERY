
import React from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SecurityEvent } from '@/types';
import EventsTableLoading from './events/EventsTableLoading';
import EventsTableEmpty from './events/EventsTableEmpty';
import EventTableRow from './events/EventTableRow';

interface EventsTableProps {
  events: SecurityEvent[];
  isLoading?: boolean;
  showClient?: boolean;
  onApprove?: (eventId: string) => void;
  onReject?: (eventId: string) => void;
  approvingIds?: Set<string>;
  rejectingIds?: Set<string>;
  isAdmin?: boolean;
}

const EventsTable = ({
  events,
  isLoading = false,
  showClient = false,
  onApprove,
  onReject,
  approvingIds = new Set(),
  rejectingIds = new Set(),
  isAdmin = false
}: EventsTableProps) => {
  if (isLoading) {
    return <EventsTableLoading />;
  }

  if (events.length === 0) {
    return <EventsTableEmpty />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            {showClient && <TableHead>Client</TableHead>}
            <TableHead>Event Source</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <EventTableRow
              key={event.id}
              event={event}
              showClient={showClient}
              onApprove={onApprove}
              onReject={onReject}
              approvingIds={approvingIds}
              rejectingIds={rejectingIds}
              isAdmin={isAdmin}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default EventsTable;
