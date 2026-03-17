import {
  BookOpen, Clock, GraduationCap, FileText, TrendingUp, AlertCircle, Play, FileCheck, CheckCircle2, Megaphone, Calendar, ChevronLeft, Bell, X, Video as VideoIcon
} from 'lucide-react';
import { StatCard } from './StatCard';
import { CourseCard } from '../courses/CourseCard';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

import { collection, query, getDocs, limit, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { useEffect, useState } from 'react';

type AnyData = { [key: string]: any };

export const StudentDashboard = ({ onSelectCourse, onNavigate }: { onSelectCourse?: (id: string) => void, onNavigate?: (view: any) => void }) => {
  const { profile } = useEducatorsAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    courses: 0,
    hours: 0,
    grade: 0,
    tasks: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.uid) return;
      try {
        // Fetch Approved Enrollments
        const enrollQ = query(
          collection(db, 'enrollments'),
          where('studentId', '==', profile.uid),
          where('status', '==', 'APPROVED')
        );
        const enrollSnap = await getDocs(enrollQ);
        const enrollments = enrollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnyData[];

        // Fetch Course Details for Enrolled Courses
        const courseIds = enrollments.map(e => e.courseId);
        let actualCourses: AnyData[] = [];
        if (courseIds.length > 0) {
          const coursesQ = query(
            collection(db, 'courses'),
            where('__name__', 'in', courseIds.slice(0, 10))
          );
          const coursesSnap = await getDocs(coursesQ);
          actualCourses = coursesSnap.docs.map(doc => {
            const data = doc.data();
            const enrollment = enrollments.find(e => e.courseId === doc.id);
            return { 
              id: doc.id, 
              ...data, 
              progress: enrollment?.progress || 0 
            };
          });
        }
        setEnrolledCourses(actualCourses);

        // Fetch Quiz Results for Grade Average
        const quizQ = query(
          collection(db, 'quiz_results'),
          where('studentId', '==', profile.uid),
          orderBy('submittedAt', 'desc')
        );
        const quizSnap = await getDocs(quizQ);
        const quizResults = quizSnap.docs.map(doc => doc.data());
        const avgScore = quizResults.length > 0 
          ? Math.round(quizResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / quizResults.length)
          : 0;

        // Fetch Recent Activity
        const activityQ = query(
          collection(db, 'student_activity'),
          where('studentId', '==', profile.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const activitySnap = await getDocs(activityQ);
        setRecentActivity(activitySnap.docs.map(doc => doc.data()));

        // Calculate Stats
        const totalCompletedTasks = enrollments.reduce((acc, curr) => acc + (curr.completedLessons?.length || 0), 0);
        // Estimate hours: 25 mins per lesson (more realistic)
        const estimatedHours = (totalCompletedTasks * 25) / 60;

        setStats({
          courses: enrollments.length,
          hours: Math.round(estimatedHours * 10) / 10,
          grade: avgScore,
          tasks: totalCompletedTasks
        });

        // Activity is already fetched from 'student_activity' collection
        setRecentActivity(activitySnap.docs.map(doc => doc.data()));

        // Fetch Targeted Announcements
        const teacherIds = Array.from(new Set(actualCourses.filter(c => c.teacherId).map(c => c.teacherId)));
        
        // 1. Fetch Teacher Announcements
        let teacherAnnouncements: any[] = [];
        if (teacherIds.length > 0) {
          const annQ = query(
            collection(db, 'announcements'), 
            where('teacherId', 'in', teacherIds.slice(0, 10)),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const annSnap = await getDocs(annQ);
          teacherAnnouncements = annSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // 2. Fetch Admin Announcements (Global or Student targeted)
        const adminAnnQ = query(
          collection(db, 'announcements'),
          where('isAdminAnn', '==', true),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const adminAnnSnap = await getDocs(adminAnnQ);
        const adminAnn = adminAnnSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(ann => {
            if (ann.targetRole === 'ALL') return true;
            if (ann.targetRole === 'STUDENT') {
              if (ann.stage && ann.grade) return ann.stage === profile.stage && ann.grade === profile.grade;
              if (ann.stage) return ann.stage === profile.stage;
              return true;
            }
            return false;
          });

        const combinedAnn = [...adminAnn, ...teacherAnnouncements].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAnnouncements(combinedAnn.slice(0, 5));

        // Fetch Upcoming Quizzes (Dynamic)
        const upcomingQ = query(
          collection(db, 'upcoming_quizzes'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const upcomingSnap = await getDocs(upcomingQ);
        setUpcomingQuizzes(upcomingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error fetching student dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  return (
    <div className="space-y-12 pb-12" dir="rtl">
      {/* Featured Hero Section */}
      <div className="relative overflow-hidden bg-brand-primary rounded-[3rem] p-8 md:p-12 text-white shadow-2xl shadow-brand-primary/30">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-right space-y-6">
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
              ذاكر في <span className="text-brand-secondary">أي وقت</span> <br />
              في <span className="text-brand-secondary underline decoration-wavy underline-offset-8">أي مكان</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-medium max-w-md leading-relaxed">
              يعني دلوقتي وفرنالك منصة تقدر تذاكر من خلالها كل المواد بضغطة واحدة وبأفضل جودة.
            </p>
            <div className="flex gap-4 pt-4">
              <Button 
                onClick={() => onNavigate?.('TEACHERS')}
                className="bg-brand-secondary text-brand-primary hover:bg-white hover:text-brand-primary px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-black/10"
              >
                تصفح الكورسات
              </Button>
              <Button variant="ghost" className="text-white border-2 border-white/30 hover:bg-white/10 px-8 py-4 rounded-2xl font-black text-lg" onClick={() => onNavigate?.('QUIZZES')}>
                جدول الامتحانات
              </Button>
              <Button 
                onClick={() => onNavigate?.('STUDENT_RESULTS')}
                className="bg-brand-mint text-white hover:bg-white hover:text-brand-mint px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-black/10 flex items-center gap-2"
              >
                <TrendingUp className="h-5 w-5" />
                تحليل أدائي
              </Button>
              <Button 
                onClick={() => onNavigate?.('HOMEWORK')}
                className="bg-white text-brand-primary hover:bg-brand-secondary hover:text-brand-primary px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-black/10"
              >
                المهام 📝
              </Button>
            </div>
          </div>
          <div className="relative w-full md:w-1/2 flex justify-center">
            <div className="absolute inset-0 bg-white/10 rounded-full blur-[100px]"></div>
            <img 
              src="/assets/hero_student.png" 
              alt="Heros Illustration" 
              className="relative z-10 w-full max-w-sm drop-shadow-2xl animate-float"
            />
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-brand-secondary/20 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "الدورات المسجلة", value: stats.courses, icon: BookOpen, color: "bg-blue-50 text-blue-600" },
          { label: "ساعات الدراسة", value: `${stats.hours}س`, icon: Clock, color: "bg-cyan-50 text-cyan-600" },
          { label: "معدل الدرجات", value: `${stats.grade}%`, icon: GraduationCap, color: "bg-brand-secondary/10 text-brand-primary" },
          { label: "المهام المكتملة", value: stats.tasks, icon: FileText, color: "bg-green-50 text-green-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-premium border border-slate-50 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", stat.color)}>
              <stat.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Content - Courses */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-8 bg-brand-secondary rounded-full"></span>
              واصل التعلم
            </h3>
            <Button 
              variant="ghost" 
              onClick={() => onNavigate?.('COURSES')}
              className="text-brand-primary font-bold hover:bg-brand-primary/5 rounded-xl"
            >
              عرض الكل
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {enrolledCourses.length > 0 ? enrolledCourses.map((course) => (
              <CourseCard 
                key={course.id}
                onClick={() => onSelectCourse?.(course.id)}
                title={course.title}
                teacher={course.teacherName || course.teacher}
                thumbnail={course.thumbnailUrl || course.thumbnail}
                price={course.price}
                progress={course.progress || 0}
                lessonsCount={course.sections?.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0) || 0}
                duration={course.duration || 'تحميل...'}
              />
            )) : (
              <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h4 className="text-xl font-black text-slate-800 mb-2">ابدأ رحلتك التعليمية الآن</h4>
                <p className="text-slate-500 font-medium mb-6">أنت لست مشتركاً في أي كورس حالياً. استكشف مكتبة الكورسات المميزة.</p>
                <Button onClick={() => onNavigate?.('COURSES')} className="bg-brand-primary text-white rounded-2xl px-10 py-6 font-black text-lg shadow-xl shadow-brand-primary/20">
                  تصفح الكورسات المتاحة
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-8 bg-brand-primary rounded-full"></span>
                الاختبارات القادمة
              </h3>
            </div>
            <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-premium">
              <CardContent className="p-0">
                {upcomingQuizzes.length > 0 ? upcomingQuizzes.map((quiz, i) => (
                  <div key={i} className="flex items-center justify-between p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm",
                        quiz.color || (i % 2 === 0 ? "bg-orange-50 text-orange-600" : "bg-purple-50 text-purple-600")
                      )}>
                        <GraduationCap className="h-7 w-7" />
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-800 leading-tight">{quiz.title}</p>
                        <p className="text-sm text-slate-500 mt-1 font-medium">{quiz.subtext}</p>
                      </div>
                    </div>
                    <Button 
                      variant="primary" 
                      className="rounded-xl px-6 font-bold shadow-md shadow-brand-primary/20"
                      onClick={() => onNavigate?.('QUIZZES')}
                    >
                      استعد الآن
                    </Button>
                  </div>
                )) : (
                  <div className="p-12 text-center text-slate-400 font-bold">
                    لا توجد اختبارات مجدولة قريباً.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-6 flex flex-row items-center justify-between">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                إشعارات و تنبيهات <Bell className="h-5 w-5 text-brand-primary" />
              </h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {announcements.length > 0 ? announcements.map((ann, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedAnnouncement(ann)}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-brand-primary/5 hover:border-brand-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {ann.mediaType === 'VIDEO' ? (
                      <VideoIcon className="h-4 w-4 text-brand-primary" />
                    ) : (
                      <Megaphone className="h-4 w-4 text-brand-primary" />
                    )}
                    <span className="text-[10px] font-black text-slate-400">
                      {ann.isAdminAnn ? 'إدارة المنصة' : 'المعلم'} • {new Date(ann.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 group-hover:text-brand-primary transition-colors line-clamp-1">{ann.title}</h4>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 font-bold">لا توجد إشعارات جديدة حالياً.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-6 flex flex-row items-center justify-between">
              <h3 className="font-black text-lg text-slate-800">النشاط الأخير</h3>
              <TrendingUp className="h-5 w-5 text-brand-primary" />
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {recentActivity.length > 0 ? recentActivity.map((item, i) => {
                const getActionText = (action: string, metadata: any) => {
                  switch (action) {
                    case 'COMPLETED_LESSON': return `أتممت درس: ${metadata.lessonTitle || 'مجهول'}`;
                    case 'VIEWED_LESSON': return `شاهدت درس: ${metadata.lessonTitle || 'مجهول'}`;
                    case 'QUIZ_SUBMITTED': return `أديت اختبار: ${metadata.quizTitle || 'مجهول'} (النتيجة: ${metadata.score}%)`;
                    default: return action;
                  }
                };
                const getColor = (action: string) => {
                  switch (action) {
                    case 'COMPLETED_LESSON': return 'bg-green-500';
                    case 'QUIZ_SUBMITTED': return 'bg-indigo-500';
                    default: return 'bg-blue-500';
                  }
                };
                return (
                  <div key={i} className="flex gap-4 group">
                    <div className="relative flex flex-col items-center">
                      <div className={cn("w-3 h-3 rounded-full mt-1.5 shrink-0 shadow-sm", getColor(item.action))}></div>
                      {i !== recentActivity.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>}
                    </div>
                    <div className="pb-1 transition-transform group-hover:translate-x-1">
                      <p className="text-sm text-slate-700 font-bold">{getActionText(item.action, item.metadata)}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{new Date(item.timestamp).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 font-bold">لا يوجد نشاط مؤخراً. أبدأ بالتعلم الآن! 🚀</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-brand-secondary rounded-[2.5rem] p-8 text-brand-primary relative overflow-hidden shadow-xl shadow-brand-secondary/20 group cursor-pointer transition-all hover:scale-[1.02]">
            <div className="relative z-10">
              <h4 className="font-black text-2xl mb-2 tracking-tight">اشترك في باقة برو</h4>
              <p className="text-brand-primary/80 font-bold text-sm mb-6 leading-relaxed">احصل على وصول غير محدود وتمتع بمميزات حصرية لدعم تفوقك.</p>
              <Button className="bg-brand-primary text-white hover:bg-slate-900 w-full py-6 rounded-2xl font-black text-lg shadow-lg">التفاصيل والاشتراك</Button>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          </div>
        </div>
      </div>

      {/* Announcement Details Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                    <Megaphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedAnnouncement.title}</h3>
                    <p className="text-slate-500 font-bold mt-1 max-w-sm">
                      {selectedAnnouncement.teacherName ? `أ. ${selectedAnnouncement.teacherName} • ` : ''}
                      {new Date(selectedAnnouncement.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                >
                  <X className="h-6 w-6 text-slate-400" />
                </button>
              </div>

              {selectedAnnouncement.mediaType === 'VIDEO' || selectedAnnouncement.videoUrl ? (
                <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
                  <video 
                    src={selectedAnnouncement.mediaUrl || selectedAnnouncement.videoUrl} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (selectedAnnouncement.imageUrl || (selectedAnnouncement.mediaType === 'IMAGE' && selectedAnnouncement.mediaUrl)) && (
                <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-video relative">
                  <img 
                    src={selectedAnnouncement.mediaUrl || selectedAnnouncement.imageUrl} 
                    alt="Announcement" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-8 rounded-full font-black"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
