import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  BookOpen,
  Calendar,
  ChevronLeft,
  GraduationCap,
  Check,
  X,
  Clock as ClockIcon
} from 'lucide-react';
import { STAGES, GRADES, getStageLabel, getGradeLabel } from '../../lib/constants';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface Enrollment {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  studentId: string;
  courseId: string;
  enrolledAt: string;
  studentName?: string;
  studentPhone?: string;
  courseTitle?: string;
}

interface Student {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  parentPhone?: string;
  fatherPhone?: string;
  grade?: string;
  stage?: string;
  joinedAt: string;
  courseTitle: string;
}

export const TeacherStudents = ({ selectedCourseId, onBack }: { selectedCourseId?: string | null, onBack?: () => void }) => {
  const { profile } = useEducatorsAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [localSelectedCourse, setLocalSelectedCourse] = useState<string>(selectedCourseId || 'ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [teacherCourses, setTeacherCourses] = useState<{id: string, title: string}[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const [studentEnrollment, setStudentEnrollment] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    fullName: '',
    email: '',
    phone: '', 
    parentPhone: '', 
    fatherPhone: '',
    grade: '',
    stage: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedStudent) return;
    const fetchStudentData = async () => {
      setIsDetailLoading(true);
      try {
        // Get teacher's course IDs for activity filtering
        const coursesSnap = await getDocs(query(collection(db, 'courses'), where('teacherId', '==', profile?.uid)));
        const courseIds = coursesSnap.docs.map(doc => doc.id);

        const resultsSnap = await getDocs(query(
          collection(db, 'quiz_results'), 
          where('studentId', '==', selectedStudent.uid),
          where('teacherId', '==', profile?.uid) // Isolate to this teacher only
        ));

        let activityData: any[] = [];
        if (courseIds.length > 0) {
          const activitySnap = await getDocs(query(
            collection(db, 'student_activity'), 
            where('studentId', '==', selectedStudent.uid),
            where('courseId', 'in', courseIds) // Isolate to this teacher's courses
          ));
          activityData = activitySnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        
        const enrollmentSnap = await getDocs(query(
          collection(db, 'enrollments'),
          where('studentId', '==', selectedStudent.uid),
          where('courseId', 'in', courseIds.length > 0 ? courseIds : ['NONE'])
        ));
        
        setStudentResults(resultsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStudentActivity(activityData);
        setStudentEnrollment(enrollmentSnap.docs[0]?.data() || null);
      } catch (error) {
        console.error("Error fetching student detail data:", error);
      } finally {
        setIsDetailLoading(false);
      }
    };
    fetchStudentData();
    setEditData({
       fullName: selectedStudent.fullName || '',
       email: selectedStudent.email || '',
       phone: selectedStudent.phone !== '--' ? selectedStudent.phone : '',
       parentPhone: selectedStudent.parentPhone !== '--' ? selectedStudent.parentPhone : '',
       fatherPhone: selectedStudent.fatherPhone !== '--' ? selectedStudent.fatherPhone : '',
       grade: selectedStudent.grade || '',
       stage: selectedStudent.stage || ''
    });
    setIsEditing(false);
  }, [selectedStudent]);

  const handleUpdateStudentData = async () => {
    if (!selectedStudent?.uid) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', selectedStudent.uid), {
        fullName: editData.fullName,
        email: editData.email,
        phone: editData.phone,
        parentPhone: editData.parentPhone,
        fatherPhone: editData.fatherPhone,
        grade: editData.grade,
        stage: editData.stage
      });
      alert('تم تحديث بيانات الطالب بنجاح! ✨');
      setIsEditing(false);
      
      // Update local state for immediate feedback
      setStudents(prev => prev.map(s => s.uid === selectedStudent.uid ? {
        ...s,
        ...editData
      } : s));
      
      // Also update the selected student to refresh the view
      setSelectedStudent((prev: any) => ({
        ...prev,
        ...editData
      }));
    } catch (error) {
       console.error("Error updating student data:", error);
       alert('حدث خطأ أثناء التحديث.');
    } finally {
       setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!profile?.uid) return;

    // 1. Fetch teacher's courses
    const coursesQuery = query(
      collection(db, 'courses'), 
      where('teacherId', '==', profile.uid)
    );

    const unsubscribeCourses = onSnapshot(coursesQuery, async (courseSnap) => {
      const courseDocs = courseSnap.docs.map(doc => ({ id: doc.id, title: doc.data().title }));
      setTeacherCourses(courseDocs);
      const courseIds = courseDocs.map(c => c.id);
      const courseMap = new Map(courseDocs.map(c => [c.id, c.title]));

      if (courseIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // 2. Fetch enrollments for these courses
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('courseId', 'in', courseIds)
      );

      const unsubscribeEnrollments = onSnapshot(enrollmentsQuery, async (enrollSnap) => {
        const allEnrollments: Enrollment[] = enrollSnap.docs.map(doc => ({
          id: doc.id,
          status: doc.data().status,
          studentId: doc.data().studentId,
          courseId: doc.data().courseId,
          enrolledAt: doc.data().enrolledAt,
          studentName: doc.data().studentName,
          studentPhone: doc.data().studentPhone,
          courseTitle: doc.data().courseTitle
        }));

        const approvedEnrollments = allEnrollments.filter(e => e.status === 'APPROVED');
        const pending = allEnrollments.filter(e => e.status === 'PENDING');

        setPendingRequests(pending);

        if (approvedEnrollments.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        // 3. Fetch user details for these students
        const studentIds = [...new Set(approvedEnrollments.map(e => e.studentId))];
        
        // Firestore 'in' query supports up to 30 items. 
        // For larger lists, we'd need to chunk this.
        const studentsData: Student[] = [];
        
        try {
          // Chunking the 'in' query for robustness
          for (let i = 0; i < studentIds.length; i += 30) {
            const chunk = studentIds.slice(i, i + 30);
            const userQuery = query(
              collection(db, 'users'),
              where('uid', 'in', chunk)
            );
            const userSnap = await getDocs(userQuery);
            
            userSnap.docs.forEach(uDoc => {
              const uData = uDoc.data();
              // Find all courses this student is enrolled in with this teacher
              const studentMatches = approvedEnrollments.filter(e => e.studentId === uDoc.id);
              
              studentMatches.forEach(match => {
                studentsData.push({
                  uid: uDoc.id,
                  fullName: uData.fullName || 'مجهول',
                  email: uData.email || '',
                  phone: uData.phone || '--',
                  parentPhone: uData.parentPhone || '--',
                  fatherPhone: uData.fatherPhone || '--',
                  grade: uData.grade || '--',
                  stage: uData.stage || '--',
                  joinedAt: match.enrolledAt || new Date().toISOString(),
                  courseTitle: courseMap.get(match.courseId as string) || 'دورة غير معروفة'
                });
              });
            });
          }
          
          setStudents(studentsData.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)));
        } catch (error) {
          console.error("Error fetching students detail:", error);
        } finally {
          setLoading(false);
        }
      });

      return () => unsubscribeEnrollments();
    });

    return () => unsubscribeCourses();
  }, [profile]);

  const handleStatusChange = async (enrollmentId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      if (status === 'APPROVED') {
        await updateDoc(doc(db, 'enrollments', enrollmentId), { status: 'APPROVED' });
      } else {
        await deleteDoc(doc(db, 'enrollments', enrollmentId));
      }
    } catch (error) {
      console.error("Error updating enrollment status:", error);
    }
  };

  useEffect(() => {
    setSelectedGrade('ALL');
  }, [selectedStage]);

  const filteredStudents = students.filter((s: Student) => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Find courseId for this title to match against filter
    const studentCourseId = teacherCourses.find((c: {id: string, title: string}) => c.title === s.courseTitle)?.id;
    const matchesCourse = localSelectedCourse === 'ALL' || studentCourseId === localSelectedCourse;
    
    const matchesStage = selectedStage === 'ALL' || s.stage === selectedStage;
    const matchesGrade = selectedGrade === 'ALL' || s.grade === selectedGrade;

    let matchesDate = true;
    if (dateRange.start) {
      matchesDate = matchesDate && new Date(s.joinedAt) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
      // Set end of day for end date
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(s.joinedAt) <= end;
    }
    
    return matchesSearch && matchesCourse && matchesStage && matchesGrade && matchesDate;
  });

  const filteredPending = pendingRequests.filter((req: Enrollment) => {
    const matchesSearch = req.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = localSelectedCourse === 'ALL' || req.courseId === localSelectedCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-12 w-12 rounded-xl bg-white/10 text-white hover:bg-white/20">
               <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="space-y-1">
               <h1 className="text-3xl font-black">إدارة طلابي المشتركين 👥</h1>
               <p className="text-slate-400 font-bold">متابعة الطلاب المسجلين في دوراتك التعليمية</p>
            </div>
         </div>
         <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <Users className="h-6 w-6 text-brand-secondary" />
            <div>
               <p className="text-[10px] font-black text-slate-500 uppercase">إجمالي الطلاب</p>
               <p className="text-xl font-black">{students.length}</p>
            </div>
         </div>
      </div>

      {/* Filters & Actions */}
      <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
           <div className="flex flex-col gap-6 p-8">
             <div className="flex flex-wrap items-center justify-between gap-6">
               <div className="flex border-b md:border-b-0 w-full md:w-auto">
                  <button 
                    onClick={() => setActiveTab('ACTIVE')}
                    className={cn(
                      "px-6 py-4 text-sm font-black transition-all border-b-2",
                      activeTab === 'ACTIVE' ? "border-brand-primary text-brand-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    الطلاب النشطين ({students.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('PENDING')}
                    className={cn(
                      "px-6 py-4 text-sm font-black transition-all border-b-2 relative",
                      activeTab === 'PENDING' ? "border-brand-primary text-brand-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    طلبات الانضمام ({pendingRequests.length})
                    {pendingRequests.length > 0 && (
                      <span className="absolute top-3 left-2 h-2 w-2 bg-red-500 rounded-full" />
                    )}
                  </button>
               </div>

               <div className="relative group w-full md:w-80">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                  <input 
                    type="text" 
                    placeholder="بحث باسم الطالب أو البريد الإلكتروني..." 
                    className="h-12 pr-12 pl-6 bg-slate-50 border-none rounded-2xl text-sm font-bold w-full outline-none focus:ring-4 focus:ring-brand-primary/5 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
               <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-400 mr-2 uppercase">تصفية حسب الكورس</p>
                 <select 
                    className="h-11 w-full px-4 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-brand-primary/5"
                    value={localSelectedCourse}
                    onChange={(e) => setLocalSelectedCourse(e.target.value)}
                  >
                    <option value="ALL">جميع الكورسات 📚</option>
                    {teacherCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-400 mr-2 uppercase">المرحلة الدراسية</p>
                 <select 
                    className="h-11 w-full px-4 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-brand-primary/5"
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                  >
                    <option value="ALL">جميع المراحل</option>
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-400 mr-2 uppercase">الصف الدراسي</p>
                 <select 
                    className="h-11 w-full px-4 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-brand-primary/5"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                  >
                    <option value="ALL">جميع الصفوف</option>
                    {(selectedStage === 'ALL' 
                      ? Object.values(GRADES).flat() 
                      : (GRADES[selectedStage] || [])
                    ).map(g => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-400 mr-2 uppercase">من تاريخ</p>
                 <input 
                    type="date"
                    className="h-11 w-full px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-primary/5"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                 />
               </div>

               <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-400 mr-2 uppercase">إلى تاريخ</p>
                 <input 
                    type="date"
                    className="h-11 w-full px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-primary/5"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                 />
               </div>
             </div>
           </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {activeTab === 'ACTIVE' ? (
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100">الطالب</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-center">الدورة المسجل بها</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-center">حالة الدفع</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-center">المرحلة / الصف</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-center">بيانات التواصل</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-left">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={5} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                         <div className="h-10 w-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                         <p className="text-slate-400 font-bold">جاري تحميل قائمة الطلاب...</p>
                      </div>
                    </td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold">لا يوجد طلاب مشتركين في دوراتك حالياً. 🔍</td></tr>
                  ) : (
                    filteredStudents.map((s, idx) => (
                      <tr 
                        key={`${s.uid}-${idx}`} 
                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedStudent(s)}
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black">
                              {s.fullName[0]}
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-base font-black text-slate-800">{s.fullName}</p>
                              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" /> {s.uid.substring(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span className="bg-brand-primary text-white px-4 py-1.5 rounded-xl text-[10px] font-black shadow-lg shadow-brand-primary/20">
                            {s.courseTitle}
                          </span>
                        </td>
                        <td className="p-6 text-center">
                          <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 mx-auto w-fit">
                            <Check className="h-3 w-3" />
                            تم الدفع
                          </span>
                        </td>
                        <td className="p-6 text-center text-[10px] font-bold text-slate-600">
                          {getStageLabel(s.stage)} <br/> {getGradeLabel(s.grade)}
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <Phone className="h-3 w-3" /> {s.phone}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                               <Mail className="h-3 w-3" /> {s.email}
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-left">
                           <div className="flex items-center justify-end gap-2 text-slate-400 text-xs font-bold">
                              <Calendar className="h-4 w-4" />
                              {new Date(s.joinedAt).toLocaleDateString('en-US')}
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100">الطالب</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-center">الكورس المطلوب</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-center">بيانات التواصل</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-center">تاريخ الطلب</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPending.length === 0 ? (
                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold">لا توجد طلبات انضمام جديدة حالياً. ✨</td></tr>
                  ) : (
                    filteredPending.map((req, idx) => (
                      <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                                 {req.studentName?.[0] || 'S'}
                              </div>
                              <p className="text-sm font-black text-slate-800">{req.studentName}</p>
                           </div>
                        </td>
                        <td className="p-6 text-center">
                           <p className="text-[11px] font-black text-brand-primary bg-brand-primary/5 px-3 py-1 rounded-lg inline-block">{req.courseTitle}</p>
                        </td>
                        <td className="p-6 text-center">
                           <p className="text-xs font-bold text-slate-500">{req.studentPhone}</p>
                        </td>
                        <td className="p-6 text-center">
                           <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold">
                              <ClockIcon className="h-3 w-3" />
                              {new Date(req.enrolledAt).toLocaleString('en-US')}
                           </div>
                        </td>
                        <td className="p-6">
                           <div className="flex items-center justify-end gap-2">
                              <Button 
                                onClick={() => handleStatusChange(req.id, 'APPROVED')}
                                className="h-9 w-9 p-0 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                              >
                                 <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                onClick={() => handleStatusChange(req.id, 'REJECTED')}
                                variant="outline"
                                className="h-9 w-9 p-0 rounded-lg border-red-100 text-red-500 hover:bg-red-50"
                              >
                                 <X className="h-4 w-4" />
                              </Button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
           <Card className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-brand-primary text-white flex items-center justify-center text-2xl font-black">
                       {(isEditing ? editData.fullName : selectedStudent.fullName)?.[0] || 'S'}
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-slate-800">{isEditing ? editData.fullName : selectedStudent.fullName}</h2>
                       <p className="text-sm text-slate-400 font-bold">{selectedStudent.courseTitle}</p>
                    </div>
                 </div>
                  <div className="flex items-center gap-2">
                     <Button 
                       variant="outline" 
                       onClick={() => setIsEditing(!isEditing)} 
                       className={cn(
                         "h-12 px-6 rounded-xl font-black text-sm transition-all",
                         isEditing ? "bg-red-50 text-red-500 border-red-100" : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-brand-primary hover:text-white"
                       )}
                     >
                        {isEditing ? 'إلغاء التعديل' : 'تعديل بيانات الطالب 📁'}
                     </Button>
                     <button 
                       onClick={() => setSelectedStudent(null)} 
                       className="h-12 w-12 flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all font-black"
                       title="إغلاق"
                     >
                        <X className="h-6 w-6" />
                     </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                 {isDetailLoading ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="h-12 w-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-400 font-bold">جاري تحميل سجل الطالب...</p>
                   </div>
                 ) : (
                   <>
                      {/* Stats Row */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div className="p-5 rounded-3xl bg-indigo-50 border border-indigo-100 space-y-1">
                            <p className="text-[10px] font-black text-indigo-400 uppercase">متوسط الدرجات</p>
                            <p className="text-xl font-black text-indigo-700">
                              {studentResults.length > 0 
                                ? Math.round(studentResults.reduce((acc, r) => acc + (r.score || 0), 0) / studentResults.length) 
                                : 0}%
                            </p>
                         </div>
                         <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100 space-y-1">
                            <p className="text-[10px] font-black text-emerald-400 uppercase">التقدم في الكورس</p>
                            <p className="text-xl font-black text-emerald-700">{studentEnrollment?.progress || 0}%</p>
                         </div>
                         <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100 space-y-1">
                            <p className="text-[10px] font-black text-blue-400 uppercase">نسبة الحضور</p>
                            <p className="text-xl font-black text-blue-700">
                               {(() => {
                                 if (!studentActivity.length) return '0%';
                                 const uniqueDays = new Set(studentActivity.map(a => new Date(a.timestamp).toLocaleDateString('en-US'))).size;
                                 const enrolledAt = new Date(selectedStudent.joinedAt);
                                 const daysSinceEnrollment = Math.max(1, Math.ceil((new Date().getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24)));
                                 return `${Math.min(100, Math.round((uniqueDays / daysSinceEnrollment) * 100))}%`;
                               })()}
                            </p>
                         </div>
                         <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100 space-y-1">
                            <p className="text-[10px] font-black text-amber-400 uppercase">النقاط الحالية</p>
                            <p className="text-xl font-black text-amber-700">{selectedStudent.points || 0} نقطة</p>
                         </div>
                      </div>

                      {/* Comprehensive Data Editing Section */}
                      <div className={cn(
                        "p-8 rounded-[2.5rem] bg-white border-2 border-slate-50 transition-all",
                        isEditing ? "ring-4 ring-brand-primary/10 border-brand-primary/20 scale-[1.01]" : "opacity-90"
                      )}>
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                           <Users className="h-5 w-5 text-brand-primary" />
                           البيانات الأساسية للطالب
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 mr-2">اسم الطالب بالكامل</label>
                              <input 
                                disabled={!isEditing}
                                type="text"
                                value={isEditing ? editData.fullName : selectedStudent.fullName}
                                onChange={(e) => setEditData(prev => ({ ...prev, fullName: e.target.value }))}
                                className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-50"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 mr-2">البريد الإلكتروني</label>
                              <input 
                                disabled={!isEditing}
                                type="email"
                                value={isEditing ? editData.email : selectedStudent.email}
                                onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-50"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 mr-2">المرحلة الدراسية</label>
                              <select 
                                disabled={!isEditing}
                                value={isEditing ? editData.stage : selectedStudent.stage}
                                onChange={(e) => setEditData(prev => ({ ...prev, stage: e.target.value, grade: '' }))}
                                className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-50 outline-none"
                              >
                                <option value="">اختر المرحلة...</option>
                                {STAGES.map(s => (
                                  <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 mr-2">الصف الدراسي</label>
                              <select 
                                disabled={!isEditing}
                                value={isEditing ? editData.grade : selectedStudent.grade}
                                onChange={(e) => setEditData(prev => ({ ...prev, grade: e.target.value }))}
                                className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-50 outline-none"
                              >
                                <option value="">اختر الصف...</option>
                                {((isEditing ? editData.stage : selectedStudent.stage) && GRADES[isEditing ? editData.stage : (selectedStudent.stage as string)])?.map((g: any) => (
                                  <option key={g.id} value={g.id}>{g.label}</option>
                                ))}
                              </select>
                           </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 pt-4 border-t border-slate-50">
                           <Phone className="h-5 w-5 text-brand-primary" />
                           أرقام التواصل والواتساب
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 mr-2">رقم هاتف الطالب</label>
                              <input 
                                disabled={!isEditing}
                                type="tel"
                                value={isEditing ? editData.phone : selectedStudent.phone}
                                onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-50"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 mr-2">رقم ولي الأمر (1)</label>
                              <input 
                                disabled={!isEditing}
                                type="tel"
                                value={isEditing ? editData.parentPhone : selectedStudent.parentPhone}
                                onChange={(e) => setEditData(prev => ({ ...prev, parentPhone: e.target.value }))}
                                className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-50"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 mr-2">رقم ولي الأمر (2)</label>
                              <input 
                                disabled={!isEditing}
                                type="tel"
                                value={isEditing ? editData.fatherPhone : selectedStudent.fatherPhone}
                                onChange={(e) => setEditData(prev => ({ ...prev, fatherPhone: e.target.value }))}
                                className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-50"
                              />
                           </div>
                        </div>

                        {isEditing && (
                          <div className="mt-8 flex justify-end">
                             <Button 
                               onClick={handleUpdateStudentData}
                               isLoading={isSaving}
                               className="h-12 px-10 rounded-xl bg-brand-primary text-white font-black shadow-lg shadow-brand-primary/20"
                             >
                                حفظ كافة التعديلات الجديدة ✅
                             </Button>
                          </div>
                        )}
                      </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Grades History */}
                        <div className="space-y-4">
                           <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                             <GraduationCap className="h-5 w-5 text-brand-primary" />
                             سجل الاختبارات
                           </h3>
                           <div className="space-y-3">
                              {studentResults.length === 0 ? (
                                <p className="text-center py-8 bg-slate-50 rounded-2xl text-slate-400 font-bold">لا توجد اختبارات مسجلة.</p>
                              ) : studentResults.map((r, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                   <div className="text-right">
                                      <p className="font-black text-slate-700 text-sm">{r.quizTitle}</p>
                                      <p className="text-[10px] text-slate-400 font-bold">{new Date(r.submittedAt).toLocaleDateString('en-US')}</p>
                                   </div>
                                   <span className={cn(
                                     "px-3 py-1 rounded-lg text-xs font-black shadow-sm",
                                     r.score >= 50 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                   )}>
                                     {r.score}%
                                   </span>
                                </div>
                              ))}
                           </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="space-y-4">
                           <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                             <ClockIcon className="h-5 w-5 text-brand-secondary" />
                             أحدث النشاطات
                           </h3>
                           <div className="space-y-3 relative before:absolute before:right-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                              {studentActivity.slice(0, 5).map((a, i) => (
                                <div key={i} className="flex items-start gap-4 p-3 pr-10 relative">
                                   <div className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white border-4 border-brand-secondary" />
                                   <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                      <p className="font-bold text-slate-700 text-xs">
                                        {a.action === 'VIEWED_LESSON' ? `شاهد درس: ${a.metadata?.lessonTitle}` : 
                                         a.action === 'COMPLETED_LESSON' ? `أكمل درس: ${a.metadata?.lessonTitle}` : 
                                         a.action === 'STARTED_QUIZ' ? `بدأ اختبار: ${a.metadata?.quizTitle}` : 
                                         a.action === 'FINISHED_QUIZ' ? `أنهى اختبار: ${a.metadata?.quizTitle}` : a.action}
                                      </p>
                                      <p className="text-[9px] text-slate-400 font-black mt-1">{new Date(a.timestamp).toLocaleString('ar-EG')}</p>
                                   </div>
                                </div>
                              ))}
                              {studentActivity.length === 0 && (
                                <p className="text-center py-8 bg-slate-50 rounded-2xl text-slate-400 font-bold">لا توجد نشاطات مسجلة.</p>
                              ) }
                           </div>
                        </div>
                     </div>
                   </>
                 )}
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};
