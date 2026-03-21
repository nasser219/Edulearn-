import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  color?: string;
  onClick?: () => void;
}

export const StatCard = ({ label, value, icon: Icon, trend, className, color, onClick }: StatCardProps) => {
  return (
    <Card 
      className={cn(
        "rounded-[2rem] border-none shadow-premium hover:-translate-y-1 transition-transform bg-white overflow-hidden",
        onClick && "cursor-pointer hover:shadow-2xl hover:shadow-brand-primary/10",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-center">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn(
            "h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0",
            color || "bg-brand-primary/10 text-brand-primary"
          )}>
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 truncate sm:whitespace-normal">{label}</p>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight truncate">{value}</h3>
              {trend && (
                <div className={cn(
                  "text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-lg shrink-0",
                  trend.isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                )}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}%
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
