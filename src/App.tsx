import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit, onSnapshot, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { SecurityMonitor } from './components/security/SecurityMonitor';
import { Settings } from './components/dashboard/Settings';
import { CourseViewer } from './components/courses/CourseViewer';
import { QuizEngine } from './components/quizzes/QuizEngine';
import { cn } from './lib/utils';
import { useEducatorsAuth } from './components/auth/AuthProvider';
import { Button } from './components/ui/Button';
import { RegistrationForm } from './components/auth/RegistrationForm';
import { CoursesList } from './components/courses/CoursesList';
import { CourseManager } from './components/courses/CourseManager';
import { TeacherStudents } from './components/dashboard/TeacherStudents';
import { Homework } from './components/dashboard/Homework';
import { Reports } from './components/dashboard/Reports';
import { Payments } from './components/dashboard/Payments';
import { Quizzes } from './components/dashboard/Quizzes';
import { QuizCreator } from './components/quizzes/QuizCreator';
import { PerformanceAI } from './components/dashboard/PerformanceAI';
import { TeacherAnnouncements } from './components/dashboard/TeacherAnnouncements';
import { Security } from './components/dashboard/Security';
import { TeachersList } from './components/courses/TeachersList';
import { TeacherProfileView } from './components/courses/TeacherProfileView';
import { GraduationCap, ShieldCheck, Mail, Lock, ArrowLeft, Clock, ShieldAlert, Users, ChevronRight } from 'lucide-react';
import { StudentProfile } from './components/dashboard/StudentProfile';
import { MessageCenter } from './components/dashboard/MessageCenter';
import { StudentResults } from './components/dashboard/StudentResults';
import { NotificationCenter } from './components/dashboard/NotificationCenter';
import { UserRole } from './types';

type View = 'DASHBOARD' | 'COURSE_VIEWER' | 'QUIZ' | 'COURSES' | 'MANAGE_COURSES' | 'HOMEWORK' | 'QUIZZES' | 'CREATE_QUIZ' | 'STUDENTS' | 'REPORTS' | 'PAYMENTS' | 'SECURITY' | 'SETTINGS' | 'PERFORMANCE_AI' | 'ANNOUNCEMENTS' | 'TEACHERS' | 'MESSAGES' | 'TEACHER_PROFILE' | 'STUDENT_RESULTS' | 'NOTIFICATION_CENTER';
type LandingView = 'HOME' | 'AUTH' | 'TEACHERS' | 'ABOUT';

const LandingHeader = ({ 
  onLogin, 
  onSignup, 
  onViewChange,
  activeView,
  whatsappNumber
}: { 
  onLogin: () => void, 
  onSignup: () => void,
  onViewChange: (view: LandingView) => void,
  activeView: LandingView,
  whatsappNumber: string
}) => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4" dir="rtl">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div 
          onClick={() => onViewChange('HOME')}
          className="bg-brand-primary p-2 px-4 rounded-xl shadow-lg shadow-brand-primary/20 transform -rotate-3 logo-animate logo-interactive ring-4 ring-white"
        >
          <span className="text-white font-black text-3xl brand-text !text-white !shadow-none">التربويين</span>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-8">
        <button 
          onClick={() => onViewChange('HOME')}
          className={cn(
            "font-black transition-all text-sm uppercase tracking-wider underline-offset-8 decoration-4",
            activeView === 'HOME' ? "text-brand-primary underline" : "text-slate-400 hover:text-brand-primary"
          )}
        >الرئيسية</button>
        <button 
          onClick={() => onViewChange('TEACHERS')}
          className={cn(
            "font-black transition-all text-sm uppercase tracking-wider underline-offset-8 decoration-4",
            activeView === 'TEACHERS' ? "text-brand-primary underline" : "text-slate-400 hover:text-brand-primary"
          )}
        >المعلمون</button>
        <button 
          onClick={() => onViewChange('ABOUT')}
          className={cn(
            "font-black transition-all text-sm uppercase tracking-wider underline-offset-8 decoration-4",
            activeView === 'ABOUT' ? "text-brand-primary underline" : "text-slate-400 hover:text-brand-primary"
          )}
        >عن المنصة</button>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={onLogin}
          className="rounded-2xl border-2 border-slate-100 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-slate-800 font-black px-6 border-none"
        >
          تسجيل الدخول
        </Button>
        <Button 
          variant="primary" 
          onClick={onSignup}
          className="rounded-2xl bg-brand-primary shadow-lg shadow-brand-primary/20 text-white font-black px-8 hidden sm:flex"
        >
          حساب جديد
        </Button>
        <a 
          href={whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-10 w-10 flex items-center justify-center bg-brand-mint text-white rounded-full transition-transform hover:scale-110 shadow-lg shadow-brand-mint/20"
        >
          <Mail className="h-5 w-5" />
        </a>
      </div>
    </div>
  </header>
);

const TeachersSection = ({ 
  onSignup,
  title,
  desc
}: { 
  onSignup: (role: UserRole) => void,
  title?: string,
  desc?: string
}) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const q = query(collection(db, "profiles"), where("role", "==", "TEACHER"), limit(8));
        const snapshot = await getDocs(q);
        setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Error fetching teachers:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  return (
    <div className="py-20 px-6 max-w-7xl mx-auto space-y-20">
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-block px-6 py-2 bg-brand-primary/10 rounded-full text-brand-primary font-black text-sm uppercase tracking-widest mb-4">
          نخبة المعلمين 👨‍🏫
        </div>
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-tight whitespace-pre-line">
          {title || <>تعلم مع <span className="text-brand-primary">العظماء</span> في مجالك</>}
        </h2>
        <p className="text-slate-500 font-bold text-xl md:text-2xl leading-relaxed">
          {desc || "نضم أفضل الكوادر التعليمية بخبرة تزيد عن 20 عاماً، لنضمن لك تجربة تعليمية لا تُنسى ومستقبلاً باهراً."}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-96 bg-slate-50 rounded-[3rem] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="group relative bg-white p-6 rounded-[3rem] shadow-premium border-2 border-slate-50 hover:border-brand-primary transition-all duration-500 hover:-translate-y-4">
              <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-6 shadow-xl ring-8 ring-slate-50 group-hover:ring-brand-primary/10 transition-all">
                {teacher.photoURL ? (
                  <img src={teacher.photoURL} alt={teacher.fullName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Users className="h-20 w-20 opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                  <span className="text-white font-black text-sm tracking-widest">تخصص: {teacher.subject || 'عام'}</span>
                </div>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-black text-slate-900">{teacher.fullName}</h3>
                <p className="text-slate-400 font-bold text-sm line-clamp-2 leading-relaxed">
                  {teacher.bio || "معلم خبير متخصص في المنصة التعليمية، يهدف لتبسيط المعرفة لجميع الطلاب."}
                </p>
                <div className="pt-4">
                   <Button 
                    variant="outline" 
                    className="w-full rounded-2xl border-2 border-brand-primary/10 text-brand-primary font-black hover:bg-brand-primary hover:text-white transition-all shadow-lg shadow-brand-primary/5"
                    onClick={() => onSignup('STUDENT')}
                   >
                     سجل معه الآن
                   </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-brand-primary rounded-[4rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden shadow-2xl shadow-brand-primary/30">
         <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
         <div className="relative z-10 space-y-6">
            <h3 className="text-4xl md:text-6xl font-black text-white">هل أنت معلم محترف؟</h3>
            <p className="text-white/80 font-bold text-xl max-w-2xl mx-auto">انضم إلينا الآن وابدأ في مشاركة معرفتك مع آلاف الطلاب الطموحين.</p>
            <Button 
              className="bg-white text-brand-primary h-20 px-12 rounded-[2rem] text-2xl font-black shadow-2xl hover:scale-110 transition-transform border-none"
              onClick={() => onSignup('TEACHER')}
            >
              سجل كمعلم الآن ✨
            </Button>
         </div>
      </div>
    </div>
  );
};

const BenefitsSection = ({ onBack }: { onBack: () => void }) => (
  <div className="py-20 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700" dir="rtl">
    <button 
      onClick={onBack}
      className="flex items-center gap-2 text-slate-400 hover:text-brand-primary font-black transition-colors"
    >
      <ArrowLeft className="h-5 w-5 rotate-180" />
      العودة للرئيسية
    </button>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div className="space-y-8">
        <div className="inline-block px-6 py-2 bg-brand-primary/10 rounded-full text-brand-primary font-black text-sm uppercase tracking-widest">
          لماذا نحن؟ ✨
        </div>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight">
          ليه تذاكر مع <span className="text-brand-primary">التربويين</span> ؟
        </h2>
        <p className="text-slate-600 font-bold text-xl leading-relaxed">
          في منصة التربويين، اجتمع "صفوة المعلمين" في مكان واحد ليحولوا المناهج الصعبة إلى تجربة ممتعة ونتائج مضمونة. نحن نؤمن أن التعليم ليس تلقيناً، بل هو رحلة ذكية تبدأ بضغطة زر.
        </p>

        <div className="space-y-6">
          <div className="flex gap-4 p-6 bg-white rounded-3xl shadow-sm border border-slate-50 hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Users className="text-brand-primary h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-lg">نخبة الخبراء</h4>
              <p className="text-slate-500 font-bold text-sm">اخترنا لك المدرسين اللي "فاهمين اللعبة" وبيوصلوا المعلومة من أقصر طريق.</p>
            </div>
          </div>

          <div className="flex gap-4 p-6 bg-white rounded-3xl shadow-sm border border-slate-50 hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-brand-mint/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="text-brand-mint h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-lg">تجربة تعليمية ذكية</h4>
              <p className="text-slate-500 font-bold text-sm">محتوى تفاعلي، اختبارات دورية، ومتابعة لحظية تجعلك دائماً في المقدمة.</p>
            </div>
          </div>

          <div className="flex gap-4 p-6 bg-white rounded-3xl shadow-sm border border-slate-50 hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-brand-secondary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="text-brand-secondary-dark h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-lg">ببساطة</h4>
              <p className="text-slate-500 font-bold text-sm">"التربويين" هي المكان اللي بيتحول فيه الطالب من مجرد "دارس" إلى "متفوق" جاهز للمستقبل.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-4 bg-brand-primary/5 rounded-[4rem] blur-3xl group-hover:bg-brand-primary/10 transition-colors"></div>
        <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
          <img 
            src="/assets/benefits_illustration.png" 
            alt="Benefits" 
            className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </div>
    </div>
  </div>
);

const LandingFooter = ({ 
  settings 
}: { 
  settings: { 
    facebookUrl?: string, 
    instagramUrl?: string, 
    linkedinUrl?: string 
  } 
}) => (
  <footer className="bg-slate-50 border-t border-slate-100 py-16 px-6" dir="rtl">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="space-y-6">
        <h2 className="text-5xl font-black text-slate-900 brand-text">التربويين</h2>
        <p className="text-slate-500 font-bold text-sm leading-relaxed">
          المنصة التعليمية الأولى والاشمل في الوطن العربي، نضم نخبة من أفضل المعلمين لتقديم تجربة تعليمية فريدة.
        </p>
      </div>
      <div>
        <h4 className="font-black text-slate-900 mb-6 underline decoration-brand-secondary decoration-4 underline-offset-8">قنوات تواصل إعدادي</h4>
        <ul className="space-y-4 text-sm font-bold text-slate-500">
          <li className="flex items-center gap-2 hover:text-brand-primary cursor-pointer transition-colors"><span>📱</span> المرحلة الإعدادية</li>
          <li className="flex items-center gap-2 hover:text-brand-primary cursor-pointer transition-colors"><span>📱</span> الأول الإعدادي</li>
          <li className="flex items-center gap-2 hover:text-brand-primary cursor-pointer transition-colors"><span>📱</span> الثاني الإعدادي</li>
        </ul>
      </div>
      <div>
        <h4 className="font-black text-slate-900 mb-6 underline decoration-brand-primary decoration-4 underline-offset-8">الأحكام</h4>
        <ul className="space-y-4 text-sm font-bold text-slate-500">
          <li className="hover:text-brand-primary cursor-pointer transition-colors">سياسة الخصوصية</li>
          <li className="hover:text-brand-primary cursor-pointer transition-colors">الشروط والأحكام</li>
          <li className="hover:text-brand-primary cursor-pointer transition-colors">سياسة الاسترداد</li>
        </ul>
      </div>
      <div>
        <h4 className="font-black text-slate-900 mb-6 underline decoration-brand-mint decoration-4 underline-offset-8">عامة</h4>
        <ul className="space-y-4 text-sm font-bold text-slate-500">
          <li className="hover:text-brand-primary cursor-pointer transition-colors">عن التربويين</li>
          <li className="hover:text-brand-primary cursor-pointer transition-colors">تواصل معنا</li>
          <li className="hover:text-brand-primary cursor-pointer transition-colors">الأسئلة الشائعة</li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
      <p className="text-xs font-bold text-slate-400">جميع الحقوق محفوظة لشركة التربويين ش. ذ. م. م 2018-2024 ©</p>
      <div className="flex items-center gap-6">
        {settings.linkedinUrl && <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-primary cursor-pointer transition-colors">LinkedIn</a>}
        {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-primary cursor-pointer transition-colors">Facebook</a>}
        {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-primary cursor-pointer transition-colors">Instagram</a>}
      </div>
    </div>
  </footer>
);

const AuthHero = ({ 
  onLoginClick, 
  onJoinClick,
  onBenefitsClick,
  title,
  subtitle,
  benefitsTitle
}: { 
  onLoginClick: () => void, 
  onJoinClick: () => void,
  onBenefitsClick: () => void,
  title?: string,
  subtitle?: string,
  benefitsTitle?: string
}) => (
   <div className="bg-white overflow-hidden relative pt-12 lg:pt-0" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[600px]">
         <div className="text-center lg:text-right space-y-8 py-10 lg:py-20 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="space-y-4">
               <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tight leading-tight whitespace-pre-line">
                  {title || <>المنصة الشاملة <span className="text-brand-primary">رقم 1</span></>}
               </h1>
               <p className="text-brand-primary font-black text-xl md:text-2xl opacity-90">
                  {subtitle || "انضم لأكثر من مليون طالب مع التربويين"}
               </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4 pt-4">
               <Button 
                  onClick={onLoginClick}
                  className="bg-brand-primary h-14 lg:h-16 px-10 lg:px-12 rounded-2xl text-white font-black text-lg lg:text-xl shadow-xl shadow-brand-primary/20 w-full sm:w-auto hover:scale-105 transition-transform"
               >
                  تسجيل دخول
               </Button>
               <Button 
                  onClick={onJoinClick}
                  className="bg-brand-secondary h-14 lg:h-16 px-10 lg:px-12 rounded-2xl text-slate-800 font-black text-lg lg:text-xl shadow-xl shadow-brand-secondary/20 w-full sm:w-auto hover:bg-brand-secondary-dark transition-colors"
               >
                  انضم بدون حساب
               </Button>
            </div>
         </div>

         <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-left-8 duration-700 pb-10 lg:pb-0">
            <div className="relative group perspective-1000">
               <div className="absolute inset-0 bg-brand-secondary rounded-full scale-125 blur-3xl opacity-20 animate-pulse"></div>
               <div className="w-64 lg:w-72 h-[500px] lg:h-[550px] bg-white rounded-[3rem] border-[12px] border-slate-900 shadow-2xl overflow-hidden transform group-hover:rotate-y-12 transition-transform duration-700">
                  <div className="h-full bg-slate-50 p-4 space-y-4">
                     <div className="h-6 w-1/2 bg-slate-200 rounded-full mx-auto"></div>
                     <div className="space-y-2">
                        <div className="h-32 bg-brand-primary/10 rounded-2xl"></div>
                        <div className="h-4 bg-slate-200 rounded-full w-full"></div>
                        <div className="h-4 bg-slate-200 rounded-full w-3/4"></div>
                     </div>
                     <div className="grid grid-cols-2 gap-2 pt-4">
                        <div className="h-20 bg-brand-secondary/20 rounded-xl"></div>
                        <div className="h-20 bg-brand-primary/20 rounded-xl"></div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div 
        onClick={onBenefitsClick}
        className="mt-10 lg:mt-0 border-y border-slate-100 py-10 bg-white/50 backdrop-blur-sm cursor-pointer group hover:bg-brand-primary/5 transition-colors"
      >
        <div className="flex items-center justify-center gap-4">
          <p className="text-slate-800 font-black text-2xl lg:text-3xl group-hover:text-brand-primary transition-colors">
            {benefitsTitle || "ليه تذاكر مع التربويين ؟"}
          </p>
          <div className="h-12 w-12 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:border-brand-primary group-hover:bg-white transition-all">
            <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-brand-primary transition-colors" />
          </div>
        </div>
      </div>
   </div>
);

const AuthSidebar = ({ 
  title, 
  subtitle, 
  onJoinClick, 
  onLoginClick,
  authMode 
}: { 
  title?: string, 
  subtitle?: string, 
  onJoinClick: () => void, 
  onLoginClick: () => void,
  authMode: 'LOGIN' | 'SIGNUP'
}) => (
  <div className="h-full min-h-[700px] w-full bg-slate-900 rounded-[3.5rem] p-12 flex flex-col justify-between relative overflow-hidden shadow-premium group" dir="rtl">
    {/* Decorative Gradients */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-primary/30 transition-colors"></div>
    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-brand-secondary/20 transition-colors"></div>

    <div className="relative z-10 space-y-12">
      <div className="bg-brand-primary w-fit p-3 px-8 rounded-2xl shadow-2xl shadow-brand-primary/20 transform -rotate-2 mb-12">
        <span className="text-white font-black text-4xl brand-text !text-white !shadow-none">التربويين</span>
      </div>
      
      <div className="space-y-6">
        <h2 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight whitespace-pre-line">
          {title || <>المنصة الشاملة <span className="text-brand-primary">رقم 1</span></>}
        </h2>
        <p className="text-slate-400 font-bold text-lg md:text-xl leading-relaxed max-w-[90%]">
          {subtitle || "انضم لأكثر من مليون طالب مع التربويين وابدأ رحلتك الذكية نحو التفوق."}
        </p>
      </div>

      <div className="flex flex-col gap-5 pt-8 max-w-sm">
        <Button 
          onClick={onJoinClick}
          className="bg-brand-secondary h-16 rounded-[2rem] text-slate-900 font-black text-xl shadow-2xl shadow-brand-secondary/20 hover:bg-brand-secondary-dark transition-all hover:scale-105 active:scale-95 border-none"
        >
          انضم بدون حساب ✨
        </Button>
        <button 
          onClick={onLoginClick}
          className="text-slate-400 font-black text-lg hover:text-white transition-colors text-right mr-4"
        >
          {authMode === 'LOGIN' ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
        </button>
      </div>
    </div>

    {/* Phone Mockup - Fixed positioning to avoid text overlap */}
    <div className="relative z-10 flex justify-end transform group-hover:translate-x-[-10px] group-hover:translate-y-[-10px] transition-transform duration-1000 mt-12">
      <div className="w-52 h-[420px] bg-slate-800 rounded-[2.5rem] border-[10px] border-slate-700 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden ring-1 ring-white/10">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-700 rounded-full flex items-center justify-center p-1">
            <div className="w-6 h-0.5 bg-slate-600 rounded-full"></div>
        </div>
        <div className="p-4 pt-10 space-y-5">
          <div className="h-24 bg-brand-primary/10 rounded-2xl border border-white/5"></div>
          <div className="space-y-2">
            <div className="h-2 bg-slate-700 rounded-full w-full"></div>
            <div className="h-2 bg-slate-700 rounded-full w-5/6"></div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-4">
             <div className="h-16 bg-brand-secondary/10 rounded-2xl border border-white/5"></div>
             <div className="h-16 bg-brand-primary/10 rounded-2xl border border-white/5"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  const { 
    user, 
    profile: realProfile, 
    loading, 
    isLoggingIn, 
    authError, 
    logout, 
    completeProfile, 
    isAdmin: realIsAdmin, 
    isTeacher: realIsTeacher, 
    isStudent: realIsStudent, 
    loginWithEmail, 
    signup,
    login 
  } = useEducatorsAuth();

  const [landingSettings, setLandingSettings] = useState<{
    whatsappNumber?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    teachersTitle?: string;
    teachersDesc?: string;
    benefitsTitle?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
  }>({});

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        setLandingSettings(snap.data());
      }
    });
  }, []);
  
  // DEV BYPASS: Set to false for production
  const BYPASS_AUTH = false;

  const mockProfile = {
    uid: 'bypass-id',
    fullName: 'Developer Admin 👑',
    email: 'dev@edu.com',
    role: 'ADMIN' as UserRole,
    isProfileComplete: true,
    isApproved: true,
    isSuspended: false,
    createdAt: new Date().toISOString()
  };

  const profile = BYPASS_AUTH ? mockProfile : realProfile;
  const isAdmin = () => {
    if (BYPASS_AUTH) return true;
    return realIsAdmin();
  };
  const isTeacher = () => BYPASS_AUTH ? false : realIsTeacher();
  const isStudent = () => BYPASS_AUTH ? false : realIsStudent();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Restore role from session storage on mount/refresh
  useEffect(() => {
    const savedRole = sessionStorage.getItem('pending_role') as UserRole;
    if (savedRole && !selectedRole) {
      setSelectedRole(savedRole);
    }
  }, []);

  // Sync role to session storage when it changes
  useEffect(() => {
    if (selectedRole) {
      sessionStorage.setItem('pending_role', selectedRole);
    }
  }, [selectedRole]);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [landingView, setLandingView] = useState<LandingView>('HOME');

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentView('COURSE_VIEWER');
  };

  const handleEditCourse = (courseId: string) => {
    setEditingCourseId(courseId);
    setCurrentView('MANAGE_COURSES');
  };

  const handleEditQuiz = (quizId: string) => {
    setEditingQuizId(quizId);
    setCurrentView('CREATE_QUIZ');
  };

  const handleNavigate = (target: any) => {
    if (typeof target === 'string') {
      setCurrentView(target as View);
      setSelectedContactId(null);
    } else if (typeof target === 'object') {
      if (target.type === 'STUDENTS') {
        setSelectedCourseId(target.courseId);
        setCurrentView('STUDENTS');
      } else if (target.type === 'MESSAGES') {
        setSelectedContactId(target.contactId);
        setCurrentView('MESSAGES');
      } else if (target.type === 'COURSE_VIEWER') {
        setSelectedCourseId(target.courseId);
        setCurrentView('COURSE_VIEWER');
      } else {
        setCurrentView(target.type);
      }
    }
  };

  // Anti-piracy: Detect DevTools
  useEffect(() => {
    if (BYPASS_AUTH) return;
    // Removed resize listener as it causes false positives and console clutter
  }, [BYPASS_AUTH]);

  // Anti-piracy: Prevent copy/paste
  useEffect(() => {
    if (BYPASS_AUTH) return;
    const handleCopy = (e: ClipboardEvent) => {
      if (currentView === 'QUIZ') {
        e.preventDefault();
        alert("Copying is disabled during exams.");
      }
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [currentView, BYPASS_AUTH]);

  if (loading && !authError && !BYPASS_AUTH) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fbff] p-6 text-center">
        <div className="flex flex-col items-center gap-8 max-w-sm">
          <div className="relative">
            <div className="h-20 w-20 animate-spin rounded-3xl border-4 border-brand-primary border-t-transparent shadow-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-brand-primary font-black text-xl">T</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-brand-primary font-black animate-pulse text-lg tracking-widest">جاري التحميل...</p>
            <p className="text-[10px] text-slate-400 font-bold italic">Educators DRM v3.0</p>
          </div>
        </div>
      </div>
    );
  }

  if ((authError?.toLowerCase().includes('database') || authError?.toLowerCase().includes('not found')) && !BYPASS_AUTH) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6" dir="rtl">
        <div className="max-w-md w-full space-y-8 bg-red-50/50 p-12 rounded-[2.5rem] border-2 border-red-100 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
          <div className="h-24 w-24 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-200">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-slate-900 leading-tight">خطأ في إعدادات النظام 🛠️</h2>
            <p className="text-slate-500 font-bold leading-relaxed">
              قاعدة بيانات "Firestore" غير مفعلة في مشروعك. لن يتمكن الموقع من العمل بدونها.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-red-200 space-y-3">
             <p className="text-xs font-black text-red-600 uppercase tracking-widest">الخطوات المطلوبة:</p>
             <ol className="text-right text-xs text-slate-600 space-y-2 font-bold pr-4 list-decimal">
                <li>افتح متصفحك واذهب إلى Firebase Console.</li>
                <li>من القائمة اليمنى، اختر Cloud Firestore.</li>
                <li>اضغط على زر "Create Database".</li>
                <li>اختر "Start in test mode" ثم اضغط "Next" ثم "Enable".</li>
             </ol>
          </div>
          <Button variant="primary" className="w-full h-14 rounded-xl font-bold bg-slate-900 border-none hover:bg-black" onClick={() => window.location.reload()}>إعادة التشغيل بعد التفعيل</Button>
        </div>
      </div>
    );
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'LOGIN') {
      try {
        await loginWithEmail(email, password);
      } catch (e) { /* Error handled in provider */ }
    } else {
      try {
        await signup(email, password, selectedRole || 'STUDENT');
      } catch (e) { /* Error handled in provider */ }
    }
  };

  if (!user && !BYPASS_AUTH) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <LandingHeader 
          onLogin={() => {
            setLandingView('AUTH');
            setAuthMode('LOGIN');
          }}
          onSignup={() => {
            setLandingView('AUTH');
            setAuthMode('SIGNUP');
          }}
          onViewChange={setLandingView}
          activeView={landingView}
          whatsappNumber={landingSettings.whatsappNumber || ''}
        />
        
        <main className="flex-1">
          {landingView === 'TEACHERS' ? (
            <TeachersSection 
              onSignup={(role) => {
                setLandingView('AUTH');
                setAuthMode('SIGNUP');
                setSelectedRole(role);
              }} 
            />
          ) : landingView === 'ABOUT' ? (
            <BenefitsSection onBack={() => setLandingView('HOME')} />
          ) : (landingView === 'HOME' && authMode === 'LOGIN') ? (
            <AuthHero 
              onLoginClick={() => {
                setLandingView('AUTH');
                setAuthMode('LOGIN');
              }}
              onJoinClick={() => setLandingView('TEACHERS')}
              onBenefitsClick={() => setLandingView('ABOUT')}
              title={landingSettings.heroTitle}
              subtitle={landingSettings.heroSubtitle}
              benefitsTitle={landingSettings.benefitsTitle}
            />
          ) : (landingView === 'HOME' && authMode === 'SIGNUP') ? (
            <div className="py-20 px-6 max-w-7xl mx-auto flex flex-col items-center gap-16">
              {/* ... existing signup view content ... */}
              <div className="text-center space-y-6">
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 brand-text !text-slate-900 !shadow-none">ابدأ رحلتك المعنوية 🚀</h2>
                <p className="text-slate-500 font-bold text-xl md:text-2xl">اختر نوع الحساب للانضمام إلى نخبة التربويين</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl">
                <button
                  onClick={() => {
                    setSelectedRole('STUDENT');
                    setLandingView('AUTH');
                  }}
                  className="group relative bg-white p-10 rounded-[3.5rem] border-[4px] border-slate-50 hover:border-brand-primary hover:shadow-2xl hover:shadow-brand-primary/10 transition-all text-center flex flex-col items-center gap-8 shadow-premium"
                >
                  <div className="h-32 w-32 bg-brand-primary/5 rounded-[2.5rem] flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white group-hover:rotate-6 transition-all shadow-inner">
                    <GraduationCap className="h-16 w-16" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 mb-2">أنا طالب متميز</h3>
                    <p className="text-slate-500 font-bold">انضم لأفضل الدورات التعليمية وتابع دروسك مع العباقرة.</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedRole('TEACHER');
                    setLandingView('AUTH');
                  }}
                  className="group relative bg-white p-10 rounded-[3.5rem] border-[4px] border-slate-50 hover:border-brand-primary hover:shadow-2xl hover:shadow-brand-primary/10 transition-all text-center flex flex-col items-center gap-8 shadow-premium"
                >
                  <div className="h-32 w-32 bg-brand-secondary/10 rounded-[2.5rem] flex items-center justify-center group-hover:bg-brand-secondary group-hover:text-slate-900 group-hover:-rotate-6 transition-all shadow-inner">
                    <Users className="h-16 w-16" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 mb-2">أنا معلم قدير</h3>
                    <p className="text-slate-500 font-bold">قم بإدارة طلابك ودوراتك التعليمية بأسلوب عصري وحديث.</p>
                  </div>
                </button>
              </div>

              <div className="text-center">
                 <button 
                   onClick={() => {
                     setAuthMode('LOGIN');
                     setLandingView('AUTH');
                   }}
                   className="text-brand-primary font-black text-lg hover:underline underline-offset-8"
                 >
                   لديك حساب بالفعل؟ سجل دخولك الآن 👋
                 </button>
              </div>
            </div>
          ) : (landingView === 'AUTH') ? (
            <div className="min-h-screen bg-white">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-20 py-10 lg:py-20 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                 <div className="w-full max-w-md mx-auto lg:mx-0">
                    <div className="space-y-12">
                      <div className="space-y-6">
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-tight">
                          {authMode === 'LOGIN' ? 'أهلاً بك مجدداً 👋' : 'عضو جديد؟ مرحباً! ✨'}
                        </h2>
                        <p className="text-slate-500 font-bold text-xl md:text-2xl leading-relaxed">
                          {authMode === 'LOGIN' 
                            ? 'سجل دخولك لتستكمل رحلتك التعليمية الممتعة معنا.' 
                            : `انضم كـ ${selectedRole === 'STUDENT' ? 'طالب' : 'معلم'} وابدأ في بناء مستقبلك اليوم.`}
                        </p>
                      </div>

                      <form onSubmit={handleAuthSubmit} className="space-y-6">
                         {/* ... form content here ... */}
                         <div className="space-y-3">
                            <label className="text-sm font-black text-slate-500 mr-2 uppercase tracking-widest">البريد الإلكتروني</label>
                            <div className="relative group">
                              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                              <input 
                                required
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@edu.com" 
                                className="w-full h-16 pr-14 pl-6 bg-slate-50 border-[3px] border-transparent rounded-3xl text-lg font-bold focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-sm font-black text-slate-500 mr-2 uppercase tracking-widest">كلمة المرور</label>
                            <div className="relative group">
                              <Lock className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                              <input 
                                required
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••" 
                                className="w-full h-16 pr-14 pl-6 bg-slate-50 border-[3px] border-transparent rounded-3xl text-lg font-bold focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner"
                              />
                            </div>
                          </div>

                          {authError && (
                            <div className="text-sm text-red-600 bg-red-50 p-6 rounded-3xl border-2 border-red-100 flex items-start gap-4 animate-in shake duration-500">
                              <span className="text-2xl">⚠️</span>
                              <p className="font-bold">{authError}</p>
                            </div>
                          )}

                          <Button 
                            type="submit"
                            variant="primary" 
                            className="w-full h-20 rounded-[2rem] text-2xl font-black shadow-2xl shadow-brand-primary/30 active:scale-95 transition-all bg-brand-primary border-none" 
                            isLoading={isLoggingIn}
                          >
                            {authMode === 'LOGIN' ? 'دخول للمنصة 🚀' : 'إنشاء الحساب الآن ✨'}
                          </Button>

                          <div className="flex items-center gap-4 py-2">
                            <div className="h-px flex-1 bg-slate-100"></div>
                            <span className="text-xs font-black text-slate-300">أو سجل عبر</span>
                            <div className="h-px flex-1 bg-slate-100"></div>
                          </div>

                          <Button 
                            type="button"
                            variant="outline" 
                            onClick={login}
                            className="w-full h-16 rounded-[1.5rem] border-[3px] border-slate-100 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-4"
                          >
                            جوجل
                          </Button>
                      </form>

                      <div className="pt-10 flex items-center justify-between border-t border-slate-100">
                        <button 
                          onClick={() => {
                            setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
                            if (authMode === 'LOGIN') setSelectedRole(null);
                          }}
                          className="text-brand-primary font-black text-lg hover:underline underline-offset-8"
                        >
                          {authMode === 'LOGIN' ? 'إنشاء حساب جديد ✨' : 'أنا مشترك بالفعل؟ دخول 👋'}
                        </button>
                      </div>
                    </div>
                 </div>

                 <div className="hidden lg:block h-full">
                    <AuthSidebar 
                       title={landingSettings.heroTitle}
                       subtitle={landingSettings.heroSubtitle}
                       onJoinClick={() => setLandingView('TEACHERS')}
                       onLoginClick={() => setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
                       authMode={authMode}
                    />
                 </div>
              </div>
            </div>
          ) : <AuthHero 
                onLoginClick={() => {
                  setLandingView('AUTH');
                  setAuthMode('LOGIN');
                }}
                onJoinClick={() => setLandingView('TEACHERS')}
                onBenefitsClick={() => setLandingView('ABOUT')}
                title={landingSettings.heroTitle}
                subtitle={landingSettings.heroSubtitle}
                benefitsTitle={landingSettings.benefitsTitle}
              />}
        </main>
        
        <LandingFooter settings={landingSettings} />
      </div>
    );
  }

  if (user && !isAdmin() && !BYPASS_AUTH) {
    const isProfileMissing = !profile || !profile.isProfileComplete;
    
    if (isProfileMissing) {
      if (!selectedRole) {
        return (
          <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white" dir="rtl">
            <div className="flex flex-col items-center justify-center p-8 lg:p-16">
              <div className="max-w-xl w-full space-y-12">
                <div className="space-y-4">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight brand-text">أهلاً بك في التربويين 👋</h2>
                  <p className="text-slate-500 font-bold text-xl">اختر نوع الحساب لإكمال تسجيلك</p>
                </div>
  
                <div className="grid grid-cols-1 gap-6">
                  <button
                    onClick={() => setSelectedRole('STUDENT')}
                    className="group relative bg-slate-50 p-8 rounded-[3rem] border-2 border-transparent hover:border-brand-primary hover:bg-white hover:shadow-2xl hover:shadow-brand-primary/10 transition-all text-right overflow-hidden shadow-premium"
                  >
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-all">
                        <GraduationCap className="h-10 w-10" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">أنا طالب</h3>
                        <p className="text-sm text-slate-500 font-bold">انضم لأفضل الدورات التعليمية وتابع دروسك.</p>
                      </div>
                    </div>
                  </button>
  
                  <button
                    onClick={() => setSelectedRole('TEACHER')}
                    className="group relative bg-slate-50 p-8 rounded-[3rem] border-2 border-transparent hover:border-brand-primary hover:bg-white hover:shadow-2xl hover:shadow-brand-primary/10 transition-all text-right overflow-hidden shadow-premium"
                  >
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-all">
                        <Users className="h-10 w-10" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">أنا معلم</h3>
                        <p className="text-sm text-slate-500 font-bold">قم بإدارة طلابك ودوراتك التعليمية باحترافية.</p>
                      </div>
                    </div>
                  </button>
                </div>
                <div className="pt-8 text-center border-t border-slate-100">
                   <button onClick={logout} className="text-red-500 font-black hover:underline cursor-pointer">تسجيل الخروج</button>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex bg-[#f0f9ff] items-center justify-center p-12">
              <img src="/assets/auth_illustration.png" alt="Welcome" className="max-w-md drop-shadow-2xl" />
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#f8fbff]">
          <RegistrationForm 
            user={user!} 
            role={selectedRole || 'STUDENT'} 
            onComplete={completeProfile} 
            onBack={async () => {
              sessionStorage.removeItem('pending_role');
              setSelectedRole(null);
              await logout();
            }}
          />
        </div>
      );
    }
  }

  if (profile && !profile.isApproved && !isAdmin() && !BYPASS_AUTH) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fbff] p-4" dir="rtl">
        <div className="max-w-md w-full text-center space-y-8 bg-white p-12 rounded-[2.5rem] shadow-premium">
          <div className="h-24 w-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Clock className="h-12 w-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-slate-900">حسابك قيد المراجعة ⏳</h2>
            <p className="text-slate-500 font-bold leading-relaxed">
              أهلاً بك يا {profile.fullName.split(' ')[0]}! طلبك وصل للمسؤولين. سيتم تفعيل حسابك فور التأكد من البيانات.
            </p>
          </div>
          <Button variant="outline" className="w-full h-14 rounded-xl font-bold" onClick={() => window.location.reload()}>تحديث الحالة</Button>
          <Button variant="ghost" className="w-full text-red-400 font-bold" onClick={logout}>تسجيل الخروج</Button>
        </div>
      </div>
    );
  }

  if (profile && profile.isSuspended && !BYPASS_AUTH) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4" dir="rtl">
        <div className="max-w-md w-full text-center space-y-8 bg-white/5 border border-white/10 p-12 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl">
          <div className="h-24 w-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white">تم إيقاف الحساب 🚫</h2>
            <p className="text-slate-400 font-bold leading-relaxed">
              عذراً {profile.fullName.split(' ')[0]}، لقد تم تعليق وصولك للمنصة. يرجى التواصل مع الدعم الفني.
            </p>
          </div>
          <div className="pt-4 space-y-4">
             <Button variant="primary" className="w-full h-14 rounded-xl font-bold bg-red-600 hover:bg-red-700 border-none shadow-xl shadow-red-900/40">تواصل مع الدعم</Button>
             <button 
                onClick={logout} 
                className="w-full h-14 rounded-[1.5rem] bg-white/10 backdrop-blur-xl border border-white/20 text-white font-black hover:bg-white/20 transition-all flex items-center justify-center gap-4 shadow-xl group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-mauve-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-primary to-mauve-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
                  <LogOut className="h-5 w-5 text-white" />
                </div>
                <span className="relative z-10">تسجيل الخروج</span>
              </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col no-select relative" dir="rtl" style={{
      fontFamily: "-apple-system, 'SF Pro Display', sans-serif"
    }}>
      {/* Dynamic Background Blobs */}
      <div className="blob-bg" />
      
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} onNavigate={setCurrentView} />
      
      <div className="flex-1 flex overflow-hidden text-right">
        <Sidebar className="hidden lg:flex shrink-0" onNavigate={setCurrentView} currentView={currentView} />
        
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <Sidebar 
          className={cn(
            "fixed inset-y-0 right-0 z-50 lg:hidden transition-transform duration-300",
            isSidebarOpen ? "translate-x-0" : "translate-x-full"
          )} 
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            setIsSidebarOpen(false);
          }}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'DASHBOARD' && (
              <>
                {isStudent() && (
                  <StudentDashboard 
                    onSelectCourse={handleSelectCourse} 
                    onNavigate={setCurrentView}
                  />
                )}
                {isTeacher() && (
                  <TeacherDashboard 
                    onNavigate={handleNavigate} 
                    onEditCourse={handleEditCourse}
                  />
                )}
                {isAdmin() && (
                  <div className="space-y-12">
                     <SuperAdminDashboard />
                     <div className="pt-8 border-t border-slate-100">
                        <SecurityMonitor />
                     </div>
                  </div>
                )}
              </>
            )}

            {currentView === 'COURSES' && (
              <CoursesList 
                role={profile?.role || 'STUDENT'} 
                onSelectCourse={handleSelectCourse} 
                teacherId={selectedTeacherId}
                onBack={() => {
                  setSelectedTeacherId(null);
                  setCurrentView('TEACHERS');
                }}
              />
            )}

            {currentView === 'TEACHERS' && (
              <TeachersList 
                onSelectTeacher={(id) => {
                  setSelectedTeacherId(id);
                  setCurrentView('TEACHER_PROFILE');
                }} 
              />
            )}

            {currentView === 'TEACHER_PROFILE' && selectedTeacherId && (
              <TeacherProfileView 
                teacherId={selectedTeacherId}
                onBack={() => setCurrentView('TEACHERS')}
                onSelectCourse={(id) => {
                  setSelectedCourseId(id);
                  setCurrentView('COURSE_VIEWER');
                }}
                onMessageTeacher={(id) => {
                  setSelectedTeacherId(id);
                  setCurrentView('MESSAGES');
                }}
              />
            )}

            {currentView === 'MANAGE_COURSES' && (
              <CourseManager 
                editCourseId={editingCourseId} 
                onBack={() => {
                  setCurrentView('DASHBOARD');
                  setEditingCourseId(null);
                }} 
              />
            )}

            {currentView === 'STUDENTS' && (
              <>
                {isTeacher() ? (
                  <TeacherStudents 
                    selectedCourseId={selectedCourseId} 
                    onBack={() => {
                      setCurrentView('DASHBOARD');
                      setSelectedCourseId(null);
                    }} 
                  />
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-black text-slate-900">إدارة طلابي 👥</h2>
                      <Button variant="outline" onClick={() => setCurrentView('DASHBOARD')} className="rounded-xl font-bold">العودة للرئيسية</Button>
                    </div>
                    <SuperAdminDashboard forceFilterRole="STUDENT" />
                  </div>
                )}
              </>
            )}

            {currentView === 'COURSE_VIEWER' && selectedCourseId && (
              <CourseViewer courseId={selectedCourseId} onBack={() => setCurrentView('COURSES')} />
            )}

            {currentView === 'QUIZ' && selectedQuizId && (
              <QuizEngine 
                quizId={selectedQuizId} 
                onBack={() => setCurrentView('QUIZZES')} 
              />
            )}

            {currentView === 'HOMEWORK' && (
              <Homework />
            )}

            {currentView === 'QUIZZES' && (
              <Quizzes 
                onNavigate={handleNavigate} 
                onStartQuiz={(id) => {
                  setSelectedQuizId(id);
                  setCurrentView('QUIZ');
                }}
                onEditQuiz={handleEditQuiz}
              />
            )}

            {currentView === 'CREATE_QUIZ' && (
               <QuizCreator 
                 editId={editingQuizId} 
                 onBack={() => {
                   setCurrentView('QUIZZES');
                   setEditingQuizId(null);
                 }} 
               />
            )}

            {currentView === 'STUDENT_RESULTS' && (
              <StudentResults onBack={() => setCurrentView('DASHBOARD')} />
            )}

            {currentView === 'REPORTS' && (
               <Reports />
            )}

            {currentView === 'PAYMENTS' && (
               <Payments />
            )}

            {currentView === 'SECURITY' && (
               <Security />
            )}

            {currentView === 'PERFORMANCE_AI' && (
               <PerformanceAI onBack={() => setCurrentView('DASHBOARD')} />
            )}
            
            {isAdmin() && currentView === 'ANNOUNCEMENTS' && (
               <TeacherAnnouncements />
            )}

            {(isAdmin() || isTeacher()) && currentView === 'NOTIFICATION_CENTER' && (
               <NotificationCenter />
            )}
            
            {currentView === 'MESSAGES' && (
              <MessageCenter preselectedContactId={selectedContactId} />
            )}
            
            {currentView === 'SETTINGS' && (
              isStudent() ? <StudentProfile /> : <Settings />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
