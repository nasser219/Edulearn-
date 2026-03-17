import { useState, useEffect } from 'react';
import { Search, Filter, Plus, BookOpen, Clock, Users, Star } from 'lucide-react';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { CourseCard } from './CourseCard';

import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowRight } from 'lucide-react';

interface CoursesListProps {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  onSelectCourse: (courseId: string) => void;
  teacherId?: string | null;
  onBack?: () => void;
}

export const CoursesList = ({ role, onSelectCourse, teacherId, onBack }: CoursesListProps) => {
  const { profile, isAdmin, isTeacher, isStudent } = useEducatorsAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState<string>('');

  useEffect(() => {
    if (teacherId) {
      getDoc(doc(db, 'users', teacherId)).then(docSnap => {
        if (docSnap.exists()) {
          setTeacherName(docSnap.data().fullName);
        }
      });
    } else {
      setTeacherName('');
    }
  }, [teacherId]);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching courses:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCourses = courses.filter(course => {
    // 1. Search filter
    const matchesSearch = 
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Role-based Visibility
    if (isAdmin()) return true;

    if (isTeacher()) {
      // Teachers only see their own courses in the main list
      return course.teacherId === profile?.uid;
    }

    if (isStudent()) {
      // Students only see courses that match their stage AND grade
      const matchesBasics = course.stage === profile?.stage && course.grade === profile?.grade;
      if (!matchesBasics) return false;

      // Also filter by teacher if selected
      if (teacherId && course.teacherId !== teacherId) return false;

      return true;
    }

    return false;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          {teacherId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm"
            >
              <ArrowRight className="h-7 w-7" />
            </Button>
          )}
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {teacherName ? `دورات المعلم: ${teacherName} 📚` : 'نظام الكورسات 📚'}
            </h2>
            <p className="text-slate-500 font-bold">تصفح وإدارة المحتوى التعليمي للمنصة</p>
          </div>
        </div>
        
        {(role === 'TEACHER' || role === 'ADMIN') && !teacherId && (
          <Button variant="primary" className="rounded-2xl px-8 py-4 h-auto font-black shadow-lg shadow-brand-primary/30 flex items-center gap-2 group">
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
            إنشاء كورس جديد
          </Button>
        )}
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-premium bg-white p-2">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن كورس أو معلم..." 
              className="pr-12 h-14 bg-slate-50 border-transparent rounded-2xl text-base focus:bg-white focus:ring-brand-primary/10 transition-all font-bold" 
            />
          </div>
          <Button variant="outline" className="h-14 px-6 rounded-2xl border-slate-100 font-black flex items-center gap-2 hover:bg-slate-50">
            <Filter className="h-5 w-5" />
            تصفية النتائج
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCourses.map((course) => (
          <CourseCard 
            key={course.id}
            onClick={() => onSelectCourse(course.id)}
            title={course.title}
            teacher={course.teacherName || course.teacher}
            thumbnail={course.thumbnailUrl || course.thumbnail}
            price={course.price}
            progress={role === 'STUDENT' ? course.progress : undefined}
            lessonsCount={course.sections?.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0) || 0}
            duration={course.duration || 'غير محدد'}
            className="cursor-pointer transition-transform hover:-translate-y-2"
          >
            {(role === 'TEACHER' || role === 'ADMIN') && (
               <div className="mt-4 px-4 flex items-center justify-between text-xs font-bold text-slate-400">
                  <div className="flex items-center gap-1">
                     <Users className="h-3.5 w-3.5" />
                     {course.studentsCount} طالب
                  </div>
                  <div className="flex items-center gap-1 text-orange-400">
                     <Star className="h-3.5 w-3.5 fill-current" />
                     {course.rating}
                  </div>
               </div>
            )}
          </CourseCard>
        ))}
      </div>
      
      {filteredCourses.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Search className="h-10 w-10" />
          </div>
          <p className="text-slate-500 font-black">لم يتم العثور على أي كورسات تطابق بحثك.</p>
        </div>
      )}
    </div>
  );
};
