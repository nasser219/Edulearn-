import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Award, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  BookOpen,
  ChevronLeft
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { cn } from '../../lib/utils';

export const StudentResults = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useEducatorsAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'quiz_results'),
      where('studentId', '==', profile.uid),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const stats = {
    total: results.length,
    graded: results.filter(r => r.status === 'GRADED').length,
    average: results.filter(r => r.status === 'GRADED').length > 0 
      ? Math.round(results.filter(r => r.status === 'GRADED').reduce((acc, curr) => acc + curr.score, 0) / results.filter(r => r.status === 'GRADED').length)
      : 0
  };

  if (loading) {
    return (
      <div className="p-20 text-center font-black text-slate-400" dir="rtl">جاري تحميل نتائجك... ⌛</div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-premium border border-slate-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-12 w-12 p-0 rounded-2xl hover:bg-slate-50">
            <ChevronRight className="h-7 w-7" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">أدائي وتقاريري 📊</h1>
            <p className="text-slate-500 font-bold">تابع تطورك الدراسي ونتائج اختباراتك أولاً بأول</p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-brand-primary border-none shadow-xl shadow-brand-primary/20 text-white p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="relative z-10 space-y-2">
            <p className="text-white/60 text-xs font-black uppercase tracking-widest">متوسط الدرجات المؤكدة</p>
            <h3 className="text-5xl font-black tracking-tighter">{stats.average}%</h3>
          </div>
          <TrendingUp className="absolute -left-4 -bottom-4 h-32 w-32 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </Card>

        <Card className="bg-white border-none shadow-premium p-8 rounded-[2.5rem] flex items-center gap-6">
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shrink-0">
            <Award className="h-8 w-8" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">اختبارات تم تصحيحها</p>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stats.graded} من {stats.total}</h3>
          </div>
        </Card>

        <Card className="bg-white border-none shadow-premium p-8 rounded-[2.5rem] flex items-center gap-6">
          <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shrink-0">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">بانتظار المراجعة</p>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stats.total - stats.graded}</h3>
          </div>
        </Card>
      </div>

      {/* Results List */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 pr-4">
          <BookOpen className="h-6 w-6 text-brand-primary" />
          سجل الاختبارات
        </h3>

        {results.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
            <div className="h-20 w-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
              <Target className="h-10 w-10" />
            </div>
            <p className="text-slate-400 font-bold text-lg">لم تقم بتأدية أي اختبارات حتى الآن.</p>
            <Button onClick={onBack} variant="primary" className="rounded-2xl px-8 h-12 font-black">اذهب لتعلم واستعد للاختبارات</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {results.map((result) => (
              <Card key={result.id} className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-2xl hover:shadow-brand-primary/5 transition-all duration-500">
                <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                  <div className={cn(
                    "h-24 w-24 rounded-[2rem] flex flex-col items-center justify-center shrink-0 text-white font-black text-2xl shadow-lg",
                    result.status === 'GRADED' ? "bg-emerald-500 shadow-emerald-100" : "bg-amber-500 shadow-amber-100"
                  )}>
                    <span>{result.status === 'GRADED' ? result.score : '?'}</span>
                    <span className="text-[10px] opacity-70">%</span>
                  </div>

                  <div className="flex-1 text-right space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-black text-slate-800">{result.quizTitle}</h4>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        result.status === 'GRADED' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {result.status === 'GRADED' ? 'تم التصحيح ✅' : 'قيد المراجعة ⏳'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(result.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>

                  {result.status === 'GRADED' && (
                    <div className="bg-slate-50 p-6 rounded-2xl flex flex-col items-end gap-2 border border-slate-100 w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <p className="text-xs font-black text-slate-700">تأكيد المعلم:</p>
                        <p className="text-xs font-bold text-slate-500">أ. {result.confirmedBy || 'المعلم'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-indigo-600" />
                        <p className="text-xs font-black text-slate-700">النقاط:</p>
                        <p className="text-xs font-bold text-slate-500">{result.earnedPoints || 0} / {result.totalPoints || 100}</p>
                      </div>
                    </div>
                  )}
                  
                  {result.status !== 'GRADED' && (
                    <div className="bg-amber-50/50 p-6 rounded-2xl text-amber-600 flex items-center gap-3 border border-amber-100/50 w-full md:w-auto">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-sm font-black">بانتظار مراجعة وتأكيد المعلم للدرجة النهائية.</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
