import { 
  Users, 
  BookOpen, 
  Plus, 
  FileCheck, 
  BarChart3,
  Search,
  Pencil,
  Megaphone,
  X,
  Video as VideoIcon,
  Sparkles,
  BrainCircuit
} from 'lucide-react';
import { StatCard } from './StatCard';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';

import { collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { useEffect, useState } from 'react';

export const TeacherDashboard = ({ onNavigate, onEditCourse }: { onNavigate?: (view: any) => void, onEditCourse?: (id: string) => void }) => {
  const { profile } = useEducatorsAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    activeCourses: 0,
    pendingEvaluations: 0,
    totalRevenue: 0
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    
    // 1. Snapshot for Teacher's Courses
    const coursesQuery = query(collection(db, 'courses'), where('teacherId', '==', profile.uid));
    const unsubscribeCourses = onSnapshot(coursesQuery, (snap) => {
      const courseDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(courseDocs);
      
      // 2. Extract course IDs to fetch student counts
      const courseIds = courseDocs.map(c => c.id);
      
      if (courseIds.length > 0) {
        // Fetch enrollments for these courses (for student count)
        const enrollmentsQuery = query(collection(db, 'enrollments'), where('courseId', 'in', courseIds));
        const unsubscribeEnrollments = onSnapshot(enrollmentsQuery, (enrollSnap) => {
          const studentIds = new Set(enrollSnap.docs.map(doc => doc.data().studentId));
          setMetrics(prev => ({
            ...prev,
            totalStudents: studentIds.size,
            activeCourses: courseDocs.length
          }));
        });

        // 3. Fetch Payments for total revenue
        const paymentsQuery = query(
          collection(db, 'payments'), 
          where('teacherId', '==', profile.uid),
          where('status', '==', 'COMPLETED')
        );
        const unsubscribePayments = onSnapshot(paymentsQuery, (paySnap) => {
          const payments = paySnap.docs.map(doc => doc.data());
          const totalEarned = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          
          const courseRevenueMap: Record<string, number> = {};
          payments.forEach(p => {
            if (p.courseId) {
              courseRevenueMap[p.courseId] = (courseRevenueMap[p.courseId] || 0) + (Number(p.amount) || 0);
            }
          });

          setMetrics(prev => ({
            ...prev,
            totalRevenue: totalEarned
          }));

          setCourses(prevCourses => prevCourses.map(c => ({
            ...c,
            revenue: courseRevenueMap[c.id] || 0
          })));
        });

        return () => {
          unsubscribeCourses();
          unsubscribeEnrollments();
          unsubscribePayments();
        };
      } else {
        setMetrics(prev => ({ ...prev, activeCourses: 0, totalStudents: 0, totalRevenue: 0 }));
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching teacher dashboard data:", error);
      setLoading(false);
    });

    // 4. Fetch Admin Announcements for Teachers (Receiving part)
    const fetchAdminAnnouncements = async () => {
      try {
        const q = query(
          collection(db, 'announcements'),
          where('isAdminAnn', '==', true),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        const adminAnn = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(ann => {
            if (ann.expiresAt && new Date(ann.expiresAt) < new Date()) return false;
            return ann.targetRole === 'ALL' || ann.targetRole === 'TEACHER';
          });
        setAnnouncements(adminAnn);
      } catch (error) {
        console.error("Error fetching admin announcements:", error);
      }
    };
    fetchAdminAnnouncements();

    return () => unsubscribeCourses();
  }, [profile]);

  return (
    <div className="space-y-12 pb-12">
      <div className="flex items-center justify-between px-2">
        <div className="text-right space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">لوحة تحكم المعلم</h2>
          <p className="text-slate-500 font-bold italic">أهلاً بك يا أستاذ {profile?.fullName.split(' ')[0]}، إليك متابعة سريعة لطلابك.</p>
        </div>
        <Button 
          variant="primary" 
          className="rounded-2xl px-8 py-4 h-auto font-black shadow-lg shadow-brand-primary/30 flex items-center gap-2 group"
          onClick={() => onNavigate?.('MANAGE_COURSES')}
        >
          <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform">
            <Plus className="h-5 w-5" />
          </div>
          إنشاء دورة جديدة
        </Button>
        <Button 
          variant="outline" 
          className="rounded-2xl px-8 py-4 h-auto font-black border-2 border-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-lg flex items-center gap-2 group"
          onClick={() => onNavigate?.('PERFORMANCE_AI')}
        >
          <div className="bg-brand-primary/10 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          تحليل الأداء الذكي
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="إجمالي الطلاب" 
          value={metrics.totalStudents.toLocaleString('en-US')} 
          icon={Users} 
          color="bg-blue-50 text-blue-600" 
          onClick={() => onNavigate?.('STUDENTS')}
        />
        <StatCard 
          label="إجمالي الإيرادات" 
          value={`${metrics.totalRevenue.toLocaleString('en-US')} EGP`} 
          icon={BarChart3} 
          color="bg-green-50 text-green-600" 
          onClick={() => onNavigate?.('PAYMENTS')} 
        />
        <StatCard label="الدورات النشطة" value={metrics.activeCourses} icon={BookOpen} color="bg-cyan-50 text-cyan-600" onClick={() => onNavigate?.('MANAGE_COURSES')} />
        <StatCard label="التقييمات والواجبات" value={metrics.pendingEvaluations} icon={FileCheck} color="bg-orange-50 text-orange-600" onClick={() => onNavigate?.('HOMEWORK')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-8 flex flex-row items-center justify-between border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-800">دوراتي التعليمية</h3>
              <div className="relative group w-72">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <Input className="pr-12 h-11 bg-white border-slate-200 rounded-2xl text-sm focus:ring-brand-primary/10" placeholder="بحث عن الدورات..." />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-right" dir="rtl">
                <thead className="bg-[#fbfcff] text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <tr>
                    <th className="px-8 py-4 font-black">اسم الدورة</th>
                    <th className="px-8 py-4 font-black">الطلاب</th>
                    <th className="px-8 py-4 font-black">الإيرادات</th>
                    <th className="px-8 py-4 font-black">التقييم</th>
                    <th className="px-8 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                           <BookOpen className="h-10 w-10 text-slate-200" />
                           <p className="text-slate-400 font-bold">لم تقم بإضافة أي دورات بعد.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    courses.map((course, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-6">
                          <p className="text-base font-black text-slate-800 group-hover:text-brand-primary transition-colors">{course.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">المادة التعليمية</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">{course.students || 0}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-base font-black text-slate-900">{course.revenue?.toLocaleString('en-US') || 0} EGP</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-black text-orange-500">{course.rating || '0.0'}</span>
                            <span className="text-orange-400 text-sm">★</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-left">
                          <div className="flex items-center gap-2 justify-end">
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="px-4 py-2 rounded-xl text-[10px] font-black italic shadow-md shadow-brand-primary/20"
                              onClick={() => onNavigate?.({ type: 'STUDENTS', courseId: course.id })}
                            >
                              عرض الطلاب 👥
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-brand-primary"
                              onClick={() => onEditCourse?.(course.id)}
                            >
                              <Pencil className="h-5 w-5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-row items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                إشعارات الإدارة <Megaphone className="h-5 w-5 text-brand-primary" />
              </h3>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
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
                      {new Date(ann.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 group-hover:text-brand-primary transition-colors line-clamp-1">{ann.title}</h4>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 font-bold">لا توجد إشعارات جديدة من الإدارة.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800">تسليمات الواجبات</h3>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                  <FileCheck className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold">لا يوجد تسليمات حالياً.</p>
                  <p className="text-[10px] text-slate-300 font-bold">سيظهر هنا الطلاب الذين قاموا بتسليم الواجبات.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-brand-primary rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-brand-primary/30 group">
             <div className="relative z-10">
                <h4 className="text-2xl font-black mb-2 tracking-tight">تحليل أداء الطلاب</h4>
                <p className="text-white/70 text-sm font-bold leading-relaxed mb-6">استخدم الذكاء الاصطناعي لتحليل نقاط الضعف والقوة لطلابك.</p>
                <Button 
                  className="bg-brand-secondary text-brand-primary w-full py-6 rounded-2xl font-black text-lg hover:bg-white transition-colors shadow-xl"
                  onClick={() => onNavigate?.('PERFORMANCE_AI')}
                >
                  ابدأ التحليل الآن
                </Button>
             </div>
             <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
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
                      إدارة المنصة • {new Date(selectedAnnouncement.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

              {selectedAnnouncement.mediaUrl && (
                <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
                  {selectedAnnouncement.mediaType === 'VIDEO' ? (
                    <video 
                      src={selectedAnnouncement.mediaUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img 
                      src={selectedAnnouncement.mediaUrl} 
                      alt="Announcement" 
                      className="w-full h-full object-cover"
                    />
                  )}
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
