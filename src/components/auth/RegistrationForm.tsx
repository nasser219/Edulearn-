import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { GraduationCap, Users, ShieldCheck, CheckCircle2, ChevronRight, Hash, ArrowLeft, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { STAGES, GRADES, SUBJECTS } from '../../lib/constants';

interface RegistrationFormProps {
  user: User;
  role: Role;
  onComplete: (data: any) => Promise<void>;
  onBack?: () => void;
}

type Role = 'STUDENT' | 'TEACHER';
type Step = 'ROLE' | 'DETAILS' | 'SUCCESS';

/* Removed local STAGES, GRADES, and SUBJECTS as they are now in constants.ts */

export const RegistrationForm = ({ user, role, onComplete, onBack }: RegistrationFormProps) => {
  const [step, setStep] = useState<Step>('DETAILS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entranceCode, setEntranceCode] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    parentPhone: '',
    fatherPhone: '',
    birthDate: '',
    address: '',
    stage: '',
    grade: '',
    stages: [] as string[],
    grades: [] as string[],
    subject: '',
    schoolName: '',
    parentProfession: '',
    nationalId: '',
  });

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TB-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const toggleSelection = (list: string[], item: string) => {
    return list.includes(item) 
      ? list.filter(i => i !== item) 
      : [...list, item];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const studentCode = role === 'STUDENT' ? generateCode() : null;
      if (studentCode) setEntranceCode(studentCode);

      const finalData = {
        ...formData,
        role,
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
        entranceCode: studentCode,
        isProfileComplete: true,
        isSuspended: false,
        isApproved: false,
        enrolledCourses: [],
        createdAt: new Date().toISOString(),
      };

      await onComplete(finalData);
      setStep('SUCCESS');
    } catch (error) {
      console.error('Registration failed:', error);
      alert('حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (step === 'DETAILS') {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white" dir="rtl">
        <div className="p-8 lg:p-16 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-10">
            <div className="space-y-2 relative">
              <button 
                onClick={onBack || (() => window.location.reload())} 
                className="absolute -top-12 right-0 text-slate-400 hover:text-brand-primary font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                العودة لتغيير نوع الحساب
              </button>
              <h2 className="text-3xl font-black text-slate-900">إنشاء حساب {role === 'TEACHER' ? 'معلم' : 'طالب'} جديد ✨</h2>
              <p className="text-slate-500 font-bold">يرجى بدقة تعبئة البيانات التالية لتفعيل حسابك.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 mr-1">الاسم الثلاثي بالكامل</label>
                <Input 
                  required 
                  placeholder="ادخل اسمك بالكامل كما في شهادة الميلاد..." 
                  className="rounded-2xl bg-slate-50 border-none font-bold h-14 focus:ring-4 focus:ring-brand-primary/10 transition-all text-lg" 
                  value={formData.fullName} 
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 mr-1">رقم الهاتف</label>
                  <Input 
                    required 
                    type="tel" 
                    placeholder="01xxxxxxxxx" 
                    className="rounded-2xl bg-slate-50 border-none font-bold h-14" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 mr-1">تاريخ الميلاد</label>
                  <Input 
                    required 
                    type="date" 
                    className="rounded-2xl bg-slate-50 border-none font-bold h-14 text-right px-4" 
                    value={formData.birthDate} 
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} 
                  />
                </div>
              </div>

              {role === 'TEACHER' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 mr-1">العنوان</label>
                    <Input 
                      required 
                      placeholder="ادخل عنوانك بالتفصيل..." 
                      className="rounded-2xl bg-slate-50 border-none font-bold h-14" 
                      value={formData.address} 
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 mr-1">المادة العلمية</label>
                    <select 
                      required 
                      className="w-full h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all" 
                      value={formData.subject} 
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    >
                      <option value="">اختر المادة...</option>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4 pt-2">
                    <label className="text-sm font-black text-slate-700 mr-1 block">المراحل الدراسية (يمكنك اختيار أكثر من مرحلة)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {STAGES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, stages: toggleSelection(prev.stages, s.id), grades: [] }))}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border-2 transition-all font-bold",
                            formData.stages.includes(s.id) 
                              ? "border-brand-primary bg-brand-primary/5 text-brand-primary ring-4 ring-brand-primary/10" 
                              : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200"
                          )}
                        >
                          <span>{s.label}</span>
                          {formData.stages.includes(s.id) && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.stages.length > 0 && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                      <label className="text-sm font-black text-slate-700 mr-1 block">الصفوف الدراسية (يمكنك اختيار أكثر من صف)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {formData.stages.flatMap(sId => GRADES[sId]).map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, grades: toggleSelection(prev.grades, g.id) }))}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-xl border-2 transition-all font-bold text-sm text-right",
                              formData.grades.includes(g.id) 
                                ? "border-brand-primary bg-brand-primary/5 text-brand-primary ring-4 ring-brand-primary/10" 
                                : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200"
                            )}
                          >
                            <span>{g.label}</span>
                            {formData.grades.includes(g.id) && <Check className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-sm font-black text-slate-700 mr-1">رقم هاتف ولي الأمر (1)</label>
                       <Input 
                         required 
                         type="tel" 
                         placeholder="رقم الأم أو ولي الأمر الأساسي..." 
                         className="rounded-2xl bg-slate-50 border-none font-bold h-14" 
                         value={formData.parentPhone} 
                         onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-black text-slate-700 mr-1">رقم هاتف ولي الأمر (2) - اختياري</label>
                       <Input 
                         type="tel" 
                         placeholder="رقم الأب أو رقم بديل..." 
                         className="rounded-2xl bg-slate-50 border-none font-bold h-14" 
                         value={formData.fatherPhone} 
                         onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })} 
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-700 mr-1">المرحلة الدراسية</label>
                      <select 
                        required 
                        className="w-full h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold text-slate-700 outline-none" 
                        value={formData.stage} 
                        onChange={(e) => setFormData({ ...formData, stage: e.target.value, grade: '', nationalId: '' })}
                      >
                        <option value="">اختر المرحلة...</option>
                        {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-700 mr-1">الصف الدراسي</label>
                      <select 
                        required 
                        className="w-full h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold text-slate-700 outline-none" 
                        disabled={!formData.stage} 
                        value={formData.grade} 
                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      >
                        <option value="">اختر الصف...</option>
                        {formData.stage && GRADES[formData.stage].map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                      </select>
                    </div>
                    
                    {formData.stage === 'secondary' ? (
                      <div className="space-y-2 animate-in slide-in-from-right-4 duration-500">
                        <label className="text-sm font-black text-slate-700 mr-1">الرقم القومي (14 رقم)</label>
                        <Input 
                          required 
                          maxLength={14}
                          placeholder="ادخل الرقم القومي كاملاً..."
                          className="rounded-2xl bg-slate-50 border-none font-bold h-14" 
                          value={formData.nationalId} 
                          onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} 
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-700 mr-1">اسم المدرسة</label>
                        <Input 
                          required 
                          className="rounded-2xl bg-slate-50 border-none font-bold h-14" 
                          value={formData.schoolName} 
                          onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })} 
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="pt-8">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all" 
                  isLoading={isSubmitting}
                >
                  إرسال طلب الانضمام
                </Button>
                <button 
                  type="button" 
                  onClick={onBack || (() => window.location.reload())} 
                  className="w-full mt-6 text-slate-400 font-bold text-sm tracking-tight hover:text-brand-primary transition-colors"
                >
                  العودة لتغيير نوع الحساب
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="hidden lg:flex bg-[#f8fbff] items-center justify-center p-12 border-r border-slate-50">
           <div className="relative">
              <div className="absolute -inset-20 bg-brand-primary/5 rounded-full blur-3xl" />
              <img 
                src="/assets/auth_illustration.png" 
                alt="Register" 
                className="relative max-w-[85%] drop-shadow-2xl h-auto object-contain"
              />
           </div>
        </div>
      </div>
    );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fbff] p-4" dir="rtl">
        <Card className="max-w-md w-full rounded-[3.5rem] shadow-premium border-none overflow-hidden bg-white text-center">
          <CardContent className="p-16 space-y-10">
            <div className="flex justify-center">
              <div className="h-24 w-24 bg-green-50 rounded-[2rem] flex items-center justify-center animate-bounce">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 leading-tight">تم إرسال طلبك بنجاح! 🎉</h2>
              <p className="text-slate-500 font-bold text-lg text-slate-500">حسابك الآن "قيد المراجعة". سيقوم المسؤول بتفعيل حسابك قريباً لتتمكن من الدخول للمنصة.</p>
            </div>

            {role === 'STUDENT' && (
              <div className="bg-brand-primary/5 rounded-[2.5rem] p-8 border-2 border-dashed border-brand-primary/20 space-y-4">
                <span className="font-black text-xs text-brand-primary uppercase tracking-widest">كود الطالب الخاص بك (احتفظ به)</span>
                <div className="text-4xl font-black text-brand-primary tracking-widest select-all">{entranceCode}</div>
              </div>
            )}

            <Button 
              variant="primary" 
              size="lg" 
              className="w-full h-16 rounded-2xl font-black text-lg shadow-premium" 
              onClick={() => window.location.reload()}
            >
              تحديث الحالة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
