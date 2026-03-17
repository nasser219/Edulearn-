import { User, BookOpen, Star, ChevronLeft, Users } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface TeacherCardProps {
  id: string;
  name: string;
  subject: string;
  photoURL?: string;
  coursesCount?: number;
  rating?: number;
  onClick?: () => void;
  formattedStages?: string;
  key?: string | number;
}

export const TeacherCard = ({ 
  id,
  name, 
  subject, 
  photoURL, 
  coursesCount = 0, 
  rating = 5.0, 
  onClick,
  formattedStages
}: TeacherCardProps) => {
  const getFakeStudentCount = (teacherId: string) => {
    let hash = 0;
    for (let i = 0; i < teacherId.length; i++) {
      hash = teacherId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 524 + (Math.abs(hash) % 876); // Returns 524 to 1400
  };

  const studentsCount = getFakeStudentCount(id);
  return (
    <Card className="group rounded-[2.5rem] border-none shadow-premium hover:shadow-2xl hover:shadow-brand-primary/20 transition-all duration-500 overflow-hidden bg-white">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Teacher Avatar */}
          <div className="relative">
            <div className="h-32 w-32 rounded-[2.5rem] overflow-hidden bg-slate-50 border-4 border-white shadow-xl">
              {photoURL ? (
                <img src={photoURL} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-primary/5 text-brand-primary">
                  <User className="h-16 w-16" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-brand-secondary text-brand-primary px-3 py-1 rounded-xl text-[10px] font-black shadow-lg border-2 border-white">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                {rating.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">{name}</h4>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-brand-primary font-bold text-xs bg-brand-primary/5 px-3 py-1 rounded-full">
                معلم {subject}
              </span>
              {formattedStages && (
                <span className="text-slate-500 font-bold text-[10px] bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  {formattedStages}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 w-full pt-2">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الطلاب</span>
              <div className="flex items-center gap-1 mt-1 text-slate-700 font-black">
                <Users className="h-4 w-4 text-brand-primary" />
                <span>{studentsCount}</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الكورسات</span>
              <div className="flex items-center gap-1 mt-1 text-slate-700 font-black">
                <BookOpen className="h-4 w-4 text-brand-primary" />
                <span>{coursesCount}</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={onClick}
            variant="primary" 
            className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-brand-primary/20 group-hover:translate-x-[-4px] transition-all"
          >
            تصفح الكورسات
            <ChevronLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
