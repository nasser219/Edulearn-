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
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm",
            color || "bg-brand-primary/10 text-brand-primary"
          )}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
              {trend && (
                <div className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-lg mr-2",
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
