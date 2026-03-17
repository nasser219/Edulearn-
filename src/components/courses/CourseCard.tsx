import { Play, Clock, FileText, CheckCircle2, User } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export const CourseCard = ({ title, teacher, thumbnail, progress, lessonsCount, duration, price, onClick, children, className }: any) => {
  const displayThumbnail = thumbnail;

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "group rounded-[2.5rem] border-none shadow-premium hover:shadow-2xl hover:shadow-brand-primary/20 transition-all duration-500 overflow-hidden bg-white",
        onClick && "cursor-pointer"
      )}
    >
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={displayThumbnail} 
          alt={title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-brand-primary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            <Play className="h-8 w-8 text-brand-primary fill-current" />
          </div>
        </div>
        <div className="absolute top-4 right-4 bg-brand-secondary text-brand-primary px-4 py-1.5 rounded-xl text-[11px] font-black shadow-lg">
          دفعة 2024
        </div>
        {price !== undefined && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-slate-800 px-4 py-1.5 rounded-xl text-sm font-black shadow-lg">
            {price > 0 ? `${price} ج.م` : 'مجاني'}
          </div>
        )}
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
            <User className="h-4 w-4 text-slate-400" />
          </div>
          <span className="text-sm font-bold text-slate-500">{teacher}</span>
        </div>
        
        <h4 className="text-xl font-black text-slate-800 line-clamp-1 mb-4 leading-tight">{title}</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-400 tracking-wide">محتوى الدورة</span>
            <span className="text-brand-primary">{progress}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-brand-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,181,226,0.3)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
      
      <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-500">
            <FileText className="h-4 w-4" />
            <span className="text-[11px] font-bold">{lessonsCount} درس</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="h-4 w-4" />
            <span className="text-[11px] font-bold">{duration}</span>
          </div>
        </div>
        {progress === 100 && (
          <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-[10px] font-black italic">مكتمل</span>
          </div>
        )}
      </div>
      {children}
    </Card>
  );
};
