import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, XCircle, CheckCircle2, Award, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardFooter } from '../ui/Card';
import { cn } from '../../lib/utils';
import { doc, getDoc, addDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { SecurityOverlay } from '../security/SecurityOverlay';

export const QuizEngine = ({ quizId, onBack, onComplete }: { 
  quizId: string, 
  onBack: () => void,
  onComplete?: (score: number) => void 
}) => {
  const { profile } = useEducatorsAuth();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [cheatInfo, setCheatInfo] = useState<{ isCheated: boolean, note: string } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [previousResult, setPreviousResult] = useState<any>(null);
  const [isRetaking, setIsRetaking] = useState(false);

  const isFinishedRef = useRef(false);
  // Keep live refs so handleFinish always has latest values
  const answersRef = useRef(answers);
  const quizRef = useRef(quiz);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { quizRef.current = quiz; }, [quiz]);

  // ─── Fetch Quiz ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!profile?.uid) return;
      try {
        // 1. Check for existing results first
        const resultsSnap = await getDocs(query(
          collection(db, 'quiz_results'),
          where('studentId', '==', profile.uid),
          where('courseId', '==', quizId)
        ));

        if (!resultsSnap.empty) {
          const resData = resultsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => 
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          
          setPreviousResult(resData[0]); // Get the most recent result
          
          // Only stop if they aren't authorized to retake
          const hasRetakePermission = resData.some((r: any) => r.allowRetake === true);
          if (!hasRetakePermission && !isRetaking) {
            setLoading(false);
            return;
          }
        }

        // 2. Fetch Quiz Data
        const docSnap = await getDoc(doc(db, 'quizzes', quizId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const now = new Date();
          if (data.availableFrom && new Date(data.availableFrom) > now) {
            alert(`هذا الاختبار غير متاح حالياً. سيفتح في: ${new Date(data.availableFrom).toLocaleString('ar-EG')}`);
            onBack();
            return;
          }
          if (data.availableUntil && new Date(data.availableUntil) < now) {
            alert('عذراً، لقد انتهى الوقت المخصص لهذا الاختبار.');
            onBack();
            return;
          }
          setQuiz(data);
          setTimeLeft(data.timeLimit * 60);
          setStartTime(Date.now());
        }
      } catch (error) {
        console.error("Error fetching quiz/results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, onBack, profile]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || isFinished || !quiz) return;
    if (timeLeft <= 0) { handleFinish(); return; }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, isFinished, quiz]);

  // ─── Score Calculator ─────────────────────────────────────────────────────
  const calculateScore = (currentAnswers?: Record<string, string>) => {
    const q = quizRef.current;
    const a = currentAnswers ?? answersRef.current;
    if (!q) return { percentage: 0, earnedPoints: 0, totalPoints: 0 };
    
    let earnedPoints = 0;
    let totalPoints = 0;

    q.questions.forEach((qu: any) => {
      const questionPoints = Number(qu.points) || 1;
      totalPoints += questionPoints;
      
      if (qu.type !== 'ESSAY' && a[qu.id] === qu.correctAnswer) {
        earnedPoints += questionPoints;
      }
    });

    if (totalPoints === 0) return { percentage: 100, earnedPoints: 0, totalPoints: 0 };
    return {
      percentage: Math.round((earnedPoints / totalPoints) * 100),
      earnedPoints,
      totalPoints
    };
  };

  // ─── Finish Handler ───────────────────────────────────────────────────────
  const handleFinish = async (isCheated = false, note = "") => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    const currentAnswers = answersRef.current;
    const currentQuiz = quizRef.current;
    const { percentage, earnedPoints, totalPoints } = calculateScore(currentAnswers);

    setScore(percentage);
    if (isCheated) setCheatInfo({ isCheated: true, note });
    setIsFinished(true);

    // Map answers to include metadata for teacher review
    const structuredAnswers = currentQuiz?.questions.map((q: any) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      points: q.points || 1,
      studentAnswer: currentAnswers[q.id] || '',
      correctAnswer: q.correctAnswer || '',
      isCorrect: q.type !== 'ESSAY' ? currentAnswers[q.id] === q.correctAnswer : null,
      earnedPoints: q.type !== 'ESSAY' ? (currentAnswers[q.id] === q.correctAnswer ? (q.points || 1) : 0) : 0
    })) || [];

    try {
      await addDoc(collection(db, 'quiz_results'), {
        courseId: quizId,
        quizTitle: currentQuiz?.title ?? '',
        teacherId: currentQuiz?.teacherId ?? '',
        studentId: profile?.uid,
        studentName: profile?.fullName,
        score: percentage,
        earnedPoints,
        totalPoints,
        answers: structuredAnswers,
        submittedAt: new Date().toISOString(),
        timeTakenMinutes: startTime ? Math.round((Date.now() - startTime) / 60000) : 0,
        timeTakenSeconds: startTime ? Math.round((Date.now() - startTime) / 1000) : 0,
        isCheated,
        cheatNote: note,
        status: isCheated ? 'FLAGGED' : (currentQuiz?.questions.some((q: any) => q.type === 'ESSAY') ? 'PENDING_GRADES' : 'SUBMITTED'),
        allowRetake: false, // Ensure new results start fresh
      });

      // Clear any previous retake permissions to ensure single-use
      const oldPermissions = await getDocs(query(
        collection(db, 'quiz_results'),
        where('studentId', '==', profile?.uid),
        where('courseId', '==', quizId),
        where('allowRetake', '==', true)
      ));
      
      const updatePromises = oldPermissions.docs.map(d => updateDoc(d.ref, { allowRetake: false }));
      await Promise.all(updatePromises);

      setAnswers({});
      onComplete?.(percentage);
    } catch (error) {
      console.error("Error saving quiz result:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Previous Result Guard View ───────────────────────────────────────────
  if (previousResult && !isRetaking && !isFinished) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-10 animate-in fade-in duration-700" dir="rtl">
        <div className="h-24 w-24 bg-brand-primary/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-brand-primary/5">
          <Award className="h-12 w-12 text-brand-primary" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-4xl font-black text-slate-900 leading-tight">لقد أتممت هذا الاختبار 🎉</h2>
          <p className="text-slate-500 font-bold text-lg">درجتك في المحاولة السابقة كانت:</p>
        </div>

        <div className="bg-white p-12 rounded-[3rem] shadow-premium border border-slate-50 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-2 bg-brand-primary/20" />
          <div className="relative z-10">
            <p className="text-7xl font-black text-brand-primary mb-2">{previousResult.score}%</p>
            <p className="text-slate-400 font-bold">بتاريخ {new Date(previousResult.submittedAt).toLocaleDateString('ar-EG')}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="outline" size="lg" onClick={onBack} className="h-16 px-12 rounded-2xl font-black min-w-[200px]">
            العودة للمنصة
          </Button>
          
          {previousResult.allowRetake ? (
            <Button 
              variant="primary" 
              size="lg" 
              onClick={() => setIsRetaking(true)}
              className="h-16 px-12 rounded-2xl font-black shadow-xl shadow-brand-primary/30 min-w-[200px] animate-pulse hover:animate-none"
            >
              بدء محاولة جديدة 🔄
            </Button>
          ) : (
            <div className="bg-amber-50 text-amber-700 px-8 py-5 rounded-2xl border border-amber-100 font-bold text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              يمكنك إعادة الاختبار فقط بعد حصولك على إذن من المعلم.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-20 text-center font-black text-slate-400" dir="rtl">جاري تحميل الاختبار... ⏳</div>
  );
  if (!quiz) return (
    <div className="p-20 text-center font-black text-red-500" dir="rtl">حدث خطأ في تحميل بيانات الاختبار.</div>
  );

  // ─── Results Screen ───────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-8 animate-in zoom-in duration-500 pb-20" dir="rtl">
        <div className="h-24 w-24 bg-green-100 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-green-100 animate-bounce">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>

        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">تم الانتهاء بنجاح! 🎉</h2>
          <p className="text-slate-500 font-bold">
            نشكرك يا {profile?.fullName.split(' ')[0]}، لقد تم حفظ إجاباتك وإرسالها للمعلم.
          </p>
        </div>

        <Card className={cn("border-none shadow-premium bg-white rounded-[3rem] overflow-hidden", cheatInfo && "ring-4 ring-red-500/20")}>
          <CardContent className="p-12 space-y-10">
            <div className="flex justify-center gap-12 text-right">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">نتيجة التقييم</p>
                <p className={cn("text-5xl font-black", cheatInfo ? "text-red-500" : "text-indigo-600")}>{score}%</p>
              </div>
              <div className="w-px bg-slate-100" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">حالة الاختبار</p>
                {cheatInfo ? (
                  <p className="text-xl font-black text-red-500 mt-2 italic underline underline-offset-4">
                    انتهاك - تم إنهاء الاختبار ❌
                  </p>
                ) : (
                  <p className="text-xl font-black text-emerald-500 mt-2">ناجح ومتميز ✅</p>
                )}
              </div>
            </div>

            {cheatInfo && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700 text-xs font-bold text-right">
                ⚠️ تنبيه: {cheatInfo.note}. تم حفظ درجتك الفعلية وإبلاغ المعلم.
              </div>
            )}

            {!cheatInfo && (
              <div className="space-y-6 pt-10 border-t border-slate-50">
                <h3 className="text-xl font-black text-slate-800 text-right mb-6">مراجعة الإجابات 📝</h3>
                <div className="space-y-4">
                  {quiz.questions.map((q: any, idx: number) => {
                    const isCorrect = answers[q.id] === q.correctAnswer;
                    const isEssay = q.type === 'ESSAY';
                    return (
                      <div key={q.id} className={cn(
                        "p-6 rounded-2xl border-2 text-right transition-all",
                        isEssay ? "border-slate-100 bg-slate-50/30" :
                          isCorrect ? "border-emerald-100 bg-emerald-50/30" : "border-red-100 bg-red-50/30"
                      )}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 mb-2">
                              <span className="text-slate-400 ml-2">{idx + 1}.</span>{q.text}
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm font-bold flex items-center gap-2">
                                <span className="text-slate-400">إجابتك:</span>
                                <span className={cn(
                                  isEssay ? "text-slate-600" :
                                    isCorrect ? "text-emerald-700" : "text-red-700 font-black"
                                )}>
                                  {answers[q.id] || '(لم يتم الإجابة)'}
                                </span>
                                {!isEssay && (isCorrect
                                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  : <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </p>
                              {!isCorrect && !isEssay && (
                                <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                  <span className="text-slate-400">الإجابة الصحيحة:</span>{q.correctAnswer}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-slate-50">
              {cheatInfo ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-red-700 text-sm font-bold border border-red-100 italic text-right">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {cheatInfo.note}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl text-indigo-700 text-sm font-bold">
                  <Award className="h-5 w-5" />
                  سيتم مراجعة الأسئلة المقالية (إن وجدت) يدويًا بواسطة المعلم.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button variant="primary" size="lg" className="h-16 px-12 rounded-2xl font-black shadow-xl shadow-brand-primary/20" onClick={onBack}>
          العودة للمنصة
        </Button>
      </div>
    );
  }

  // ─── Quiz Screen ──────────────────────────────────────────────────────────
  const question = quiz.questions[currentQuestion];

  return (
    <SecurityOverlay
      active={quiz?.cheatPrevention}
      onViolation={(type) => handleFinish(true, type)}
    >
      <div className="max-w-4xl mx-auto space-y-10 pb-16 pt-4 animate-in fade-in duration-700" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md py-8 px-6 z-20 border-b border-slate-100/50">
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{quiz.title}</h2>
            <p className="text-sm text-slate-400 font-bold mt-1">
              السؤال {currentQuestion + 1} من {quiz.questions.length}
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-3 px-6 py-3 rounded-2xl font-black shadow-sm transition-all",
            timeLeft < 300
              ? "bg-red-100 text-red-600 animate-pulse ring-4 ring-red-50"
              : "bg-white text-brand-primary border border-slate-100"
          )}>
            <Clock className="h-5 w-5" />
            <span className="font-mono text-xl">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Question Card */}
        <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="p-12 pb-6 border-b border-slate-50">
            <h3 className="text-3xl font-black text-slate-800 leading-tight text-right">{question.text}</h3>
          </CardHeader>
          <CardContent className="p-12 pt-10 space-y-6">
            {question.type === 'MCQ' || question.type === 'TRUE_FALSE' ? (
              <div className="grid grid-cols-1 gap-4">
                {question.options?.map((option: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [question.id]: option })}
                    className={cn(
                      "flex items-center gap-6 p-6 rounded-2xl border-2 text-right transition-all group",
                      answers[question.id] === option
                        ? "border-brand-primary bg-brand-primary/5 ring-4 ring-brand-primary/10"
                        : "border-slate-50 hover:border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform group-active:scale-90",
                      answers[question.id] === option ? "border-brand-primary bg-brand-primary" : "border-slate-300"
                    )}>
                      {answers[question.id] === option && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-lg font-bold text-slate-700">{option}</span>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full h-48 p-6 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-brand-primary/10 focus:bg-white outline-none transition-all resize-none text-base font-bold text-slate-700 placeholder:text-slate-300"
                placeholder="اكتب إجابتك هنا بالتفصيل..."
                value={answers[question.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
              />
            )}
          </CardContent>
          <CardFooter className="p-10 bg-slate-50/50 flex items-center justify-between">
            <Button
              variant="ghost"
              className="h-12 px-6 rounded-xl font-black text-slate-500"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(v => v - 1)}
            >
              السابق
            </Button>
            {currentQuestion === quiz.questions.length - 1 ? (
              <Button
                variant="primary" size="lg"
                className="h-14 px-10 rounded-xl font-black shadow-lg shadow-brand-primary/20"
                onClick={() => handleFinish()}
              >
                تسليم الاختبار
              </Button>
            ) : (
              <Button
                variant="primary"
                className="h-14 px-10 rounded-xl font-black shadow-lg shadow-brand-primary/20"
                onClick={() => setCurrentQuestion(v => v + 1)}
              >
                السؤال التالي
              </Button>
            )}
          </CardFooter>
        </Card>

        {quiz.cheatPrevention && (
          <div className="flex items-center gap-4 p-6 bg-red-50 rounded-[2rem] border border-red-100">
            <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 font-black leading-relaxed text-right">
              ⚠️ تحذير أمني: يمنع منعا باتا الانتقال لتاب آخر أو أخذ لقطات شاشة أثناء الاختبار.
              أي مخالفة سيتم إغلاق الاختبار فوراً وإبلاغ المعلم.
            </p>
          </div>
        )}
      </div>
    </SecurityOverlay>
  );
};