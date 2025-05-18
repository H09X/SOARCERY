
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRole } from '@/types';

const LoginPage = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [role, setRole] = useState<UserRole>('client');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please fill in all fields.');
      return;
    }
    
    try {
      await login(username, password, role);
    } catch (error) {
      // Error is handled in AuthContext
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30">
      <div className="w-full max-w-md p-8 space-y-8 rounded-lg shadow-lg bg-card">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Shield className="h-12 w-12 text-soar-purple" />
          <h1 className="text-3xl font-bold">SOARCERY</h1>
          <p className="text-muted-foreground">
            Security Orchestration, Automation & Response
          </p>
        </div>
        
        <Tabs defaultValue="client" onValueChange={(v) => setRole(v as UserRole)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client">Client</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="client">
            <p className="text-sm text-center text-muted-foreground mb-4">
              Login as a client to view your security events
            </p>
          </TabsContent>
          <TabsContent value="admin">
            <p className="text-sm text-center text-muted-foreground mb-4">
              Login as an admin to manage all client events
            </p>
          </TabsContent>
        </Tabs>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder={role === 'client' ? "Enter client name" : "Enter admin username"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block animate-spin"></span>
                Logging in...
              </span>
            ) : (
              `Login as ${role === 'admin' ? 'Admin' : 'Client'}`
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
