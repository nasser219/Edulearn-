import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, FileText, GraduationCap, CheckCircle2, Lock, Layers, Image as ImageIcon, Download, FileArchive, File as FileIcon, ExternalLink, AlertCircle } from 'lucide-react';
import { VideoPlayer } from '../video/VideoPlayer';
import { Button } from '../ui/Button';
import { QuizEngine } from '../quizzes/QuizEngine';
import { PaymentModal } from '../payments/PaymentModal';
import { cn } from '../../lib/utils';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { SecurityOverlay } from '../security/SecurityOverlay';
import { LessonComments } from './LessonComments';

export const CourseViewer = ({ courseId, onBack }: { courseId: string, onBack: () => void }) => {
  const { profile, isAdmin, isTeacher } = useEducatorsAuth();
  const [course, setCourse] = useState<any>(null);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const allLessons = course?.sections?.flatMap((s: any) => s.lessons) || [];
  const currentLesson = allLessons[activeLessonIdx];

  const logActivity = async (action: string, metadata: any = {}) => {
    if (!profile?.uid) return;
    try {
      await addDoc(collection(db, 'student_activity'), {
        studentId: profile.uid,
        studentName: profile.fullName,
        courseId,
        courseTitle: course?.title,
        action,
        metadata,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error logging activity:", e);
    }
  };

  const markLessonCompleted = async (lessonId: string) => {
    if (!profile?.uid || !enrollment || enrollment.completedLessons?.includes(lessonId)) return;
    
    try {
      const { increment } = await import('firebase/firestore');
      const updatedLessons = [...(enrollment.completedLessons || []), lessonId];
      const progress = Math.round((updatedLessons.length / allLessons.length) * 100);
      
      const updateData: any = {
        completedLessons: arrayUnion(lessonId),
        progress
      };

      // Award points if course is 100% complete and points haven't been awarded yet
      if (progress === 100 && !enrollment.pointsAwarded) {
        updateData.pointsAwarded = true;
        updateData.completedAt = new Date().toISOString();
        
        // Milestone logic: 20 points = 1 Gem (Diamond)
        const currentPoints = profile.points || 0;
        const currentGems = profile.gems || 0;
        const ptsToAdd = 5;
        
        let newTotalPoints = currentPoints + ptsToAdd;
        let gemsToAdd = Math.floor(newTotalPoints / 20);
        let finalPoints = newTotalPoints % 20;

        // Update user profile
        await updateDoc(doc(db, 'users', profile.uid), {
          points: finalPoints,
          gems: currentGems + gemsToAdd
        });
      }
      
      await updateDoc(doc(db, 'enrollments', enrollment.id), updateData);
      
      logActivity('COMPLETED_LESSON', { lessonId, lessonTitle: currentLesson?.title });
    } catch (error) {
      console.error("Error marking lesson completed:", error);
    }
  };

  useEffect(() => {
    if (currentLesson && enrollment) {
      logActivity('VIEWED_LESSON', { lessonId: currentLesson.id, lessonTitle: currentLesson.title });
      
      // Auto-complete PDF, Image, and Document lessons when viewed
      const isStaticContent = ['PDF', 'IMAGE', 'HOMEWORK'].includes(currentLesson.type) || 
                              isDoc(currentLesson.contentUrl) || 
                              isImage(currentLesson.contentUrl) ||
                              isArchive(currentLesson.contentUrl);
                              
      if (isStaticContent) {
        markLessonCompleted(currentLesson.id);
      }
    }
  }, [activeLessonIdx, !!enrollment]);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'courses', courseId));
        if (docSnap.exists()) {
          setCourse(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching course details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();

    if (profile?.uid) {
      const q = query(
        collection(db, 'enrollments'),
        where('courseId', '==', courseId),
        where('studentId', '==', profile.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setEnrollment({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setEnrollment(null);
        }
      });
      return () => unsubscribe();
    }
  }, [courseId, profile]);

  const handleRequestEnrollment = async () => {
    if (!profile?.uid) return;
    setShowPaymentModal(true);
  };

  // Helper: Proxify Cloudinary URLs to bypass 401 and handle restricted access
  const getProxiedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('cloudinary.com') && !url.includes('collection.cloudinary.com')) {
       // Automatic direct download anchor via our proxy for reliability
       return `/api/media/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const handleDownload = async () => {
    const url = currentLesson?.contentUrl;
    if (!url) {
      alert("رابط الملف غير متوفر حالياً.");
      return;
    }
    window.open(getFileUrl(url, true), '_blank');
  };

  // Universal File Support Logic
  const getFileExt = (url: string) => url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  const isImage = (url: string) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(getFileExt(url));
  const isVideo = (url: string) => ['mp4', 'webm', 'ogg', 'mov'].includes(getFileExt(url));
  const isDoc = (url: string) => ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(getFileExt(url));
  const isArchive = (url: string) => ['zip', 'rar', '7z', 'tar', 'gz'].includes(getFileExt(url));
  const isCloudinaryCollection = (url: string) => url?.includes('collection.cloudinary.com');

  const getFileUrl = (url: string, forceDownload = false) => {
    if (!url) return '';
    
    // If it's a direct Cloudinary link, route it through our proxy for 100% reliability
    if (url.includes('cloudinary.com') && !isCloudinaryCollection(url)) {
      let finalUrl = url;
      
      // For images/videos being displayed directly (not downloaded), ensure they are public
      // and use standard transformations. For PDFs/Docs, we prefer the proxy's flexibility.
      if (forceDownload) {
        // If downloading, we let the proxy handle the filename and attachment header
        return `/api/media/proxy?url=${encodeURIComponent(finalUrl)}&download=true`;
      }
      
      // For videos, we MUST force MP4/H264 to fix black screen issues strictly
      if (isVideo(url)) {
        if (finalUrl.includes('/upload/')) {
          const parts = finalUrl.split('/upload/');
          finalUrl = `${parts[0]}/upload/f_mp4,vc_h264,q_auto/${parts[1]}`;
        }
      }

      return `/api/media/proxy?url=${encodeURIComponent(finalUrl)}`;
    }
    return url;
  };

  const getIsLessonLocked = (lesson: any) => {
    if (isAdmin() || isTeacher()) return false;
    if (lesson.locked) return true;

    // Strict sequential lock: If it's a Quiz/Homework, ensure all VIDEOS in the same section are completed
    const section = course.sections.find((s: any) => s.lessons.some((l: any) => l.id === lesson.id));
    if (section && (lesson.type === 'QUIZ' || lesson.type === 'HOMEWORK')) {
      const videosBefore = section.lessons.filter((l: any) => l.type === 'VIDEO');
      const hasUnfinishedVideo = videosBefore.some((v: any) => !enrollment?.completedLessons?.includes(v.id));
      if (hasUnfinishedVideo) return true;
    }
    return false;
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400">جاري تحميل محتوى الكورس... ⏳</div>;
  if (!course) return <div className="p-20 text-center font-black text-red-400">لم يتم العثور على الكورس. 🚫</div>;

  const isCurrentLessonLocked = currentLesson ? getIsLessonLocked(currentLesson) : false;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-6">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500 font-bold hover:bg-slate-100 rounded-xl">
            <ChevronRight className="h-4 w-4 ml-1" /> العودة للكورسات
          </Button>
        </div>

        {(!isAdmin() && !isTeacher() && (!course?.students?.includes(profile?.uid) && enrollment?.status !== 'APPROVED')) ? (
          <div className="aspect-video bg-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-white space-y-6 border-8 border-white shadow-premium p-8 text-center">
            <div className="h-24 w-24 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
              <Lock className="h-12 w-12 text-brand-secondary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black">هذا المحتوى مغلق 🔒</h3>
              {enrollment?.status === 'PENDING' ? (
                <p className="text-slate-400 font-bold max-w-md mx-auto">طلبك قيد المراجعة من قبل المعلم. سيتم إخطارك فور الموافقة على اشتراكك في الكورس.</p>
              ) : (
                <p className="text-slate-400 font-bold max-w-md mx-auto">للوصول إلى دروس هذا الكورس والاختبارات، يجب الاشتراك أولاً والحصول على موافقة المعلم.</p>
              )}
            </div>
            {enrollment?.status !== 'PENDING' && (
              <Button variant="primary" size="lg" onClick={handleRequestEnrollment} isLoading={isRequesting} className="rounded-2xl font-black h-16 px-12 text-lg shadow-2xl shadow-brand-primary/40 mt-4 group">
                طلب الانضمام للكورس 🎓
              </Button>
            )}
          </div>
        ) : isCurrentLessonLocked ? (
          <div className="aspect-video bg-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-white space-y-6 border-8 border-white shadow-premium p-8 text-center">
            <div className="h-24 w-24 bg-brand-primary/10 rounded-full flex items-center justify-center border-4 border-brand-primary/20">
              <Lock className="h-12 w-12 text-brand-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black">الاختبار مغلق حالياً 🔒</h2>
              <p className="text-slate-400 font-bold max-w-md mx-auto text-lg leading-relaxed">
                عذراً، يجب عليك مشاهدة جميع فيديوهات الشرح في هذه الوحدة أولاً لتتمكن من فتح هذا الاختبار.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
              <AlertCircle className="h-5 w-5 text-brand-secondary" />
              <p className="text-xs font-bold text-slate-300">نظام التعاقب مفعل: شاهد الفيديو لتفتح الاختبار ✅</p>
            </div>
          </div>
        ) : currentLesson ? (
          <div className="flex flex-col gap-6">
            {currentLesson.type === 'QUIZ' && currentLesson.contentUrl ? (
              <SecurityOverlay>
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-hidden min-h-[600px] animate-in slide-in-from-bottom duration-500">
                  <QuizEngine 
                    quizId={currentLesson.contentUrl} 
                    onBack={() => {}} 
                    onComplete={() => markLessonCompleted(currentLesson.id)}
                  />
                </div>
              </SecurityOverlay>
            ) : (
              <SecurityOverlay showViolationUI={false}>
                <div className="aspect-video bg-slate-900 rounded-[2.5rem] border-8 border-white shadow-premium overflow-hidden relative group font-sans">
                  {isCloudinaryCollection(currentLesson.contentUrl) ? (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-800 p-8 text-center text-white">
                       <div className="bg-brand-primary/20 p-6 rounded-full border border-brand-primary/30 mb-6 backdrop-blur-md">
                          <ImageIcon className="h-16 w-16 text-brand-primary" />
                       </div>
                       <h3 className="text-2xl font-black mb-4">هذا الرابط عبارة عن "مجموعة ملفات" 📁</h3>
                       <p className="text-slate-300 font-bold mb-8 max-w-lg leading-relaxed">
                          لقد قمت بإضافة رابط لمجموعة (Collection) من Cloudinary. لرؤية الملفات داخلها، يرجى الضغط على الزر أدناه.
                          <br/>
                          <span className="text-[10px] text-slate-400 mt-2 block">💡 نصيحة للمعلم: للحصول على أفضل تجربة للطلاب، يرجى وضع الرابط المباشر للملف (Direct Link) بدلاً من رابط المجموعة.</span>
                       </p>
                       <a 
                         href={currentLesson.contentUrl} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="bg-brand-primary text-white h-16 px-12 rounded-2xl font-black text-lg flex items-center gap-3 shadow-2xl hover:scale-105 transition-all"
                       >
                          فتح المجموعة في نافذة جديدة <ExternalLink className="h-5 w-5" />
                       </a>
                    </div>
                  ) : isVideo(currentLesson.contentUrl) || currentLesson.type === 'VIDEO' ? (
                    <VideoPlayer 
                      src={getFileUrl(currentLesson.contentUrl)} 
                      studentName={profile?.fullName || "طالب"}
                      studentPhone={profile?.phone || profile?.fatherPhone || "---"}
                      ipAddress="Active Session"
                      courseThumbnail={course?.thumbnailUrl}
                      onEnded={() => markLessonCompleted(currentLesson.id)}
                    />
                  ) : isImage(currentLesson.contentUrl) || currentLesson.type === 'IMAGE' ? (
                    <img src={getFileUrl(currentLesson.contentUrl)} className="w-full h-full object-contain" alt={currentLesson.title} />
                  ) : isDoc(currentLesson.contentUrl) || currentLesson.type === 'PDF' ? (
                    <div className="flex flex-col h-full w-full">
                      <div className="bg-white p-4 flex items-center justify-between border-b border-slate-100 relative z-20">
                        <div className="flex items-center gap-3 text-right">
                          <div className="bg-blue-500/10 p-2 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm leading-none">{currentLesson.title}</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">معاينة المستند 📖</p>
                          </div>
                        </div>
                        <Button variant="primary" size="sm" onClick={handleDownload} className="rounded-xl text-xs font-black shadow-lg shadow-brand-primary/30 flex items-center gap-2">
                          تحميل مباشر سريع 📥
                        </Button>
                      </div>
                      <iframe 
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(getFileUrl(currentLesson.contentUrl))}&embedded=true`} 
                        className="flex-1 w-full border-none bg-white"
                        title={currentLesson.title}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-800 p-8 text-center text-white">
                      <div className="bg-white/10 p-6 rounded-full mb-6 border border-white/10">
                        {isArchive(currentLesson.contentUrl) ? <FileArchive className="h-16 w-16 text-amber-400" /> : <FileIcon className="h-16 w-16 text-slate-400" />}
                      </div>
                      <h3 className="text-2xl font-black mb-2">{currentLesson.title}</h3>
                      <p className="text-slate-400 font-bold mb-8 max-w-md">
                         هذا النوع من الملفات (.{getFileExt(currentLesson.contentUrl)}) مخصص للتحميل المباشر فقط. يرجى الضغط على الزر أدناه.
                      </p>
                      <Button variant="primary" size="lg" onClick={handleDownload} className="rounded-2xl font-black h-16 px-12 text-lg shadow-2xl shadow-brand-primary/40">
                        بدء التحميل المباشر 📥
                      </Button>
                    </div>
                  )}
                </div>
              </SecurityOverlay>
            )}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-900">{currentLesson?.title || 'جاري التحميل...'}</h2>
            <p className="text-sm text-slate-500">{course.title}</p>
          </div>
          <div className="flex items-center gap-2" dir="ltr">
            <Button variant="outline" size="sm" disabled={activeLessonIdx === 0} onClick={() => setActiveLessonIdx(v => v - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> السابق
            </Button>
            <Button variant="outline" size="sm" disabled={activeLessonIdx === allLessons.length - 1} onClick={() => setActiveLessonIdx(v => v + 1)}>
              التالي <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-right">وصف الدرس</h3>
            <div className="bg-red-50 px-3 py-1 rounded-lg border border-red-100 flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-[10px] font-black text-red-600">نظام حماية المحتوى مفعل 🛡️</span>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-right">
            {currentLesson?.description || "لا يوجد وصف متاح لهذا الدرس حالياً."}
          </p>
          
          <div className="mt-6 space-y-3">
             <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-right">
                <p className="text-[10px] font-black text-amber-700 leading-relaxed">
                   ⚠️ ملحوظة هامة: يمنع منعا باتا أخذ لقطات شاشة (Screenshots) أو تسجيل فيديو للمحتوى. أي محاولة سيتم رصدها تلقائياً وقد تؤدي لحظر الحساب نهائياً.
                </p>
             </div>

             {currentLesson?.contentUrl && !isVideo(currentLesson.contentUrl) && (
               <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <Download className="h-5 w-5 text-brand-primary" />
                   <div className="text-right">
                     <p className="text-sm font-bold">تحميل مرفق المحاضرة</p>
                     <p className="text-[10px] text-slate-500">.{getFileExt(currentLesson.contentUrl)} | تم التحديث مؤخراً</p>
                   </div>
                 </div>
                 <Button variant="primary" size="sm" onClick={handleDownload} className="font-bold px-6 border-none">تحميل الآن</Button>
               </div>
             )}
          </div>
        </div>

        <LessonComments 
          lessonId={currentLesson.id} 
          courseId={courseId} 
          profile={profile} 
        />
      </div>

      {/* Right Side: List */}
      <div className="w-full lg:w-80 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 text-right">
          <h3 className="font-bold text-sm">محتوى الكورس</h3>
          <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${enrollment?.progress || 0}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">تم إكمال {enrollment?.progress || 0}% • {enrollment?.completedLessons?.length || 0}/{allLessons.length} من الدروس</p>
        </div>
        <div className="flex-1 overflow-y-auto font-sans">
          {course.sections?.map((section: any, sIdx: number) => (
            <div key={sIdx}>
              <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100 text-right">{section.title}</div>
              <div className="divide-y divide-slate-50">
                {section.lessons.map((lesson: any) => {
                  const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id);
                  const isActive = activeLessonIdx === globalIdx;
                  const isLocked = getIsLessonLocked(lesson);
                  return (
                    <button 
                      key={lesson.id} 
                      disabled={isLocked} 
                      onClick={() => setActiveLessonIdx(globalIdx)} 
                      className={cn(
                        "w-full flex items-start gap-3 p-4 text-right transition-colors", 
                        isActive ? "bg-brand-primary/5" : "hover:bg-slate-50", 
                        isLocked && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="mt-0.5">
                        {enrollment?.completedLessons?.includes(lesson.id) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : isLocked ? (
                          <Lock className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Play className={cn("h-4 w-4", isActive ? "text-brand-primary" : "text-slate-400")} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-xs font-bold", isActive ? "text-brand-primary" : "text-slate-700")}>{lesson.title}</p>
                        {lesson.duration && <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{lesson.duration}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          courseId={courseId}
          courseTitle={course?.title}
          price={course?.price || 0}
          teacherId={course?.teacherId}
          onConfirm={() => {
            setShowPaymentModal(false);
          }}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};
