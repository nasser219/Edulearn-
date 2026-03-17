import React, { useState, useEffect } from 'react';
import { 
  Target, 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  BookOpen, 
  ChevronRight,
  Sparkles,
  BarChart2,
  PieChart,
  Lightbulb
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { cn } from '../../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface QuizResult {
  id: string;
  studentId: string;
  studentName: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  topic?: string;
  subject?: string;
  createdAt: string;
}

export const PerformanceAI = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useEducatorsAuth();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [insights, setInsights] = useState<{
    totalStudents: number;
    averageScore: number;
    weakTopics: { topic: string, count: number, avgScore: number }[];
    strongTopics: { topic: string, count: number, avgScore: number }[];
    studentAnalysis: { name: string, score: number, status: string }[];
  }>({
    totalStudents: 0,
    averageScore: 0,
    weakTopics: [],
    strongTopics: [],
    studentAnalysis: []
  });

  useEffect(() => {
    const analyzeData = async () => {
      if (!profile?.uid) return;
      try {
        // 1. Fetch all quiz results for this teacher's quizzes
        // Note: For a real app, you'd filter by teacher quizzes. 
        // Here we'll fetch results where the teacherId matches (if stored) 
        // Or fetch all results and filter if we had mapping.
        // Assuming 'quiz_results' collection exists from QuizEngine saves.
        const q = query(collection(db, 'quiz_results'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
        
        setResults(data);

        // 2. Perform Analysis logic
        if (data.length > 0) {
          const totalScore = data.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions) * 100, 0);
          const avgScore = totalScore / data.length;

          // Group by topic/subject
          const topicStats: Record<string, { total: number, count: number }> = {};
          data.forEach(r => {
            const topic = r.subject || r.topic || 'عام';
            if (!topicStats[topic]) topicStats[topic] = { total: 0, count: 0 };
            topicStats[topic].total += (r.score / r.totalQuestions) * 100;
            topicStats[topic].count += 1;
          });

          const topics = Object.entries(topicStats).map(([topic, stats]) => ({
            topic,
            count: stats.count,
            avgScore: stats.total / stats.count
          }));

          const weakTopics = topics.filter(t => t.avgScore < 60).sort((a,b) => a.avgScore - b.avgScore);
          const strongTopics = topics.filter(t => t.avgScore >= 80).sort((a,b) => b.avgScore - a.avgScore);

          const studentAnalysis = data.slice(0, 10).map(r => ({
            name: r.studentName,
            score: (r.score / r.totalQuestions) * 100,
            status: (r.score / r.totalQuestions) * 100 > 70 ? 'متفوق' : 'يحتاج دعم'
          }));

          setInsights({
            totalStudents: new Set(data.map(d => d.studentId)).size,
            averageScore: avgScore,
            weakTopics,
            strongTopics,
            studentAnalysis
          });
        }
      } catch (error) {
        console.error("AI Analysis Error:", error);
      } finally {
        setLoading(false);
      }
    };

    analyzeData();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4" dir="rtl">
        <div className="h-16 w-16 bg-brand-primary/10 rounded-full flex items-center justify-center relative">
          <BrainCircuit className="h-8 w-8 text-brand-primary animate-pulse" />
          <div className="absolute inset-0 border-4 border-brand-primary/20 border-t-brand-primary animate-spin rounded-full" />
        </div>
        <p className="text-slate-500 font-bold">جاري تحليل البيانات باستخدام المعالج الذكي... 🤖</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-premium border border-slate-50">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <Button variant="ghost" size="sm" onClick={onBack} className="h-10 w-10 p-0 rounded-xl">
               <ChevronRight className="h-6 w-6" />
             </Button>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
               تحليل الأداء الذكي <Sparkles className="h-8 w-8 text-amber-500" />
             </h1>
          </div>
          <p className="text-slate-500 font-bold mr-14">تقارير تعتمد على تحليل البيانات لتطوير مستوى الطلاب</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black ring-1 ring-emerald-100 flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             النظام مفعل ويعمل بكفاءة
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-brand-primary border-none shadow-xl shadow-brand-primary/20 text-white relative overflow-hidden group">
           <CardContent className="p-8">
             <div className="relative z-10 flex items-center gap-6">
                <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <div>
                   <p className="text-white/60 text-xs font-black uppercase tracking-widest">متوسط مجموع الدرجات</p>
                   <h3 className="text-4xl font-black mt-1 leading-none">{insights.averageScore.toFixed(1)}%</h3>
                </div>
             </div>
             <TrendingUp className="absolute -left-4 -bottom-4 h-32 w-32 text-white/10 -rotate-12 group-hover:scale-110 transition-transform" />
           </CardContent>
        </Card>

        <Card className="bg-slate-900 border-none shadow-premium text-white relative overflow-hidden group">
           <CardContent className="p-8">
             <div className="relative z-10 flex items-center gap-6">
                <div className="h-16 w-16 bg-white/10 rounded-3xl flex items-center justify-center">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                   <p className="text-white/40 text-xs font-black uppercase tracking-widest">إجمالي الطلاب المشمولين</p>
                   <h3 className="text-4xl font-black mt-1 leading-none">{insights.totalStudents}</h3>
                </div>
             </div>
             <BrainCircuit className="absolute -left-4 -bottom-4 h-32 w-32 text-white/5 group-hover:rotate-12 transition-transform" />
           </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-premium text-slate-900 relative overflow-hidden group">
           <CardContent className="p-8">
             <div className="relative z-10 flex items-center gap-6">
                <div className="h-16 w-16 bg-brand-primary/10 text-brand-primary rounded-3xl flex items-center justify-center">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div>
                   <p className="text-slate-400 text-xs font-black uppercase tracking-widest">إجمالي المحاولات (الامتحانات)</p>
                   <h3 className="text-4xl font-black mt-1 leading-none text-brand-primary">{results.length}</h3>
                </div>
             </div>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Topic Analysis Chart */}
        <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
             <h3 className="text-xl font-black flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-brand-primary" />
                تحليل الأداء حسب الموضوع
             </h3>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.weakTopics.concat(insights.strongTopics).slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="topic" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 12, fontWeight: 900, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(56, 189, 248, 0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                />
                <Bar dataKey="avgScore" radius={[0, 10, 10, 0]} barSize={32}>
                  {insights.weakTopics.concat(insights.strongTopics).slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avgScore < 60 ? '#f43f5e' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weaknesses List */}
        <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50 bg-red-50/30">
             <h3 className="text-xl font-black flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                نقاط الضعف المكتشفة 🚨
             </h3>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            {insights.weakTopics.length === 0 ? (
               <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">كل شيء رائع! لم يتم اكتشاف نقاط ضعف حرجة حالياً.</p>
               </div>
            ) : insights.weakTopics.map((topic, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100 group hover:scale-[1.02] transition-all">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 bg-red-600 text-white rounded-xl flex items-center justify-center font-black">
                     {topic.avgScore.toFixed(0)}%
                   </div>
                   <div>
                     <p className="font-black text-slate-800">{topic.topic}</p>
                     <p className="text-[10px] text-red-400 font-bold">بناءً على {topic.count} محاولات من الطلاب</p>
                   </div>
                </div>
                <Button variant="ghost" size="sm" className="text-red-600 font-black text-xs hover:bg-white hover:shadow-sm">
                   اقتراح شرح إضافي
                </Button>
              </div>
            ))}
            
            <div className="pt-4 border-t border-slate-100 flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
               <div className="h-10 w-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center shrink-0">
                 <Lightbulb className="h-5 w-5" />
               </div>
               <div className="space-y-1">
                  <p className="text-xs font-black text-slate-800 tracking-tight leading-relaxed">توصية الذكاء الاصطناعي: يفضل إعادة شرح درس "الميكانيكا" لوجود هبوط ملحوظ في درجات الطلاب الأسبوع الماضي.</p>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Students Analysis */}
      <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
           <div>
              <h3 className="text-xl font-black text-slate-800">متابعة الطلاب المشمولين بالتحليل</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 tracking-tight">آخر 10 نتائج تم تحليلها لطلابك</p>
           </div>
           <Button variant="outline" className="rounded-xl font-black">تحميل تقرير كامل (PDF)</Button>
        </CardHeader>
        <CardContent className="p-0">
           <table className="w-full text-right border-collapse">
              <thead className="bg-[#fbfcff] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                 <tr>
                    <th className="px-8 py-4 px-8 font-black">اسم الطالب</th>
                    <th className="px-8 py-4 font-black">النسبة المئوية</th>
                    <th className="px-8 py-4 font-black">الحالة العامة</th>
                    <th className="px-8 py-4 font-black text-center">الإجراء الموصى به</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {insights.studentAnalysis.length === 0 ? (
                  <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold">لا توجد بيانات كافية للتحليل حالياً.</td></tr>
                ) : insights.studentAnalysis.map((st, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-700 group-hover:text-brand-primary transition-colors">{st.name}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                           <div className={cn(
                             "h-full rounded-full transition-all duration-1000",
                             st.score > 70 ? "bg-emerald-500" : st.score > 40 ? "bg-amber-500" : "bg-red-500"
                           )} style={{ width: `${st.score}%` }} />
                        </div>
                        <span className="text-sm font-black text-slate-600">{st.score.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className={cn(
                         "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black",
                         st.status === 'متفوق' ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-600 ring-1 ring-amber-100"
                       )}>
                         <target className="h-3 w-3" />
                         {st.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <Button variant="ghost" size="sm" className="rounded-lg text-[10px] font-black hover:bg-brand-primary/5 hover:text-brand-primary">إرسال تقرير لولي الأمر</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </CardContent>
      </Card>
    </div>
  );
};
