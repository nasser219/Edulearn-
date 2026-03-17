import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';

export const Reports = () => {
  const { profile, isTeacher, isAdmin } = useEducatorsAuth();
  const [timeRange, setTimeRange] = useState('MONTH');
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!profile?.uid) return;
      try {
        // 1. Fetch teacher's courses to get courseIds
        const coursesSnap = await getDocs(query(collection(db, 'courses'), where('teacherId', '==', profile.uid)));
        const courseIds = coursesSnap.docs.map(doc => doc.id);

        if (courseIds.length === 0) {
          setResults([]);
          setStudents([]);
          setActivity([]);
          setLoading(false);
          return;
        }

        // 2. Fetch results for this teacher's quizzes
        const resultsSnap = await getDocs(query(collection(db, 'quiz_results'), where('teacherId', '==', profile.uid)));
        
        // 3. Fetch enrollments to identify the teacher's students
        const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', courseIds), where('status', '==', 'APPROVED')));
        const studentIds = [...new Set(enrollSnap.docs.map(doc => doc.data().studentId))];

        // 4. Fetch activity filtered by teacher's courses
        const activitySnap = await getDocs(query(collection(db, 'student_activity'), where('courseId', 'in', courseIds)));

        // 5. Fetch student user details (chunked if needed, but keeping it simple for now)
        let studentsData: any[] = [];
        if (studentIds.length > 0) {
           // Handling Firestore 'in' limit of 30
           for (let i = 0; i < studentIds.length; i += 30) {
             const chunk = studentIds.slice(i, i + 30);
             const studentsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', chunk)));
             studentsData = [...studentsData, ...studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))];
           }
        }
        
        setResults(resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setStudents(studentsData);
        setActivity(activitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching isolated reports data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const analytics = React.useMemo(() => {
    if (loading) return null;
    
    const gradedResults = results.filter(r => r.status === 'GRADED');
    const avgScore = gradedResults.length > 0 
      ? Math.round(gradedResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / gradedResults.length)
      : 0;

    // Filter activity by timeRange
    const now = new Date();
    const rangeMs = timeRange === 'DAILY' ? 24 * 60 * 60 * 1000 :
                    timeRange === 'WEEK' ? 7 * 24 * 60 * 60 * 1000 : 
                    timeRange === 'MONTH' ? 30 * 24 * 60 * 60 * 1000 : 
                    365 * 24 * 60 * 60 * 1000; // YEAR
    
    const startTime = new Date(now.getTime() - rangeMs);
    const filteredActivity = activity.filter(a => new Date(a.timestamp) >= startTime);

    const activeInPeriod = new Set(filteredActivity.map(a => a.studentId)).size;
    const attendanceRate = students.length > 0
      ? Math.round((activeInPeriod / students.length) * 100)
      : 0;

    const topStudents = [...students]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5)
      .map((s, i) => ({
        rank: i + 1,
        name: s.fullName,
        points: s.points || 0,
        progress: Math.min(100, (s.points || 0) * 2),
        grade: s.points ? `${s.points} نقطه` : '0'
      }));

    return { avgScore, attendanceRate, topStudents };
  }, [results, students, activity, loading, timeRange]);

  const stats = [
    { label: 'متوسط الدرجات', value: `${analytics?.avgScore || 0}%`, trend: '+5%', up: true, icon: Target, color: 'brand-primary' },
    { label: 'نسبة الحضور', value: `${analytics?.attendanceRate || 0}%`, trend: '+12%', up: true, icon: UserCheck, color: 'emerald' },
    { label: 'إجمالي المهام', value: results.length.toString(), trend: '+8%', up: true, icon: BookOpen, color: 'blue' },
    { label: 'طلاب المنصة', value: students.length.toString(), trend: '+20%', up: true, icon: Users, color: 'amber' },
  ];

  const topStudents = analytics?.topStudents || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl shadow-slate-200">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">تقارير الأداء الذكية 📊</h1>
          <p className="text-slate-400 font-bold">تحليل دقيق لمستوى الطلاب ونمو المنصة التعليمية</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-2xl font-black">
             <Calendar className="h-5 w-5 ml-2" />
             تصدير PDF
           </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-premium bg-white group hover:scale-[1.02] transition-all duration-500">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12", `bg-${stat.color}/10 text-${stat.color}`)}>
                  <stat.icon className="h-7 w-7" />
                </div>
                <div className={cn("flex items-center gap-1 text-xs font-black", stat.up ? "text-emerald-500" : "text-red-500")}>
                  {stat.up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {stat.trend}
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Placeholder View */}
        <Card className="lg:col-span-2 border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-slate-50 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900">نمو التحصيل الدراسي</h2>
              <p className="text-sm text-slate-400 font-bold">مقارنة أداء الطلاب عبر الأشهر الأخيرة</p>
            </div>
            <select 
              className="h-10 px-4 bg-slate-50 border-none rounded-xl text-xs font-black outline-none"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="DAILY">يومياً</option>
              <option value="WEEK">أسبوعياً</option>
              <option value="MONTH">شهرياً</option>
              <option value="YEAR">سنوياً</option>
            </select>
          </CardHeader>
          <CardContent className="p-10 h-[400px] flex items-center justify-center relative">
            {/* Visual Placeholder for a Chart */}
            <div className="absolute inset-x-10 bottom-10 top-20 flex items-end justify-between gap-4">
               {[65, 45, 75, 55, 90, 70, 85, 60, 95, 80, 75, 88].map((h, i) => (
                 <div key={i} className="flex-1 group relative">
                    <div 
                      className="w-full bg-slate-100 group-hover:bg-brand-primary rounded-t-xl transition-all duration-500 relative cursor-pointer"
                      style={{ height: `${h}%` }}
                    >
                       <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                         {h}% تحسن
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            <div className="absolute inset-x-10 bottom-4 flex justify-between text-[10px] font-black text-slate-400 border-t border-slate-50 pt-4">
               <span>يناير</span>
               <span>مارس</span>
               <span>مايو</span>
               <span>يوليو</span>
               <span>سبتمبر</span>
               <span>نوفمبر</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-slate-50">
             <h2 className="text-2xl font-black text-slate-900">أوائل الطلبة 🏆</h2>
             <p className="text-sm text-slate-400 font-bold">لوحة الشرف لأعلى الطلاب تقييماً</p>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
             {topStudents.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                 <Users className="h-12 w-12 text-slate-100" />
                 <p className="text-slate-400 font-bold">سيتم إدراج الطلاب هنا بمجرد بدء تقييم أدائهم.</p>
               </div>
             ) : topStudents.map((student, i) => (
               <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-transparent hover:border-brand-primary/20 hover:bg-white transition-all group">
                 <div className={cn(
                   "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm",
                   i === 0 ? "bg-amber-100 text-amber-600" : i === 1 ? "bg-slate-200 text-slate-600" : "bg-orange-100 text-orange-600"
                 )}>
                   {student.rank}
                 </div>
                 <div className="flex-1 space-y-1">
                   <p className="font-black text-slate-900 group-hover:text-brand-primary transition-colors">{student.name}</p>
                   <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-primary transition-all duration-1000" style={{ width: `${student.progress}%` }}></div>
                   </div>
                 </div>
                 <div className="text-right">
                    <p className="text-lg font-black text-brand-primary">{student.grade}</p>
                 </div>
               </div>
             ))}
             <Button variant="ghost" className="w-full h-14 rounded-2xl font-black text-slate-500 hover:text-brand-primary hover:bg-brand-primary/5">
                عرض القائمة الكاملة
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
