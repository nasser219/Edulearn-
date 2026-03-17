import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Users, 
  Filter, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Search,
  BookOpen,
  Calendar,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth, UserProfile } from '../auth/AuthProvider';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { STAGES, GRADES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { sendWhatsAppNotification, normalizePhoneNumber } from '../../lib/whatsapp';

export const NotificationCenter = () => {
  const { profile, isAdmin } = useEducatorsAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  
  // Filters
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<any[]>([]);

  // Message
  const [messageText, setMessageText] = useState('');
  const [sendToStudent, setSendToStudent] = useState(true);
  const [sendToParent, setSendToParent] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const fetchCourses = async () => {
      if (!profile?.uid) return;
      let q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      if (!isAdmin()) {
        q = query(collection(db, 'courses'), where('teacherId', '==', profile.uid));
      }
      const snap = await getDocs(q);
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCourses();
  }, [profile, isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const roleToFetch = isAdmin() ? selectedRole : 'STUDENT';
      let q = query(collection(db, 'users'), where('role', '==', roleToFetch));
      
      if (roleToFetch === 'STUDENT') {
        if (selectedStage) q = query(q, where('stage', '==', selectedStage));
        if (selectedGrade) q = query(q, where('grade', '==', selectedGrade));
      }
      
      const snap = await getDocs(q);
      let results = snap.docs.map(doc => ({ 
        id: doc.id,
        uid: doc.id,
        ...doc.data() 
      } as any));

      // 🔐 Role Selection & Teacher Restrictions
      if (!isAdmin() && roleToFetch === 'STUDENT') {
        // Teachers only see students enrolled in their courses
        let enrollQuery = query(
          collection(db, 'enrollments'),
          where('teacherId', '==', profile?.uid),
          where('status', '==', 'APPROVED')
        );
        
        // If a specific course is selected, filter by it
        if (selectedCourseId) {
          enrollQuery = query(enrollQuery, where('courseId', '==', selectedCourseId));
        }

        const enrollSnap = await getDocs(enrollQuery);
        const enrolledIds = enrollSnap.docs.map(doc => doc.data().studentId);
        results = results.filter(s => enrolledIds.includes(s.uid));
      } else if (isAdmin() && roleToFetch === 'STUDENT' && selectedCourseId) {
        // Admins filtering by course
        const enrollQ = query(
          collection(db, 'enrollments'),
          where('courseId', '==', selectedCourseId),
          where('status', '==', 'APPROVED')
        );
        const enrollSnap = await getDocs(enrollQ);
        const enrolledStudentIds = enrollSnap.docs.map(doc => doc.data().studentId);
        results = results.filter(s => enrolledStudentIds.includes(s.uid));
      }

      // Search term
      if (searchTerm) {
        results = results.filter(s => 
          s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          s.phone?.includes(searchTerm)
        );
      }

      setUsers(results);
      setSelectedUsers([]); // Reset selection on new search
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(s => s.uid));
    }
  };

  const handleToggleUser = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSendMessages = async () => {
    if (selectedUsers.length === 0 || !messageText.trim()) return;
    
    setSendingStatus('SENDING');
    setProgress({ current: 0, total: selectedUsers.length });

    const selectedProfiles = users.filter(s => selectedUsers.includes(s.uid));
    
    let successCount = 0;
    for (let i = 0; i < selectedProfiles.length; i++) {
      const user = selectedProfiles[i];
      
      const numbers: string[] = [];
      if (sendToStudent && user.phone) numbers.push(user.phone);
      if (sendToParent && selectedRole === 'STUDENT') {
        if (user.parentPhone) numbers.push(user.parentPhone);
        if (user.fatherPhone) numbers.push(user.fatherPhone);
      }

      const phonesToSend = Array.from(new Set(
        numbers
          .filter(Boolean)
          .map(p => normalizePhoneNumber(p!))
      ));
      
      for (const phone of phonesToSend) {
        try {
          await sendWhatsAppNotification(phone, messageText, {
            email: profile?.whatsappEmail,
            password: profile?.whatsappPassword,
            token: profile?.whatsappToken
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to send to ${phone}`, e);
        }
      }
      setProgress({ current: i + 1, total: selectedUsers.length });
    }

    setSendingStatus('SUCCESS');
    setTimeout(() => setSendingStatus('IDLE'), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-premium">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary shadow-inner">
            <Bell className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">مركز الإشعارات 📢</h1>
            <p className="text-slate-500 font-bold">أرسل رسائل جماعية للطلاب أو المعلمين عبر الواتساب</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-premium rounded-[2.5rem] bg-white">
            <CardHeader className="p-8 border-b border-slate-50">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-primary" />
                تحديد الفئة والبحث
              </h3>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {isAdmin() && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2">إرسال إلى</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedRole('STUDENT');
                        setUsers([]);
                        setSelectedUsers([]);
                      }}
                      className={cn(
                        "h-10 rounded-xl text-xs font-black transition-all",
                        selectedRole === 'STUDENT' ? "bg-brand-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      طلاب
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRole('TEACHER');
                        setUsers([]);
                        setSelectedUsers([]);
                      }}
                      className={cn(
                        "h-10 rounded-xl text-xs font-black transition-all",
                        selectedRole === 'TEACHER' ? "bg-brand-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      معلمين
                    </button>
                  </div>
                </div>
              )}

              {selectedRole === 'STUDENT' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2">المسار التعليمي</label>
                    <select 
                      className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
                      value={selectedStage}
                      onChange={(e) => {
                        setSelectedStage(e.target.value);
                        setSelectedGrade('');
                      }}
                    >
                      <option value="">كل المسارات</option>
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2">الصف الدراسي</label>
                    <select 
                      className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all disabled:opacity-50"
                      value={selectedGrade}
                      disabled={!selectedStage}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                    >
                      <option value="">كل الصفوف</option>
                      {selectedStage && GRADES[selectedStage]?.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2">مشتركين في كورس معين</label>
                    <select 
                      className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold"
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                      <option value="">كل الكورسات</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2">بحث بالاسم أو الهاتف</label>
                <div className="relative group">
                   <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-brand-primary transition-colors" />
                   <Input 
                     placeholder="اسم الطالب أو رقمه..."
                     className="rounded-2xl bg-slate-50 border-none font-bold pr-10"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full h-14 rounded-2xl font-black shadow-lg"
                onClick={fetchUsers}
                isLoading={loading}
              >
                تطبيق الفلاتر وعرض {selectedRole === 'STUDENT' ? 'الطلاب' : 'المعلمين'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
             <CardHeader className="p-8 border-b border-slate-50">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-brand-primary" />
                  محتوى الرسالة
                </h3>
             </CardHeader>
              <CardContent className="p-8 space-y-6">
                 <div className="flex items-center gap-6 mb-2">
                   <button 
                     onClick={() => setSendToStudent(!sendToStudent)}
                     className="flex items-center gap-2 group cursor-pointer"
                   >
                     <div className={cn(
                       "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                       sendToStudent ? "bg-brand-primary border-brand-primary text-white" : "border-slate-200 group-hover:border-brand-primary/50"
                     )}>
                       {sendToStudent && <Check className="h-4 w-4" />}
                     </div>
                     <span className="font-black text-sm text-slate-700">{selectedRole === 'STUDENT' ? 'الطلاب' : 'المعلمين'}</span>
                   </button>

                   {selectedRole === 'STUDENT' && (
                     <button 
                       onClick={() => setSendToParent(!sendToParent)}
                       className="flex items-center gap-2 group cursor-pointer"
                     >
                       <div className={cn(
                         "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                         sendToParent ? "bg-brand-primary border-brand-primary text-white" : "border-slate-200 group-hover:border-brand-primary/50"
                       )}>
                         {sendToParent && <Check className="h-4 w-4" />}
                       </div>
                       <span className="font-black text-sm text-slate-700">أولياء الأمور</span>
                     </button>
                   )}
                 </div>

                <textarea 
                  className="w-full h-40 p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all resize-none shadow-inner"
                  placeholder="اكتب رسالتك هنا..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 italic text-[10px] text-blue-600 font-bold leading-relaxed">
                   * سيتم إرسال الرسالة إلى رقم الطالب ورقم ولي الأمر (إن وجد) بشكل مباشر عبر نظام الواتساب التابع لك.
                </div>

                <Button 
                  variant="primary" 
                  className="w-full h-16 rounded-2xl font-black shadow-xl bg-brand-primary text-white disabled:opacity-50"
                  disabled={selectedUsers.length === 0 || !messageText.trim() || sendingStatus === 'SENDING'}
                  onClick={handleSendMessages}
                >
                  {sendingStatus === 'SENDING' ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner />
                      جاري الإرسال ({progress.current}/{progress.total})
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xl">
                      إرسال الرسالة الآن
                      <Send className="h-6 w-6" />
                    </div>
                  )}
                </Button>
             </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-6">
            <h3 className="text-xl font-black flex items-center gap-2 text-slate-900">
              قائمة {selectedRole === 'STUDENT' ? 'الطلاب' : 'المعلمين'} ({users.length})
            </h3>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="font-black text-brand-primary rounded-xl"
                onClick={handleSelectAll}
                disabled={users.length === 0}
              >
                {selectedUsers.length === users.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </Button>
              <div className="bg-brand-primary/10 px-4 py-2 rounded-xl text-brand-primary font-black text-sm">
                تم تحديد: {selectedUsers.length} {selectedRole === 'STUDENT' ? 'طالب' : 'معلم'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((user) => (
                <div 
                  key={user.uid}
                  onClick={() => handleToggleUser(user.uid)}
                  className={cn(
                    "p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between group",
                    selectedUsers.includes(user.uid) 
                      ? "bg-brand-primary/5 border-brand-primary shadow-lg shadow-brand-primary/10" 
                      : "bg-white border-slate-50 hover:border-brand-primary/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center font-black transition-all",
                      selectedUsers.includes(user.uid) ? "bg-brand-primary text-white scale-110" : "bg-slate-50 text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
                    )}>
                      {selectedUsers.includes(user.uid) ? <Check className="h-6 w-6" /> : user.fullName?.charAt(0)}
                    </div>
                  <div className="space-y-0.5">
                    <p className="font-black text-slate-900">{user.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{user.phone}</p>
                  </div>
                </div>
                <div className="text-left space-y-1">
                   {user.role === 'STUDENT' ? (
                     <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-500 uppercase">{user.grade}</span>
                   ) : (
                     <span className="px-2 py-0.5 bg-brand-primary/10 rounded-md text-[8px] font-black text-brand-primary uppercase">معلم</span>
                   )}
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && !loading && (
             <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                   <Users className="h-10 w-10" />
                </div>
                <p className="text-slate-400 font-bold">لم تظهر أي نتائج بعد. يرجى اختيار الفئة واضغط على "تطبيق".</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
);
