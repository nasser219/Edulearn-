import React, { useState, useRef } from 'react';
import {
  Trash2, Save, FileQuestion, CheckCircle2, Clock, ChevronRight,
  ListOrdered, Type, CheckSquare, AlertCircle, Upload, Sparkles,
  Loader2, FileText, Image as ImageIcon, X, Target
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { STAGES, GRADES } from '../../lib/constants';

interface Question {
  id: string;
  text: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
  options?: string[];
  correctAnswer?: string;
  points: number;
}

// ─── AI Import Modal ──────────────────────────────────────────────────────────
const AIImportModal = ({
  onClose,
  onImport,
  apiKey,
}: {
  onClose: () => void;
  onImport: (questions: Question[]) => void;
  apiKey: string;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['MCQ', 'TRUE_FALSE']);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleType = (type: string) => {
    setQuestionTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleGenerate = async () => {
    if (!file && !textInput.trim()) {
      alert('الرجاء رفع ملف أو إدخال نص أولاً.');
      return;
    }
    if (questionTypes.length === 0) {
      alert('الرجاء اختيار نوع سؤال واحد على الأقل.');
      return;
    }
    if (!apiKey) {
      alert('مفتاح الـ API غير مهيأ. يرجى التواصل مع السوبر أدمن.');
      return;
    }

    setIsLoading(true);
    setStatus('جاري تحليل المحتوى...');

    try {
      const typesLabel = questionTypes
        .map(t => t === 'MCQ' ? 'اختيار من متعدد' : t === 'TRUE_FALSE' ? 'صح/خطأ' : 'مقالي')
        .join(' و ');

      const systemPrompt = `أنت خبير تعليمي متخصص في إنشاء الاختبارات. مهمتك تحليل المحتوى التعليمي وتوليد أسئلة اختبار شاملة ودقيقة.
قواعد مهمة:
1. استخرج المفاهيم الأساسية من المحتوى وأنشئ أسئلة تقيسها
2. لأسئلة MCQ: أنشئ 4 خيارات دائماً، خيار صحيح واحد فقط، والباقي منطقي ومضلل
3. لأسئلة TRUE_FALSE: الخيارات دائماً ["صح","خطأ"] فقط
4. لأسئلة ESSAY: لا تضع correctAnswer
5. إذا كان المحتوى يحتوي أسئلة بدون إجابات، استنتج الإجابة الصحيحة من السياق
6. اكتب الأسئلة باللغة العربية الفصحى
7. تأكد أن الأسئلة متنوعة وتغطي أجزاء مختلفة من المحتوى

أجب فقط بـ JSON صالح بهذا الشكل بدون أي نص إضافي:
{
  "questions": [
    {
      "text": "نص السؤال هنا",
      "type": "MCQ",
      "options": ["خيار 1","خيار 2","خيار 3","خيار 4"],
      "correctAnswer": "خيار 1"
    }
  ]
}`;

      // Build user message content
      let userContent: any = `حلل المحتوى التالي وأنشئ ${questionCount} سؤالاً من أنواع (${typesLabel}).
وزّع الأسئلة بالتساوي بين الأنواع المطلوبة قدر الإمكان.`;

      // If file uploaded, read it as text or base64
      if (file) {
        setStatus('جاري معالجة الملف...');
        const isImage = file.type.startsWith('image/');

        if (isImage) {
          // Groq vision model for images
          const base64 = await fileToBase64(file);
          userContent = [
            {
              type: 'text',
              text: `حلل المحتوى في الصورة وأنشئ ${questionCount} سؤالاً من أنواع (${typesLabel}). وزّع الأسئلة بالتساوي.`
            },
            {
              type: 'image_url',
              image_url: { url: `data:${file.type};base64,${base64}` }
            }
          ];
        } else {
          // PDF or TXT - read as text
          const text = await file.text();
          userContent = `حلل المحتوى التالي وأنشئ ${questionCount} سؤالاً من أنواع (${typesLabel}).
وزّع الأسئلة بالتساوي بين الأنواع المطلوبة قدر الإمكان.
\nالمحتوى:\n${text}`;
        }
      } else if (textInput.trim()) {
        userContent = `حلل المحتوى التالي وأنشئ ${questionCount} سؤالاً من أنواع (${typesLabel}).
وزّع الأسئلة بالتساوي بين الأنواع المطلوبة قدر الإمكان.
\nالمحتوى:\n${textInput}`;
      }

      setStatus('الذكاء الاصطناعي يولّد الأسئلة...');

      // Choose model based on content type
      const isImageUpload = file?.type.startsWith('image/');
      const model = isImageUpload ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Groq error:', errText);
        throw new Error(`خطأ من الخادم: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || '';

      // Extract JSON flexibly
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('لم يتم العثور على رد JSON صالح');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('تنسيق الرد غير صحيح');
      }

      const questions: Question[] = parsed.questions.map((q: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        text: q.text,
        type: q.type as Question['type'],
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || 1,
      }));

      setStatus(`✅ تم توليد ${questions.length} سؤال بنجاح!`);
      setTimeout(() => { onImport(questions); onClose(); }, 800);

    } catch (err: any) {
      console.error('AI Error:', err);
      setStatus('');
      alert(`حدث خطأ: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">

        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">استيراد بالذكاء الاصطناعي</h2>
              <p className="text-xs text-slate-400 font-bold">ارفع ملف أو أدخل نص وسيتولى الذكاء الاصطناعي الباقي</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* File Upload */}
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
              file ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
            )}
          >
            <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.txt" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                {file.type.startsWith('image/') ? <ImageIcon className="h-8 w-8 text-indigo-500" /> : <FileText className="h-8 w-8 text-indigo-500" />}
                <div className="text-right">
                  <p className="font-black text-indigo-700 text-sm">{file.name}</p>
                  <p className="text-xs text-indigo-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} className="mr-auto h-8 w-8 rounded-lg hover:bg-indigo-100 flex items-center justify-center">
                  <X className="h-4 w-4 text-indigo-400" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-black text-slate-500 text-sm">اسحب ملف هنا أو انقر للاختيار</p>
                <p className="text-xs text-slate-400 mt-1">صور (JPG, PNG) • TXT</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs font-black text-slate-300">أو</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400">الصق النص مباشرة</label>
            <textarea
              className="w-full h-32 p-4 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all resize-none placeholder:text-slate-300"
              placeholder="الصق محتوى الدرس أو الأسئلة هنا..."
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400">عدد الأسئلة</label>
              <select className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-black text-sm outline-none" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))}>
                {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} سؤال</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400">أنواع الأسئلة</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {[{ id: 'MCQ', label: 'اختيار' }, { id: 'TRUE_FALSE', label: 'صح/خطأ' }, { id: 'ESSAY', label: 'مقالي' }].map(t => (
                  <button key={t.id} onClick={() => toggleType(t.id)} className={cn("px-3 py-1.5 rounded-xl text-xs font-black transition-all", questionTypes.includes(t.id) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {status && (
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              {isLoading && <Loader2 className="h-4 w-4 text-indigo-600 animate-spin shrink-0" />}
              <p className="text-sm font-black text-indigo-700">{status}</p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-2xl font-black h-14 bg-slate-50 border-none" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" className="flex-1 rounded-2xl font-black h-14 bg-indigo-600 hover:bg-indigo-700 border-none shadow-xl shadow-indigo-200" onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-5 w-5 ml-2 animate-spin" /> جاري التحليل...</> : <><Sparkles className="h-5 w-5 ml-2" /> توليد الأسئلة</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main QuizCreator ─────────────────────────────────────────────────────────
export const QuizCreator = ({ onBack, editId }: { onBack: () => void; editId?: string | null }) => {
  const { profile, isStudent } = useEducatorsAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [quizStage, setQuizStage] = useState('');
  const [quizGrade, setQuizGrade] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [cheatPrevention, setCheatPrevention] = useState(false);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [groqApiKey, setGroqApiKey] = useState('');

  // Fetch Groq API key from Firestore settings
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'system'));
        if (snap.exists()) {
          setGroqApiKey(snap.data().groqApiKey || '');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Pre-fill subject if creating new quiz
  React.useEffect(() => {
    if (!editId && profile?.subject) {
      setSubject(profile.subject);
    }
  }, [editId, profile?.subject]);

  React.useEffect(() => {
    const fetchQuiz = async () => {
      if (!editId) return;
      try {
        const docSnap = await getDoc(doc(db, 'quizzes', editId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setQuizTitle(data.title || '');
          setSubject(data.subject || '');
          setQuizStage(data.stage || '');
          setQuizGrade(data.grade || '');
          setTimeLimit(data.timeLimit || 30);
          setCheatPrevention(data.cheatPrevention || false);
          setAvailableFrom(data.availableFrom || '');
          setAvailableUntil(data.availableUntil || '');
          setQuestions(data.questions || []);
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
      }
    };
    fetchQuiz();
  }, [editId]);

  const addQuestion = (type: Question['type']) => {
    setQuestions(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      text: 'نص السؤال الجديد...',
      type,
      options: type === 'MCQ' ? ['اختيار 1', 'اختيار 2', 'اختيار 3', 'اختيار 4'] : type === 'TRUE_FALSE' ? ['صح', 'خطأ'] : undefined,
      correctAnswer: type !== 'ESSAY' ? (type === 'MCQ' ? 'اختيار 1' : 'صح') : undefined,
      points: 1,
    }]);
  };

  const updateQuestion = (id: string, data: Partial<Question>) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...data } : q));

  const deleteQuestion = (id: string) =>
    setQuestions(prev => prev.filter(q => q.id !== id));

  const handleAIImport = (newQuestions: Question[]) =>
    setQuestions(prev => [...prev, ...newQuestions]);

  const handleSave = async () => {
    if (!quizTitle.trim() || !subject.trim() || !quizStage || !quizGrade || questions.length === 0) {
      alert('الرجاء إكمال بيانات الاختبار وإضافة سؤال واحد على الأقل.');
      return;
    }
    setIsSubmitting(true);
    try {
      const sanitizedQuestions = questions.map(q => {
        const cleaned: any = { id: q.id, text: q.text, type: q.type, points: Number(q.points) || 1 };
        if (q.options) cleaned.options = q.options;
        if (q.correctAnswer) cleaned.correctAnswer = q.correctAnswer;
        return cleaned;
      });
      const totalPoints = sanitizedQuestions.reduce((acc, q) => acc + (q.points || 0), 0);
      const quizData: any = {
        title: quizTitle, subject, stage: quizStage, grade: quizGrade,
        timeLimit: Number(timeLimit) || 30,
        cheatPrevention: !!cheatPrevention,
        availableFrom: availableFrom || null,
        availableUntil: availableUntil || null,
        questions: sanitizedQuestions,
        totalPoints,
        teacherId: profile?.uid || null,
        teacherName: profile?.fullName || 'معلم',
        updatedAt: new Date().toISOString(),
        participantsCount: 0,
      };
      if (editId) {
        await updateDoc(doc(db, 'quizzes', editId), quizData);
        alert('تم تحديث الاختبار بنجاح! 🎓✨');
      } else {
        await addDoc(collection(db, 'quizzes'), { ...quizData, createdAt: new Date().toISOString() });
        alert('تم حفظ الاختبار بنجاح! 🎓✨');
      }
      onBack();
    } catch (error: any) {
      alert(`حدث خطأ: ${error?.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isStudent()) {
    return (
      <div className="p-20 text-center animate-in fade-in" dir="rtl">
        <div className="max-w-md mx-auto bg-white p-12 rounded-[3rem] shadow-premium">
          <div className="h-20 w-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileQuestion className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">عذراً، لا تملك الصلاحية 🛑</h2>
          <p className="text-slate-500 font-bold mb-8">هذه الصفحة مخصصة للمعلين فقط لإنشاء وتعديل الاختبارات.</p>
          <Button variant="primary" onClick={onBack} className="w-full rounded-2xl h-14 font-black">العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showAIModal && <AIImportModal onClose={() => setShowAIModal(false)} onImport={handleAIImport} apiKey={groqApiKey} />}

      <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-premium border border-slate-50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-10 w-10 rounded-xl p-0">
              <ChevronRight className="h-6 w-6" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{editId ? 'تعديل الاختبار ✏️' : 'إنشاء اختبار جديد 📝'}</h1>
              <p className="text-slate-500 font-bold">صمّم أسئلتك وحدد الإجابات الصحيحة للتصحيح التلقائي</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => setShowAIModal(true)} className="rounded-2xl font-black h-14 px-8 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100">
              <Sparkles className="h-5 w-5 ml-2" /> استيراد بالذكاء الاصطناعي
            </Button>
            <Button variant="outline" onClick={onBack} className="rounded-2xl font-black h-14 bg-slate-50 border-none hover:bg-slate-100 px-8">إلغاء</Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSubmitting} className="rounded-2xl font-black h-14 px-10 shadow-xl shadow-brand-primary/20 bg-indigo-600 hover:bg-indigo-700 border-none">
              <Save className="h-5 w-5 ml-2" /> حفظ ونشر الاختبار
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-50 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-indigo-600" />
                <h3 className="font-black text-slate-800">إعدادات الاختبار</h3>
              </CardHeader>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2">عنوان الاختبار</label>
                  <Input placeholder="مثال: اختبار الميد ترم" className="rounded-2xl bg-slate-50 border-none font-bold placeholder:text-slate-300" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2">المادة العلمية</label>
                  <Input 
                    placeholder="مثال: الفيزياء، الكيمياء..." 
                    readOnly={!!profile?.subject}
                    className={cn(
                      "rounded-2xl border-none font-bold transition-all",
                      !!profile?.subject ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50 placeholder:text-slate-300 focus:bg-white"
                    )} 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                  />
                  {profile?.subject && <p className="text-[9px] text-slate-400 font-bold mr-2 mt-1">تم التحديد تلقائياً بناءً على تخصصك 🔒</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2">مدة الاختبار (بالدقائق)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input type="number" className="rounded-2xl bg-slate-50 border-none font-black pl-12" value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2">المسار التعليمي</label>
                    <select className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none" value={quizStage} onChange={e => { setQuizStage(e.target.value); setQuizGrade(''); }}>
                      <option value="">اختر المرحلة...</option>
                      {STAGES.filter(s => profile?.stages?.includes(s.id) || profile?.role === 'ADMIN').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2">الصف الدراسي</label>
                    <select className="w-full h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold text-sm outline-none disabled:opacity-50" value={quizGrade} disabled={!quizStage} onChange={e => setQuizGrade(e.target.value)}>
                      <option value="">اختر الصف...</option>
                      {quizStage && GRADES[quizStage]?.filter(g => profile?.grades?.includes(g.id) || profile?.role === 'ADMIN').map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">جدولة الاختبار (اختياري)</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400">يفتح في</label>
                    <Input type="datetime-local" className="rounded-2xl bg-slate-50 border-none font-bold text-xs" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400">يغلق في</label>
                    <Input type="datetime-local" className="rounded-2xl bg-slate-50 border-none font-bold text-xs" value={availableUntil} onChange={e => setAvailableUntil(e.target.value)} />
                  </div>
                  <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-3 rounded-xl">* إذا تركت الحقول فارغة، سيكون الاختبار متاحاً فوراً وبشكل دائم.</p>
                </div>
                <div className="pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-colors", cheatPrevention ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400")}>
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800 leading-none mb-1">منع الغش</p>
                        <p className="text-[10px] font-bold text-slate-500">إنهاء الاختبار عند تغيير التبويب</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setCheatPrevention(!cheatPrevention)} className={cn("w-12 h-6 rounded-full transition-all relative", cheatPrevention ? "bg-indigo-600" : "bg-slate-200")}>
                      <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", cheatPrevention ? "left-1" : "left-7")} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
            <div className="p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 space-y-4">
              <h4 className="font-black text-indigo-900 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />حول التصحيح التلقائي</h4>
              <p className="text-xs text-indigo-700/80 font-bold leading-relaxed">سيقوم النظام بتصحيح أسئلة الاختيار من متعدد وصح/خطأ فوراً، بينما ستنتظر الأسئلة المقالية تقييمك اليدوي.</p>
            </div>
          </div>

          {/* Questions Builder */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <ListOrdered className="h-6 w-6 text-indigo-600" />
                أسئلة الاختبار ({questions.length})
              </h3>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => addQuestion('MCQ')} className="rounded-xl font-black bg-white border-slate-200">+ اختيار</Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion('TRUE_FALSE')} className="rounded-xl font-black bg-white border-slate-200">+ صح/خطأ</Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion('ESSAY')} className="rounded-xl font-black bg-white border-slate-200">+ مقالي</Button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <FileQuestion className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                <p className="text-slate-400 font-bold mb-4">ابدأ بإضافة الأسئلة يدوياً أو استخدم الذكاء الاصطناعي</p>
                <Button variant="outline" onClick={() => setShowAIModal(true)} className="rounded-2xl font-black bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100">
                  <Sparkles className="h-4 w-4 ml-2" /> استيراد بالذكاء الاصطناعي
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <Card key={q.id} className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white animate-in slide-in-from-bottom-4">
                    <div className="bg-slate-50 p-6 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <span className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black">{idx + 1}</span>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                        <Target className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-black text-slate-400">الدرجة:</span>
                        <input 
                          type="number" 
                          className="w-12 bg-transparent font-black text-indigo-600 outline-none text-center"
                          value={q.points}
                          onChange={e => updateQuestion(q.id, { points: Number(e.target.value) })}
                          min="1"
                        />
                      </div>
                      <button onClick={() => deleteQuestion(q.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400">نص السؤال</label>
                        <textarea className="w-full h-24 p-4 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all resize-none" value={q.text} onChange={e => updateQuestion(q.id, { text: e.target.value })} />
                      </div>
                      {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                          <label className="text-xs font-black text-slate-400">الخيارات (انقر الدائرة لتحديد الإجابة الصحيحة)</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {q.options?.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-3">
                                <button onClick={() => updateQuestion(q.id, { correctAnswer: opt })} className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all", q.correctAnswer === opt ? "bg-indigo-600 border-indigo-600" : "border-slate-200")}>
                                  {q.correctAnswer === opt && <div className="h-2 w-2 bg-white rounded-full" />}
                                </button>
                                <input type="text" disabled={q.type === 'TRUE_FALSE'}
                                  className={cn("flex-1 h-12 px-4 rounded-xl border-none font-bold text-sm transition-all outline-none", q.correctAnswer === opt ? "bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200" : "bg-slate-50 text-slate-600")}
                                  value={opt}
                                  onChange={e => {
                                    const newOpts = [...(q.options || [])];
                                    newOpts[optIdx] = e.target.value;
                                    updateQuestion(q.id, { options: newOpts });
                                    if (q.correctAnswer === opt) updateQuestion(q.id, { correctAnswer: e.target.value });
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {q.type === 'ESSAY' && (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                          <Type className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-bold">هذا السؤال يتطلب تصحيحاً يدوياً من قِبلك لاحقاً.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};