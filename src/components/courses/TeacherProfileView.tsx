import React, { useState, useEffect } from 'react';
import { User, BookOpen, Star, Mail, GraduationCap, ChevronRight, ArrowRight, Video, FileText, Users } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { CourseCard } from './CourseCard';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';

interface TeacherProfile {
  id: string;
  fullName: string;
  subject: string;
  email: string;
  photoURL?: string;
  bio?: string;
  experience?: string;
  education?: string;
  rating?: number;
  studentsCount?: number;
  coursesCount?: number;
}

export const TeacherProfileView = ({ 
  teacherId, 
  onBack, 
  onSelectCourse,
  onMessageTeacher
}: { 
  teacherId: string; 
  onBack: () => void; 
  onSelectCourse: (id: string) => void;
  onMessageTeacher?: (teacherId: string) => void;
}) => {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useEducatorsAuth();

  const getFakeStudentCount = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 524 + (Math.abs(hash) % 876);
  };

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Teacher Info
        const teacherDoc = await getDoc(doc(db, 'users', teacherId));
        if (teacherDoc.exists()) {
          setTeacher({ id: teacherDoc.id, ...teacherDoc.data() } as TeacherProfile);
        }

        // 2. Fetch Teacher's Courses
        const coursesQ = query(collection(db, 'courses'), where('teacherId', '==', teacherId));
        const coursesSnap = await getDocs(coursesQ);
        setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching teacher profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [teacherId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black text-slate-800">المعلم غير موجود</h2>
        <Button onClick={onBack} className="mt-4">العودة للقائمة</Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700" dir="rtl">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="flex items-center gap-2 font-bold text-slate-500 hover:text-brand-primary group"
        >
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          العودة لقائمة المعلمين
        </Button>
        {onMessageTeacher && (
           <Button 
            variant="primary" 
            onClick={() => onMessageTeacher(teacherId)}
            className="rounded-2xl px-8 h-12 font-black shadow-lg shadow-brand-primary/20 flex items-center gap-2"
          >
            تواصل مع المعلم
            <Mail className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Profile Hero Card */}
      <div className="relative">
        <div className="absolute inset-x-0 -top-20 -bottom-10 bg-gradient-to-b from-brand-primary/5 to-transparent rounded-[4rem] -z-10"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Left Column: Stats & Actions (Mobile First) */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="rounded-[3rem] border-none shadow-premium overflow-hidden bg-white">
              <CardContent className="p-8 text-center space-y-6">
                <div className="relative mx-auto w-48 h-48">
                  <div className="w-full h-full rounded-[3rem] overflow-hidden bg-slate-50 border-8 border-white shadow-2xl">
                    {teacher.photoURL ? (
                      <img src={teacher.photoURL} alt={teacher.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-primary/5 text-brand-primary">
                        <User className="h-24 w-24" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-brand-secondary text-brand-primary px-4 py-2 rounded-2xl text-xs font-black shadow-xl border-4 border-white flex items-center gap-1">
                    <Star className="h-4 w-4 fill-current" />
                    {teacher.rating?.toFixed(1) || '5.0'}
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{teacher.fullName}</h2>
                  <p className="text-brand-primary font-bold text-lg">معلم {teacher.subject}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">الطلاب</p>
                    <div className="flex items-center justify-center gap-2 text-slate-800 font-black">
                      <Users className="h-5 w-5 text-brand-primary" />
                      <span className="text-xl tracking-tight">{getFakeStudentCount(teacherId)}</span>
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">الكورسات</p>
                    <div className="flex items-center justify-center gap-2 text-slate-800 font-black">
                      <BookOpen className="h-5 w-5 text-brand-primary" />
                      <span className="text-xl tracking-tight">{courses.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card className="rounded-[2.5rem] border-none shadow-premium bg-white p-6">
              <CardContent className="p-0 space-y-6">
                <h4 className="font-black text-slate-800 text-lg border-b border-slate-50 pb-4">معلومات تواصل</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-slate-600">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">البريد الإلكتروني</p>
                      <p className="text-sm font-bold">{teacher.email}</p>
                    </div>
                  </div>
                  {teacher.experience && (
                    <div className="flex items-center gap-4 text-slate-600">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-5 w-5 text-brand-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">الخبرة</p>
                        <p className="text-sm font-bold">{teacher.experience}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Bio & Courses */}
          <div className="lg:col-span-2 space-y-10 text-right">
            <div className="space-y-6">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <span className="w-2 h-10 bg-brand-secondary rounded-full"></span>
                عن المعلم
              </h3>
              <div className="bg-white rounded-[3rem] p-10 shadow-premium border border-slate-50 leading-relaxed text-lg font-medium text-slate-600">
                {teacher.bio || `أهلاً بكم! أنا أ. ${teacher.fullName}، متخصص في تدريس ${teacher.subject}. أطمح دائماً لتقديم المعلومة بأحدث الطرق وأكثرها سهولة لتصل لكل طالب بشكل مبتكر يضمن التفوق والتميز.`}
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <span className="w-2 h-10 bg-brand-primary rounded-full"></span>
                  الكورسات المتاحة
                </h3>
                <span className="bg-brand-primary/5 text-brand-primary px-4 py-2 rounded-2xl font-black text-sm">
                  {courses.length} كورس
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {courses.length > 0 ? courses.map((course) => (
                  <CourseCard 
                    key={course.id}
                    onClick={() => onSelectCourse(course.id)}
                    title={course.title}
                    teacher={teacher.fullName}
                    thumbnail={course.thumbnailUrl || course.thumbnail}
                    price={course.price}
                    lessonsCount={course.sections?.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0) || 0}
                    duration={course.duration || 'تحميل...'}
                  />
                )) : (
                  <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <BookOpen className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-xl">لا توجد كورسات متاحة حالياً لهدا المعلم.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
