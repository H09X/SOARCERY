
import { SeverityLevel } from '@/types';
import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
}

const SeverityBadge = ({ severity, className = '' }: SeverityBadgeProps) => {
  const baseClass = 'flex items-center gap-1.5 severity-badge';
  const severityClass = `severity-${severity}`;
  
  const getIcon = () => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-3.5 w-3.5" />;
      case 'high':
        return <AlertTriangle className="h-3.5 w-3.5" />;
      case 'medium':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'low':
        return <Info className="h-3.5 w-3.5" />;
    }
  };
  
  return (
    <span className={`${baseClass} ${severityClass} ${className}`}>
      {getIcon()}
      <span className="capitalize">{severity}</span>
    </span>
  );
};

export default SeverityBadge;
