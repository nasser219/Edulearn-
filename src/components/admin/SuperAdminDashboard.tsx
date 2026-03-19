import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, doc, updateDoc, deleteDoc, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  Trash2, 
  Search, 
  ShieldAlert, 
  GraduationCap, 
  UserRound,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  CreditCard,
  Award,
  BookOpen,
  AlertCircle,
  Settings,
  Key,
  Phone,
  Layout,
  Globe,
  Facebook,
  Instagram,
  Linkedin,
  ArrowBigUpDash,
  Pencil,
  RotateCcw
} from 'lucide-react';
import { STAGES, GRADES } from '../../lib/constants';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { Quizzes } from '../dashboard/Quizzes';
import { AdminAnnouncements } from './AdminAnnouncements';
import { AdminManagement } from './AdminManagement';
import { Megaphone, ShieldCheck } from 'lucide-react';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isProfileComplete: boolean;
  isSuspended: boolean;
  entranceCode?: string;
  createdAt: string;
  phone?: string;
  stage?: 'primary' | 'prep' | 'secondary';
  grade?: string;
  isApproved?: boolean;
  photoURL?: string;
}

interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  courseTitle: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface Payment {
  id: string;
  studentId: string;
  courseId: string;
  teacherId?: string;
  amount: number | string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  method: string;
}

interface QuizResult {
  id: string;
  quizId?: string;
  courseId?: string;
  quizTitle: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  score: number;
  submittedAt: string;
  isCheated: boolean;
  status: 'SUBMITTED' | 'FLAGGED';
}

// ============================================================
// ✅ FIX 1: تعريف القائمة البيضاء خارج الـ Component تماماً
// هكذا لا يتم إعادة إنشاؤها في كل render، وتكون متاحة دائماً
// ============================================================
export const PROTECTED_EMAILS = [
  'ayaayad147258@gmail.com',
  'nasseryasser832000@gmail.com',
  'admin@edu.com'
];

// ✅ FIX 2: isProtectedAdmin كدالة عادية خارج الـ Component
// هذا يحل مشكلة TDZ (Temporal Dead Zone) نهائياً
export const isProtectedAdmin = (email?: string): boolean => {
  if (!email) return false;
  return PROTECTED_EMAILS.includes(email.toLowerCase().trim());
};

export const SuperAdminDashboard = ({ forceFilterRole }: { forceFilterRole?: 'STUDENT' | 'TEACHER' }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER' | 'PENDING'>(forceFilterRole || 'ALL');
  const [activeView, setActiveView] = useState<'USERS' | 'TEACHERS' | 'STUDENTS' | 'QUIZZES' | 'REVENUE' | 'RESULTS' | 'SETTINGS' | 'PROMOTE' | 'ADVERTISEMENTS' | 'ADMINS'>('USERS');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [teachersTitle, setTeachersTitle] = useState('');
  const [teachersDesc, setTeachersDesc] = useState('');
  const [benefitsTitle, setBenefitsTitle] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<UserData>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { user, isAdmin: checkIsAdmin, hasPermission, allAdminRoles } = useEducatorsAuth();

  // ✅ FIX 3: الآن isProtectedAdmin معرفة قبل أي useMemo - لا مشكلة TDZ
  const isAuthorized = React.useMemo(
    () => checkIsAdmin(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.email, checkIsAdmin]
  );

  const isSuperAdmin = React.useMemo(() => {
    const adminData = user?.email ? allAdminRoles[user.email.toLowerCase()] : null;
    return adminData?.role === 'SUPER' || isProtectedAdmin(user?.email);
  }, [user?.email, allAdminRoles]);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      (snap) => {
        setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
        setLoading(false);
      }
    );

    const unsubEnrollments = onSnapshot(collection(db, 'enrollments'), (snap) => {
      setEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)));
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    });

    const unsubResults = onSnapshot(
      query(collection(db, 'quiz_results'), orderBy('submittedAt', 'desc')),
      (snap) => {
        setQuizResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as QuizResult)));
      }
    );

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGroqApiKey(data.groqApiKey || '');
        setWhatsappNumber(data.whatsappNumber || '');
        setHeroTitle(data.heroTitle || '');
        setHeroSubtitle(data.heroSubtitle || '');
        setTeachersTitle(data.teachersTitle || '');
        setTeachersDesc(data.teachersDesc || '');
        setBenefitsTitle(data.benefitsTitle || '');
        setFacebookUrl(data.facebookUrl || '');
        setInstagramUrl(data.instagramUrl || '');
        setLinkedinUrl(data.linkedinUrl || '');
      }
    });

    return () => {
      unsubUsers();
      unsubEnrollments();
      unsubPayments();
      unsubResults();
      unsubSettings();
    };
  }, [isAuthorized]);
  // ✅ FIX 4: dependency صحيح - كان [isSuperAdmin] خطأ لأنه لا يؤثر على الـ subscriptions

  const stats = React.useMemo(() => ({
    total: users.length,
    students: users.filter(u => u.role === 'STUDENT').length,
    teachers: users.filter(u => u.role === 'TEACHER').length,
    pending: users.filter(u => !u.isApproved).length
  }), [users]);

  if (!isAuthorized && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50" dir="rtl">
        <div className="max-w-md w-full text-center space-y-8 bg-white p-12 rounded-[3rem] shadow-premium border-2 border-red-50">
          <div className="h-24 w-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-red-100">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">الدخول محظور! 🛡️</h2>
            <p className="text-slate-500 font-bold leading-relaxed">
              عذراً، هذه المنطقة مخصصة حصرياً للسوبر أدمن الرئيسي للمنصة. لا تملك الصلاحيات الكافية للوصول إلى مركز القيادة.
            </p>
          </div>
          <div className="pt-4">
            <Button variant="outline" className="w-full h-14 rounded-xl font-black" onClick={() => window.location.href = '/'}>
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleSuspend = async (uid: string, currentStatus: boolean, userEmail: string) => {
    if (isProtectedAdmin(userEmail)) {
      alert("لا يمكن حظر حساب السوبر أدمن! 🛡️");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { isSuspended: !currentStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteUser = async (uid: string, userEmail: string) => {
    if (isProtectedAdmin(userEmail)) {
      alert("لا يمكن حذف حساب السوبر أدمن! 🛡️");
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleApprove = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: true });
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleChangeRole = async (uid: string, newRole: 'STUDENT' | 'TEACHER' | 'ADMIN') => {
    const roleLabel = newRole === 'TEACHER' ? 'مدرس' : newRole === 'ADMIN' ? 'مدير' : 'طالب';
    if (!window.confirm(`هل أنت متأكد من تغيير رتبة المستخدم إلى ${roleLabel}؟`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'system'), {
        groqApiKey: groqApiKey.trim(),
        whatsappNumber: whatsappNumber.trim(),
        heroTitle: heroTitle.trim(),
        heroSubtitle: heroSubtitle.trim(),
        teachersTitle: teachersTitle.trim(),
        teachersDesc: teachersDesc.trim(),
        benefitsTitle: benefitsTitle.trim(),
        facebookUrl: facebookUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('تم حفظ الإعدادات بنجاح! ✅');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات.');
    }
  };

  const PROMOTION_SEQUENCE: Record<string, { nextGrade: string; nextStage?: string }> = {
    'p1': { nextGrade: 'p2' },
    'p2': { nextGrade: 'p3' },
    'p3': { nextGrade: 'p4' },
    'p4': { nextGrade: 'p5' },
    'p5': { nextGrade: 'p6' },
    'p6': { nextGrade: 'm1', nextStage: 'prep' },
    'm1': { nextGrade: 'm2' },
    'm2': { nextGrade: 'm3' },
    'm3': { nextGrade: 's1', nextStage: 'secondary' },
    's1': { nextGrade: 's2' },
    's2': { nextGrade: 's3' },
    's3': { nextGrade: 'GRADUATED' },
  };

  const handleBulkPromote = async () => {
    const studentsToPromote = users.filter(u => selectedUserIds.includes(u.uid) && u.role === 'STUDENT');
    if (studentsToPromote.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من ترقية ${studentsToPromote.length} طالب إلى الصف التالي؟`)) return;

    setLoading(true);
    let successCount = 0;
    try {
      for (const student of studentsToPromote) {
        const next = PROMOTION_SEQUENCE[student.grade || ''];
        if (next) {
          await updateDoc(doc(db, 'users', student.uid), {
            grade: next.nextGrade,
            ...(next.nextStage ? { stage: next.nextStage } : {})
          });
          successCount++;
        }
      }
      alert(`تمت ترقية ${successCount} طالب بنجاح! 🎓`);
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Promotion Error:", error);
      alert("حدث خطأ أثناء الترقية.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (userData: UserData) => {
    setSelectedUserForEdit(userData);
    setEditData({ ...userData });
    setIsEditModalOpen(true);
  };

  const handleAdminUpdateUser = async () => {
    if (!selectedUserForEdit?.uid) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', selectedUserForEdit.uid), {
        fullName: editData.fullName,
        email: editData.email,
        phone: editData.phone,
        stage: editData.stage,
        grade: editData.grade,
        isApproved: editData.isApproved,
        isSuspended: editData.isSuspended,
        points: Number((editData as any).points) || 0,
      } as any);
      setIsEditModalOpen(false);
      alert('تم تحديث بيانات المستخدم بنجاح! ✅');
    } catch (error) {
      console.error("Admin Update Error:", error);
      alert('حدث خطأ أثناء التحديث.');
    } finally {
      setIsSaving(false);
    }
  };

  const usersWithStats = React.useMemo(() => {
    const paymentsIdx: Record<string, Payment[]> = {};
    payments.forEach(p => {
      if (!paymentsIdx[p.studentId]) paymentsIdx[p.studentId] = [];
      paymentsIdx[p.studentId].push(p);
    });

    const resultsIdx: Record<string, QuizResult[]> = {};
    quizResults.forEach(r => {
      if (!resultsIdx[r.studentId]) resultsIdx[r.studentId] = [];
      resultsIdx[r.studentId].push(r);
    });

    const enrollmentsIdx: Record<string, Enrollment[]> = {};
    enrollments.forEach(e => {
      if (!enrollmentsIdx[e.studentId]) enrollmentsIdx[e.studentId] = [];
      enrollmentsIdx[e.studentId].push(e);
    });

    return users.map(u => {
      if (u.role !== 'STUDENT') return { ...u, stats: null };

      const sPayments = paymentsIdx[u.uid] || [];
      const sResults = resultsIdx[u.uid] || [];
      const sEnrollments = enrollmentsIdx[u.uid] || [];

      const totalPaid = sPayments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const studentScores = sResults.map(r => r.score);
      const avgScore = studentScores.length > 0
        ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length)
        : null;

      return {
        ...u,
        stats: {
          totalPaid,
          avgScore,
          scoreCount: studentScores.length,
          approvedEnrollments: sEnrollments.filter(e => e.status === 'APPROVED')
        }
      };
    });
  }, [users, payments, quizResults, enrollments]);

  const filteredUsers = React.useMemo(() => {
    return usersWithStats.filter(u => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        u.fullName?.toLowerCase().includes(search) ||
        u.entranceCode?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search) ||
        u.phone?.includes(searchTerm);

      let matchesFilter = true;
      if (filter === 'ALL') matchesFilter = true;
      else if (filter === 'PENDING') matchesFilter = !u.isApproved;
      else matchesFilter = u.role === filter;

      return matchesSearch && matchesFilter;
    });
  }, [usersWithStats, searchTerm, filter]);

  const groupedStudents = React.useMemo(() => {
    const students = usersWithStats.filter(u => u.role === 'STUDENT');
    return {
      primary: students.filter(u => u.stage === 'primary' || !u.stage),
      prep: students.filter(u => u.stage === 'prep'),
      secondary: students.filter(u => u.stage === 'secondary')
    };
  }, [usersWithStats]);

  const teacherRevenue = React.useMemo(() => {
    return users
      .filter(u => u.role === 'TEACHER')
      .map(teacher => {
        const teacherPayments = payments.filter(
          p => p.teacherId === teacher.uid && p.status === 'COMPLETED'
        );
        const totalEarned = teacherPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        return { teacher, teacherPayments, totalEarned };
      });
  }, [users, payments]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl shadow-slate-200">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">لوحة التحكم العليا 👑</h1>
          <p className="text-slate-400 font-bold">مركز التحكم الشامل في منصة التربويين</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl font-bold gap-2 cursor-default"
          >
            <div className={cn("h-2 w-2 rounded-full bg-green-500", loading && "animate-pulse")} />
            مزامنة مباشرة ⚡
          </Button>
          <div className="text-left md:text-right border-r border-white/10 pr-4">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">تاريخ اليوم</p>
            <p className="text-lg font-black">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'إجمالي المستخدمين', value: stats.total, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'الطلاب المسجلين', value: stats.students, icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
          { label: 'المعلمون', value: stats.teachers, icon: UserRound, color: 'bg-amber-50 text-amber-600' },
          { label: 'بانتظار الموافقة', value: stats.pending, icon: ShieldAlert, color: 'bg-red-50 text-red-600' },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-premium hover:shadow-2xl transition-all duration-300 group rounded-[2rem]">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] shadow-premium border border-slate-50 overflow-x-auto no-scrollbar">
        {[
          { view: 'USERS', label: 'إدارة المستخدمين', icon: Users, color: 'bg-slate-900' },
          { view: 'TEACHERS', label: 'المعلمون', icon: UserRound, color: 'bg-amber-500' },
          { view: 'STUDENTS', label: 'تقارير الطلاب', icon: GraduationCap, color: 'bg-blue-600' },
          { view: 'QUIZZES', label: 'بنك الامتحانات', icon: FileCheck, color: 'bg-indigo-600' },
          { view: 'REVENUE', label: 'الأرباح', icon: CreditCard, color: 'bg-emerald-600' },
          { view: 'RESULTS', label: 'النتائج', icon: Award, color: 'bg-purple-600' },
          { view: 'ADVERTISEMENTS', label: 'الإعلانات', icon: Megaphone, color: 'bg-brand-primary' },
          { view: 'PROMOTE', label: 'الترقية', icon: ArrowBigUpDash, color: 'bg-indigo-600' },
          { view: 'SETTINGS', label: 'الإعدادات', icon: Settings, color: 'bg-red-600' },
          { view: 'ADMINS', label: 'الصلاحيات', icon: ShieldCheck, color: 'bg-amber-600' },
        ].map(({ view, label, icon: Icon, color }) => (
          <button
            key={view}
            onClick={() => setActiveView(view as any)}
            className={cn(
              "flex-1 h-16 min-w-[160px] rounded-[1.5rem] font-black transition-all flex items-center justify-center gap-3",
              activeView === view ? `${color} text-white shadow-xl scale-[1.02]` : "text-slate-400 hover:bg-slate-50"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>

      {/* ==================== USERS VIEW ==================== */}
      {activeView === 'USERS' && !hasPermission('MANAGE_USERS') ? (
        <AccessDenied message='تحتاج إلى صلاحية "إدارة المستخدمين" للوصول لهذه البيانات.' />
      ) : activeView === 'USERS' ? (
        <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[3rem]">
          <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-brand-primary rounded-full animate-ping" />
                <h2 className="text-2xl font-black text-slate-900">إدارة الحسابات وطلبات الانضمام</h2>
              </div>
              <p className="text-sm text-slate-400 font-bold mr-6">تحكم كامل في تفعيل أو حظر المستخدمين</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="relative group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الكود، أو البريد..."
                  className="h-14 pr-12 pl-6 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold w-80 focus:ring-4 focus:ring-brand-primary/10 focus:bg-white focus:border-brand-primary outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative group">
                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <select
                  className="h-14 pr-12 pl-6 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none appearance-none hover:bg-slate-100 transition-colors"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="ALL">جميع الأدوار</option>
                  <option value="PENDING">بانتظار الموافقة ⏳</option>
                  <option value="STUDENT">طلاب فقط</option>
                  <option value="TEACHER">مدرسين فقط</option>
                </select>
              </div>
            </div>

            {selectedUserIds.length > 0 && (
              <div className="flex items-center gap-3 animate-in slide-in-from-top-4 border-t border-slate-50 pt-6 mt-6 w-full">
                <span className="text-xs font-black text-slate-400 ml-2">({selectedUserIds.length} مستخدم محدد)</span>
                <Button
                  onClick={handleBulkPromote}
                  isLoading={loading}
                  className="h-12 px-6 rounded-xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-100 border-none"
                >
                  <ArrowBigUpDash className="h-4 w-4 ml-2" />
                  ترقية المجموعة للصَّف التالي 📈
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserIds([])}
                  className="h-12 w-12 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-6 w-12 text-center border-b border-slate-100">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded-lg border-2 border-slate-200 text-brand-primary focus:ring-brand-primary/20 accent-brand-primary"
                        checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.filter(u => u.role === 'STUDENT').length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(filteredUsers.filter(u => u.role === 'STUDENT').map(u => u.uid));
                          } else {
                            setSelectedUserIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">المستخدم وتاريخ الانضمام</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">الرتبة</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">بيانات الوصول</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">حالة الحساب</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-left border-b border-slate-100">التحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-12 w-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-slate-400 font-bold">جاري تحميل البيانات...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-24 text-center text-slate-400 font-bold">
                        لا توجد بيانات تطابق بحثك حالياً. 🔍
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.uid}
                        className={cn(
                          "group transition-all duration-300",
                          u.isSuspended ? "bg-red-50/20 grayscale-[0.5]" : "hover:bg-slate-50/50"
                        )}
                      >
                        <td className="p-6 text-center">
                          {u.role === 'STUDENT' && (
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded-lg border-2 border-slate-200 text-brand-primary focus:ring-brand-primary/20 accent-brand-primary"
                              checked={selectedUserIds.includes(u.uid)}
                              onChange={() => {
                                setSelectedUserIds(prev =>
                                  prev.includes(u.uid) ? prev.filter(id => id !== u.uid) : [...prev, u.uid]
                                );
                              }}
                            />
                          )}
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all shadow-lg overflow-hidden shrink-0",
                              u.role === 'TEACHER' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                            )}>
                              {u.photoURL
                                ? <img src={u.photoURL} alt={u.fullName} className="w-full h-full object-cover" />
                                : u.fullName?.charAt(0) || 'U'
                              }
                            </div>
                            <div className="space-y-1">
                              <p className="text-base font-black text-slate-900 group-hover:text-brand-primary transition-colors">
                                {u.fullName || 'مستخدم جديد'}
                              </p>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <Clock className="h-3 w-3" />
                                {new Date(u.createdAt).toLocaleDateString('en-US')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <select
                            className={cn(
                              "px-4 py-1.5 rounded-xl text-[10px] font-black tracking-tight flex items-center gap-2 justify-center w-32 mx-auto shadow-sm border-none outline-none appearance-none cursor-pointer text-center",
                              u.role === 'TEACHER' ? "bg-amber-50 text-amber-600 ring-1 ring-amber-200" :
                                u.role === 'ADMIN' ? "bg-slate-900 text-white shadow-slate-300" :
                                  "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                            )}
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.uid, e.target.value as any)}
                          >
                            <option value="STUDENT">طالب 🎓</option>
                            <option value="TEACHER">مدرس 👨‍🏫</option>
                            <option value="ADMIN">مدير 🛡️</option>
                          </select>
                        </td>
                        <td className="p-6 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <code className="text-sm font-black text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-xl tracking-widest border border-brand-primary/10 shadow-sm">
                              {u.entranceCode || '-- NO CODE --'}
                            </code>
                            <p className="text-[10px] text-slate-400 font-bold font-mono">{u.email}</p>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            {!u.isApproved ? (
                              <span className="inline-flex items-center gap-2 text-[10px] font-black text-amber-600 bg-amber-50 px-4 py-1.5 rounded-xl animate-pulse ring-1 ring-amber-200">
                                <span className="w-1.5 h-1.5 bg-amber-600 rounded-full" /> في الانتظار
                              </span>
                            ) : u.isSuspended ? (
                              <span className="inline-flex items-center gap-2 text-[10px] font-black text-red-600 bg-red-50 px-4 py-1.5 rounded-xl ring-1 ring-red-200">
                                <XCircle className="h-3.5 w-3.5" /> معطل إدارياً
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-[10px] font-black text-green-600 bg-green-50 px-4 py-1.5 rounded-xl ring-1 ring-green-200">
                                <CheckCircle className="h-3.5 w-3.5" /> مفعل ونشط
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center active:scale-90"
                              onClick={() => handleOpenEditModal(u)}
                              title="تعديل كافة البيانات"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            {!u.isApproved && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="h-10 px-4 rounded-xl text-xs font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 border-none transition-transform active:scale-95"
                                onClick={() => handleApprove(u.uid)}
                              >
                                <CheckCircle className="h-4 w-4 ml-2" />
                                تفعيل
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-10 px-4 rounded-xl text-xs font-black border-2 transition-all active:scale-95",
                                u.isSuspended
                                  ? "border-green-100 text-green-600 hover:bg-green-50 hover:border-green-200"
                                  : "border-red-50 text-red-500 hover:bg-red-50 hover:border-red-100"
                              )}
                              onClick={() => handleToggleSuspend(u.uid, u.isSuspended, u.email)}
                            >
                              {u.isSuspended ? <UserCheck className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                            </Button>
                            <button
                              className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center group/btn active:scale-90"
                              onClick={() => handleDeleteUser(u.uid, u.email)}
                              title="حذف نهائي"
                            >
                              <Trash2 className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      /* ==================== TEACHERS VIEW ==================== */
      ) : activeView === 'TEACHERS' && !hasPermission('MANAGE_USERS') ? (
        <AccessDenied message='تحتاج إلى صلاحية "إدارة المستخدمين" لرؤية قائمة المعلمين.' />
      ) : activeView === 'TEACHERS' ? (
        <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[3rem]">
          <CardHeader className="p-10 border-b border-slate-50">
            <h2 className="text-2xl font-black text-slate-900">سجل المعلمين المعتمدين 👨‍🏫</h2>
            <p className="text-sm text-slate-400 font-bold">عرض بيانات المعلمين والمواد الدراسية</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    {['المعلم', 'المادة', 'بيانات الاتصال', 'الحالة'].map(h => (
                      <th key={h} className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.filter(u => u.role === 'TEACHER').map(teacher => (
                    <tr key={teacher.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black overflow-hidden">
                            {teacher.photoURL
                              ? <img src={teacher.photoURL} alt={teacher.fullName} className="w-full h-full object-cover" />
                              : teacher.fullName?.charAt(0)
                            }
                          </div>
                          <p className="font-black text-slate-900">{teacher.fullName}</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold">
                          {(teacher as any).subject || 'غير محدد'}
                        </span>
                      </td>
                      <td className="p-6 text-sm text-slate-500 font-bold">
                        <p>{teacher.email}</p>
                        <p className="text-xs">{teacher.phone || 'بدون هاتف'}</p>
                      </td>
                      <td className="p-6">
                        {teacher.isApproved ? (
                          <span className="text-green-600 font-black text-xs flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> معتمد
                          </span>
                        ) : (
                          <span className="text-amber-600 font-black text-xs flex items-center gap-1">
                            <Clock className="h-4 w-4" /> بانتظار الاعتماد
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      /* ==================== STUDENTS VIEW ==================== */
      ) : activeView === 'STUDENTS' && !hasPermission('MANAGE_USERS') ? (
        <AccessDenied message='تحتاج إلى صلاحية "إدارة المستخدمين" لمشاهدة تقارير الطلاب.' />
      ) : activeView === 'STUDENTS' ? (
        <div className="space-y-8">
          {(['primary', 'prep', 'secondary'] as const).map(stage => {
            const stageStudents = groupedStudents[stage];
            if (stageStudents.length === 0 && stage !== 'primary') return null;
            const stageLabel = stage === 'primary' ? 'المرحلة الابتدائية 🎒' : stage === 'prep' ? 'المرحلة الإعدادية 🎓' : 'المرحلة الثانوية 🏫';

            return (
              <Card key={stage} className="border-none shadow-premium overflow-hidden bg-white rounded-[3rem]">
                <CardHeader className="p-10 border-b border-slate-50 bg-slate-50/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900">{stageLabel}</h2>
                    <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg shadow-blue-200">
                      {stageStudents.length} طالب
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {['الطالب', 'الصف', 'الكورسات المشترك بها', 'إجمالي المدفوعات', 'نتائج الامتحانات'].map(h => (
                            <th key={h} className="p-6 border-b border-slate-100">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stageStudents.map(student => {
                          const s = student.stats!;
                          return (
                            <tr key={student.uid} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-6">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black overflow-hidden">
                                    {student.photoURL
                                      ? <img src={student.photoURL} alt={student.fullName} className="w-full h-full object-cover" />
                                      : student.fullName?.charAt(0)
                                    }
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900">{student.fullName}</p>
                                    <p className="text-xs text-slate-400 font-bold">{student.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-6">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold">
                                  {student.grade || 'غير محدد'}
                                </span>
                              </td>
                              <td className="p-6">
                                <div className="flex flex-wrap gap-2 max-w-xs">
                                  {s.approvedEnrollments.length > 0 ? s.approvedEnrollments.map(e => {
                                    const ep = payments.find(p => p.studentId === student.uid && p.courseId === e.courseId && p.status === 'COMPLETED');
                                    return (
                                      <span key={e.id} className="inline-flex flex-col bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-100">
                                        {e.courseTitle}
                                        <span className="text-blue-500/70 border-t border-blue-200/50 mt-1 pt-0.5">
                                          {ep ? `${ep.amount} EGP` : 'مجاني/يدوي'}
                                        </span>
                                      </span>
                                    );
                                  }) : <span className="text-slate-300 italic text-xs">لا يوجد اشتراكات نشطة</span>}
                                </div>
                              </td>
                              <td className="p-6 text-center">
                                <span className="text-lg font-black text-green-600">
                                  {s.totalPaid} <small className="text-[10px] text-slate-400">EGP</small>
                                </span>
                              </td>
                              <td className="p-6 text-center">
                                {s.avgScore !== null ? (
                                  <div className="flex flex-col items-center">
                                    <span className={cn("text-lg font-black", s.avgScore >= 50 ? "text-emerald-600" : "text-red-500")}>
                                      {s.avgScore}%
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold tracking-tight">معدل {s.scoreCount} اختبارات</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 italic text-xs">لا توجد محاولات</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      /* ==================== QUIZZES/RESULTS PERMISSION ==================== */
      ) : (activeView === 'QUIZZES' || activeView === 'RESULTS') && !hasPermission('MANAGE_EXAMS') ? (
        <AccessDenied message='تحتاج إلى صلاحية "إدارة الامتحانات" للوصول لهذه البيانات.' />
      ) : activeView === 'QUIZZES' ? (
        <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[3rem] p-8">
          <Quizzes />
        </Card>

      ) : activeView === 'ADVERTISEMENTS' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <AdminAnnouncements />
        </div>

      /* ==================== PROMOTE VIEW ==================== */
      ) : activeView === 'PROMOTE' ? (
        <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[3rem]">
          <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-indigo-600 rounded-full animate-ping" />
                <h2 className="text-2xl font-black text-slate-900">ترقية الطلاب للسنة القادمة 📈</h2>
              </div>
              <p className="text-sm text-slate-400 font-bold mr-6">انقل الطلاب من سنة دراسية إلى أخرى بضغطة زر</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="relative group">
                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <select
                  className="h-14 pr-12 pl-6 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none appearance-none hover:bg-slate-100 transition-colors w-64"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="ALL">جميع الطلاب</option>
                  <optgroup label="المرحلة الابتدائية">
                    {['p1','p2','p3','p4','p5','p6'].map(g => (
                      <option key={g} value={g}>الصف {g}</option>
                    ))}
                  </optgroup>
                  <optgroup label="المرحلة الإعدادية">
                    {['m1','m2','m3'].map(g => (
                      <option key={g} value={g}>الصف {g}</option>
                    ))}
                  </optgroup>
                  <optgroup label="المرحلة الثانوية">
                    {['s1','s2','s3'].map(g => (
                      <option key={g} value={g}>الصف {g}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <Button
                onClick={handleBulkPromote}
                isLoading={loading}
                disabled={selectedUserIds.length === 0}
                className="h-14 px-8 rounded-2xl bg-indigo-600 text-white font-black shadow-xl hover:bg-indigo-700 border-none transition-all"
              >
                <ArrowBigUpDash className="h-5 w-5 ml-2" />
                ترقية كافة الطلاب المختارين 🎓
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-6 w-12 text-center border-b border-slate-100">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-600/20"
                        checked={
                          users.filter(u => u.role === 'STUDENT' && (filter === 'ALL' || u.grade === filter)).length > 0 &&
                          selectedUserIds.length === users.filter(u => u.role === 'STUDENT' && (filter === 'ALL' || u.grade === filter)).length
                        }
                        onChange={(e) => {
                          const eligible = users.filter(u => u.role === 'STUDENT' && (filter === 'ALL' || u.grade === filter));
                          setSelectedUserIds(e.target.checked ? eligible.map(u => u.uid) : []);
                        }}
                      />
                    </th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">الطالب</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">الصف الحالي</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center border-b border-slate-100">الصف المُرقى إليه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.filter(u => u.role === 'STUDENT' && (filter === 'ALL' || u.grade === filter)).length === 0 ? (
                    <tr><td colSpan={4} className="p-24 text-center text-slate-400 font-bold">لا يوجد طلاب في هذا الصف حالياً.</td></tr>
                  ) : (
                    users.filter(u => u.role === 'STUDENT' && (filter === 'ALL' || u.grade === filter)).map(student => {
                      const next = PROMOTION_SEQUENCE[student.grade || ''];
                      return (
                        <tr key={student.uid} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-6 text-center">
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded-lg border-2 border-slate-200 text-indigo-600"
                              checked={selectedUserIds.includes(student.uid)}
                              onChange={() => {
                                setSelectedUserIds(prev =>
                                  prev.includes(student.uid) ? prev.filter(id => id !== student.uid) : [...prev, student.uid]
                                );
                              }}
                            />
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                                {student.fullName?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-slate-900">{student.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                              {student.grade || 'غير محدد'}
                            </span>
                          </td>
                          <td className="p-6 text-center">
                            {next ? (
                              <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black ring-1 ring-green-100">
                                {next.nextGrade}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      /* ==================== RESULTS VIEW ==================== */
      ) : activeView === 'RESULTS' ? (
        <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[3rem]">
          <CardHeader className="p-10 border-b border-slate-50 bg-purple-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">سجل نتائج الامتحانات الشامل 🏆</h2>
              <p className="text-sm text-slate-400 font-bold">عرض جميع درجات الطلاب ومحاولاتهم عبر المنصة</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                <input
                  type="text"
                  placeholder="ابحث بالطالب، المعلم، أو الامتحان..."
                  className="h-12 pr-12 pl-6 bg-white border-2 border-purple-100 rounded-2xl text-sm font-bold w-72 focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600 outline-none transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-purple-100 h-12">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-black text-purple-700">{quizResults.length} محاولة مُسجلة</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {['الطالب', 'الامتحان والمدرس', 'الدرجة', 'الحالة', 'التاريخ'].map(h => (
                      <th key={h} className="p-6 border-b border-slate-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {quizResults.filter(res => {
                    const teacher = users.find(u => u.uid === res.teacherId);
                    const search = searchTerm.toLowerCase();
                    return (
                      res.studentName?.toLowerCase().includes(search) ||
                      res.quizTitle?.toLowerCase().includes(search) ||
                      teacher?.fullName?.toLowerCase().includes(search)
                    );
                  }).map(res => {
                    const teacher = users.find(u => u.uid === res.teacherId);
                    return (
                      <tr key={res.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="p-6">
                          <p className="font-black text-slate-900">{res.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-bold">ID: {res.studentId?.slice(0, 8)}</p>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-slate-700">{res.quizTitle}</p>
                          <p className="text-[10px] text-amber-600 font-black">المعلم: {teacher?.fullName || 'غير معروف'}</p>
                        </td>
                        <td className="p-6 text-center">
                          <span className={cn(
                            "px-4 py-1.5 rounded-xl text-lg font-black shadow-sm",
                            res.score >= 50
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-red-50 text-red-600 border border-red-100"
                          )}>
                            {res.score}%
                          </span>
                        </td>
                        <td className="p-6">
                          {res.status === 'FLAGGED' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black animate-pulse">
                              <AlertCircle className="h-3 w-3" /> تم الإنهاء (غش)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black">
                              <CheckCircle className="h-3 w-3" /> تسليم نظامي
                            </span>
                          )}
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-bold text-slate-500">
                            {new Date(res.submittedAt).toLocaleString('en-US')}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                  {quizResults.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-24 text-center text-slate-400 font-bold">
                        لا توجد نتائج امتحانات مسجلة حتى الآن.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      /* ==================== REVENUE VIEW ==================== */
      ) : activeView === 'REVENUE' && !hasPermission('VIEW_REVENUE') ? (
        <AccessDenied message='تحتاج إلى صلاحية "تقارير الأرباح" لمشاهدة البيانات المالية.' />
      ) : activeView === 'REVENUE' ? (
        <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[3rem]">
          <CardHeader className="p-10 border-b border-slate-50 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">تقرير الإيرادات لكل معلم 💵</h2>
                <p className="text-sm text-slate-400 font-bold">ملخص مالي شامل للأرباح المؤكدة</p>
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">إجمالي دخل المنصة</p>
                <p className="text-3xl font-black text-emerald-700">
                  {payments
                    .filter(p => p.status === 'COMPLETED')
                    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                    .toLocaleString('en-US')} EGP
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {['المعلم', 'عدد العمليات', 'إجمالي الإيرادات', 'الحالة الحالية'].map(h => (
                      <th key={h} className="p-6 border-b border-slate-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teacherRevenue.map(({ teacher, teacherPayments, totalEarned }) => (
                    <tr key={teacher.uid} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black overflow-hidden">
                            {teacher.photoURL
                              ? <img src={teacher.photoURL} alt={teacher.fullName} className="w-full h-full object-cover" />
                              : teacher.fullName?.charAt(0)
                            }
                          </div>
                          <p className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                            {teacher.fullName}
                          </p>
                        </div>
                      </td>
                      <td className="p-6 text-center font-bold text-slate-600">{teacherPayments.length} عملية مؤكدة</td>
                      <td className="p-6 text-center">
                        <span className="text-xl font-black text-emerald-600">{totalEarned.toLocaleString('en-US')} EGP</span>
                      </td>
                      <td className="p-6 text-center">
                        <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black ring-1 ring-emerald-100">
                          نشط مالياً ✅
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      /* ==================== SETTINGS VIEW ==================== */
      ) : activeView === 'SETTINGS' ? (
        <div className="max-w-2xl mx-auto space-y-8">
          <Card className="border-none shadow-premium rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-50 bg-red-50/30">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Settings className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">إعدادات المنصة ⚙️</h2>
                  <p className="text-sm text-slate-400 font-bold">تخصيص الخيارات التقنية للمنصة</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-indigo-600" />
                    <label className="text-sm font-black text-slate-700">مفتاح Groq API</label>
                  </div>
                  <span className="text-[10px] font-black text-white bg-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest">Llama 3.3</span>
                </div>
                <div className="relative group">
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    type="password"
                    placeholder="أدخل مفتاح Groq API هنا..."
                    className="h-16 pr-12 pl-6 bg-slate-50 border-none rounded-2xl text-sm font-bold w-full focus:ring-4 focus:ring-indigo-600/10 focus:bg-white outline-none transition-all shadow-inner"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-400 font-bold leading-relaxed px-2">
                  * هذا المفتاح يُستخدم لتوليد الأسئلة باستخدام الذكاء الاصطناعي. يرجى الحفاظ على سرية هذا المفتاح.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-50">
                <Button
                  variant="primary"
                  className="w-full h-16 rounded-[1.5rem] font-black text-lg bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 border-none"
                  onClick={handleSaveSettings}
                >
                  حفظ التغييرات 💾
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-50 bg-blue-50/30">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Layout className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">تخصيص صفحة الهبوط 🎨</h2>
                  <p className="text-sm text-slate-400 font-bold">تعديل نصوص الصفحة الرئيسية ومعلومات التواصل</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-green-600" />
                  <label className="text-sm font-black text-slate-700">رقم الواتساب للتواصل</label>
                </div>
                <div className="relative group">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">+</span>
                  <Input
                    placeholder="201012345678"
                    className="h-16 pr-8 bg-slate-50 border-none rounded-2xl text-sm font-bold w-full focus:ring-4 focus:ring-green-600/10 focus:bg-white transition-all shadow-inner"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-700">عنوان القسم الرئيسي</label>
                  <Input placeholder="المنصة الشاملة رقم 1" className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-bold w-full shadow-inner" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-700">العنوان الفرعي</label>
                  <Input placeholder="انضم لأكثر من مليون طالب" className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-bold w-full shadow-inner" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-700">عنوان قسم المعلمين</label>
                  <Input placeholder="تعلم مع العظماء في مجالك" className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-bold w-full shadow-inner" value={teachersTitle} onChange={(e) => setTeachersTitle(e.target.value)} />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-700">وصف قسم المعلمين</label>
                  <Input placeholder="نضم أفضل الكوادر التعليمية" className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-bold w-full shadow-inner" value={teachersDesc} onChange={(e) => setTeachersDesc(e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-black text-slate-700">عنوان قسم المميزات</label>
                <Input placeholder="ليه تذاكر مع التربويين ؟" className="h-14 bg-slate-50 border-none rounded-2xl text-sm font-bold w-full shadow-inner" value={benefitsTitle} onChange={(e) => setBenefitsTitle(e.target.value)} />
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-50">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-brand-primary" />
                  روابط التواصل الاجتماعي
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Facebook', icon: Facebook, color: 'blue-600', value: facebookUrl, setter: setFacebookUrl, placeholder: 'https://facebook.com/...' },
                    { label: 'Instagram', icon: Instagram, color: 'pink-600', value: instagramUrl, setter: setInstagramUrl, placeholder: 'https://instagram.com/...' },
                    { label: 'LinkedIn', icon: Linkedin, color: 'blue-700', value: linkedinUrl, setter: setLinkedinUrl, placeholder: 'https://linkedin.com/...' },
                  ].map(({ label, icon: Icon, value, setter, placeholder }) => (
                    <div key={label} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
                      <div className="relative group">
                        <Icon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 transition-colors" />
                        <Input
                          placeholder={placeholder}
                          className="h-12 pr-10 bg-slate-50 border-none rounded-xl text-xs font-bold w-full shadow-inner"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <Button
                  variant="primary"
                  className="w-full h-16 rounded-[1.5rem] font-black text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 border-none"
                  onClick={handleSaveSettings}
                >
                  حفظ إعدادات الهبوط 🎨
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 space-y-3">
            <h4 className="font-black text-amber-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> ملاحظة هامة
            </h4>
            <p className="text-xs text-amber-700/80 font-bold leading-relaxed">
              تغيير مفتاح الـ API سيؤثر فوراً على جميع المعلمين الذين يستخدمون ميزة "توليد الأسئلة بالذكاء الاصطناعي". تأكد من صحة المفتاح قبل الحفظ.
            </p>
          </div>
        </div>

      ) : activeView === 'ADMINS' ? (
        <AdminManagement />
      ) : null}

      {/* Admin Edit User Modal */}
      {isEditModalOpen && selectedUserForEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
          <Card className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border-none">
            <CardHeader className="p-8 border-b border-slate-50 flex items-center justify-between bg-blue-50/30">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Pencil className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    تعديل بيانات {selectedUserForEdit.role === 'TEACHER' ? 'المعلم' : 'الطالب'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">تعديل إداري شامل لكافة الحقول</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </CardHeader>
            <CardContent className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-2">الاسم بالكامل</label>
                  <Input value={editData.fullName || ''} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} className="h-12 bg-slate-50 border-none rounded-2xl font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-2">البريد الإلكتروني</label>
                  <Input value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="h-12 bg-slate-50 border-none rounded-2xl font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-2">رقم الهاتف</label>
                  <Input value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="h-12 bg-slate-50 border-none rounded-2xl font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-2">النقاط / الرصيد</label>
                  <Input type="number" value={(editData as any).points || 0} onChange={(e) => setEditData({ ...editData, points: Number(e.target.value) } as any)} className="h-12 bg-slate-50 border-none rounded-2xl font-bold font-mono" />
                </div>
              </div>

              {selectedUserForEdit.role === 'STUDENT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 mr-2">المرحلة الدراسية</label>
                    <select
                      value={editData.stage || ''}
                      onChange={(e) => setEditData({ ...editData, stage: e.target.value, grade: '' } as any)}
                      className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="">اختر المرحلة...</option>
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 mr-2">الصف الدراسي</label>
                    <select
                      value={editData.grade || ''}
                      onChange={(e) => setEditData({ ...editData, grade: e.target.value })}
                      className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="">اختر الصف...</option>
                      {(editData.stage ? GRADES[editData.stage as string] : [])?.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="isApproved" checked={editData.isApproved} onChange={(e) => setEditData({ ...editData, isApproved: e.target.checked })} className="h-5 w-5 rounded-lg border-2 border-slate-200 text-brand-primary accent-brand-primary" />
                  <label htmlFor="isApproved" className="text-sm font-black text-slate-700">حساب مفعل ✅</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="isSuspended" checked={editData.isSuspended} onChange={(e) => setEditData({ ...editData, isSuspended: e.target.checked })} className="h-5 w-5 rounded-lg border-2 border-slate-200 text-red-600 accent-red-600" />
                  <label htmlFor="isSuspended" className="text-sm font-black text-red-600">حساب محظور 🚫</label>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <Button className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black shadow-lg" onClick={handleAdminUpdateUser} isLoading={isSaving}>
                  حفظ كافة التغييرات 💾
                </Button>
                <Button variant="ghost" className="h-14 px-6 rounded-2xl bg-slate-50 text-slate-400 font-bold" onClick={() => setIsEditModalOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pb-8 border-t border-slate-100 pt-8 mt-12 bg-slate-50/50 rounded-[3rem] p-12">
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Educators Command Center v3.5</p>
        <p className="text-[10px] text-slate-300 font-bold mt-2 italic">Copyright © 2026. All rights reserved for Nasser Education Platform.</p>
      </div>
    </div>
  );
};

// ✅ FIX 5: مكون مستقل لرسالة منع الوصول - يمنع تكرار الكود
const AccessDenied = ({ message }: { message: string }) => (
  <div className="p-20 text-center bg-white rounded-[3rem] shadow-premium">
    <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
    <h3 className="text-xl font-black text-slate-900">غير مصرح لك بالدخول 🔐</h3>
    <p className="text-slate-500 font-bold">{message}</p>
  </div>
);