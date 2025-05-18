
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '@/types';
import { toast } from 'sonner';
import { authenticateUser } from '@/services/securityService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('soarUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('soarUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Call the authentication service
      const isAuthenticated = await authenticateUser(username, password , role);
      
      if (!isAuthenticated) {
        throw new Error('Invalid credentials');
      }
      
      // Create a user object based on the login info
      const newUser: User = {
        id: `user-${Date.now()}`,
        username,
        role,
        clientName: role === 'client' ? username : undefined
      };
      
      setUser(newUser);
      localStorage.setItem('soarUser', JSON.stringify(newUser));
      
      toast.success(`Welcome, ${username}!`);
      navigate(role === 'admin' ? '/admin' : '/client');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('soarUser');
    toast.info('You have been logged out.');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
