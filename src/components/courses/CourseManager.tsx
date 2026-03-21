import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Video, 
  FileText, 
  GraduationCap, 
  Save, 
  ChevronRight, 
  Layout,
  Layers,
  FileDown,
  Pencil,
  Clock,
  X,
  Upload
} from 'lucide-react';
import { QuizCreator } from '../quizzes/QuizCreator';
import { Button } from '../ui/Button';
import { doc, collection, addDoc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { useEffect } from 'react';
import { STAGES, GRADES, SEMESTERS, ACADEMIC_YEARS } from '../../lib/constants';
import { FileUpload } from '../ui/FileUpload';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { sendWhatsAppNotification, normalizePhoneNumber } from '../../lib/whatsapp';
import { PdfUploaderSupabase } from '../ui/PdfUploaderSupabase';
import { VideoUploaderStream } from '../ui/VideoUploaderStream';
import { uploadFileToSupabase } from '../../lib/supabase';

interface Lesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'PDF' | 'QUIZ' | 'HOMEWORK' | 'IMAGE';
  contentUrl?: string;
  duration?: string;
  description?: string;
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export const CourseManager = ({ onBack, editCourseId }: { onBack: () => void, editCourseId?: string | null }) => {
  const { profile, isStudent } = useEducatorsAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseStage, setCourseStage] = useState('');
  const [courseGrade, setCourseGrade] = useState('');
  const [coursePrice, setCoursePrice] = useState<number | string>(0);
  const [courseThumbnail, setCourseThumbnail] = useState('');
  const [courseDuration, setCourseDuration] = useState('');
  const [courseSemester, setCourseSemester] = useState('term1');
  const [courseAcademicYear, setCourseAcademicYear] = useState('2024-2025');
  const [isActive, setIsActive] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [availableHomeworks, setAvailableHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!editCourseId);
  const [sendToStudent, setSendToStudent] = useState(true);
  const [sendToParent, setSendToParent] = useState(false);

  // States for inline creation
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [showHomeworkCreator, setShowHomeworkCreator] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwMaxGrade, setHwMaxGrade] = useState(100);
  const [hwAttachment, setHwAttachment] = useState<File | null>(null);
  const [hwIsSubmitting, setHwIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!editCourseId) return;
      try {
        const docSnap = await getDoc(doc(db, 'courses', editCourseId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCourseTitle(data.title || '');
          setCourseDescription(data.description || '');
          setCourseStage(data.stage || '');
          setCourseGrade(data.grade || '');
           setCoursePrice(data.price || 0);
          setCourseThumbnail(data.thumbnailUrl || '');
          setCourseDuration(data.duration || '');
          setCourseSemester(data.semester || 'term1');
          setCourseAcademicYear(data.academicYear || '2024-2025');
          setIsActive(data.isActive !== undefined ? data.isActive : true);
          setSections(data.sections || []);
        }
      } catch (error) {
        console.error("Error fetching course for edit:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [editCourseId]);

  useEffect(() => {
    // Fetch quizzes and homeworks created by this teacher to link them in lessons
    if (!profile?.uid) return;
    
    const q1 = query(
      collection(db, 'quizzes'), 
      where('teacherId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe1 = onSnapshot(q1, (snap) => {
      setAvailableQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const q2 = query(
      collection(db, 'homework'), 
      where('teacherId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe2 = onSnapshot(q2, (snap) => {
      setAvailableHomeworks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [profile]);

  const addSection = () => {
    const newSection: Section = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'وحدة جديدة',
      lessons: []
    };
    setSections([...sections, newSection]);
  };

  const addLesson = (sectionId: string, type: Lesson['type']) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          lessons: [...s.lessons, {
            id: Math.random().toString(36).substr(2, 9),
            title: 'درس جديد',
            type,
            duration: type === 'VIDEO' ? '15:00' : undefined
          }]
        };
      }
      return s;
    }));
  };

  const handleCreateHomework = async () => {
    if (!hwTitle || !hwDueDate || !profile?.uid) return;
    setHwIsSubmitting(true);
    try {
      let attachmentUrl = '';
      if (hwAttachment) {
        attachmentUrl = await uploadFileToSupabase(hwAttachment, 'homework-attachments');
      }

      await addDoc(collection(db, 'homework'), {
        title: hwTitle,
        description: hwDesc,
        subject: profile.subject || courseStage || '',
        courseId: editCourseId || 'new', // It might be unassigned if course is brand new and unsaved
        courseTitle: courseTitle || '',
        teacherId: profile.uid,
        teacherName: profile.fullName,
        dueDate: hwDueDate,
        status: 'ACTIVE',
        submissions: 0,
        attachmentUrl,
        maxGrade: hwMaxGrade,
        stage: profile.stage || courseStage || '',
        grade: profile.grade || courseGrade || '',
        createdAt: new Date().toISOString(),
      });

      setShowHomeworkCreator(false);
      setHwTitle(''); setHwDesc(''); setHwDueDate(''); setHwAttachment(null);
    } catch (e: any) {
      console.error('Error creating homework:', e);
      alert(`حدث خطأ أثناء إنشاء الواجب: ${e.message}`);
    } finally {
      setHwIsSubmitting(false);
    }
  };

  const updateSectionTitle = (id: string, title: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, title } : s));
  };

  const updateLesson = (sectionId: string, lessonId: string, data: Partial<Lesson>) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          lessons: s.lessons.map(l => l.id === lessonId ? { ...l, ...data } : l)
        };
      }
      return s;
    }));
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const deleteLesson = (sectionId: string, lessonId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, lessons: s.lessons.filter(l => l.id !== lessonId) };
      }
      return s;
    }));
  };

  const sanitizeData = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeData);
    } else if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, sanitizeData(v)])
      );
    }
    return obj;
  };

  const handleSave = async () => {
    if (!courseTitle.trim() || !courseStage || !courseGrade) {
      alert('الرجاء إكمال البيانات الأساسية (العنوان، المرحلة، والصف الدراسي)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate Total Duration
      let totalSeconds = 0;
      sections.forEach(s => {
        s.lessons.forEach(l => {
          if (l.type === 'VIDEO' && l.duration) {
            const parts = l.duration.split(':');
            if (parts.length === 2) {
              totalSeconds += (parseInt(parts[0]) * 60) + parseInt(parts[1]);
            } else if (parts.length === 1) {
              totalSeconds += parseInt(parts[0]) * 60;
            }
          }
        });
      });

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const calculatedDuration = hours > 0 
        ? `${hours}س ${minutes}د` 
        : `${minutes} دقيقة`;

      const finalDuration = courseDuration.trim() || (totalSeconds > 0 ? calculatedDuration : 'غير محدد');

      const courseData = sanitizeData({
        title: courseTitle,
        description: courseDescription,
        stage: courseStage,
        grade: courseGrade,
        price: Number(coursePrice) || 0,
        thumbnailUrl: courseThumbnail,
        sections,
        duration: finalDuration,
        semester: courseSemester,
        academicYear: courseAcademicYear,
        isActive: isActive,
        teacherId: profile?.uid || '--',
        teacherName: profile?.fullName || 'معلم',
        updatedAt: new Date().toISOString(),
      });

      if (editCourseId) {
        await updateDoc(doc(db, 'courses', editCourseId), courseData);

        // Automated Notification for Course Update
        try {
          const enrollmentsQuery = query(
            collection(db, 'enrollments'),
            where('courseId', '==', editCourseId),
            where('status', '==', 'APPROVED')
          );
          const enrollmentsSnap = await getDocs(enrollmentsQuery);
          
          if (!enrollmentsSnap.empty) {
            let message = profile?.whatsappTemplateCourseUpdate || 'تم تحديث مادة الكورس: [course]. يرجى المراجعة لمعرفة الجديد يا [student]!';
            message = message
              .replace(/\[course\]/g, courseTitle)
              .replace(/\[teacher\]/g, profile?.fullName || 'معلمك');

            // Collect student IDs
            const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
            
            if (studentIds.length > 0) {
              const studentsQuery = query(collection(db, 'users'), where('__name__', 'in', studentIds));
              const studentsSnap = await getDocs(studentsQuery);
              
              for (const studentDoc of studentsSnap.docs) {
                const studentData = studentDoc.data();
                
                let studentPersonalMessage = message.replace(/\[student\]/g, studentData.fullName?.split(' ')[0] || 'طالبنا');

                const numbers: string[] = [];
                if (sendToStudent && studentData.phone) numbers.push(studentData.phone);
                if (sendToParent) {
                  if (studentData.parentPhone) numbers.push(studentData.parentPhone);
                  if (studentData.fatherPhone) numbers.push(studentData.fatherPhone);
                }

                const phones = Array.from(new Set(
                  numbers
                    .filter(Boolean)
                    .map(p => typeof p === 'string' ? normalizePhoneNumber(p) : '')
                    .filter(Boolean)
                ));
                for (const phone of phones) {
                  await sendWhatsAppNotification(phone, studentPersonalMessage, {
                    email: profile?.whatsappEmail,
                    password: profile?.whatsappPassword,
                    token: profile?.whatsappToken
                  });
                }
              }
            }
          }
        } catch (waError) {
          console.error("Error sending course update WhatsApp notification:", waError);
        }

      } else {
        const newCourseRef = await addDoc(collection(db, 'courses'), {
          ...courseData,
          createdAt: new Date().toISOString(),
          studentCount: 0,
          rating: 5.0
        });

        // Automated Notification for New Course
        try {
          const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'STUDENT'),
            where('stage', '==', courseStage),
            where('grade', '==', courseGrade)
          );
          const studentsSnap = await getDocs(studentsQuery);
          
          if (!studentsSnap.empty) {
            let message = profile?.whatsappTemplateNewCourse || 'خبر عاجل! 🎉 تم رفع كورس جديد: [course] مع مستر [teacher]. اشترك الآن وابدأ المذاكرة!';
            message = message
              .replace(/\[course\]/g, courseTitle)
              .replace(/\[teacher\]/g, profile?.fullName || 'معلمك');

            for (const studentDoc of studentsSnap.docs) {
              const studentData = studentDoc.data();
              
              let studentPersonalMessage = message.replace(/\[student\]/g, studentData.fullName?.split(' ')[0] || 'طالبنا');

              const numbers: string[] = [];
              if (sendToStudent && studentData.phone) numbers.push(studentData.phone);
              if (sendToParent) {
                if (studentData.parentPhone) numbers.push(studentData.parentPhone);
                if (studentData.fatherPhone) numbers.push(studentData.fatherPhone);
              }

              const phones = Array.from(new Set(
                numbers
                  .filter(Boolean)
                  .map(p => typeof p === 'string' ? normalizePhoneNumber(p) : '')
                  .filter(Boolean)
              ));
              for (const phone of phones) {
                await sendWhatsAppNotification(phone, studentPersonalMessage, {
                  email: profile?.whatsappEmail,
                  password: profile?.whatsappPassword,
                  token: profile?.whatsappToken
                });
              }
            }
          }
        } catch (waError) {
          console.error("Error sending new course WhatsApp notification:", waError);
        }
      }
      
      alert(editCourseId ? 'تم تحديث الكورس بنجاح! ✏️' : 'تم حفظ الكورس بنجاح! 🎉');
      onBack();
    } catch (error: any) {
      console.error('Error saving course full details:', error);
      alert(`حدث خطأ أثناء حفظ الكورس: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isStudent()) {
    return (
      <div className="p-20 text-center animate-in fade-in" dir="rtl">
        <div className="max-w-md mx-auto bg-white p-12 rounded-[3rem] shadow-premium">
          <div className="h-20 w-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Layers className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">عذراً، لا تملك الصلاحية 🛑</h2>
          <p className="text-slate-500 font-bold mb-8">هذه الصفحة مخصصة للمعلين فقط لإدارة المحتوى التعليمي.</p>
          <Button variant="primary" onClick={onBack} className="w-full rounded-2xl h-14 font-black">العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-20 text-center font-black text-slate-400">جاري تحميل بيانات الكورس... ⏳</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-premium">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-10 w-10 rounded-xl p-0">
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">إنشاء كورس جديد ✨</h2>
            <p className="text-sm text-slate-400 font-bold">صمم رحلتك التعليمية الخاصة بك الآن</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-50 p-2 rounded-2xl gap-2 border border-slate-100 h-12 items-center">
             <button 
               onClick={() => setSendToStudent(!sendToStudent)}
               className={cn(
                 "px-4 py-2 rounded-xl text-[10px] font-black transition-all",
                 sendToStudent ? "bg-brand-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
               )}
             >
               إرسال للطلاب
             </button>
             <button 
               onClick={() => setSendToParent(!sendToParent)}
               className={cn(
                 "px-4 py-2 rounded-xl text-[10px] font-black transition-all",
                 sendToParent ? "bg-brand-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
               )}
             >
               أولياء الأمور
             </button>
           </div>

          <Button 
            variant="outline" 
            className="rounded-xl font-black h-12"
            onClick={onBack}
          >
            إلغاء التعديلات
          </Button>
          <Button 
            variant="primary" 
            className="rounded-xl font-black h-12 px-8 shadow-lg shadow-brand-primary/20"
            onClick={handleSave}
            isLoading={isSubmitting}
          >
            <Save className="h-5 w-5 ml-2" />
            نشر الكورس
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Info Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Layout className="h-5 w-5 text-brand-primary" />
                بيانات الكورس الأساسية
              </h3>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2">عنوان الكورس</label>
                <Input 
                  placeholder="مثال: فيزياء الصف الثالث الثانوي" 
                  className="rounded-2xl bg-slate-50 border-none font-bold placeholder:text-slate-300"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2">وصف مختصر</label>
                <textarea 
                  placeholder="اشرح للطلاب ماذا سيتعلمون في هذا الكورس..." 
                  className="w-full h-32 rounded-2xl bg-slate-50 border-none p-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 focus:bg-white transition-all resize-none placeholder:text-slate-300 text-slate-700"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2">سعر الكورس (جنيه مصري)</label>
                <Input 
                  type="number"
                  min="0"
                  placeholder="0 للمجاني" 
                  className="rounded-2xl bg-slate-50 border-none font-bold placeholder:text-slate-300"
                  value={coursePrice}
                  onChange={(e) => setCoursePrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2 flex items-center gap-1">
                  إجمالي مدة الكورس
                  <span className="text-[10px] font-bold text-slate-300">(اختياري - يترك فارغاً للحساب التلقائي)</span>
                </label>
                <Input 
                  placeholder="مثال: 5 ساعات، أو 45 دقيقة..." 
                  className="rounded-2xl bg-slate-50 border-none font-bold placeholder:text-slate-300"
                  value={courseDuration}
                  onChange={(e) => setCourseDuration(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2">المسار التعليمي</label>
                  <select 
                    className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold"
                    value={courseStage}
                    onChange={(e) => {
                      setCourseStage(e.target.value);
                      setCourseGrade(''); // Reset grade when stage changes
                    }}
                  >
                    <option value="">اختر المرحلة...</option>
                    {STAGES.filter(s => profile?.stages?.includes(s.id) || profile?.role === 'ADMIN').map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2">الصف الدراسي</label>
                  <select 
                    className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all disabled:opacity-50 font-bold"
                    value={courseGrade}
                    disabled={!courseStage}
                    onChange={(e) => setCourseGrade(e.target.value)}
                  >
                    <option value="">اختر الصف...</option>
                    {courseStage && GRADES[courseStage]
                      ?.filter(g => profile?.grades?.includes(g.id) || profile?.role === 'ADMIN')
                      .map(g => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2">الفصل الدراسي</label>
                  <select 
                    className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold"
                    value={courseSemester}
                    onChange={(e) => setCourseSemester(e.target.value)}
                  >
                    {SEMESTERS.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2">السنة الدراسية (الدفعة)</label>
                  <select 
                    className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold"
                    value={courseAcademicYear}
                    onChange={(e) => setCourseAcademicYear(e.target.value)}
                  >
                    {ACADEMIC_YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="space-y-1">
                   <p className="text-xs font-black text-slate-900">تفعيل الكورس للطلاب</p>
                   <p className="text-[10px] text-slate-400 font-bold">عند إلغاء التفعيل سيختفي الكورس من عند الطلاب</p>
                </div>
                <button 
                  onClick={() => setIsActive(!isActive)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                    isActive ? "bg-brand-primary" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 bg-white rounded-full transition-transform",
                    isActive ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-50">
                <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">صورة الغلاف للكورس</label>
                {courseThumbnail ? (
                  <div className="relative group rounded-2xl overflow-hidden aspect-video border-2 border-slate-100">
                    <img 
                      src={courseThumbnail} 
                      className="w-full h-full object-cover" 
                      alt="Course Thumbnail" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setCourseThumbnail('')}>تغيير الصورة</Button>
                    </div>
                  </div>
                ) : (
                  <FileUpload 
                    path={`courses/${editCourseId || 'new'}/thumbnail`}
                    label="ارفع صورة غلاف الكورس (16:9)"
                    allowedTypes={['image/jpeg', 'image/png']}
                    onUploadComplete={(url) => setCourseThumbnail(url)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Curriculum Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-6">
            <h3 className="text-lg font-black flex items-center gap-2">
              <Layers className="h-5 w-5 text-brand-primary" />
              منهج الكورس
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addSection}
              className="rounded-xl font-black border-dashed border-2 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة وحدة تعليمية
            </Button>
          </div>

          <div className="space-y-6">
            {sections.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <Layers className="h-10 w-10" />
                </div>
                <p className="text-slate-400 font-bold">ابدأ بإضافة أول وحدة تعليمية لكورسك</p>
                <Button variant="ghost" className="mt-4 font-black text-brand-primary" onClick={addSection}>إضغط هنا للبدء</Button>
              </div>
            ) : (
              sections.map((section, sIdx) => (
                <Card key={section.id} className="border-none shadow-premium rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4">
                  <div className="bg-slate-900 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="h-8 w-8 bg-white/10 text-white rounded-lg flex items-center justify-center font-black text-sm">
                        {sIdx + 1}
                      </span>
                      <input 
                        type="text"
                        className="bg-transparent border-none text-white font-black text-lg outline-none focus:ring-0 w-full"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => deleteSection(section.id)}
                      className="text-white/40 hover:text-red-400 transition-colors p-2"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <CardContent className="p-6 space-y-4">
                    {section.lessons.map((lesson, lIdx) => (
                      <div key={lesson.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center",
                          lesson.type === 'VIDEO' ? "bg-blue-100 text-blue-600" :
                          lesson.type === 'PDF' ? "bg-red-100 text-red-600" :
                          lesson.type === 'QUIZ' ? "bg-amber-100 text-amber-600" :
                          lesson.type === 'IMAGE' ? "bg-emerald-100 text-emerald-600" :
                          "bg-purple-100 text-purple-600"
                        )}>
                          {lesson.type === 'VIDEO' && <Video className="h-5 w-5" />}
                          {lesson.type === 'PDF' && <FileDown className="h-5 w-5" />}
                          {lesson.type === 'QUIZ' && <GraduationCap className="h-5 w-5" />}
                          {lesson.type === 'IMAGE' && <Layers className="h-5 w-5" />}
                          {lesson.type === 'HOMEWORK' && <FileText className="h-5 w-5" />}
                        </div>
                        
                        <div className="flex-1">
                          <input 
                            type="text"
                            className="bg-transparent border-none font-bold text-sm text-slate-700 outline-none w-full"
                            value={lesson.title}
                            onChange={(e) => updateLesson(section.id, lesson.id, { title: e.target.value })}
                          />
                          <div className="space-y-3 mt-3">
                            <div className="flex items-center gap-4 bg-white/50 p-2 rounded-xl border border-slate-100 mb-2">
                               <input 
                                 type="text"
                                 placeholder="رابط المحتوى (URL)..."
                                 className="bg-transparent border-none text-[10px] text-slate-400 font-bold outline-none w-full"
                                 value={lesson.contentUrl || ''}
                                 onChange={(e) => updateLesson(section.id, lesson.id, { contentUrl: e.target.value })}
                               />
                            </div>

                            {lesson.type === 'VIDEO' && (
                              <VideoUploaderStream 
                                label="رفع الفيديو المحمي (Bunny Stream)"
                                className="mt-2"
                                onUploadComplete={(videoId, meta) => {
                                  updateLesson(section.id, lesson.id, { 
                                    contentUrl: videoId, // Store videoId as contentUrl
                                    duration: meta?.duration 
                                  });
                                }}
                              />
                            )}

                            {lesson.type === 'PDF' && (
                              <PdfUploaderSupabase 
                                label="رفع مذكرة PDF عبر Supabase"
                                className="mt-2"
                                onUploadComplete={(url) => updateLesson(section.id, lesson.id, { contentUrl: url })}
                              />
                            )}

                            {lesson.type !== 'QUIZ' && lesson.type !== 'IMAGE' && lesson.type !== 'PDF' && lesson.type !== 'VIDEO' && lesson.type !== 'HOMEWORK' && (
                              <FileUpload 
                                path={`courses/${editCourseId || 'new'}/lessons/${lesson.id}`}
                                label={`ارفع ملف ${lesson.type === 'VIDEO' ? 'فيديو' : 'مستند'}`}
                                className="mt-2"
                                allowedTypes={lesson.type === 'VIDEO' ? ['video/mp4'] : ['application/pdf', 'image/jpeg', 'image/png']}
                                onUploadComplete={(url, meta) => {
                                  const updates: any = { contentUrl: url };
                                  if (meta?.duration && lesson.type === 'VIDEO') {
                                    updates.duration = meta.duration;
                                  }
                                  updateLesson(section.id, lesson.id, updates);
                                }}
                              />
                            )}

                            {lesson.type === 'IMAGE' && (
                              <div className="mt-2 space-y-3">
                                {lesson.contentUrl && (
                                  <div className="relative rounded-xl overflow-hidden aspect-video border-2 border-slate-100 bg-slate-900">
                                    <img 
                                      src={lesson.contentUrl} 
                                      className="w-full h-full object-contain" 
                                      alt="Lesson Image Preview" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                                <FileUpload 
                                  path={`courses/${editCourseId || 'new'}/lessons/${lesson.id}`}
                                  label="ارفع صورة الدرس (JPG/PNG)"
                                  allowedTypes={['image/jpeg', 'image/png']}
                                  onUploadComplete={(url) => updateLesson(section.id, lesson.id, { contentUrl: url })}
                                />
                              </div>
                            )}

                            {lesson.type === 'QUIZ' && (
                              <div className="space-y-2 pb-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black text-slate-400 mr-2">اختر اختباراً من بنك الامتحانات</label>
                                  <a href="/?view=CREATE_QUIZ" target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-primary font-bold hover:underline" onClick={(e) => { e.preventDefault(); setShowQuizCreator(true); }}>
                                    + إنشاء اختبار جديد بالذكاء الاصطناعي
                                  </a>
                                </div>
                                <select 
                                  className="w-full h-10 rounded-xl bg-white border border-slate-200 px-4 font-bold text-xs outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
                                  value={lesson.contentUrl || ''}
                                  onChange={(e) => updateLesson(section.id, lesson.id, { contentUrl: e.target.value })}
                                >
                                  <option value="">-- اختر اختباراً --</option>
                                  {availableQuizzes.map(quiz => (
                                    <option key={quiz.id} value={quiz.id}>{quiz.title} ({quiz.subject})</option>
                                  ))}
                                </select>
                                {availableQuizzes.length === 0 && (
                                  <p className="text-[10px] text-amber-600 font-bold p-2 bg-amber-50 rounded-lg">لا توجد اختبارات متاحة حالياً.</p>
                                )}
                              </div>
                            )}

                            {lesson.type === 'HOMEWORK' && (
                              <div className="space-y-2 pb-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black text-slate-400 mr-2">اختر واجباً من بنك الواجبات</label>
                                  <a href="/?view=HOMEWORK" target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-primary font-bold hover:underline" onClick={(e) => { e.preventDefault(); setShowHomeworkCreator(true); }}>
                                    + إنشاء واجب جديد
                                  </a>
                                </div>
                                <select 
                                  className="w-full h-10 rounded-xl bg-white border border-slate-200 px-4 font-bold text-xs outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
                                  value={lesson.contentUrl || ''}
                                  onChange={(e) => updateLesson(section.id, lesson.id, { contentUrl: e.target.value })}
                                >
                                  <option value="">-- اختر واجباً --</option>
                                  {availableHomeworks.map(hw => (
                                    <option key={hw.id} value={hw.id}>{hw.title} ({hw.subject})</option>
                                  ))}
                                </select>
                                {availableHomeworks.length === 0 && (
                                  <p className="text-[10px] text-amber-600 font-bold p-2 bg-amber-50 rounded-lg">لا توجد واجبات متاحة حالياً.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => deleteLesson(section.id, lesson.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <div className="pt-4 flex flex-wrap gap-2">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="rounded-xl font-bold bg-blue-50 text-blue-600 hover:bg-blue-100"
                         onClick={() => addLesson(section.id, 'VIDEO')}
                       >
                         <Plus className="h-3 w-3 ml-2" /> فيديو
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="rounded-xl font-bold bg-red-50 text-red-600 hover:bg-red-100"
                         onClick={() => addLesson(section.id, 'PDF')}
                       >
                         <Plus className="h-3 w-3 ml-2" /> ملف PDF
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="rounded-xl font-bold bg-amber-50 text-amber-600 hover:bg-amber-100"
                         onClick={() => addLesson(section.id, 'QUIZ')}
                       >
                         <Plus className="h-3 w-3 ml-2" /> إختبار
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="rounded-xl font-bold bg-purple-50 text-purple-600 hover:bg-purple-100"
                         onClick={() => addLesson(section.id, 'HOMEWORK')}
                       >
                         <Plus className="h-3 w-3 ml-2" /> واجب
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="rounded-xl font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                         onClick={() => addLesson(section.id, 'IMAGE')}
                       >
                         <Plus className="h-3 w-3 ml-2" /> صورة
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ══════ QUIZ CREATOR OVERLAY ══════ */}
      {showQuizCreator && (
        <div className="fixed inset-0 z-[100] bg-[#f8fbff] overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <QuizCreator onBack={() => setShowQuizCreator(false)} />
          </div>
        </div>
      )}

      {/* ══════ HOMEWORK CREATOR OVERLAY ══════ */}
      {showHomeworkCreator && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="h-10 w-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                إضافة واجب جديد سريع
              </h3>
              <button onClick={() => setShowHomeworkCreator(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">عنوان الواجب *</label>
                <input value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="مثال: حل تمارين الصفحة 45"
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">وصف الواجب</label>
                <textarea value={hwDesc} onChange={e => setHwDesc(e.target.value)} rows={3} placeholder="أضف تعليمات أو ملاحظات للطلاب..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600">تاريخ التسليم *</label>
                  <input type="date" value={hwDueDate} onChange={e => setHwDueDate(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-600">الدرجة القصوى</label>
                  <input type="number" value={hwMaxGrade} onChange={e => setHwMaxGrade(Number(e.target.value))} min={1} max={1000}
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-600">مرفق (اختياري)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-brand-primary/30 transition-colors">
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,.gif" onChange={e => setHwAttachment(e.target.files?.[0] || null)} className="hidden" id="hw-inline-attachment" />
                  <label htmlFor="hw-inline-attachment" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">{hwAttachment ? hwAttachment.name : 'اضغط لرفع ملف PDF أو صورة'}</p>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <Button variant="ghost" onClick={() => setShowHomeworkCreator(false)} className="rounded-xl font-bold">إلغاء</Button>
              <Button variant="primary" onClick={handleCreateHomework} isLoading={hwIsSubmitting} disabled={!hwTitle || !hwDueDate}
                className="rounded-xl font-black px-8 shadow-lg">
                حفظ وإضافة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
