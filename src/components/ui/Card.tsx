import React from 'react';
import { cn } from '@/src/lib/utils';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn('px-6 py-4 border-bottom border-slate-100', className)}>{children}</div>
);

export const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn('px-6 py-4', className)}>{children}</div>
);

export const CardFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn('px-6 py-4 bg-slate-50 border-t border-slate-100', className)}>{children}</div>
);
