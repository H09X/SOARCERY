
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface RemediationBadgeProps {
  remediated: boolean;
  pending?: boolean;
  className?: string;
}

const RemediationBadge = ({ remediated, pending = false, className = '' }: RemediationBadgeProps) => {
  const baseClass = 'flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full';
  
  if (pending) {
    return (
      <span className={`${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 ${className}`}>
        <Clock className="h-3.5 w-3.5" />
        <span>Pending Approval</span>
      </span>
    );
  }
  
  if (remediated) {
    return (
      <span className={`${baseClass} remediated ${className}`}>
        <CheckCircle className="h-3.5 w-3.5" />
        <span>Remediated</span>
      </span>
    );
  }
  
  return (
    <span className={`${baseClass} not-remediated ${className}`}>
      <XCircle className="h-3.5 w-3.5" />
      <span>Not Remediated</span>
    </span>
  );
};

export default RemediationBadge;
