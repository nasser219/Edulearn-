import {
  Search,
  BookOpen,
  Plus,
  Clock,
  Users,
  AlertCircle,
  GraduationCap,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  User,
  Calendar
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { collection, query, onSnapshot, orderBy, where, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Lock } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { STAGES, GRADES, SUBJECTS, getStageLabel, getGradeLabel } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { Trash2, MessageSquare, CheckCircle2, X, Target, AlertTriangle, MoreVertical, Edit, CheckSquare, Square } from 'lucide-react';
import { increment } from 'firebase/firestore';
import { sendWhatsAppNotification, normalizePhoneNumber } from '../../lib/whatsapp';
import { createNotification } from '../../hooks/useNotifications';

type SelectionState = {
  stage: string | null;
  grade: string | null;
  subject: string | null;
  teacher: string | null;
};

export const Quizzes = ({ onNavigate, onStartQuiz, onEditQuiz }: {
  onNavigate?: (view: any) => void,
  onStartQuiz?: (id: string) => void,
  onEditQuiz?: (id: string) => void
}) => {
  const { profile, isTeacher, isAdmin, isStudent } = useEducatorsAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrolledTeachers, setEnrolledTeachers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selection, setSelection] = useState<SelectionState>({
    stage: null,
    grade: null,
    subject: null,
    teacher: null
  });
  const [activeTab, setActiveTab] = useState<'QUIZZES' | 'REQUESTS' | 'VIOLATIONS' | 'RESULTS' | 'UPCOMING'>('QUIZZES');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [authorizedQuizzes, setAuthorizedQuizzes] = useState<string[]>([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [gradingScore, setGradingScore] = useState<string>('');
  const [isHydrating, setIsHydrating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [studentResultsData, setStudentResultsData] = useState<any[]>([]);

  // Hydrate legacy results with quiz metadata
  useEffect(() => {
    const hydrateResult = async () => {
      if (selectedResult && !Array.isArray(selectedResult.answers) && selectedResult.courseId) {
        setIsHydrating(true);
        try {
          const quizSnap = await getDoc(doc(db, 'quizzes', selectedResult.courseId));
          if (quizSnap.exists()) {
            const quizData = quizSnap.data();
            const flatAnswers = selectedResult.answers || {};
            
            // Transform legacy flat object into structured array
            const structuredAnswers = quizData.questions.map((q: any) => ({
              id: q.id,
              text: q.text,
              type: q.type,
              studentAnswer: flatAnswers[q.id] || '',
              correctAnswer: q.correctAnswer || '',
              // We don't necessarily know isCorrect here without re-calculating, 
              // but for ESSAY viewing it's not strictly needed.
            }));

            setSelectedResult({
              ...selectedResult,
              answers: structuredAnswers,
              isHydrated: true
            });
          }
        } catch (error) {
          console.error("Error hydrating result:", error);
        } finally {
          setIsHydrating(false);
        }
      }
    };

    hydrateResult();
  }, [selectedResult?.id]);

  useEffect(() => {
    // 1. Fetch Quizzes
    const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribeQuizzes = onSnapshot(q, (snap) => {
      setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // 2. Fetch Enrollments
    let unsubscribeEnrollments = () => { };
    if (isStudent() && profile?.uid) {
      const eq = query(
        collection(db, 'enrollments'),
        where('studentId', '==', profile.uid),
        where('status', '==', 'APPROVED')
      );
      unsubscribeEnrollments = onSnapshot(eq, (snap) => {
        const courseIds = snap.docs.map(doc => doc.data().courseId);
        const teacherIds = Array.from(new Set(snap.docs.map(doc => doc.data().teacherId).filter(Boolean)));
        setEnrollments(courseIds);
        setEnrolledTeachers(teacherIds as string[]);
      });
    }

    // 3. Fetch Pending Requests for Teachers
    let unsubscribeRequests = () => { };
    if (isTeacher() && profile?.uid) {
      const rq = query(
        collection(db, 'enrollments'),
        where('teacherId', '==', profile.uid),
        where('status', '==', 'PENDING')
      );
      unsubscribeRequests = onSnapshot(rq, (snap) => {
        setPendingRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    // 4. Fetch Violations (Flagged Results)
    let unsubscribeViolations = () => { };
    if ((isTeacher() || isAdmin()) && profile?.uid) {
      const vq = query(
        collection(db, 'quiz_results'),
        orderBy('submittedAt', 'desc')
      );
      unsubscribeViolations = onSnapshot(vq, (snap) => {
        let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filter by Status & Teacher
        docs = docs.filter((d: any) => d.status === 'FLAGGED');
        if (isTeacher() && !isAdmin()) {
          docs = docs.filter((d: any) => d.teacherId === profile.uid);
        }
        setViolations(docs);
      });
    }

    // 5. Fetch All Results (Non-Flagged)
    let unsubscribeResults = () => { };
    if ((isTeacher() || isAdmin()) && profile?.uid) {
      const rq = query(
        collection(db, 'quiz_results'),
        orderBy('submittedAt', 'desc')
      );
      unsubscribeResults = onSnapshot(rq, (snap) => {
        let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filter by Status & Teacher
        docs = docs.filter((d: any) => d.status === 'SUBMITTED' || d.status === 'FLAGGED' || d.status === 'PENDING_GRADES' || d.status === 'GRADED');
        if (isTeacher() && !isAdmin()) {
          docs = docs.filter((d: any) => d.teacherId === profile.uid);
        }
        setAllResults(docs);
      });
    }
    
    // 6. Fetch Upcoming Quizzes
    const uq = query(collection(db, 'upcoming_quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribeUpcoming = onSnapshot(uq, (snap) => {
      setUpcomingQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 7. Fetch Student's Own Results
    let unsubscribeStudentResults = () => { };
    if (isStudent() && profile?.uid) {
      const srq = query(
        collection(db, 'quiz_results'),
        where('studentId', '==', profile.uid)
      );
      unsubscribeStudentResults = onSnapshot(srq, (snap) => {
        setStudentResultsData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubscribeQuizzes();
      unsubscribeEnrollments();
      unsubscribeRequests();
      unsubscribeViolations();
      unsubscribeResults();
      unsubscribeUpcoming();
      unsubscribeStudentResults();
    };
  }, [profile, isStudent, isTeacher]);

  // Fetch implicitly authorized quizzes from enrolled courses
  useEffect(() => {
    if (enrollments.length > 0) {
      const fetchAuthorizedQuizzes = async () => {
        try {
          const allAuthorized = new Set<string>();
          const { getDocs, query, collection, where } = await import('firebase/firestore');
          
          for (let i = 0; i < enrollments.length; i += 10) {
            const chunk = enrollments.slice(i, i + 10);
            const coursesRef = collection(db, 'courses');
            const q = query(coursesRef, where('__name__', 'in', chunk));
            const snap = await getDocs(q);
            
            snap.docs.forEach(doc => {
              const data = doc.data();
              if (data.sections) {
                data.sections.forEach((section: any) => {
                  section.lessons?.forEach((lesson: any) => {
                    if (lesson.type === 'QUIZ' && lesson.contentUrl) {
                      allAuthorized.add(lesson.contentUrl);
                    }
                  });
                });
              }
            });
          }
          setAuthorizedQuizzes(Array.from(allAuthorized));
        } catch (error) {
          console.error("Error fetching authorized quizzes:", error);
        }
      };
      
      fetchAuthorizedQuizzes();
    }
  }, [enrollments]);

  // Handle student-specific initial state
  useEffect(() => {
    if (isStudent() && profile?.stage && profile?.grade) {
      setSelection(prev => ({
        ...prev,
        stage: profile.stage || null,
        grade: profile.grade || null
      }));
    }
  }, [profile, isStudent]);

  const handleRequestEnrollment = async (quiz: any) => {
    if (!profile?.uid) return;
    try {
      await addDoc(collection(db, 'enrollments'), {
        studentId: profile.uid,
        studentName: profile.fullName || 'طالب مجهول',
        studentPhone: profile.phone || '--',
        courseId: quiz.id,
        courseTitle: quiz.title,
        teacherId: quiz.teacherId,
        status: 'PENDING',
        enrolledAt: new Date().toISOString()
      });
      alert('تم إرسال طلب الاشتراك للمعلم بنجاح! 📨');

      // Add In-App Notification for Teacher
      await createNotification({
        userId: quiz.teacherId,
        title: 'طلب انضمام جديد 📥',
        message: `لقد تلقيت طلب انضمام جديد من الطالب "${profile.fullName}" لاختبار "${quiz.title}"`,
        type: 'ENROLLMENT',
        link: 'QUIZZES'
      });
    } catch (error) {
      console.error('Error requesting enrollment:', error);
      alert('حدث خطأ أثناء إرسال الطلب.');
    }
  };

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      // Role-based baseline visibility
      if (isTeacher() && quiz.teacherId !== profile?.uid && !isAdmin()) return false;
      
      // If student, ONLY show quizzes from teachers they are enrolled with
      if (isStudent() && !isAdmin()) {
        if (!enrolledTeachers.includes(quiz.teacherId)) return false;
      }

      // Hierarchy filtering (only if not student or if admin/teacher)
      if (!isStudent() || isAdmin()) {
        if (selection.stage && quiz.stage !== selection.stage) return false;
        if (selection.grade && quiz.grade !== selection.grade) return false;
        if (selection.subject && quiz.subject !== selection.subject) return false;
        if (selection.teacher && quiz.teacherId !== selection.teacher) return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          quiz.title.toLowerCase().includes(searchLower) ||
          quiz.subject?.toLowerCase().includes(searchLower) ||
          quiz.teacherName?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [quizzes, selection, searchTerm, isAdmin, isTeacher, isStudent, profile, enrolledTeachers]);

  const currentLevel = useMemo(() => {
    if (isTeacher() && !isAdmin()) return 'QUIZZES';
    if (isStudent() && !isAdmin()) return 'QUIZZES'; // Skip paths for students
    if (!selection.stage) return 'STAGE';
    if (!selection.grade) return 'GRADE';
    if (!selection.teacher) return 'TEACHER';
    return 'QUIZZES';
  }, [selection, isTeacher, isStudent, isAdmin]);

  const breadcrumbs = useMemo(() => {
    if ((isTeacher() || isStudent()) && !isAdmin()) return [{ label: 'امتحاناتي المتاحة', value: 'QUIZZES' }];
    return [
      { label: 'الرئيسية', value: 'ROOT' },
      selection.stage && { label: getStageLabel(selection.stage), value: 'STAGE' },
      selection.grade && { label: getGradeLabel(selection.grade), value: 'GRADE' },
      selection.teacher && { label: filteredQuizzes[0]?.teacherName || 'المعلم', value: 'TEACHER' }
    ].filter(Boolean);
  }, [selection, isTeacher, isStudent, isAdmin, filteredQuizzes]);

  const handleApproveRequest = async (requestId: string, approved: boolean) => {
    try {
      if (approved) {
        const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
        await updateDoc(doc(db, 'enrollments', requestId), {
          status: 'APPROVED',
          approvedAt: serverTimestamp()
        });
        alert('تم قبول الطلب بنجاح! ✅');
      } else {
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'enrollments', requestId));
        alert('تم رفض الطلب.');
      }

      // Add In-App Notification
      const enrollData = pendingRequests.find(r => r.id === requestId);
      if (enrollData) {
        await createNotification({
          userId: enrollData.studentId,
          title: approved ? 'تم قبول طلب انضمامك! ✅' : 'تم رفض طلب انضمامك ❌',
          message: approved 
            ? `لقد تم قبول طلب انضمامك لاختبار "${enrollData.courseTitle}"` 
            : `عذراً، تم رفض طلب انضمامك لاختبار "${enrollData.courseTitle}"`,
          type: 'ENROLLMENT',
          link: 'QUIZZES'
        });
      }
    } catch (error) {
      console.error("Error handling request:", error);
    }
  };

  const getQuizStatus = (quiz: any) => {
    const now = new Date();
    if (quiz.availableFrom && new Date(quiz.availableFrom) > now) return 'UPCOMING';
    if (quiz.availableUntil && new Date(quiz.availableUntil) < now) return 'ENDED';
    return 'AVAILABLE';
  };

  const toggleUpcoming = async (quiz: any) => {
    try {
      const existing = upcomingQuizzes.find(u => u.quizId === quiz.id);
      if (existing) {
        const { doc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'upcoming_quizzes', existing.id));
      } else {
        const subtext = prompt('أدخل وصف الاختبار القادم (مثلاً: يبدأ بعد ساعتين):', 'سيبدأ قريباً');
        if (subtext === null) return;
        
        await addDoc(collection(db, 'upcoming_quizzes'), {
          quizId: quiz.id,
          title: quiz.title,
          subtext: subtext,
          teacherId: profile?.uid,
          createdAt: new Date().toISOString(),
          icon: 'GraduationCap'
        });
        alert('تمت إضافة الاختبار للقائمة القادمة! 🚀');
      }
    } catch (error) {
      console.error("Error toggling upcoming quiz:", error);
    }
  };

  const sendToParent = async (result: any) => {
    const hasWhatsAppCreds = (!!profile?.whatsappEmail && !!profile?.whatsappPassword) || !!profile?.whatsappToken;
    if (!result?.studentId || !hasWhatsAppCreds) {
      if (!hasWhatsAppCreds && (isTeacher() || isAdmin())) {
        toast.error('يرجى ضبط بيانات دخول واتساب في الإعدادات أولاً');
      }
      return;
    }

    try {
      // Fetch student profile to get parent phone
      const studentSnap = await getDoc(doc(db, 'users', result.studentId));
      if (!studentSnap.exists()) {
        toast.error('لم يتم العثور على بيانات الطالب');
        return;
      }

      const studentData = studentSnap.data();
      const phones = Array.from(new Set(
        [studentData.phone, studentData.parentPhone, studentData.fatherPhone]
          .filter(Boolean)
          .map(p => normalizePhoneNumber(p!))
      ));

      if (phones.length === 0) {
        toast.error('لم يتم العثور على أرقام هواتف لهذا الطالب');
        return;
      }

      const message = `تلميذنا العزيز/ ${result.studentName}
لقد تم تصحيح اختبار: *${result.quizTitle}*
الدرجة الحاصل عليها: *${result.score}%*
أطيب تمنياتنا بالتوفيق والنجاح المستمر. ✨`;

      for (const phone of phones) {
        await sendWhatsAppNotification(phone, message, {
          email: profile.whatsappEmail,
          password: profile.whatsappPassword,
          token: profile.whatsappToken
        });
      }
      
      toast.success(`تم إرسال النتيجة بنجاح! ✅`);
    } catch (error) {
      console.error('Error in sendToParent:', error);
      toast.error('حدث خطأ أثناء محاولة إرسال الرسالة');
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النتيجة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'quiz_results', resultId));
      toast.success('تم حذف النتيجة بنجاح');
      setSelectedResult(null);
    } catch (error) {
      console.error("Error deleting result:", error);
      toast.error('فشل في حذف النتيجة');
    }
  };

  const handleUpdateScore = async () => {
    if (!selectedResult || !gradingScore) return;
    const scoreNum = parseFloat(gradingScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      alert('يرجى إدخال درجة صحيحة بين 0 و 100');
      return;
    }

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const isPerfectScore = scoreNum === 100;

      await updateDoc(doc(db, 'quiz_results', selectedResult.id), {
        score: scoreNum,
        status: 'GRADED', 
        gradedManually: true,
        updatedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        confirmedBy: profile?.fullName
      });

      if (isPerfectScore && selectedResult.studentId) {
        await updateDoc(doc(db, 'users', selectedResult.studentId), {
          points: increment(5)
        });
        toast.success('تم منح الطالب 5 نقاط لتفوقه! 🌟');
      }

      toast.success('تم تحديث وتأكيد الدرجة بنجاح');
      setSelectedResult((prev: any) => ({ ...prev, score: scoreNum, status: 'GRADED' }));
      
      // Add In-App Notification
      await createNotification({
        userId: selectedResult.studentId,
        title: 'تم تصحيح اختبارك! 📝',
        message: `لقد حصلت على ${scoreNum}% في اختبار "${selectedResult.quizTitle}"`,
        type: 'QUIZ_GRADED',
        link: 'STUDENT_RESULTS'
      });

      // Auto-send WhatsApp
      sendToParent({ ...selectedResult, score: scoreNum });
    } catch (error) {
      console.error("Error updating score:", error);
      toast.error('فشل في تحديث الدرجة');
    }
  };

  const handleConfirmGrade = async () => {
    if (!selectedResult || !selectedResult.id) return;
    try {
      const totalEarned = selectedResult.answers.reduce((acc: number, a: any) => acc + (Number(a.earnedPoints) || 0), 0);
      const totalPossible = selectedResult.answers.reduce((acc: number, a: any) => acc + (Number(a.points) || 1), 0);
      const newPercentage = Math.round((totalEarned / totalPossible) * 100);

      const { doc, updateDoc } = await import('firebase/firestore');
      const isPerfectScore = newPercentage === 100;

      await updateDoc(doc(db, 'quiz_results', selectedResult.id), {
        answers: selectedResult.answers,
        score: newPercentage,
        earnedPoints: totalEarned,
        totalPoints: totalPossible,
        status: 'GRADED',
        confirmedAt: new Date().toISOString(),
        confirmedBy: profile?.fullName
      });
      
      if (isPerfectScore && selectedResult.studentId) {
        await updateDoc(doc(db, 'users', selectedResult.studentId), {
          points: increment(5)
        });
        toast.success('تم منح الطالب 5 نقاط لتفوقه! 🌟');
      }

      toast.success('تم تأكيد الدرجة بنجاح! ✅');
      setSelectedResult((prev: any) => ({ ...prev, score: newPercentage, status: 'GRADED', earnedPoints: totalEarned, totalPoints: totalPossible }));
      
      // Add In-App Notification
      await createNotification({
        userId: selectedResult.studentId,
        title: 'تم تصحيح اختبارك! 📝',
        message: `لقد حصلت على ${newPercentage}% في اختبار "${selectedResult.quizTitle}"`,
        type: 'QUIZ_GRADED',
        link: 'STUDENT_RESULTS'
      });

      // Auto-send WhatsApp
      sendToParent({ ...selectedResult, score: newPercentage });
    } catch (error) {
      console.error('Error confirming grade:', error);
      toast.error('حدث خطأ أثناء حفظ الدرجة');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[]) => {
    if (selectedIds.size === ids.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} عنصر؟ لا يمكن التراجع.`)) return;
    
    setLoading(true);
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const collectionName = activeTab === 'QUIZZES' ? 'quizzes' : 'quiz_results';
      
      await Promise.all(
        Array.from(selectedIds).map(id => deleteDoc(doc(db, collectionName, id)))
      );
      
      toast.success(`تم حذف ${selectedIds.size} عنصر بنجاح`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error('فشل في الحذف الجماعي');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const resetTo = (level: string) => {
    setSearchTerm('');
    switch (level) {
      case 'ROOT': setSelection({ stage: null, grade: null, subject: null, teacher: null }); break;
      case 'STAGE': setSelection(prev => ({ ...prev, grade: null, subject: null, teacher: null })); break;
      case 'GRADE': setSelection(prev => ({ ...prev, teacher: null })); break;
      case 'TEACHER': setSelection(prev => ({ ...prev, teacher: null })); break;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">بنك الامتحانات 🎓</h1>
          </div>
          <p className="text-slate-400 font-bold mr-15">استكشف وخذ اختباراتك التعليمية في أي وقت</p>
        </div>

        {(isTeacher() || isAdmin()) && (
          <Button
            className="relative z-10 bg-brand-secondary text-brand-primary hover:bg-white px-8 py-4 rounded-2xl font-black shadow-xl"
            onClick={() => onNavigate?.('CREATE_QUIZ')}
          >
            <Plus className="h-5 w-5 ml-2" />
            إنشاء اختبار جديد
          </Button>
        )}

        <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Tabs for Teachers/Admins */}
      {(isTeacher() || isAdmin()) && (
        <div className="flex gap-4 px-4 overflow-x-auto scrollbar-none pb-2">
            <button 
              onClick={() => setActiveTab('QUIZZES')}
              className={cn(
                "px-8 py-3 rounded-2xl font-black transition-all shrink-0",
                activeTab === 'QUIZZES' ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-400 hover:bg-slate-50"
              )}
            >
              قائمة الامتحانات
            </button>
            <button 
              onClick={() => setActiveTab('REQUESTS')}
              className={cn(
                "px-8 py-3 rounded-2xl font-black transition-all shrink-0 flex items-center gap-2",
                activeTab === 'REQUESTS' ? "bg-indigo-600 text-white shadow-xl" : "bg-white text-slate-400 hover:bg-slate-50"
              )}
            >
              طلبات الانضمام {pendingRequests.length > 0 && (
                <span className="h-5 w-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('VIOLATIONS')}
              className={cn(
                "px-8 py-3 rounded-2xl font-black transition-all shrink-0 flex items-center gap-2",
                activeTab === 'VIOLATIONS' ? "bg-red-600 text-white shadow-xl" : "bg-white text-slate-400 hover:bg-slate-50"
              )}
            >
              سجلات المخالفات {violations.length > 0 && (
                <span className="h-5 w-5 bg-white text-red-600 text-[10px] rounded-full flex items-center justify-center font-black">
                  {violations.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('RESULTS')}
              className={cn(
                "px-8 py-3 rounded-2xl font-black transition-all shrink-0 flex items-center gap-2",
                activeTab === 'RESULTS' ? "bg-indigo-600 text-white shadow-xl" : "bg-white text-slate-400 hover:bg-slate-50"
              )}
            >
              نتائج الطلاب {allResults.length > 0 && (
                <span className="h-5 w-5 bg-white text-indigo-600 text-[10px] rounded-full flex items-center justify-center font-black">
                  {allResults.length}
                </span>
              )}
            </button>
            {isTeacher() && (
                <button 
                  onClick={() => setActiveTab('UPCOMING')}
                  className={cn(
                    "px-8 py-3 rounded-2xl font-black transition-all shrink-0 flex items-center gap-2",
                    activeTab === 'UPCOMING' ? "bg-amber-600 text-white shadow-xl" : "bg-white text-slate-400 hover:bg-slate-50"
                  )}
                >
                  <Calendar className="h-5 w-5" />
                  الجدولة القادمة
                </button>
              )}
        </div>
      )}

      {activeTab === 'QUIZZES' && (
        <>
          {/* Navigation Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm overflow-x-auto pb-2 scrollbar-none px-4">
        {breadcrumbs.map((crumb: any, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            {i !== 0 && <ChevronLeft className="h-4 w-4 text-slate-300" />}
            <button
              onClick={() => resetTo(crumb.value)}
              className={cn(
                "px-4 py-2 rounded-full font-bold transition-all",
                i === breadcrumbs.length - 1
                  ? "bg-brand-primary text-white shadow-lg"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {crumb.label}
            </button>
          </div>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative group">
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-14 h-16 bg-white border-none shadow-premium rounded-2xl text-lg font-bold"
            placeholder="ابحث عن اختبار..."
          />
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center font-black text-slate-400">جاري تحميل البيانات... ⏳</div>
      ) : (
        <div className="pb-12">
          {currentLevel === 'STAGE' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STAGES.map(s => (
                <Card
                  key={s.id}
                  onClick={() => setSelection(prev => ({ ...prev, stage: s.id }))}
                  className="p-8 rounded-[2.5rem] border-none shadow-premium bg-white cursor-pointer hover:scale-105 transition-all text-center group"
                >
                  <div className="h-16 w-16 bg-brand-primary/5 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">{s.label}</h3>
                </Card>
              ))}
            </div>
          )}

          {currentLevel === 'GRADE' && selection.stage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {GRADES[selection.stage].map(g => (
                <Card
                  key={g.id}
                  onClick={() => setSelection(prev => ({ ...prev, grade: g.id }))}
                  className="p-8 rounded-[2.5rem] border-none shadow-premium bg-white cursor-pointer hover:scale-105 transition-all text-center group"
                >
                  <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">{g.label}</h3>
                </Card>
              ))}
            </div>
          )}

          {currentLevel === 'TEACHER' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Array.from(new Set(filteredQuizzes.map(q => q.teacherId))).map(tid => {
                const quiz = quizzes.find(q => q.teacherId === tid);
                const teacherName = quiz?.teacherName || 'معلم خبير';
                return (
                  <Card
                    key={tid}
                    onClick={() => setSelection(prev => ({ ...prev, teacher: tid }))}
                    className="p-10 rounded-[2.5rem] border-none shadow-premium bg-white cursor-pointer hover:shadow-2xl transition-all text-center group"
                  >
                    <div className="h-20 w-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-secondary group-hover:text-brand-primary transition-colors">
                      <User className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">أ. {teacherName}</h3>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      <span className="text-brand-primary font-bold text-[10px] bg-brand-primary/5 px-3 py-1 rounded-full">
                        معلم {quiz?.subject}
                      </span>
                    </div>
                    <p className="text-slate-400 font-bold mt-3 text-xs">
                      {filteredQuizzes.filter(q => q.teacherId === tid).length} اختبار متاح
                    </p>
                  </Card>
                );
              })}
              {Array.from(new Set(filteredQuizzes.map(q => q.teacherId))).length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 font-bold">لا توجد اختبارات أو معلمون متاحون لهذا الصف حالياً.</div>
              )}
            </div>
          )}

          {currentLevel === 'QUIZZES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                  <div className="p-8 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit">
                          {quiz.subject}
                        </span>
                        {getQuizStatus(quiz) === 'UPCOMING' && (
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black w-fit flex items-center gap-1">
                            <Clock className="h-3 w-3" /> يفتح: {formatDateTime(quiz.availableFrom)}
                          </span>
                        )}
                        {getQuizStatus(quiz) === 'ENDED' && (
                          <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black w-fit">
                            انتهى الوقت ❌
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <div 
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                            selectedIds.has(quiz.id) ? "bg-brand-primary text-white" : "bg-slate-50 text-slate-300 hover:bg-slate-100"
                          )}
                          onClick={(e) => { e.stopPropagation(); toggleSelection(quiz.id); }}
                        >
                          {selectedIds.has(quiz.id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                        </div>
                        {(isAdmin() || (isTeacher() && quiz.teacherId === profile?.uid)) && (
                          <div className="flex gap-2">
                             <div 
                               className={cn(
                                 "h-10 w-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
                                 upcomingQuizzes.some(u => u.quizId === quiz.id) ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                               )}
                               onClick={(e) => { e.stopPropagation(); toggleUpcoming(quiz); }}
                               title="جدولة كاختبار قادم"
                             >
                                <Calendar className="h-4 w-4" />
                             </div>
                             <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); onEditQuiz?.(quiz.id); }}>
                               <Pencil className="h-4 w-4" />
                             </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-brand-primary transition-colors">{quiz.title}</h3>
                      <p className="text-sm text-slate-400 font-bold">{quiz.teacherName || 'معلم خبير'}</p>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-300" />
                        <span className="text-xs font-black text-slate-600">{quiz.timeLimit} دقيقة</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-300" />
                        <span className="text-xs font-black text-slate-600">{quiz.participantsCount || 0} طالب</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      {isAdmin() || isTeacher() || enrollments.includes(quiz.id) || authorizedQuizzes.includes(quiz.id) ? (
                        <Button
                          variant={studentResultsData.some(r => r.courseId === quiz.id) ? "outline" : "primary"}
                          className="w-full h-12 rounded-xl font-black shadow-lg shadow-brand-primary/10 group-hover:shadow-brand-primary/30 transition-all disabled:opacity-50"
                          onClick={() => onStartQuiz?.(quiz.id)}
                          disabled={getQuizStatus(quiz) !== 'AVAILABLE' || studentResultsData.some(r => r.courseId === quiz.id)}
                        >
                          {studentResultsData.some(r => r.courseId === quiz.id) ? 'لقد أتممت الاختبار بالفعل ✔️' : 
                           getQuizStatus(quiz) === 'UPCOMING' ? 'بانتظار الموعد...' : 
                           getQuizStatus(quiz) === 'ENDED' ? 'انتهت صلاحية الاختبار' : 'بدء الاختبار الآن'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full h-12 rounded-xl font-black border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                          onClick={() => handleRequestEnrollment(quiz)}
                        >
                          <Lock className="h-4 w-4" />
                          طلب اشتراك بالامتحان
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {filteredQuizzes.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 font-bold">لا توجد اختبارات متاحة لهذه الفئة.</div>
              )}
            </div>
          )}
          </div>
        )}
        </>
      )}

      {activeTab === 'REQUESTS' && (
        /* REQUESTS VIEW */
        <div className="space-y-6 pb-20">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-800">طلبات انتظار الموافقة 📥</h3>
              <p className="text-xs text-slate-400 font-bold">بإمكانك قبول أو رفض انضمام الطلاب لامتحاناتك من هنا</p>
            </div>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-right border-collapse">
                   <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">الطالب</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">الامتحان</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">التاريخ</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-left">الإجراءات</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {pendingRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6">
                            <p className="font-black text-slate-900">{req.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{req.studentPhone}</p>
                          </td>
                          <td className="p-6">
                            <p className="font-bold text-slate-700">{req.courseTitle}</p>
                          </td>
                          <td className="p-6">
                            <p className="text-xs font-bold text-slate-500">{new Date(req.enrolledAt).toLocaleDateString('ar-EG')}</p>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center justify-end gap-2">
                               <Button 
                                 size="sm" 
                                 className="rounded-xl h-9 px-4 font-black bg-emerald-600 hover:bg-emerald-700"
                                 onClick={() => handleApproveRequest(req.id, true)}
                               >
                                 قبول ✅
                               </Button>
                               <Button 
                                 variant="outline"
                                 size="sm" 
                                 className="rounded-xl h-9 px-4 font-black text-red-500 border-red-100 hover:bg-red-50"
                                 onClick={() => handleApproveRequest(req.id, false)}
                               >
                                 رفض
                               </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pendingRequests.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-slate-400 font-bold">لا توجد طلبات معلقة حالياً.</td>
                        </tr>
                      )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'VIOLATIONS' && (
        /* VIOLATIONS VIEW */
        <div className="space-y-6 pb-20">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-slate-50">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <AlertCircle className="h-5 w-5" />
                 </div>
                 <div className="text-right">
                    <h3 className="text-xl font-black text-slate-800">سجل مخالفات الامتحانات 🛡️</h3>
                    <p className="text-xs text-slate-400 font-bold">متابعة دقيقة لمحاولات الغش وتصوير الشاشة</p>
                 </div>
               </div>
            </div>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-right border-collapse">
                   <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-6 w-14 border-b border-slate-100">
                           <div 
                             className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center cursor-pointer text-slate-400 hover:text-brand-primary"
                             onClick={() => selectAll(violations.map(v => v.id))}
                           >
                             {selectedIds.size === violations.length && violations.length > 0 ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                           </div>
                        </th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">الطالب</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">الامتحان</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">نوع المخالفة</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">التاريخ</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {violations.map((v) => (
                        <tr key={v.id} className={cn("hover:bg-red-50/30 transition-colors", selectedIds.has(v.id) && "bg-red-50/50")}>
                          <td className="p-6">
                             <div 
                               className={cn(
                                 "h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-all",
                                 selectedIds.has(v.id) ? "bg-red-600 text-white" : "bg-white border border-slate-200 text-slate-300"
                               )}
                               onClick={() => toggleSelection(v.id)}
                             >
                               {selectedIds.has(v.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                             </div>
                          </td>
                          <td className="p-6">
                            <p className="font-black text-slate-900">{v.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">UID: {v.studentId?.slice(0, 8)}</p>
                          </td>
                          <td className="p-6">
                            <p className="font-bold text-slate-700">{v.quizTitle}</p>
                          </td>
                          <td className="p-6 text-right">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black ring-4 ring-red-50">
                               <AlertCircle className="h-3 w-3" />
                               {v.cheatNote || 'مخالفة غير محددة'}
                            </div>
                          </td>
                          <td className="p-6">
                            <p className="text-xs font-bold text-slate-500">{new Date(v.submittedAt).toLocaleString('en-US')}</p>
                          </td>
                        </tr>
                      ))}
                      {violations.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-slate-400 font-bold">لا توجد مخالفات مسجلة حالياً. ✅</td>
                        </tr>
                      )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'RESULTS' && (
        /* RESULTS VIEW */
        <div className="space-y-6 pb-20">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-slate-50">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                 </div>
                 <div className="text-right">
                    <h3 className="text-xl font-black text-slate-800">نتائج امتحانات الطلاب 🎓</h3>
                    <p className="text-xs text-slate-400 font-bold">جميع الدرجات والمحاولات الرسمية لطلابك</p>
                 </div>
               </div>
            </div>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-right border-collapse">
                   <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-6 w-14 border-b border-slate-100">
                           <div 
                             className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center cursor-pointer text-slate-400 hover:text-brand-primary"
                             onClick={() => selectAll(allResults.map(r => r.id))}
                           >
                             {selectedIds.size === allResults.length && allResults.length > 0 ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                           </div>
                        </th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">الطالب</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">الامتحان</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">الدرجة</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">التاريخ</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {allResults.map((v) => (
                        <tr key={v.id} className={cn("hover:bg-indigo-50/30 transition-colors group", selectedIds.has(v.id) && "bg-indigo-50/50")}>
                          <td className="p-6">
                             <div 
                               className={cn(
                                 "h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-all",
                                 selectedIds.has(v.id) ? "bg-brand-primary text-white" : "bg-white border border-slate-200 text-slate-300"
                               )}
                               onClick={() => toggleSelection(v.id)}
                             >
                               {selectedIds.has(v.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                             </div>
                          </td>
                          <td className="p-6">
                            <p className="font-black text-slate-900">{v.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">UID: {v.studentId?.slice(0, 8)}</p>
                          </td>
                          <td className="p-6">
                            <p className="font-bold text-slate-700">{v.quizTitle}</p>
                          </td>
                          <td className="p-6">
                            <div className="flex flex-col gap-2">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-black ring-4 w-fit",
                                v.score >= 50 ? "bg-emerald-100 text-emerald-700 ring-emerald-50" : "bg-red-100 text-red-700 ring-red-50"
                              )}>
                                {v.score}%
                              </span>
                              {v.status === 'FLAGGED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold border border-red-100 w-fit">
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  محاولة غش (تم الإنهاء)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 justify-end">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-10 w-10 p-0 rounded-xl hover:bg-white text-slate-400 hover:text-brand-primary"
                                onClick={() => {
                                  setSelectedResult(v);
                                  setGradingScore(v.score.toString());
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-10 w-10 p-0 rounded-xl hover:bg-white text-slate-400 hover:text-red-500"
                                onClick={() => handleDeleteResult(v.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-10 w-10 p-0 rounded-xl hover:bg-white text-slate-400 hover:text-emerald-500"
                                onClick={() => onNavigate?.({ type: 'MESSAGES', contactId: v.studentId })}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {allResults.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-slate-400 font-bold">لا توجد نتائج مسجلة حالياً.</td>
                        </tr>
                      )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'UPCOMING' && isTeacher() && (
        <div className="space-y-6 pb-20">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-slate-50">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Calendar className="h-5 w-5" />
                 </div>
                 <div className="text-right">
                    <h3 className="text-xl font-black text-slate-800">إدارة الاختبارات القادمة 🗓️</h3>
                    <p className="text-xs text-slate-400 font-bold">تحكم في ما يراه الطلاب في قسم "الاختبارات القادمة"</p>
                 </div>
               </div>
            </div>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-right border-collapse">
                   <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">اسم الاختبار</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">الوصف المعروض</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">تاريخ الإضافة</th>
                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-left">الإجراءات</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {upcomingQuizzes.filter(u => u.teacherId === profile?.uid).map((uq) => (
                        <tr key={uq.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-6">
                            <p className="font-black text-slate-900">{uq.title}</p>
                          </td>
                          <td className="p-6">
                            <p className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-fit">{uq.subtext}</p>
                          </td>
                          <td className="p-6">
                            <p className="text-xs font-bold text-slate-500">{new Date(uq.createdAt).toLocaleDateString('ar-EG')}</p>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center justify-end gap-2">
                               <Button 
                                 variant="outline"
                                 size="sm" 
                                 className="rounded-xl h-9 px-4 font-black text-red-500 border-red-100 hover:bg-red-50"
                                 onClick={() => toggleUpcoming({ id: uq.quizId })}
                               >
                                 إزالة من القائمة
                               </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {upcomingQuizzes.filter(u => u.teacherId === profile?.uid).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-slate-400 font-bold">لم تقم بجدولة أي اختبارات قادمة بعد.</td>
                        </tr>
                      )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Result Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
               <div>
                  <h3 className="text-2xl font-black text-slate-800">تفاصيل إجابة الطالب 📝</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-slate-500 font-bold">{selectedResult.studentName} - {selectedResult.quizTitle}</p>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-black">
                      مدة الحل: {selectedResult.timeTakenMinutes || 0} دقيقة
                    </span>
                  </div>
               </div>
               <Button 
                variant="ghost" 
                size="sm" 
                className="h-12 w-12 p-0 rounded-2xl hover:bg-white text-slate-400"
                onClick={() => setSelectedResult(null)}
               >
                 <X className="h-6 w-6" />
               </Button>
            </div>
            
            <CardContent className="p-8 max-h-[70vh] overflow-y-auto space-y-8 scrollbar-thin">
               {/* Essay Answers Section */}
               <div className="space-y-6">
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-brand-primary" />
                    المراجعة والتصحيح اليدوي
                  </h4>
                  
                  {isHydrating ? (
                    <div className="p-20 text-center animate-pulse bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                      <p className="text-slate-400 font-black text-lg">جاري استرجاع بيانات الإجابات المقالية... ⏳</p>
                    </div>
                  ) : Array.isArray(selectedResult.answers) ? (
                    selectedResult.answers.filter((a: any) => a.type === 'ESSAY').length > 0 ? (
                      <div className="space-y-6">
                        {selectedResult.answers.filter((a: any) => a.type === 'ESSAY').map((ans: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-black text-slate-500 tracking-wider">سؤال مقالي</p>
                              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                                <Target className="h-4 w-4 text-indigo-500" />
                                <span className="text-xs font-black text-slate-400">الدرجة:</span>
                                <input 
                                  type="number" 
                                  className="w-10 bg-transparent font-black text-indigo-600 outline-none text-center"
                                  value={ans.earnedPoints || 0}
                                  onChange={e => {
                                    const val = Math.min(Number(e.target.value), ans.points || 1);
                                    const newAnswers = [...selectedResult.answers];
                                    const ansIdx = selectedResult.answers.findIndex((a: any) => a.id === ans.id);
                                    if (ansIdx !== -1) {
                                      newAnswers[ansIdx] = { ...ans, earnedPoints: val, isCorrect: val > 0 };
                                      setSelectedResult({ ...selectedResult, answers: newAnswers });
                                    }
                                  }}
                                  max={ans.points || 1}
                                  min="0"
                                />
                                <span className="text-xs font-black text-slate-300">/ {ans.points || 1}</span>
                              </div>
                            </div>
                            <p className="text-base font-bold text-slate-800">{ans.text || ans.questionText}</p>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 min-h-[100px]">
                              <p className="text-slate-600 leading-relaxed font-bold">{ans.studentAnswer || ans.answer || 'لم يتم تقديم إجابة.'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                        <p className="text-slate-400 font-bold">هذا الاختبار لا يحتوي على أسئلة مقالية. ✅</p>
                      </div>
                    )
                  ) : (
                    <div className="p-12 text-center bg-amber-50 rounded-[2.5rem] border-2 border-dashed border-amber-100">
                      <p className="text-amber-700 font-bold">
                        ⚠️ تعذر استرجاع تفاصيل الأسئلة لهذا الامتحات القديم. 
                        يمكنك فقط تعديل الدرجة النهائية مباشرة بالأسفل.
                      </p>
                    </div>
                  )}
               </div>

                {/* Score Update Section */}
                <div className="pt-8 border-t border-slate-50 space-y-8">
                   <div className="bg-indigo-600 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-100/50">
                     <div className="text-right">
                       <p className="text-indigo-100 font-bold mb-1">الدرجة النهائية</p>
                       <h5 className="text-6xl font-black">
                         {selectedResult.status === 'GRADED' ? selectedResult.score : '?'}%
                       </h5>
                       <p className="text-[10px] text-indigo-200 mt-2 font-black uppercase tracking-widest">
                         {selectedResult.status === 'GRADED' ? `تم التأكيد بواسطة أ. ${selectedResult.confirmedBy || 'المعلم'}` : 'بانتظار التأكيد'}
                       </p>
                     </div>
                     
                     <div className="flex flex-col gap-4 w-full md:w-auto">
                          <Button
                            variant="primary"
                            className="bg-brand-primary text-white hover:bg-slate-900 h-14 px-10 rounded-2xl font-black shadow-lg text-lg flex items-center justify-center gap-2"
                            onClick={handleConfirmGrade}
                          >
                          تأكيد الدرجة النهائية ✅
                        </Button>
                        
                        <Button 
                          className="bg-emerald-500 text-white hover:bg-emerald-600 h-14 px-10 rounded-2xl font-black shadow-lg text-lg flex items-center justify-center gap-2"
                          onClick={() => sendToParent(selectedResult)}
                        >
                          <MessageSquare className="h-6 w-6" />
                          إرسال النتيجة لولي الأمر (واتساب) 📱
                        </Button>
                        
                        <div className="flex gap-2">
                          <Input 
                            type="number" 
                            placeholder="تعديل يدوي..."
                            value={gradingScore}
                            onChange={(e) => setGradingScore(e.target.value)}
                            className="bg-white/10 border-white/20 text-white font-black h-12 rounded-xl text-center focus:bg-white focus:text-indigo-900 transition-all placeholder:text-white/40"
                          />
                          <Button 
                            variant="primary" 
                            size="sm"
                            className="bg-indigo-500 hover:bg-indigo-400 h-12 px-4 rounded-xl font-black"
                            onClick={handleUpdateScore}
                          >
                            تعديل مباشر
                          </Button>
                        </div>
                     </div>
                   </div>

                   <div className="flex justify-center">
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold flex items-center gap-2"
                        onClick={() => handleDeleteResult(selectedResult.id)}
                     >
                       <Trash2 className="h-4 w-4" />
                       حذف هذه النتيجة نهائياً 🗑️
                     </Button>
                   </div>
                </div>
             </CardContent>
          </Card>
        </div>
      )}
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-xl border border-white/20 px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-10 duration-500">
           <div className="flex items-center gap-2">
             <div className="h-10 w-10 bg-brand-primary text-white rounded-xl flex items-center justify-center font-black">
               {selectedIds.size}
             </div>
             <p className="text-white font-black text-sm">عنصر محدد</p>
           </div>
           
           <div className="h-8 w-px bg-white/10" />
           
           <div className="flex items-center gap-2">
             <Button 
               variant="outline" 
               className="rounded-xl h-12 bg-white/5 border-white/10 text-white hover:bg-red-500 hover:border-red-500 font-black transition-all"
               onClick={handleBulkDelete}
             >
               <Trash2 className="h-4 w-4 ml-2" />
               حذف المحدد
             </Button>
             
             <Button 
               variant="ghost" 
               className="text-slate-400 hover:text-white font-bold"
               onClick={() => setSelectedIds(new Set())}
             >
               إلغاء التحديد
             </Button>
           </div>
        </div>
      )}
    </div>
  );
};
