import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, Clock, CheckCircle2, AlertCircle,
  Download, Eye, Trash2, Upload, X, Star, Send, BookOpen
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadFileToSupabase } from '../../lib/supabase';

// ─── Types ───
interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  courseId: string;
  courseTitle?: string;
  teacherId: string;
  teacherName?: string;
  dueDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OVERDUE' | 'DRAFT';
  submissions: number;
  attachmentUrl?: string;
  maxGrade: number;
  stage?: string;
  grade?: string;
  createdAt: string;
}

interface SubmissionItem {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
}

export const Homework = () => {
  const { profile, isAdmin, isTeacher, isStudent } = useEducatorsAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState<string | null>(null); // homeworkId
  const [showGradeModal, setShowGradeModal] = useState<string | null>(null); // homeworkId
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Record<string, SubmissionItem>>({}); // homeworkId -> submission

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formMaxGrade, setFormMaxGrade] = useState(100);
  const [formAttachment, setFormAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit form state
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Grade form state
  const [gradeValue, setGradeValue] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Homework
    const q = query(collection(db, 'homework'), orderBy('createdAt', 'desc'));
    const unsubscribeHW = onSnapshot(q, (snap) => {
      setHomeworks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
      setLoading(false);
    });

    // Fetch courses for teacher
    let unsubscribeCourses = () => {};
    if ((isTeacher() || isAdmin()) && profile?.uid) {
      const cq = isAdmin()
        ? query(collection(db, 'courses'))
        : query(collection(db, 'courses'), where('teacherId', '==', profile.uid));
      unsubscribeCourses = onSnapshot(cq, (snap) => {
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
      });
    }

    // Fetch Enrollments for current student
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

    // Fetch student's submissions
    let unsubscribeSubs = () => {};
    if (isStudent() && profile?.uid) {
      const sq = query(collection(db, 'homework_submissions'), where('studentId', '==', profile.uid));
      unsubscribeSubs = onSnapshot(sq, (snap) => {
        const subs: Record<string, SubmissionItem> = {};
        snap.docs.forEach(d => {
          const data = { id: d.id, ...d.data() as any };
          subs[data.homeworkId] = data;
        });
        setMySubmissions(subs);
      });
    }

    return () => {
      unsubscribeHW();
      unsubscribeCourses();
      unsubscribeEnrollments();
      unsubscribeSubs();
    };
  }, [profile, isStudent, isTeacher, isAdmin]);

  // Pre-fill subject when modal opens
  useEffect(() => {
    if (showCreateModal && profile?.subject) {
      setFormSubject(profile.subject);
    }
  }, [showCreateModal, profile?.subject]);

  // Stats
  const activeCount = homeworks.filter(hw => hw.status === 'ACTIVE' && (isAdmin() || isTeacher() ? hw.teacherId === profile?.uid : true)).length;
  const pendingGrading = Object.values(mySubmissions).filter(s => s.grade === undefined || s.grade === null).length;
  const totalCount = homeworks.filter(hw => isAdmin() || isTeacher() ? hw.teacherId === profile?.uid : true).length;

  const filteredHomework = homeworks.filter(hw => {
    const matchesSearch = hw.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hw.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (isAdmin()) return true;
    if (isTeacher()) return hw.teacherId === profile?.uid;
    if (isStudent()) {
      const isEnrolled = enrollments.includes(hw.courseId);
      return isEnrolled && hw.status === 'ACTIVE';
    }
    return false;
  });

  // ── Create Homework ──
  const handleCreateHomework = async () => {
    if (!formTitle || !formCourseId || !formDueDate || !profile?.uid) return;
    setIsSubmitting(true);
    try {
      let attachmentUrl = '';
      if (formAttachment) {
        attachmentUrl = await uploadFileToSupabase(formAttachment, 'homework-attachments');
      }

      const selectedCourse = courses.find(c => c.id === formCourseId);
      await addDoc(collection(db, 'homework'), {
        title: formTitle,
        description: formDesc,
        subject: formSubject || selectedCourse?.title || '',
        courseId: formCourseId,
        courseTitle: selectedCourse?.title || '',
        teacherId: profile.uid,
        teacherName: profile.fullName,
        dueDate: formDueDate,
        status: 'ACTIVE',
        submissions: 0,
        attachmentUrl,
        maxGrade: formMaxGrade,
        stage: profile.stage || '',
        grade: profile.grade || '',
        createdAt: new Date().toISOString(),
      });

      setShowCreateModal(false);
      setFormTitle(''); setFormDesc(''); setFormSubject(''); setFormCourseId(''); setFormDueDate(''); setFormAttachment(null);
    } catch (e: any) {
      console.error('Error creating homework:', e);
      alert(`حدث خطأ أثناء إنشاء الواجب: ${e.message || 'تأكد من نوع الملف وحجمه (الحد الأقصى 25MB)'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submit Solution ──
  const handleSubmitSolution = async () => {
    if (!submitFile || !showSubmitModal || !profile?.uid) return;
    setIsUploading(true);
    try {
      const fileUrl = await uploadFileToSupabase(submitFile, 'student-submissions');
      
      await addDoc(collection(db, 'homework_submissions'), {
        homeworkId: showSubmitModal,
        studentId: profile.uid,
        studentName: profile.fullName,
        fileUrl,
        fileName: submitFile.name,
        submittedAt: new Date().toISOString(),
      });

      // Increment submissions count
      const hw = homeworks.find(h => h.id === showSubmitModal);
      if (hw) {
        await updateDoc(doc(db, 'homework', showSubmitModal), {
          submissions: (hw.submissions || 0) + 1
        });
      }

      setShowSubmitModal(null);
      setSubmitFile(null);
    } catch (e: any) {
      console.error('Error submitting solution:', e);
      alert(`حدث خطأ أثناء رفع الحل: ${e.message || 'تأكد من نوع الملف وحجمه (الحد الأقصى 25MB)'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Load Submissions for Grading ──
  const openGradeModal = async (homeworkId: string) => {
    setShowGradeModal(homeworkId);
    try {
      const snap = await getDocs(
        query(collection(db, 'homework_submissions'), where('homeworkId', '==', homeworkId))
      );
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
    } catch (e) {
      console.error('Error fetching submissions:', e);
    }
  };

  // ── Grade Submission ──
  const handleGradeSubmission = async (submissionId: string) => {
    try {
      await updateDoc(doc(db, 'homework_submissions', submissionId), {
        grade: gradeValue,
        feedback: gradeFeedback,
        gradedAt: new Date().toISOString(),
      });
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, grade: gradeValue, feedback: gradeFeedback } : s));
      setGradingStudentId(null);
      setGradeValue(0);
      setGradeFeedback('');
    } catch (e) {
      console.error('Error grading:', e);
    }
  };

  // ── Delete Homework ──
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الواجب؟')) return;
    try {
      await deleteDoc(doc(db, 'homework', id));
    } catch (e) {
      console.error('Error deleting homework:', e);
    }
  };

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
          <Button 
            variant="primary" size="lg" 
            className="rounded-2xl font-black h-14 px-8 shadow-xl shadow-brand-primary/20"
            onClick={() => setShowCreateModal(true)}
          >
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
                <h3 className="text-3xl font-black text-slate-900 group-hover:text-white leading-none mt-1">{activeCount}</h3>
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
                <h3 className="text-3xl font-black text-slate-900 group-hover:text-white leading-none mt-1">{pendingGrading}</h3>
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
                <h3 className="text-3xl font-black text-slate-900 group-hover:text-white leading-none mt-1">{totalCount}</h3>
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
                 </select>
              </div>
           </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[800px]">
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
                ) : filteredHomework.map((hw) => {
                  const mySub = mySubmissions[hw.id];
                  return (
                  <tr key={hw.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-brand-primary font-black group-hover:bg-brand-primary group-hover:text-white transition-all">
                          {(hw.subject || hw.title || 'و').charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 group-hover:text-brand-primary transition-colors">{hw.title}</p>
                          <p className="text-xs text-slate-400 font-bold">{hw.subject || hw.courseTitle}</p>
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
                         {hw.submissions || 0} طالب قام بالتسليم
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
                       ) : (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-[10px] font-black ring-1 ring-red-100">
                            <AlertCircle className="h-3 w-3" /> انتهى الوقت
                         </span>
                       )}
                    </td>
                    <td className="p-6">
                        <div className="flex items-center justify-end gap-2">
                           {/* Teacher actions */}
                           {(isTeacher() || isAdmin()) && (
                             <>
                               <Button 
                                 variant="ghost" size="sm" 
                                 className={cn("h-9 px-3 rounded-lg font-black text-[10px] transition-all",
                                   hw.status === 'ACTIVE' ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                                 )}
                                 onClick={async () => {
                                   const newStatus = hw.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                   await updateDoc(doc(db, 'homework', hw.id), { status: newStatus });
                                 }}
                               >
                                 {hw.status === 'ACTIVE' ? 'إلغاء التفعيل' : 'تفعيل'}
                               </Button>
                               <Button 
                                 variant="ghost" size="sm" 
                                 className="h-9 px-3 rounded-lg font-black text-[10px] bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/10"
                                 onClick={() => openGradeModal(hw.id)}
                               >
                                 <Star className="h-3.5 w-3.5 ml-1" /> تصحيح
                               </Button>
                               <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => handleDelete(hw.id)}>
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </>
                           )}
                           
                           {/* Student actions */}
                           {isStudent() && (
                             <>
                               {mySub ? (
                                 <div className="flex items-center gap-2">
                                   {mySub.grade !== undefined && mySub.grade !== null ? (
                                     <span className={cn(
                                       "px-3 py-1.5 rounded-xl text-xs font-black",
                                       mySub.grade >= (hw.maxGrade * 0.5) ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                                     )}>
                                       {mySub.grade}/{hw.maxGrade}
                                     </span>
                                   ) : (
                                     <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-[10px] font-black">
                                       <Clock className="h-3 w-3 inline ml-1" /> بانتظار التصحيح
                                     </span>
                                   )}
                                   {mySub.feedback && (
                                     <span className="text-[10px] text-slate-500 font-bold max-w-[120px] truncate" title={mySub.feedback}>
                                       💬 {mySub.feedback}
                                     </span>
                                   )}
                                 </div>
                               ) : (
                                 <Button 
                                   variant="primary" size="sm" 
                                   className="h-9 px-4 rounded-xl font-black text-[10px] shadow-md"
                                   onClick={() => setShowSubmitModal(hw.id)}
                                 >
                                   <Upload className="h-3.5 w-3.5 ml-1" /> رفع الحل
                                 </Button>
                               )}
                             </>
                           )}

                           {hw.attachmentUrl && (
                             <Button 
                               variant="ghost" size="sm" 
                               className="h-9 w-9 p-0 rounded-lg hover:bg-brand-primary/5 hover:text-brand-primary transition-colors"
                               onClick={() => window.open(hw.attachmentUrl, '_blank')}
                             >
                               <Download className="h-4 w-4" />
                             </Button>
                           )}
                        </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ═══════ CREATE HOMEWORK MODAL ═══════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="h-10 w-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                إضافة واجب جديد
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">عنوان الواجب *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="مثال: حل تمارين الصفحة 45"
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">وصف الواجب</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} placeholder="أضف تعليمات أو ملاحظات للطلاب..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600">المادة</label>
                  <input 
                    value={formSubject} 
                    onChange={e => setFormSubject(e.target.value)} 
                    placeholder="عربي / رياضيات..."
                    readOnly={!!profile?.subject}
                    className={cn(
                      "w-full h-12 px-4 border-2 border-transparent rounded-2xl text-sm font-bold outline-none transition-all",
                      !!profile?.subject ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50 focus:bg-white focus:border-brand-primary"
                    )} 
                  />
                  {profile?.subject && <p className="text-[9px] text-slate-400 font-bold mr-2">تم التحديد تلقائياً بناءً على تخصصك 🔒</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600">الدورة المرتبطة *</label>
                  <select value={formCourseId} onChange={e => setFormCourseId(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-black outline-none appearance-none cursor-pointer focus:bg-white focus:border-brand-primary transition-all">
                    <option value="">اختر الدورة</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600">تاريخ التسليم *</label>
                  <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600">الدرجة القصوى</label>
                  <input type="number" value={formMaxGrade} onChange={e => setFormMaxGrade(Number(e.target.value))} min={1} max={1000}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">مرفق (اختياري)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-brand-primary/30 transition-colors">
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,.gif" onChange={e => setFormAttachment(e.target.files?.[0] || null)} className="hidden" id="hw-attachment" />
                  <label htmlFor="hw-attachment" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">{formAttachment ? formAttachment.name : 'اضغط لرفع ملف PDF أو صورة'}</p>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-xl font-bold">إلغاء</Button>
              <Button variant="primary" onClick={handleCreateHomework} isLoading={isSubmitting} disabled={!formTitle || !formCourseId || !formDueDate}
                className="rounded-xl font-black px-8 shadow-lg">
                <Send className="h-4 w-4 ml-2" /> نشر الواجب
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SUBMIT SOLUTION MODAL ═══════ */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">رفع حل الواجب 📤</h3>
              <button onClick={() => { setShowSubmitModal(null); setSubmitFile(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-brand-primary/30 transition-colors">
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,.gif,.zip,.rar" onChange={e => setSubmitFile(e.target.files?.[0] || null)} className="hidden" id="submit-file" />
                <label htmlFor="submit-file" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-black text-slate-700 mb-1">{submitFile ? submitFile.name : 'اسحب الملف هنا أو اضغط للرفع'}</p>
                  <p className="text-[10px] text-slate-400 font-bold">PDF, DOC, DOCX, JPG, PNG, ZIP — حتى 25MB</p>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowSubmitModal(null)} className="rounded-xl font-bold">إلغاء</Button>
              <Button variant="primary" onClick={handleSubmitSolution} isLoading={isUploading} disabled={!submitFile}
                className="rounded-xl font-black px-8 shadow-lg">
                <Send className="h-4 w-4 ml-2" /> تسليم الحل
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ GRADE SUBMISSIONS MODAL ═══════ */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900">تصحيح الواجبات ✍️</h3>
                <p className="text-slate-400 font-bold text-sm mt-1">{submissions.length} تسليم</p>
              </div>
              <button onClick={() => { setShowGradeModal(null); setGradingStudentId(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">لم يقم أي طالب بتسليم الواجب بعد.</p>
                </div>
              ) : submissions.map(sub => (
                <div key={sub.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-800">{sub.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        تم التسليم: {new Date(sub.submittedAt).toLocaleDateString('ar-EG')} · {sub.fileName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[10px] font-bold" onClick={() => window.open(sub.fileUrl, '_blank')}>
                        <Eye className="h-3.5 w-3.5 ml-1" /> عرض
                      </Button>
                      {sub.grade !== undefined && sub.grade !== null ? (
                        <span className="px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-black">{sub.grade}</span>
                      ) : (
                        <Button variant="primary" size="sm" className="h-8 rounded-lg text-[10px] font-black shadow-sm"
                          onClick={() => { setGradingStudentId(sub.id); setGradeValue(0); setGradeFeedback(''); }}>
                          <Star className="h-3.5 w-3.5 ml-1" /> تصحيح
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Grading form */}
                  {gradingStudentId === sub.id && (
                    <div className="mt-3 p-4 bg-white rounded-xl border border-brand-primary/20 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500">الدرجة</label>
                          <input type="number" value={gradeValue} onChange={e => setGradeValue(Number(e.target.value))} min={0} max={homeworks.find(h => h.id === showGradeModal)?.maxGrade || 100}
                            className="w-full h-10 px-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500">من {homeworks.find(h => h.id === showGradeModal)?.maxGrade || 100}</label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500">ملاحظات المعلم</label>
                        <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} rows={2} placeholder="أحسنت! / يحتاج تحسين..."
                          className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none" />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setGradingStudentId(null)} className="rounded-lg text-xs">إلغاء</Button>
                        <Button variant="primary" size="sm" onClick={() => handleGradeSubmission(sub.id)} className="rounded-lg text-xs font-black px-6 shadow-md">
                          حفظ الدرجة ✅
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
