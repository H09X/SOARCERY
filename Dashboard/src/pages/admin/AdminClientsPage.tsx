
import { useState, useEffect } from 'react';
import { getAllClients } from '@/services/securityService';
import { Client } from '@/types';
import ClientsTable from '@/components/ClientsTable';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const AdminClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await getAllClients();
        setClients(data);
        setFilteredClients(data);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClients();
  }, []);
  
  // Apply search filter
  useEffect(() => {
    if (searchTerm) {
      setFilteredClients(
        clients.filter(client => 
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredClients(clients);
    }
  }, [clients, searchTerm]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight">Clients</h2>
        <p className="text-muted-foreground">
          Manage and monitor all client security events
        </p>
      </div>
      
      <div className="flex max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search clients..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <ClientsTable clients={filteredClients} isLoading={isLoading} />
    </div>
  );
};

export default AdminClientsPage;
