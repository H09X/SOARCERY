
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Client } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ClientsTableProps {
  clients: Client[];
  isLoading?: boolean;
}

const ClientsTable = ({ clients, isLoading = false }: ClientsTableProps) => {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="w-full p-8 flex justify-center">
        <div className="animate-pulse flex flex-col w-full space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  if (clients.length === 0) {
    return (
      <div className="w-full p-8 text-center">
        <p className="text-muted-foreground">No clients found.</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client Name</TableHead>
            <TableHead>Critical</TableHead>
            <TableHead>High</TableHead>
            <TableHead>Medium</TableHead>
            <TableHead>Low</TableHead>
            <TableHead>Total Events</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-severity-critical/10 text-severity-critical text-xs">
                  {client.eventCount.critical}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-severity-high/10 text-severity-high text-xs">
                  {client.eventCount.high}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-severity-medium/10 text-severity-medium text-xs">
                  {client.eventCount.medium}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-severity-low/10 text-severity-low text-xs">
                  {client.eventCount.low}
                </span>
              </TableCell>
              <TableCell>{client.eventCount.total}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/client/${client.id}`)}
                >
                  View Events
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientsTable;
