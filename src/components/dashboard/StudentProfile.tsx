import React, { useState } from 'react';
import { 
  User, 
  Settings, 
  MessageCircle, 
  Info, 
  QrCode, 
  LogOut, 
  ChevronLeft, 
  Star,
  Gem,
  X,
  Phone,
  CheckCircle2,
  Users,
  ShieldCheck,
  GraduationCap,
  Camera
} from 'lucide-react';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { cn } from '../../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { STAGES, GRADES } from '../../lib/constants';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';

interface ProfileMenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  className?: string;
  extra?: React.ReactNode;
}

const ProfileMenuItem = ({ icon: Icon, label, onClick, className, extra }: ProfileMenuItemProps) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-50 transition-all hover:bg-slate-50 group mb-4",
      className
    )}
  >
    <div className="flex items-center gap-4">
      <div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:text-brand-primary transition-colors">
        <Icon className="h-6 w-6" />
      </div>
      <span className="font-bold text-slate-700">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {extra}
      <ChevronLeft className="h-5 w-5 text-slate-300 group-hover:text-brand-primary transition-colors" />
    </div>
  </button>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="h-6 w-6 text-slate-500" />
          </button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const StudentProfile = () => {
  const { profile, logout } = useEducatorsAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [newName, setNewName] = useState(profile?.fullName || '');
  const [newEmail, setNewEmail] = useState(profile?.email || '');
  const [newPhone, setNewPhone] = useState(profile?.phone || '');
  const [newParentPhone, setNewParentPhone] = useState(profile?.parentPhone || '');
  const [newFatherPhone, setNewFatherPhone] = useState(profile?.fatherPhone || '');
  const [newGrade, setNewGrade] = useState(profile?.grade || '');
  const [newStage, setNewStage] = useState(profile?.stage || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleWhatsAppContact = () => {
    const whatsappNumber = '201012345678'; // Example
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setIsUpdating(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        fullName: newName,
        email: newEmail,
        phone: newPhone,
        parentPhone: newParentPhone,
        fatherPhone: newFatherPhone,
        grade: newGrade,
        stage: newStage
      });
      setMessage({ type: 'success', text: 'تم تحديث البيانات بنجاح! ✨' });
      setTimeout(() => {
        setIsEditModalOpen(false);
        setMessage(null);
      }, 2000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء التحديث.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoUpload = async (url: string) => {
    if (!profile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        photoURL: url
      });
      setIsPhotoModalOpen(false);
    } catch (error) {
      console.error("Error updating photo:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-700" dir="rtl">
      {/* Profile Header with Wavy Background */}
      <div className="relative rounded-[3rem] overflow-hidden bg-white shadow-premium mb-8">
        <div className="h-32 bg-pink-300 relative">
          <div className="absolute bottom-0 w-full overflow-hidden leading-[0]">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block h-[40px] w-full text-white fill-current">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C57.32,103.11,114.65,116.79,172,104.91a260,260,0,0,0,74-21C266,73,293.47,61.63,321.39,56.44Z"></path>
            </svg>
          </div>
        </div>

        <div className="px-8 pb-8 flex flex-col items-center -mt-16 relative z-10">
          <div className="relative group mb-4 text-center">
            <div className="h-32 w-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white ring-4 ring-slate-100 flex items-center justify-center relative">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <User className="h-16 w-16 text-slate-300" />
                </div>
              )}
              <button 
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-8 w-8 text-white" />
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-1">{profile?.fullName}</h2>
          <p className="text-slate-400 font-bold mb-6">
            {profile?.gradeLabel || profile?.stageLabel || "الثالث الإعدادي عام"}
          </p>

          {/* Points & Gems */}
          <div className="flex gap-4">
             <div className="bg-slate-50/50 backdrop-blur-sm border border-slate-100 py-2 px-6 rounded-full flex items-center gap-3 shadow-sm">
               <span className="font-black text-slate-700">Points {profile?.points || 0}</span>
               <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
             </div>
             <div className="bg-slate-50/50 backdrop-blur-sm border border-slate-100 py-2 px-6 rounded-full flex items-center gap-3 shadow-sm">
               <span className="font-black text-slate-700">{profile?.gems || 0}</span>
               <Gem className="h-5 w-5 text-blue-400" />
             </div>
          </div>
        </div>
      </div>

      {/* Menu Options ... */}
      <div className="space-y-4">
        <ProfileMenuItem 
          icon={Star} 
          label="المستوى الحالي" 
        />
        <ProfileMenuItem 
          icon={Settings} 
          label="تعديل البيانات" 
          onClick={() => {
            setNewName(profile?.fullName || '');
            setNewEmail(profile?.email || '');
            setNewPhone(profile?.phone || '');
            setNewParentPhone(profile?.parentPhone || '');
            setNewFatherPhone(profile?.fatherPhone || '');
            setNewGrade(profile?.grade || '');
            setNewStage(profile?.stage || '');
            setIsEditModalOpen(true);
          }}
        />
        {/* ... */}
      </div>

      {/* Edit Data Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="تعديل البيانات الشخصية ⚙️"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-6">
            <p className="text-[10px] font-black text-amber-600 text-center">
              ⚠️ يمكنك تعديل أرقام التواصل فقط. لتعديل البيانات الأساسية، يرجى التواصل مع الإدارة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2">الاسم بالكامل (للقراءة فقط)</label>
              <input 
                disabled
                type="text" 
                value={newName}
                className="w-full h-12 px-5 bg-slate-100 border-2 border-transparent rounded-2xl text-sm font-bold cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2">البريد الإلكتروني (للقراءة فقط)</label>
              <input 
                disabled
                type="email" 
                value={newEmail}
                className="w-full h-12 px-5 bg-slate-100 border-2 border-transparent rounded-2xl text-sm font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2">المرحلة الدراسية</label>
              <select 
                disabled
                value={newStage}
                className="w-full h-12 px-4 bg-slate-100 border-2 border-transparent rounded-2xl text-sm font-bold cursor-not-allowed appearance-none"
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
                disabled
                value={newGrade}
                className="w-full h-12 px-4 bg-slate-100 border-2 border-transparent rounded-2xl text-sm font-bold cursor-not-allowed appearance-none"
              >
                <option value="">اختر الصف...</option>
                {(newStage ? GRADES[newStage as string] : [])?.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-50">
            <label className="text-xs font-black text-slate-500 mr-2">رقم هاتف الطالب</label>
            <div className="relative group">
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                required
                type="tel" 
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full h-12 pr-12 pl-6 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
                placeholder="01xxxxxxxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2">رقم ولي الأمر (1)</label>
              <input 
                required
                type="tel" 
                value={newParentPhone}
                onChange={(e) => setNewParentPhone(e.target.value)}
                className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
                placeholder="رقم الأم أو المحمول الأساسي..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2">رقم ولي الأمر (2)</label>
              <input 
                type="tel" 
                value={newFatherPhone}
                onChange={(e) => setNewFatherPhone(e.target.value)}
                className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
                placeholder="رقم الأب أو بديل..."
              />
            </div>
          </div>

          {message && (
            <div className={cn(
              "p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300",
              message.type === 'success' ? "bg-green-50" : "bg-red-50"
            )}>
              {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />}
              <p className={cn("font-bold", message.type === 'success' ? "text-green-700" : "text-red-700")}>{message.text}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-16 rounded-3xl bg-brand-primary text-white font-black text-xl shadow-xl shadow-brand-primary/20"
            isLoading={isUpdating}
          >
            حفظ التغييرات
          </Button>
        </form>
      </Modal>

      {/* Photo Upload Modal */}
      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title="تغيير الصورة الشخصية 📸"
      >
        <div className="space-y-6">
          <p className="text-slate-500 font-bold text-center">قم برفع صورة جديدة لتحديث ملفك الشخصي ✨</p>
          <FileUpload 
            path={`users/${profile?.uid}/profile_pic`}
            onUploadComplete={handlePhotoUpload}
            allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
            label="اختر صورة جديدة"
          />
          <div className="pt-4 flex justify-end">
            <Button variant="ghost" onClick={() => setIsPhotoModalOpen(false)} className="font-bold">
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>

      {/* About Us Modal */}
      <Modal 
        isOpen={isAboutModalOpen} 
        onClose={() => setIsAboutModalOpen(false)} 
        title="ليه تذاكر مع التربويين ؟ ✨"
      >
        <div className="space-y-8">
          <p className="text-slate-600 font-bold text-lg leading-relaxed text-right">
            في منصة التربويين، اجتمع "صفوة المعلمين" في مكان واحد ليحولوا المناهج الصعبة إلى تجربة ممتعة ونتائج مضمونة. نحن نؤمن أن التعليم ليس تلقيناً، بل هو رحلة ذكية تبدأ بضغطة زر.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
              <div className="h-12 w-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Users className="text-brand-primary h-6 w-6" />
              </div>
              <div className="space-y-1 text-right">
                <h4 className="font-black text-slate-900 text-lg">نخبة الخبراء</h4>
                <p className="text-slate-500 font-bold text-sm">اخترنا لك المدرسين اللي "فاهمين اللعبة" وبيوصلوا المعلومة من أقصر طريق.</p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
              <div className="h-12 w-12 bg-brand-mint/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="text-brand-mint h-6 w-6" />
              </div>
              <div className="space-y-1 text-right">
                <h4 className="font-black text-slate-900 text-lg">تجربة تعليمية ذكية</h4>
                <p className="text-slate-500 font-bold text-sm">محتوى تفاعلي، اختبارات دورية، ومتابعة لحظية تجعلك دائماً في المقدمة.</p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
              <div className="h-12 w-12 bg-brand-secondary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="text-brand-secondary-dark h-6 w-6" />
              </div>
              <div className="space-y-1 text-right">
                <h4 className="font-black text-slate-900 text-lg">ببساطة</h4>
                <p className="text-slate-500 font-bold text-sm">"التربويين" هي المكان اللي بيتحول فيه الطالب من مجرد "دارس" إلى "متفوق" جاهز للمستقبل.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
