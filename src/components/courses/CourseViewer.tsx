import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Play, FileText, GraduationCap, CheckCircle2, Lock, Layers, 
  Image as ImageIcon, Download, FileArchive, File as FileIcon, ExternalLink, AlertCircle, 
  Eye, Upload, Send, Star, Clock, Trophy, Calendar, X
} from 'lucide-react';
import { VideoPlayer } from '../video/VideoPlayer';
import { Button } from '../ui/Button';
import { QuizEngine } from '../quizzes/QuizEngine';
import { PaymentModal } from '../payments/PaymentModal';
import { cn } from '../../lib/utils';
import { 
  doc, getDoc, collection, query, where, onSnapshot, addDoc, 
  updateDoc, arrayUnion, limit 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { SecurityOverlay } from '../security/SecurityOverlay';
import { LessonComments } from './LessonComments';
import { uploadFileToSupabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const VIDEO_COMPLETION_THRESHOLD = 85; // % to consider video watched

// ─── Homework Lesson View ───────────────────────────────────────────────────
const HomeworkLessonView = ({ 
  homeworkId, 
  profile, 
  onComplete 
}: { 
  homeworkId: string; 
  profile: any; 
  onComplete: () => void;
}) => {
  const [homework, setHomework] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!homeworkId || !profile?.uid) return;

    // Fetch Homework Details
    const fetchHW = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'homework', homeworkId));
        if (docSnap.exists()) {
          setHomework({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error('Error fetching homework:', err);
      }
    };

    // Listen for Student Submission
    const q = query(
      collection(db, 'homework_submissions'),
      where('homeworkId', '==', homeworkId),
      where('studentId', '==', profile.uid),
      limit(1)
    );
    
    const unsubscribeSub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setSubmission({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setSubmission(null);
      }
      setLoading(false);
    });

    fetchHW();
    return () => unsubscribeSub();
  }, [homeworkId, profile?.uid]);

  const handleUpload = async () => {
    if (!file || !profile?.uid || !homework) return;
    setIsUploading(true);
    try {
      const fileUrl = await uploadFileToSupabase(file, 'student-submissions');
      
      await addDoc(collection(db, 'homework_submissions'), {
        homeworkId: homework.id,
        studentId: profile.uid,
        studentName: profile.fullName,
        fileUrl,
        fileName: file.name,
        submittedAt: new Date().toISOString(),
      });

      // Increment submissions count in main homework doc
      await updateDoc(doc(db, 'homework', homework.id), {
        submissions: (homework.submissions || 0) + 1
      });

      setFile(null);
      onComplete(); // Mark lesson as completed
    } catch (err) {
      console.error('Error submitting homework:', err);
      alert('حدث خطأ أثناء رفع الحل. حاول مرة أخرى.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="h-12 w-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-slate-400">جاري تحميل بيانات الواجب... ⏳</p>
    </div>
  );

  if (!homework) {
    // FALLBACK: If homeworkId is actually a direct file URL (legacy/migrated content)
    const isFileUrl = homeworkId?.startsWith('http') || homeworkId?.includes('cloudinary.com') || homeworkId?.includes('supabase');
    
    if (isFileUrl) {
      return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium p-12 text-center space-y-8" dir="rtl">
          <div className="h-24 w-24 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto border-4 border-brand-primary/5">
            <FileText className="h-12 w-12 text-brand-primary" />
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black text-slate-900">ملف الواجب المنزلي 📝</h3>
            <p className="text-slate-500 font-bold text-lg max-w-md mx-auto leading-relaxed">
              يرجى تحميل ملف الواجب المرفق أدناه، حله، ثم تسليمه إلى المعلم مباشرة أو عبر المنصة عند تفعيل نظام التسليم الجديد لهذا الدرس.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              variant="primary" 
              size="lg" 
              className="rounded-2xl font-black h-16 px-12 text-lg shadow-xl shadow-brand-primary/30"
              onClick={() => window.open(homeworkId, '_blank')}
            >
              تحميل ملف الواجب 📥
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="rounded-2xl font-black h-16 px-12 text-lg"
              onClick={onComplete}
            >
              تعليم كمكتمل ✅
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
        <p className="font-black text-slate-500">عذراً، لم يتم العثور على بيانات هذا الواجب.</p>
        <p className="text-[10px] text-slate-400">المعرف: {homeworkId}</p>
      </div>
    );
  }

  const isGraded = submission?.grade !== undefined && submission?.grade !== null;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-hidden animate-in fade-in duration-500 text-right" dir="rtl">
      {/* HW Hero Header */}
      <div className="p-8 md:p-12 bg-slate-50 border-b border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
             <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-black rounded-lg uppercase tracking-tight">واجب منزلي</span>
                <span className="text-slate-400 font-bold text-xs">{homework.subject}</span>
             </div>
             <h3 className="text-3xl font-black text-slate-900">{homework.title}</h3>
             <div className="flex items-center gap-4 text-slate-500 text-sm font-bold">
                <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> التسليم قبل: {new Date(homework.dueDate).toLocaleDateString('ar-EG')}</div>
                <div className="flex items-center gap-1.5 text-brand-primary"><Star className="h-4 w-4" /> الدرجة القصوى: {homework.maxGrade}</div>
             </div>
          </div>
          
          {isGraded ? (
            <div className="bg-green-500 text-white p-6 rounded-[2rem] shadow-xl shadow-green-200 flex flex-col items-center min-w-[140px] border-4 border-white">
              <Trophy className="h-8 w-8 mb-2" />
              <div className="text-3xl font-black leading-none">{submission.grade}</div>
              <div className="text-[10px] font-bold opacity-80 mt-1">من {homework.maxGrade}</div>
            </div>
          ) : submission ? (
            <div className="bg-amber-500 text-white px-8 py-5 rounded-[2rem] shadow-xl shadow-amber-200 flex items-center gap-3 border-4 border-white">
              <Clock className="h-6 w-6 animate-pulse" />
              <span className="font-black text-lg">قيد التصحيح...</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-8 md:p-12 space-y-10">
        {/* Description & Instruction */}
        <div className="space-y-4">
          <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-primary" /> تعليمات الواجب
          </h4>
          <p className="text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic">
            {homework.description || "يرجى حل الواجب المطلوب ورفعه كملف PDF أو صورة واضحة."}
          </p>
          
          {homework.attachmentUrl && (
            <Button 
              variant="outline" 
              className="rounded-2xl h-14 font-black px-8 bg-brand-primary/5 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10 transition-all flex items-center gap-3"
              onClick={() => window.open(homework.attachmentUrl, '_blank')}
            >
              <Download className="h-5 w-5" /> تحميل ملف الواجب المرفق
            </Button>
          )}
        </div>

        {/* Submission Section */}
        <div className="pt-10 border-t border-slate-100 space-y-6">
          <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" /> 
            {submission ? 'حلولك التي رفعتها' : 'رفع حل الواجب'}
          </h4>

          {submission ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6" />
                   </div>
                   <div className="text-right">
                      <p className="font-black text-slate-900">{submission.fileName}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{new Date(submission.submittedAt).toLocaleString('ar-EG')}</p>
                   </div>
                </div>
                <Button variant="ghost" className="rounded-xl font-bold" onClick={() => window.open(submission.fileUrl, '_blank')}>
                   <Eye className="h-4 w-4 ml-2" /> عرض الملف
                </Button>
              </div>

              {isGraded && (
                <div className="p-6 bg-green-50 rounded-3xl border border-green-100 animate-in slide-in-from-top-4">
                  <h5 className="font-black text-green-800 flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4" /> ملاحظات المعلم:
                  </h5>
                  <p className="text-green-700 font-bold text-sm leading-relaxed">
                    {submission.feedback || "أحسنت! إجابة ممتازة."}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
               <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center hover:border-brand-primary transition-all cursor-pointer group bg-slate-50/30 hover:bg-slate-50"
                 onClick={() => (document.getElementById('hw-sub') as HTMLInputElement)?.click()}>
                  <input type="file" id="hw-sub" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.gif,.zip,.rar" 
                    onChange={e => setFile(e.target.files?.[0] || null)} />
                  <div className="h-20 w-20 bg-white shadow-xl rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                    <Upload className="h-10 w-10 text-slate-300" />
                  </div>
                  <h5 className="text-xl font-black text-slate-900 mb-2">{file ? file.name : 'اسحب ملف الحل هنا'}</h5>
                  <p className="text-slate-400 font-bold mb-8">PDF أو صور (بحد أقصى 25 ميجابايت)</p>
                  
                  <div className="flex justify-center gap-3">
                    <Button variant="primary" size="lg" className="rounded-2xl font-black h-16 px-12 shadow-2xl shadow-brand-primary/30"
                      onClick={e => { e.stopPropagation(); handleUpload(); }} disabled={!file || isUploading} isLoading={isUploading}>
                      {isUploading ? 'جاري الرفع...' : 'تأكيد رفع الحل 🚀'}
                    </Button>
                    {file && (
                      <Button variant="ghost" className="rounded-2xl h-16 w-16 p-0 text-red-500 hover:bg-red-50" onClick={e => { e.stopPropagation(); setFile(null); }}>
                        <X className="h-6 w-6" />
                      </Button>
                    )}
                  </div>
               </div>
               <p className="text-xs text-amber-600 font-bold bg-amber-50 p-4 rounded-xl border border-amber-100 inline-block">
                 ⚠️ تنبيه: بمجرد رفع الحل، يمكنك تغييره فقط عبر التواصل مع المعلم. يرجى التأكد من الملف قبل الرفع.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CourseViewer = ({ courseId, onBack }: { courseId: string, onBack: () => void }) => {
  const { profile, isAdmin, isTeacher } = useEducatorsAuth();
  const [course, setCourse] = useState<any>(null);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({}); // lessonId -> % watched
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(new Set());
  const autoAdvanceRef = useRef(false);

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
    if (!profile?.uid || optimisticCompleted.has(lessonId)) return;
    
    // Optimistic UI Update - Show checkmark instantly even during tests
    setOptimisticCompleted(prev => new Set(prev).add(lessonId));

    if (!enrollment || enrollment.completedLessons?.includes(lessonId)) return;

    try {
      const { increment, arrayUnion } = await import('firebase/firestore');
      const updatedLessonsCount = (enrollment.completedLessons?.length || 0) + 1;
      const progress = Math.round((updatedLessonsCount / allLessons.length) * 100);
      
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
    toast.loading('جاري تجهيز طلب الانضمام والاشتراك... ⏳', { duration: 2000 });
    setTimeout(() => {
      setShowPaymentModal(true);
    }, 1000);
  };

  // Pre-fetch signed URLs for videos and images to avoid Vercel proxy issues while maintaining security
  useEffect(() => {
    const resolveMediaUrl = async () => {
       const url = currentLesson?.contentUrl;
       if (!url) {
         setResolvedUrl('');
         return;
       }
       
       if (url.includes('cloudinary.com') && !isCloudinaryCollection(url) && (isVideo(url) || isImage(url))) {
         let finalUrl = url;
         if (isVideo(url) && finalUrl.includes('/upload/')) {
            const parts = finalUrl.split('/upload/');
            finalUrl = `${parts[0]}/upload/f_mp4,vc_h264,q_auto/${parts[1]}`;
         }
         try {
            const res = await fetch(`/api/cloudinary/sign-delivery?url=${encodeURIComponent(finalUrl)}`);
            const data = await res.json();
            setResolvedUrl(data.signedUrl || finalUrl);
         } catch(e) {
            console.error("Failed to sign url:", e);
            setResolvedUrl(finalUrl);
         }
       } else if (url.includes('cloudinary.com') && !isCloudinaryCollection(url)) {
         setResolvedUrl(`/api/media/proxy?url=${encodeURIComponent(url)}`);
       } else {
         setResolvedUrl(url);
       }
    };
    resolveMediaUrl();
  }, [currentLesson?.contentUrl]);

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

      // DO NOT proxy videos or images for display! Serverless functions break mobile video range requests.
      if (isVideo(url) || isImage(url)) {
        return finalUrl;
      }

      // For PDFs and Docs, proxying helps with CORS and download enforcement
      return `/api/media/proxy?url=${encodeURIComponent(finalUrl)}`;
    }
    return url;
  };

  // ── Save video progress to Firestore ──
  const handleVideoProgress = useCallback(async (percent: number) => {
    if (!profile?.uid || !enrollment || !currentLesson) return;
    const lessonId = currentLesson.id;
    
    setVideoProgress(prev => ({ ...prev, [lessonId]: Math.max(prev[lessonId] || 0, percent) }));
    
    // Persist to Firestore every 10% increment
    if (percent % 10 === 0 || percent >= VIDEO_COMPLETION_THRESHOLD) {
      try {
        const progressMap = enrollment.videoProgress || {};
        const currentSaved = progressMap[lessonId] || 0;
        if (percent > currentSaved) {
          await updateDoc(doc(db, 'enrollments', enrollment.id), {
            [`videoProgress.${lessonId}`]: percent
          });
        }
      } catch (e) {
        console.error('Error saving video progress:', e);
      }
    }
  }, [profile?.uid, enrollment, currentLesson]);

  // ── Auto-advance to exam when video completes ──
  const handleVideoEnded = useCallback(() => {
    if (!currentLesson) return;
    markLessonCompleted(currentLesson.id);
    
    // Auto-advance to next exam if it exists in same section
    const section = course?.sections?.find((s: any) => 
      s.lessons.some((l: any) => l.id === currentLesson.id)
    );
    if (section) {
      const currentIdx = section.lessons.findIndex((l: any) => l.id === currentLesson.id);
      const nextLesson = section.lessons[currentIdx + 1];
      if (nextLesson && (nextLesson.type === 'QUIZ' || nextLesson.type === 'HOMEWORK')) {
        // Auto-advance to the exam after a brief delay
        autoAdvanceRef.current = true;
        setTimeout(() => {
          const globalIdx = allLessons.findIndex((l: any) => l.id === nextLesson.id);
          if (globalIdx >= 0) setActiveLessonIdx(globalIdx);
          autoAdvanceRef.current = false;
        }, 1500);
      }
    }
  }, [currentLesson, course, allLessons]);

  const getIsLessonLocked = (lesson: any) => {
    if (isAdmin() || isTeacher()) return false;
    if (lesson.locked) return true;
    
    // Root fix: If already in completedLessons in Firestore, it must be unlocked
    if (enrollment?.completedLessons?.includes(lesson.id)) return false;

    // Sequential lock: If Quiz/Homework, ensure all VIDEOS in same section are fully watched (90%+)
    const section = course.sections?.find((s: any) => s.lessons.some((l: any) => l.id === lesson.id));
    if (section && (lesson.type === 'QUIZ' || lesson.type === 'HOMEWORK')) {
      const videosInSameSection = section.lessons.filter((l: any) => l.type === 'VIDEO');
      const hasUnfinishedVideo = videosInSameSection.some((v: any) => {
        const isComp = enrollment?.completedLessons?.includes(v.id);
        const savedProg = enrollment?.videoProgress?.[v.id] || 0;
        const localProg = videoProgress[v.id] || 0;
        const maxProg = Math.max(savedProg, localProg);
        return !isComp && maxProg < VIDEO_COMPLETION_THRESHOLD;
      });
      if (hasUnfinishedVideo) return true;
    }
    return false;
  };

  // Helper: get video watch % for sidebar display
  const getVideoWatchPercent = (lessonId: string) => {
    const saved = enrollment?.videoProgress?.[lessonId] || 0;
    const local = videoProgress[lessonId] || 0;
    return Math.max(saved, local);
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400">جاري تحميل محتوى الكورس... ⏳</div>;
  if (!course) return <div className="p-20 text-center font-black text-red-400">لم يتم العثور على الكورس. 🚫</div>;

  const isCurrentLessonLocked = currentLesson ? getIsLessonLocked(currentLesson) : false;

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-120px)] gap-6 lg:gap-8 pb-10 lg:pb-0">
      <div className="flex-1 space-y-4 overflow-y-auto lg:pr-2 px-1 sm:px-0">
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
                <p className="text-slate-400 font-bold max-w-md mx-auto">طلبك قيد المراجعة. يرجى التأكد من دفع رسوم الكورس وإرسال الوصل للمعلم ليتم تفعيل الحساب فوراً.</p>
              ) : (
                <p className="text-slate-400 font-bold max-w-md mx-auto">للوصول إلى دروس هذا الكورس والاختبارات، يجب الاشتراك أولاً وإتمام عملية الدفع للحصول على موافقة المعلم.</p>
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
            ) : currentLesson.type === 'HOMEWORK' && currentLesson.contentUrl ? (
              <SecurityOverlay showViolationUI={false}>
                <HomeworkLessonView 
                  homeworkId={currentLesson.contentUrl} 
                  profile={profile}
                  onComplete={() => markLessonCompleted(currentLesson.id)}
                />
              </SecurityOverlay>
            ) : (
              <SecurityOverlay showViolationUI={false}>
                <div className="aspect-video bg-slate-900 rounded-2xl sm:rounded-[2.5rem] border-4 sm:border-8 border-white shadow-premium overflow-hidden relative group font-sans">
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
                      src={resolvedUrl || getFileUrl(currentLesson.contentUrl)} 
                      studentName={profile?.fullName || "طالب"}
                      studentPhone={profile?.phone || profile?.fatherPhone || "---"}
                      courseThumbnail={course?.thumbnailUrl}
                      onEnded={handleVideoEnded}
                      onProgress={handleVideoProgress}
                      initialProgress={getVideoWatchPercent(currentLesson.id)}
                    />
                  ) : isImage(currentLesson.contentUrl) || currentLesson.type === 'IMAGE' ? (
                    <img src={resolvedUrl || getFileUrl(currentLesson.contentUrl)} className="w-full h-full object-contain" alt={currentLesson.title} />
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


          </div>
        </div>

        <LessonComments 
          lessonId={currentLesson.id} 
          courseId={courseId} 
          profile={profile} 
        />
      </div>

      {/* Right Side: Content Sidebar with Bubble/Glass Theme */}
      <div className="w-full lg:w-85 xl:w-[22rem] glass-mauve rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden border border-white/10 shadow-2xl relative">
        <div className="p-6 border-b border-white/10 bg-white/5 text-right relative group">
          <div className="flex items-center justify-between mb-3">
             <button 
              onClick={() => window.location.reload()} 
              className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
              title="تحديث البيانات"
             >
                <div className="animate-spin-slow">
                  <Layers className="h-3.5 w-3.5" />
                </div>
             </button>
             <h3 className="text-white font-black text-base">محتوى الكورس</h3>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-brand-primary transition-all duration-1000 shadow-[0_0_15px_rgba(139,92,246,0.6)]" style={{ width: `${enrollment?.progress || 0}%` }} />
          </div>
          <p className="text-[10px] text-white/50 font-bold mt-2 tracking-tight">تم إكمال {enrollment?.progress || 0}% • {enrollment?.completedLessons?.length || 0}/{allLessons.length} من الدروس</p>
        </div>
        <div className="flex-1 overflow-y-auto font-sans p-2 space-y-1 scrollbar-none">
          {course.sections?.map((section: any, sIdx: number) => (
            <div key={sIdx}>
              <div className="px-5 py-3 text-[11px] font-black text-white/40 uppercase tracking-widest border-y border-white/5 bg-white/5 text-right mt-2 first:mt-0 rounded-xl mx-2 mb-1">{section.title}</div>
              <div className="space-y-1 mx-2">
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
                        "w-full flex items-center gap-4 p-4 text-right transition-all duration-300 rounded-[1.5rem] group relative", 
                        isActive 
                          ? "glass-item-active text-white scale-[1.02] shadow-xl z-10" 
                          : "text-white/60 hover:text-white hover:bg-white/5", 
                        isLocked && "opacity-40 cursor-not-allowed grayscale"
                      )}
                    >
                      <div className="shrink-0">
                        {(enrollment?.completedLessons?.includes(lesson.id) || optimisticCompleted.has(lesson.id) || (lesson.type === 'VIDEO' && getVideoWatchPercent(lesson.id) >= VIDEO_COMPLETION_THRESHOLD)) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        ) : isLocked ? (
                          <Lock className="h-5 w-5 text-white/30" />
                        ) : (lesson.type === 'VIDEO' && getVideoWatchPercent(lesson.id) > 0 && getVideoWatchPercent(lesson.id) < VIDEO_COMPLETION_THRESHOLD) ? (
                          <div className="relative h-5 w-5">
                            <Eye className="h-5 w-5 text-brand-primary/60" />
                            <div className="absolute -bottom-0.5 -right-0.5 bg-brand-primary text-white text-[7px] font-black rounded-full h-3 w-3 flex items-center justify-center">
                              {getVideoWatchPercent(lesson.id) > 0 ? Math.min(getVideoWatchPercent(lesson.id), 99) : ''}
                            </div>
                          </div>
                        ) : (
                          <Play className={cn("h-5 w-5", isActive ? "text-white animate-pulse" : "text-white/40 group-hover:text-white")} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[0.85rem] font-black tracking-tight leading-tight", isActive ? "text-white" : "text-current")}>
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {lesson.duration && <p className="text-[10px] text-white/40 font-bold leading-none">{lesson.duration}</p>}
                          {lesson.type === 'VIDEO' && getVideoWatchPercent(lesson.id) > 0 && !enrollment?.completedLessons?.includes(lesson.id) && !optimisticCompleted.has(lesson.id) && (
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${getVideoWatchPercent(lesson.id)}%` }} />
                              </div>
                              <span className="text-[8px] text-white/30 font-bold">{getVideoWatchPercent(lesson.id)}%</span>
                            </div>
                          )}
                        </div>
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
