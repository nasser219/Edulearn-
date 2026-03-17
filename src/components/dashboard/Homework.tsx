import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEffect } from 'react';

export const Homework = () => {
  const { profile, isAdmin, isTeacher, isStudent } = useEducatorsAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Homework
    const q = query(collection(db, 'homework'), orderBy('createdAt', 'desc'));
    const unsubscribeHW = onSnapshot(q, (snap) => {
      setHomeworks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // 2. Fetch Enrollments for current student
    let unsubscribeEnrollments = () => {};
    if (isStudent() && profile?.uid) {
      const eq = query(
        collection(db, 'enrollments'),
        where('studentId', '==', profile.uid),
        where('status', '==', 'APPROVED')
      );
      unsubscribeEnrollments = onSnapshot(eq, (snap) => {
        setEnrollments(snap.docs.map(doc => doc.data().courseId));
      });
    }

    return () => {
      unsubscribeHW();
      unsubscribeEnrollments();
    };
  }, [profile, isStudent]);

  const filteredHomework = homeworks.filter(hw => {
    // 1. Search filter
    const matchesSearch = hw.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hw.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Role-based Visibility
    if (isAdmin()) return true;

    if (isTeacher()) {
      return hw.teacherId === profile?.uid;
    }

    if (isStudent()) {
      const matchesGrade = hw.stage === profile?.stage && hw.grade === profile?.grade;
      const isEnrolled = enrollments.includes(hw.courseId) || enrollments.includes(hw.id);
      return matchesGrade && isEnrolled;
    }

    return false;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-premium border border-slate-50">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center">
                <FileText className="h-6 w-6" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">المهام والواجبات 📝</h1>
          </div>
          <p className="text-slate-500 font-bold mr-15">قم بإدارة ورفع الواجبات المدرسية لطلابك بسهولة</p>
        </div>
        {(isTeacher() || isAdmin()) && (
          <Button variant="primary" size="lg" className="rounded-2xl font-black h-14 px-8 shadow-xl shadow-brand-primary/20">
            <Plus className="h-5 w-5 ml-2" />
            إضافة واجب جديد
          </Button>
        )}
      </div>

      {/* Stats Quick View */}
      {(isTeacher() || isAdmin()) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-none shadow-premium group hover:bg-brand-primary transition-all duration-500">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-16 w-16 bg-brand-primary/10 text-brand-primary rounded-3xl flex items-center justify-center group-hover:bg-white transition-colors">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-white/60">واجبات نشطة</p>
                <h3 className="text-3xl font-black text-slate-900 group-hover:text-white leading-none mt-1">0</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-premium group hover:bg-amber-500 transition-all duration-500">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center group-hover:bg-white transition-colors">
                <Clock className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-white/60">بانتظار التصحيح</p>
                <h3 className="text-3xl font-black text-slate-900 group-hover:text-white leading-none mt-1">0</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-premium group hover:bg-slate-900 transition-all duration-500">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-16 w-16 bg-slate-50 text-slate-600 rounded-3xl flex items-center justify-center group-hover:bg-white transition-colors">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-white/60">إجمالي الواجبات</p>
                <h3 className="text-3xl font-black text-slate-900 group-hover:text-white leading-none mt-1">0</h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Search */}
      <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="flex flex-wrap gap-4 flex-1">
              <div className="relative group flex-1 max-w-md">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="ابحث عن واجب معين..." 
                  className="w-full h-14 pr-12 pl-6 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 focus:bg-white focus:border-brand-primary outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative group">
                 <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                 <select 
                   className="h-14 pr-12 pl-10 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none appearance-none hover:bg-slate-100 transition-colors cursor-pointer"
                   value={filter}
                   onChange={(e) => setFilter(e.target.value)}
                 >
                   <option value="ALL">جميع المناهج</option>
                   <option value="ACTIVE">نشط حالياً</option>
                   <option value="INACTIVE">غير نشط</option>
                   <option value="OVERDUE">منتهي الوقت</option>
                   <option value="DRAFT">مسودة</option>
                 </select>
              </div>
           </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">عنوان الواجب والمادة</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">تاريخ التسليم</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">التسليمات</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">الحالة</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-left border-b border-slate-100">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="p-20 text-center font-black text-slate-400">جاري التحميل... ⏳</td></tr>
                ) : filteredHomework.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                          <FileText className="h-8 w-8" />
                        </div>
                        <p className="text-slate-400 font-bold">لا يوجد واجبات مضافة حالياً.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredHomework.map((hw) => (
                  <tr key={hw.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-brand-primary font-black group-hover:bg-brand-primary group-hover:text-white transition-all">
                          {hw.subject.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 group-hover:text-brand-primary transition-colors">{hw.title}</p>
                          <p className="text-xs text-slate-400 font-bold">{hw.subject}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                         <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                           <Calendar className="h-3.5 w-3.5 text-slate-400" />
                           {hw.dueDate}
                         </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                       <span className="inline-block px-3 py-1.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                         {hw.submissions} طالب قام بالتسليم
                       </span>
                    </td>
                    <td className="p-6 text-center">
                       {hw.status === 'ACTIVE' ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-600 text-[10px] font-black ring-1 ring-green-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> متاح للطالب
                         </span>
                       ) : hw.status === 'INACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black">
                           <Clock className="h-3 w-3" /> غير متاح حالياً
                        </span>
                       ) : hw.status === 'OVERDUE' ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-[10px] font-black ring-1 ring-red-100">
                            <AlertCircle className="h-3 w-3" /> انتهى الوقت
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black">
                            <Clock className="h-3 w-3" /> مسودة
                         </span>
                       )}
                    </td>
                    <td className="p-6">
                        <div className="flex items-center justify-end gap-2">
                           {(isTeacher() || isAdmin()) && (
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className={cn(
                                 "h-9 px-3 rounded-lg font-black text-[10px] transition-all",
                                 hw.status === 'ACTIVE' 
                                   ? "bg-red-50 text-red-600 hover:bg-red-100" 
                                   : "bg-green-50 text-green-600 hover:bg-green-100"
                               )}
                               onClick={async () => {
                                 const newStatus = hw.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                 await updateDoc(doc(db, 'homework', hw.id), { status: newStatus });
                               }}
                             >
                               {hw.status === 'ACTIVE' ? 'إلغاء التفعيل' : 'تفعيل'}
                             </Button>
                           )}
                           <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-brand-primary/5 hover:text-brand-primary transition-colors">
                             <Eye className="h-4.5 w-4.5" />
                           </Button>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-brand-primary/5 hover:text-brand-primary transition-colors">
                            <Download className="h-4.5 w-4.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
