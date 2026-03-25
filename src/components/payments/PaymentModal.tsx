import { CreditCard, Smartphone, Landmark, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { createNotification } from '../../hooks/useNotifications';

export const PaymentModal = ({ courseId, courseTitle, price, teacherId, onConfirm, onCancel }: any) => {
  const [method, setMethod] = useState('CARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { profile } = useEducatorsAuth();
  const [teacherPaymentInfo, setTeacherPaymentInfo] = useState<any>(null);

  useEffect(() => {
    if (teacherId) {
      const fetchTeacherInfo = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../../firebase');
          const teacherDoc = await getDoc(doc(db, 'users', teacherId));
          if (teacherDoc.exists() && teacherDoc.data()?.paymentInfo) {
             setTeacherPaymentInfo(teacherDoc.data()?.paymentInfo);
          }
        } catch(err) {
           console.error("Error fetching teacher payment info:", err);
        }
      };
      fetchTeacherInfo();
    }
  }, [teacherId]);

  const handlePay = async () => {
    setIsProcessing(true);
    
    // Simulate redirection/processing transition
    await new Promise(r => setTimeout(r, 1200));

    if (method === 'INSTAPAY' || method === 'VODAFONE') {
      setIsProcessing(false);
      setShowInstructions(true);
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate Card Payment logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Save record to Firestore
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      
      await addDoc(collection(db, 'payments'), {
        studentId: profile?.uid,
        studentName: profile?.fullName,
        studentEmail: profile?.email,
        courseId,
        courseTitle,
        teacherId, // Added teacherId
        amount: price,
        method,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        invoice: `#INV-${Math.floor(Math.random() * 9000) + 1000}`
      });

      // Notify the teacher
      await createNotification({
        userId: teacherId,
        title: 'طلب انضمام جديد (بطاقة) 💳',
        message: `قام الطالب ${profile?.fullName} بعملية دفع عبر البطاقة لكورس "${courseTitle}" (بانتظار التأكيد).`,
        type: 'ENROLLMENT',
        link: 'PAYMENTS'
      });

      // Standardized Enrollment ID to prevent duplicates
      const enrollmentId = `${profile?.uid}_${courseId}`;
      const { setDoc, doc } = await import('firebase/firestore');
      
      // Also create a PENDING enrollment record (Teacher must approve even card payments)
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        studentId: profile?.uid,
        studentName: profile?.fullName,
        studentPhone: profile?.phone || profile?.fatherPhone || '--',
        courseId,
        courseTitle,
        teacherId, // Added teacherId
        status: 'PENDING',
        enrolledAt: new Date().toISOString(),
        progress: 0,
        completedLessons: []
      });

      setIsSuccess(true);
      setTimeout(onConfirm, 2000);
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmManual = async () => {
    setIsProcessing(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      
      await addDoc(collection(db, 'payments'), {
        studentId: profile?.uid,
        studentName: profile?.fullName,
        studentEmail: profile?.email,
        courseId,
        courseTitle,
        teacherId, // Added teacherId
        amount: price,
        method,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        invoice: `#INV-${Math.floor(Math.random() * 9000) + 1000}`
      });

      // Notify the teacher
      await createNotification({
        userId: teacherId,
        title: 'طلب انضمام جديد (يدوي) 📱',
        message: `قام الطالب ${profile?.fullName} بطلب الانضمام لكورس "${courseTitle}" (انتظار الوصل).`,
        type: 'ENROLLMENT',
        link: 'PAYMENTS'
      });

      // Standardized Enrollment ID to prevent duplicates
      const enrollmentId = `${profile?.uid}_${courseId}`;
      const { setDoc, doc } = await import('firebase/firestore');

      // Also create a PENDING enrollment record for the teacher/admin to see
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        studentId: profile?.uid,
        studentName: profile?.fullName,
        studentPhone: profile?.phone || profile?.fatherPhone || '--',
        courseId,
        courseTitle,
        teacherId, // Added teacherId
        status: 'PENDING',
        enrolledAt: new Date().toISOString(),
        progress: 0,
        completedLessons: []
      });

      // WhatsApp Redirection
      let academyPhone = teacherPaymentInfo?.whatsapp || '201066708090'; 
      if (academyPhone.startsWith('0')) {
         academyPhone = '2' + academyPhone;
      }
      
      const message = `*طلب اشتراك جديد - منصة التربويين* 🎓
---------------------------
*اسم الطالب:* ${profile?.fullName}
*الكورس:* ${courseTitle}
*المبلغ:* ${price} EGP
*المرحلة/الصف:* ${profile?.stage || '--'} / ${profile?.grade || '--'}
*رقم الطالب:* ${profile?.phone || '--'}

السلام عليكم، لقد قمت بالتحويل المطلوب للاشتراك في الكورس. مرفق صورة الوصل للتأكيد. يرجى تفعيل الحساب. 🙏`;

      const waLink = `https://wa.me/${academyPhone}?text=${encodeURIComponent(message)}`;
      window.open(waLink, '_blank');

      setIsSuccess(true);
      setTimeout(onConfirm, 4000); 
    } catch (error) {
       console.error("Manual Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md text-center p-8 space-y-5 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-500">
          <div className="h-20 w-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-100">
            <Check className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">نشكرك يا {profile?.fullName.split(' ')[0]}! ❤️</h2>
            <p className="text-sm text-slate-500 font-bold leading-relaxed">
              {method === 'CARD' 
                ? `تم استلام عملية الدفع بنجاح! بمجرد تأكيد المعلم للاشتراك، سيفتح الكورس تلقائياً. 🙏`
                : "تم استلام طلبك! بمجرد مراجعة تحويلك، سيظهر الكورس كـ 'مفتوح' تلقائياً. المراجعة تتم خلال دقائق بسيطة في أوقات العمل. 🙏"}
            </p>
          </div>
          {method !== 'CARD' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] font-black text-amber-600">💡 تم فتح الواتساب للتواصل مع المعلم، يرجى إرسال الصورة هناك لسرعة التفعيل.</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md overflow-hidden rounded-[2.5rem]">
          <div className="p-6 bg-brand-primary text-white text-right">
            <h2 className="text-xl font-black">تعليمات الدفع</h2>
            <p className="text-white/80 text-[10px] font-bold mt-1">يرجى اتباع الخطوات التالية لإتمام العملية عبر {method === 'INSTAPAY' ? 'InstaPay' : 'Vodafone Cash'}</p>
          </div>
          
          <CardContent className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
               <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div className="h-8 w-8 bg-brand-primary text-white rounded-xl flex items-center justify-center shrink-0 font-black">1</div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-700">حول المبلغ المطلوب</p>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      قم بتحويل مبلغ <span className="text-brand-primary font-black">{price} EGP</span> إلى الرقم/العنوان التالي:
                    </p>
                    <div className="mt-2 p-3 bg-white border-2 border-dashed border-brand-primary/20 rounded-xl flex items-center justify-between">
                       <span className="text-lg font-black text-brand-primary tracking-wider" dir="ltr">
                         {method === 'INSTAPAY' ? (teacherPaymentInfo?.instapay || 'غير متوفر') : (teacherPaymentInfo?.vodafoneCash || 'غير متوفر')}
                       </span>
                       <button className="text-[10px] font-black text-brand-primary uppercase">نسخ</button>
                    </div>
                  </div>
               </div>

               <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div className="h-8 w-8 bg-brand-primary text-white rounded-xl flex items-center justify-center shrink-0 font-black">2</div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-700">احتفظ بصورة التحويل</p>
                    <p className="text-xs text-slate-500 font-bold mt-1">يرجى أخذ لقطة شاشة لعملية التحويل الناجحة للرجوع إليها عند الحاجة.</p>
                  </div>
               </div>

               <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div className="h-8 w-8 bg-brand-primary text-white rounded-xl flex items-center justify-center shrink-0 font-black">3</div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-700">اضغط "تم التحويل"</p>
                    <p className="text-xs text-slate-500 font-bold mt-1">ويرسل الوصل وسوف يتم التأكيد عليه ويبعت اشعار بعد الارسال على السيستم.. سيتفعل الكورس خلال ساعات.</p>
                  </div>
               </div>
            </div>
          </CardContent>

          <div className="p-6 bg-slate-50 flex gap-4 border-t border-slate-100">
            <Button variant="ghost" className="flex-1 rounded-xl font-black h-12" onClick={() => setShowInstructions(false)}>رجوع</Button>
            <Button variant="primary" className="flex-2 rounded-xl font-black h-12" isLoading={isProcessing} onClick={handleConfirmManual}>
              لقد قمت بالتحويل
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-50 text-right bg-white">
          <h2 className="text-xl font-black text-slate-800">إتمام الشراء 💳</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1">كورس: {courseTitle}</p>
        </div>
        
        <CardContent className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
            <span className="text-base font-black text-brand-primary">EGP {price}</span>
            <span className="text-xs font-bold text-slate-500">إجمالي المبلغ</span>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">اختر وسيلة الدفع المناسبة</p>
            
            {[
              { id: 'CARD', label: 'بطاقة بنكية', icon: CreditCard },
              { id: 'VODAFONE', label: 'فودافون كاش', icon: Smartphone },
              { id: 'INSTAPAY', label: 'إنستا باي (InstaPay)', icon: Landmark },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                  method === m.id ? "border-brand-primary bg-brand-primary/5 ring-4 ring-brand-primary/10" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                )}
                dir="rtl"
              >
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                     method === m.id ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                   )}>
                      <m.icon className="h-4 w-4" />
                   </div>
                   <span className={cn("text-sm font-black transition-colors", method === m.id ? "text-brand-primary" : "text-slate-600")}>{m.label}</span>
                </div>
                {method === m.id && <Check className="h-4 w-4 text-brand-primary" />}
              </button>
            ))}
          </div>

          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
            <p className="text-[10px] text-blue-700 leading-relaxed text-right font-bold">
              يتم معالجة الدفع بأمان من خلال منصة <span className="text-brand-primary font-black italic">التربويين</span>. بياناتك مشفرة ومحمية بالكامل وفقاً للمعايير العالمية.
            </p>
          </div>
        </CardContent>

        <div className="p-6 bg-slate-50/50 flex gap-4 border-t border-slate-100">
          <Button variant="ghost" className="flex-1 h-12 rounded-xl font-black text-slate-400" onClick={onCancel}>إلغاء</Button>
          <Button variant="primary" className="flex-2 h-12 rounded-xl font-black shadow-lg shadow-brand-primary/20" isLoading={isProcessing} onClick={handlePay}>
            تأكيد والدفع
          </Button>
        </div>
      </Card>
    </div>
  );
};
