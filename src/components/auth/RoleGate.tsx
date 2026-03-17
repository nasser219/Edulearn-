import React from 'react';
import { useEducatorsAuth } from './AuthProvider';

interface RoleGateProps {
  children: React.ReactNode;
  roles: ('STUDENT' | 'TEACHER' | 'ADMIN')[];
  fallback?: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ children, roles, fallback = null }) => {
  const { hasRole, loading } = useEducatorsAuth();

  if (loading) return null;

  if (hasRole(roles)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
