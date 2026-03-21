import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Users, TrendingUp, TrendingDown, Award, Search,
  ChevronRight, Filter, Download, Eye, BookOpen, Target, ArrowLeft
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#ec4899'];

interface StudentResult {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  quizTitle: string;
  courseTitle: string;
  courseId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  submittedAt: string;
  passed: boolean;
}

export const TeacherAnalytics = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useEducatorsAuth();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentResult[] | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchData = async () => {
      try {
        // 1. Get teacher's courses
        const coursesSnap = await getDocs(
          query(collection(db, 'courses'), where('teacherId', '==', profile.uid))
        );
        const coursesList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        setCourses(coursesList);
        const courseIds = coursesList.map(c => c.id);

        if (courseIds.length === 0) { setLoading(false); return; }

        // 2. Get quiz results for these courses
        // Firestore 'in' supports max 30 items, chunk if needed
        const chunks = [];
        for (let i = 0; i < courseIds.length; i += 10) {
          chunks.push(courseIds.slice(i, i + 10));
        }

        const allResults: StudentResult[] = [];
        for (const chunk of chunks) {
          const resultsSnap = await getDocs(
            query(collection(db, 'quiz_results'), where('courseId', 'in', chunk))
          );
          resultsSnap.docs.forEach(d => {
            const data = d.data() as any;
            allResults.push({
              id: d.id,
              studentId: data.studentId,
              studentName: data.studentName || 'طالب',
              studentPhone: data.studentPhone,
              quizTitle: data.quizTitle || 'اختبار',
              courseTitle: data.courseTitle || coursesList.find(c => c.id === data.courseId)?.title || '',
              courseId: data.courseId,
              score: data.score || 0,
              totalQuestions: data.totalQuestions || 0,
              percentage: data.percentage ?? Math.round((data.score / (data.totalQuestions || 1)) * 100),
              submittedAt: data.submittedAt || data.createdAt || '',
              passed: (data.percentage ?? Math.round((data.score / (data.totalQuestions || 1)) * 100)) >= 50,
              allowRetake: data.allowRetake || false,
            } as any);
          });
        }
        setResults(allResults);

        // 3. Get enrollments 
        const allEnrollments: any[] = [];
        for (const chunk of chunks) {
          const enrollSnap = await getDocs(
            query(collection(db, 'enrollments'), where('courseId', 'in', chunk))
          );
          enrollSnap.docs.forEach(d => allEnrollments.push({ id: d.id, ...d.data() }));
        }
        setEnrollments(allEnrollments);
      } catch (e) {
        console.error('Error fetching analytics:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.uid]);

  // ── Computed metrics ──
  const filteredResults = useMemo(() => {
    let data = results;
    if (selectedCourse !== 'ALL') data = data.filter(r => r.courseId === selectedCourse);
    if (searchTerm) data = data.filter(r => r.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    return data;
  }, [results, selectedCourse, searchTerm]);

  const stats = useMemo(() => {
    if (filteredResults.length === 0) return { avg: 0, passRate: 0, highest: 0, lowest: 0, total: 0 };
    const scores = filteredResults.map(r => r.percentage);
    return {
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      passRate: Math.round((filteredResults.filter(r => r.passed).length / filteredResults.length) * 100),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      total: filteredResults.length,
    };
  }, [filteredResults]);

  // Grade distribution for bar chart
  const gradeDistribution = useMemo(() => {
    const buckets = [
      { range: '90-100', label: 'ممتاز', count: 0 },
      { range: '80-89', label: 'جيد جداً', count: 0 },
      { range: '70-79', label: 'جيد', count: 0 },
      { range: '60-69', label: 'مقبول', count: 0 },
      { range: '50-59', label: 'ضعيف', count: 0 },
      { range: '0-49', label: 'راسب', count: 0 },
    ];
    filteredResults.forEach(r => {
      if (r.percentage >= 90) buckets[0].count++;
      else if (r.percentage >= 80) buckets[1].count++;
      else if (r.percentage >= 70) buckets[2].count++;
      else if (r.percentage >= 60) buckets[3].count++;
      else if (r.percentage >= 50) buckets[4].count++;
      else buckets[5].count++;
    });
    return buckets;
  }, [filteredResults]);

  // Pass/Fail data for pie chart
  const passFailData = useMemo(() => [
    { name: 'ناجح', value: filteredResults.filter(r => r.passed).length },
    { name: 'راسب', value: filteredResults.filter(r => !r.passed).length },
  ], [filteredResults]);

  // Per-course averages for line chart
  const perCourseAvg = useMemo(() => {
    return courses.map(c => {
      const courseResults = results.filter(r => r.courseId === c.id);
      const avg = courseResults.length > 0
        ? Math.round(courseResults.reduce((a, r) => a + r.percentage, 0) / courseResults.length)
        : 0;
      return { name: c.title?.substring(0, 20) || 'كورس', avg, students: courseResults.length };
    });
  }, [courses, results]);

  // Unique students aggregated
  const studentsSummary = useMemo(() => {
    const map = new Map<string, { name: string; scores: number[]; quizCount: number; courseIds: Set<string> }>();
    filteredResults.forEach(r => {
      const existing = map.get(r.studentId) || { name: r.studentName, scores: [], quizCount: 0, courseIds: new Set() };
      existing.scores.push(r.percentage);
      existing.quizCount++;
      existing.courseIds.add(r.courseId);
      map.set(r.studentId, existing);
    });
    return Array.from(map.entries()).map(([id, data]) => ({
      studentId: id,
      name: data.name,
      avg: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      quizCount: data.quizCount,
      courseCount: data.courseIds.size,
      highest: Math.max(...data.scores),
      lowest: Math.min(...data.scores),
    })).sort((a, b) => b.avg - a.avg);
  }, [filteredResults]);

  if (loading) return (
    <div className="p-20 text-center">
      <div className="h-16 w-16 animate-spin rounded-2xl border-4 border-brand-primary border-t-transparent mx-auto mb-4" />
      <p className="text-slate-400 font-black">جاري تحميل الإحصائيات... 📊</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500 font-bold hover:bg-slate-100 rounded-xl">
            <ChevronRight className="h-4 w-4 ml-1" /> العودة
          </Button>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              إحصائيات أداء الطلاب
              <BarChart3 className="h-7 w-7 text-brand-primary" />
            </h2>
            <p className="text-slate-500 font-bold">تحليل شامل لأداء طلابك عبر جميع الاختبارات والدورات</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative group flex-1 max-w-sm">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
          <input
            type="text"
            placeholder="ابحث عن طالب..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-12 pr-12 pl-6 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="h-12 pr-12 pl-8 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black outline-none appearance-none cursor-pointer hover:border-brand-primary/30 transition-colors"
          >
            <option value="ALL">جميع الدورات</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'متوسط الدرجات', value: `${stats.avg}%`, icon: Target, color: 'brand-primary', bgColor: 'bg-brand-primary/10' },
          { label: 'نسبة النجاح', value: `${stats.passRate}%`, icon: TrendingUp, color: 'green-600', bgColor: 'bg-green-50' },
          { label: 'أعلى درجة', value: `${stats.highest}%`, icon: Award, color: 'amber-600', bgColor: 'bg-amber-50' },
          { label: 'أقل درجة', value: `${stats.lowest}%`, icon: TrendingDown, color: 'red-500', bgColor: 'bg-red-50' },
          { label: 'إجمالي النتائج', value: stats.total, icon: BookOpen, color: 'cyan-600', bgColor: 'bg-cyan-50' },
        ].map((stat, i) => (
          <Card key={i} className="bg-white border-none shadow-premium rounded-[2rem] group hover:shadow-2xl transition-all">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", stat.bgColor)}>
                <stat.icon className={cn("h-6 w-6", `text-${stat.color}`)} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grade Distribution Bar Chart */}
        <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-50">
            <h3 className="text-lg font-black text-slate-800">توزيع الدرجات 📊</h3>
          </CardHeader>
          <CardContent className="p-6">
            {gradeDistribution.some(g => g.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={gradeDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={75} tick={{ fontSize: 12, fontWeight: 800 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontFamily: 'inherit' }}
                    formatter={(value: number) => [`${value} طالب`, 'العدد']}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400 font-bold">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

        {/* Pass Rate Pie Chart */}
        <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-50">
            <h3 className="text-lg font-black text-slate-800">نسبة النجاح والرسوب 🎯</h3>
          </CardHeader>
          <CardContent className="p-6">
            {passFailData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={passFailData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400 font-bold">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

        {/* Per-Course Average */}
        <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white lg:col-span-2">
          <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-50">
            <h3 className="text-lg font-black text-slate-800">متوسط الدرجات لكل دورة 📈</h3>
          </CardHeader>
          <CardContent className="p-6">
            {perCourseAvg.some(c => c.avg > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perCourseAvg}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    formatter={(value: number, name: string) => name === 'avg' ? [`${value}%`, 'المتوسط'] : [value, 'عدد الطلاب']}
                  />
                  <Bar dataKey="avg" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="avg" />
                  <Bar dataKey="students" fill="#06b6d4" radius={[8, 8, 0, 0]} name="students" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 font-bold">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Student Table */}
      <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-50 flex flex-row items-center justify-between">
          <h3 className="text-lg font-black text-slate-800">تقارير الطلاب التفصيلية 👥</h3>
          <span className="text-xs font-black text-slate-400 bg-slate-100 px-4 py-2 rounded-full">{studentsSummary.length} طالب</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[800px]">
              <thead className="bg-[#fbfcff] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <tr>
                  <th className="px-6 py-4 font-black">#</th>
                  <th className="px-6 py-4 font-black">اسم الطالب</th>
                  <th className="px-6 py-4 font-black text-center">المتوسط</th>
                  <th className="px-6 py-4 font-black text-center">عدد الاختبارات</th>
                  <th className="px-6 py-4 font-black text-center">أعلى درجة</th>
                  <th className="px-6 py-4 font-black text-center">أقل درجة</th>
                  <th className="px-6 py-4 font-black text-center">التقدير</th>
                  <th className="px-6 py-4 font-black"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {studentsSummary.length === 0 ? (
                  <tr><td colSpan={8} className="p-16 text-center font-bold text-slate-400">لا يوجد نتائج اختبارات بعد.</td></tr>
                ) : (
                  studentsSummary.map((s, i) => (
                    <tr key={s.studentId} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5 text-sm font-black text-slate-300">{i + 1}</td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-slate-800 group-hover:text-brand-primary transition-colors">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{s.courseCount} دورة</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black",
                          s.avg >= 80 ? "bg-green-50 text-green-700" :
                          s.avg >= 60 ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-600"
                        )}>{s.avg}%</span>
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-black text-slate-700">{s.quizCount}</td>
                      <td className="px-6 py-5 text-center text-sm font-bold text-green-600">{s.highest}%</td>
                      <td className="px-6 py-5 text-center text-sm font-bold text-red-500">{s.lowest}%</td>
                      <td className="px-6 py-5 text-center">
                        <span className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black ring-1",
                          s.avg >= 90 ? "bg-emerald-50 text-emerald-700 ring-emerald-100" :
                          s.avg >= 80 ? "bg-blue-50 text-blue-700 ring-blue-100" :
                          s.avg >= 70 ? "bg-cyan-50 text-cyan-700 ring-cyan-100" :
                          s.avg >= 60 ? "bg-amber-50 text-amber-700 ring-amber-100" :
                          s.avg >= 50 ? "bg-orange-50 text-orange-700 ring-orange-100" :
                          "bg-red-50 text-red-600 ring-red-100"
                        )}>
                          {s.avg >= 90 ? 'ممتاز' : s.avg >= 80 ? 'جيد جداً' : s.avg >= 70 ? 'جيد' : s.avg >= 60 ? 'مقبول' : s.avg >= 50 ? 'ضعيف' : 'راسب'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <Button 
                          variant="ghost" size="sm" 
                          className="h-9 px-3 rounded-xl text-[10px] font-black text-brand-primary hover:bg-brand-primary/5"
                          onClick={() => {
                            const studentResults = filteredResults.filter(r => r.studentId === s.studentId);
                            setSelectedStudent(studentResults);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 ml-1" /> تقرير مفصل
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedStudent[0]?.studentName}</h3>
                <p className="text-slate-400 font-bold text-sm">تقرير تفصيلي — {selectedStudent.length} اختبار</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="rounded-full h-10 w-10 p-0">✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedStudent.map((r, i) => (
                <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-800 text-sm">{r.quizTitle}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">{r.courseTitle} · {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('ar-EG') : ''}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "text-[10px] font-black rounded-xl h-9 px-3",
                        (r as any).allowRetake ? "bg-green-50 text-green-600 border-green-200" : "text-brand-primary hover:bg-brand-primary/5"
                      )}
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'quiz_results', r.id), { allowRetake: !(r as any).allowRetake });
                          // Update local state for immediate feedback
                          setResults(prev => prev.map(res => res.id === r.id ? { ...res, allowRetake: !(res as any).allowRetake } as any : res));
                          setSelectedStudent(prev => prev?.map(res => res.id === r.id ? { ...res, allowRetake: !(res as any).allowRetake } as any : res) || null);
                        } catch (err) {
                          console.error("Failed to update retake status:", err);
                        }
                      }}
                    >
                      {(r as any).allowRetake ? '✓ مسموح بالإعادة' : 'سماح بالإعادة 🔄'}
                    </Button>
                    <span className="text-xs font-bold text-slate-500">{r.score}/{r.totalQuestions}</span>
                    <span className={cn(
                      "px-4 py-2 rounded-xl text-sm font-black",
                      r.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    )}>{r.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
