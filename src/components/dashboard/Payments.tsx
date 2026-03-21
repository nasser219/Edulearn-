import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Filter, Download, Calendar, CheckCircle2, XCircle, Clock, ArrowDownLeft, ArrowUpRight, MoreVertical, DollarSign, CheckCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, where, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { sendWhatsAppNotification, normalizePhoneNumber } from '../../lib/whatsapp';
import { createNotification } from '../../hooks/useNotifications';

export const Payments = () => {
  const { profile, isAdmin, isTeacher } = useEducatorsAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [realPayments, setRealPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendToStudent, setSendToStudent] = useState(true);
  const [sendToParent, setSendToParent] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const isStudent = profile?.role === 'STUDENT';

  useEffect(() => {
    let q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    
    // If teacher, only show their payments
    if (isTeacher() && !isAdmin() && profile?.uid) {
      q = query(
        collection(db, 'payments'), 
        where('teacherId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
    }

    // If student, only show their own payments
    if (isStudent && profile?.uid) {
      q = query(
        collection(db, 'payments'),
        where('studentId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setRealPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile, isAdmin, isTeacher]);

  const handleApprove = async (payment: any) => {
    try {
      // Update payment status
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'COMPLETED',
        approvedAt: serverTimestamp()
      });

      // Unlock course for student (Update or create enrollment)
      if (payment.studentId && payment.courseId) {
        const enrollmentId = `${payment.studentId}_${payment.courseId}`;
        await setDoc(doc(db, 'enrollments', enrollmentId), {
          studentId: payment.studentId,
          courseId: payment.courseId,
          courseTitle: payment.courseTitle,
          teacherId: payment.teacherId,
          status: 'APPROVED',
          approvedAt: serverTimestamp(),
          progress: 0,
          completedLessons: []
        }, { merge: true });

        // Also update student profile with enrolledCourses array
        try {
          await updateDoc(doc(db, 'users', payment.studentId), {
            enrolledCourses: arrayUnion(payment.courseId)
          });
        } catch (uError) {
          console.error("Error updating student enrolledCourses:", uError);
        }
      }
      
      alert('تم تأكيد الدفع وتفعيل الكورس للطالب بنجاح! ✅');

      // Add In-App Notification
      await createNotification({
        userId: payment.studentId,
        title: 'تم تفعيل الكورس! 🎓',
        message: `لقد تم تفعيل اشتراكك في كورس "${payment.courseTitle}" بنجاح. يمكنك الآن البدء في المذاكرة!`,
        type: 'ENROLLMENT',
        link: 'COURSES'
      });

      // Send WhatsApp Notification
      try {
        const studentDoc = await getDoc(doc(db, 'users', payment.studentId));
        const teacherDoc = await getDoc(doc(db, 'users', payment.teacherId));
        
        if (studentDoc.exists() && teacherDoc.exists()) {
          const studentData = studentDoc.data();
          const teacherData = teacherDoc.data();
          
          let message = teacherData.whatsappTemplateSubscription || 'تم الاشتراك في كورس [course] بنجاح مع مستر [teacher]. بالتوفيق يا [student]!';
          message = message
            .replace(/\[student\]/g, studentData.fullName)
            .replace(/\[course\]/g, payment.courseTitle)
            .replace(/\[teacher\]/g, teacherData.fullName);

          const numbers: string[] = [];
          if (sendToStudent && studentData.phone) numbers.push(studentData.phone);
          if (sendToParent) {
            if (studentData.parentPhone) numbers.push(studentData.parentPhone);
            if (studentData.fatherPhone) numbers.push(studentData.fatherPhone);
          }

          const phones = Array.from(new Set(
            numbers
              .filter(Boolean)
              .map(p => normalizePhoneNumber(p!))
          ));
          
          for (const phone of phones) {
            await sendWhatsAppNotification(phone, message, {
              email: teacherData.whatsappEmail,
              password: teacherData.whatsappPassword,
              token: teacherData.whatsappToken
            });
          }
        }
      } catch (waError) {
        console.error("Error sending WhatsApp notification:", waError);
      }
    } catch (error) {
      console.error("Error approving payment:", error);
      alert('حدث خطأ أثناء تأكيد الدفع.');
    }
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }

    const headers = [
      'رقم الفاتورة',
      'الطالب',
      'الكورس',
      'المبلغ (EGP)',
      'التاريخ',
      'وسيلة الدفع',
      'الحالة'
    ];

    const rows = filteredPayments.map(p => [
      p.invoice || '',
      p.studentName || '',
      p.courseTitle || '',
      p.amount || '0',
      p.createdAt?.toDate().toLocaleDateString('en-US') || '',
      p.method || '',
      p.status === 'COMPLETED' ? 'تم التأكيد' : p.status === 'PENDING' ? 'قيد المراجعة' : 'ملغي'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for UTF-8 compatibility with Excel
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `statement_${profile?.fullName}_${new Date().toLocaleDateString('en-US')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totals = realPayments.reduce((acc, p) => {
    const amount = parseFloat(p.amount) || 0;
    if (p.status === 'COMPLETED') acc.revenue += amount;
    if (p.status === 'PENDING') acc.pending += amount;
    return acc;
  }, { revenue: 0, pending: 0 });

  const availableCourses = Array.from(new Set(realPayments.map(p => p.courseTitle))).filter(Boolean);

  const filteredPayments = realPayments.filter(p => {
    const matchesSearch = p.invoice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === 'ALL' || p.courseTitle === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const studentTotals = filteredPayments.reduce((acc, p) => {
    const amount = parseFloat(p.amount) || 0;
    if (p.status === 'COMPLETED') acc.paid += amount;
    return acc;
  }, { paid: 0 });

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-premium border border-slate-50">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">سجل المدفوعات 💳</h1>
          </div>
          <p className="text-slate-500 font-bold mr-15">
            {isStudent ? 'تابع مدفوعاتك، فواتيرك، وحالات اشتراكك في الكورسات' : 'إدارة الإيرادات، الفواتير، وحالات الدفع لجميع الطلاب'}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
           {!isStudent && (
             <div className="flex bg-slate-50 p-2 rounded-2xl gap-2 border border-slate-100">
               <button 
                 onClick={() => setSendToStudent(!sendToStudent)}
                 className={cn(
                   "px-4 py-2 rounded-xl text-xs font-black transition-all",
                   sendToStudent ? "bg-brand-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 إرسال للطالب
               </button>
               <button 
                 onClick={() => setSendToParent(!sendToParent)}
                 className={cn(
                   "px-4 py-2 rounded-xl text-xs font-black transition-all",
                   sendToParent ? "bg-brand-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 إرسال لولي الأمر
               </button>
             </div>
           )}
           
           <Button 
             variant="outline" 
             className="rounded-2xl font-black h-14 bg-slate-50 border-none hover:bg-slate-100"
             onClick={handleExportCSV}
           >
             <Download className="h-5 w-5 ml-2" />
             تصدير كشف حساب
           </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isStudent ? (
          <>
            <Card className="bg-brand-primary border-none shadow-xl shadow-brand-primary/10 text-white overflow-hidden relative group">
              <CardContent className="p-8 space-y-2 relative z-10">
                 <p className="text-xs font-black text-brand-secondary uppercase tracking-widest">إجمالي المبالغ المدفوعة</p>
                 <h3 className="text-4xl font-black">{studentTotals.paid.toLocaleString('en-US')} EGP</h3>
                 <div className="flex items-center gap-2 text-xs font-bold pt-4 text-white/60">
                    يشمل جميع الكورسات التي تم تفعيلها
                 </div>
              </CardContent>
              <DollarSign className="absolute -right-8 -bottom-8 h-40 w-40 text-white/10 group-hover:scale-110 transition-transform duration-700" />
            </Card>

            <Card className="bg-white border-none shadow-premium overflow-hidden relative group">
              <CardContent className="p-8 space-y-2">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">عدد الكورسات المشترك بها</p>
                 <h3 className="text-4xl font-black text-indigo-600">
                   {Array.from(new Set(realPayments.filter(p => p.status === 'COMPLETED').map(p => p.courseId))).length} كورس
                 </h3>
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-400 pt-4">
                   <CheckCircle className="h-4 w-4 text-green-500" />
                   حسابك مفعل وجاهز للدراسة
                 </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-premium overflow-hidden relative group">
              <CardContent className="p-8 space-y-2">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">عمليات دفع قيد المراجعة</p>
                 <h3 className="text-4xl font-black text-amber-600">
                   {realPayments.filter(p => p.status === 'PENDING').length} عمليات
                 </h3>
                 <div className="flex items-center gap-2 text-xs font-bold text-amber-500 pt-4">
                   <Clock className="h-4 w-4" />
                   سيتم التفعيل فور مراجعة الإدارة
                 </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="bg-emerald-600 border-none shadow-xl shadow-emerald-100 text-white overflow-hidden relative group">
              <CardContent className="p-8 space-y-2 relative z-10">
                 <p className="text-xs font-black text-emerald-100 uppercase tracking-widest">إجمالي الإيرادات المؤكدة</p>
                 <h3 className="text-4xl font-black">{totals.revenue.toLocaleString('en-US')} EGP</h3>
                 <div className="flex items-center gap-2 text-xs font-bold pt-4 text-emerald-100">
                    محدث لحظياً من قاعدة البيانات
                 </div>
              </CardContent>
              <DollarSign className="absolute -right-8 -bottom-8 h-40 w-40 text-white/10 group-hover:scale-110 transition-transform duration-700" />
            </Card>

            <Card className="bg-white border-none shadow-premium overflow-hidden relative group">
              <CardContent className="p-8 space-y-2">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">مدفوعات بانتظار التأكيد (Pending)</p>
                 <h3 className="text-4xl font-black text-amber-600">{totals.pending.toLocaleString('en-US')} EGP</h3>
                 <div className="flex items-center gap-2 text-xs font-bold text-amber-500 pt-4">
                   <Clock className="h-4 w-4" />
                   بانتظار المراجعة من الإدارة
                 </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-premium overflow-hidden relative group">
              <CardContent className="p-8 space-y-2">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">متوسط الفاتورة</p>
                 <h3 className="text-4xl font-black text-slate-900">
                   {realPayments.length > 0 ? Math.round((totals.revenue + totals.pending) / realPayments.length).toLocaleString('en-US') : 0} EGP
                 </h3>
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-400 pt-4">
                   <Filter className="h-4 w-4" />
                   لعدد {realPayments.length} عملية دفع
                 </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Transactions Table */}
      <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="flex flex-wrap gap-4 flex-1">
              <div className="relative group flex-1 max-w-md">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder={isStudent ? "ابحث برقم الفاتورة..." : "ابحث برقم الفاتورة أو اسم الطالب..."}
                  className="w-full h-14 pr-12 pl-6 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 focus:bg-white focus:border-brand-primary outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative group">
                 <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                 <select 
                   value={selectedCourse}
                   onChange={(e) => setSelectedCourse(e.target.value)}
                   className="h-14 pr-12 pl-8 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none appearance-none hover:bg-slate-100 transition-colors min-w-[200px]"
                 >
                   <option value="ALL">جميع الكورسات</option>
                   {availableCourses.map(course => (
                     <option key={course} value={course}>{course}</option>
                   ))}
                 </select>
              </div>
           </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">
                    {isStudent ? 'بيانات الفاتورة والكورس' : 'الطالب والبيان'}
                  </th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">المبلغ</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">التاريخ والوسيلة</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">الحالة</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-left border-b border-slate-100">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="p-6">
                      <div className="space-y-1">
                        {!isStudent && <p className="font-black text-slate-900 group-hover:text-brand-primary transition-colors">{p.studentName}</p>}
                        <p className={cn("font-black text-slate-900", isStudent ? "text-base" : "text-[10px] text-slate-500 font-bold")}>
                          {p.courseTitle}
                        </p>
                        <p className="text-[10px] text-slate-300 font-black tracking-widest">{p.invoice}</p>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                       <span className="text-base font-black text-slate-900">{p.amount} EGP</span>
                    </td>
                    <td className="p-6 text-center">
                       <div className="space-y-1">
                          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {p.createdAt?.toDate().toLocaleDateString('en-US') || 'حديث'}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">{p.method}</p>
                       </div>
                    </td>
                    <td className="p-6 text-center">
                       {p.status === 'COMPLETED' ? (
                         <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-green-50 text-green-600 text-[10px] font-black ring-1 ring-green-100">
                            <CheckCircle2 className="h-3 w-3" /> تم التأكيد
                         </span>
                       ) : p.status === 'PENDING' ? (
                         <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-[10px] font-black ring-1 ring-amber-100">
                            <Clock className="h-3 w-3" /> قيد المراجعة
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-50 text-red-600 text-[10px] font-black ring-1 ring-red-100">
                            <XCircle className="h-3 w-3" /> ملغي
                         </span>
                       )}
                    </td>
                    <td className="p-6">
                       <div className="flex items-center justify-end gap-2">
                          {p.status === 'PENDING' && (isAdmin() || (isTeacher() && p.teacherId === profile?.uid)) && (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="h-10 px-6 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApprove(p)}
                            >
                              تأكيد الدفع ✅
                            </Button>
                          )}
                          <button className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                             <MoreVertical className="h-5 w-5" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && !loading && (
                   <tr>
                     <td colSpan={5} className="p-20 text-center space-y-4">
                        <div className="h-20 w-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto">
                           <DollarSign className="h-10 w-10" />
                        </div>
                        <p className="text-slate-400 font-bold">لا توجد عمليات دفع مسجلة حالياً.</p>
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
