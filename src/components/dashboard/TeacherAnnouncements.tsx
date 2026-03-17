import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Layers, 
  Calendar, 
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { createNotification } from '../../hooks/useNotifications';
import { getDocs } from 'firebase/firestore';
import { STAGES, GRADES } from '../../lib/constants';
import { FileUpload } from '../ui/FileUpload';
import { cn } from '../../lib/utils';

export const TeacherAnnouncements = () => {
  const { profile } = useEducatorsAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [stage, setStage] = useState('');
  const [grade, setGrade] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'announcements'), 
      where('teacherId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !stage || !grade) {
      alert('الرجاء إكمال كافة البيانات المطلوبة.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title,
        content,
        stage,
        grade,
        imageUrl,
        teacherId: profile?.uid,
        teacherName: profile?.fullName,
        createdAt: new Date().toISOString()
      });
      setTitle('');
      setContent('');
      setStage('');
      setGrade('');
      setImageUrl('');
      setIsAdding(false);

      // Add In-App Notifications for targeted students
      try {
        const studentQuery = query(
          collection(db, 'users'),
          where('role', '==', 'STUDENT'),
          where('stage', '==', stage),
          where('grade', '==', grade)
        );
        const studentSnap = await getDocs(studentQuery);
        
        const notificationPromises = studentSnap.docs.map(studentDoc => 
          createNotification({
            userId: studentDoc.id,
            title: `إعلان جديد: ${title} 📢`,
            message: content.length > 50 ? content.substring(0, 50) + '...' : content,
            type: 'ANNOUNCEMENT',
            senderName: profile?.fullName
          })
        );
        
        await Promise.all(notificationPromises);
      } catch (notifError) {
        console.error("Error sending targeted notifications:", notifError);
      }
    } catch (error) {
      console.error("Error adding announcement:", error);
      alert('حدث خطأ أثناء إضافة الإعلان.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-premium border border-slate-50">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             الإعلانات المستهدفة <Megaphone className="h-8 w-8 text-brand-primary" />
          </h2>
          <p className="text-slate-500 font-bold">قم بنشر إعلانات تظهر فقط للطلاب في مراحل دراسية معينة</p>
        </div>
        {!isAdding && (
          <Button 
            variant="primary" 
            onClick={() => setIsAdding(true)}
            className="rounded-2xl font-black h-14 px-8 shadow-xl shadow-brand-primary/20"
          >
            <Plus className="h-5 w-5 ml-2" />
            إضافة إعلان جديد
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="rounded-[2.5rem] border-none shadow-premium bg-white overflow-hidden animate-in slide-in-from-top-4">
          <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
             <h3 className="text-xl font-black">تفاصيل الإعلان الجديد ✨</h3>
             <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-red-500 transition-colors">
               <X className="h-6 w-6" />
             </button>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">عنوان الإعلان</label>
                    <Input 
                      placeholder="مثال: فتح باب الاشتراك في الترم الثاني" 
                      className="rounded-2xl h-14 bg-slate-50 border-none font-bold"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">محتوى الإعلان</label>
                    <textarea 
                      placeholder="اشرح تفاصيل الإعلان هنا..." 
                      className="w-full h-32 rounded-2xl bg-slate-50 border-none p-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all resize-none"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">المرحلة المستهدفة</label>
                      <select 
                        className="w-full h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold"
                        value={stage}
                        onChange={(e) => {
                          setStage(e.target.value);
                          setGrade('');
                        }}
                      >
                        <option value="">اختر المرحلة...</option>
                        {STAGES.filter(s => profile?.stages?.includes(s.id)).map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">الصف المستهدف</label>
                      <select 
                        className="w-full h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold disabled:opacity-50"
                        value={grade}
                        disabled={!stage}
                        onChange={(e) => setGrade(e.target.value)}
                      >
                        <option value="">اختر الصف...</option>
                        {stage && GRADES[stage]?.filter(g => profile?.grades?.includes(g.id)).map(g => (
                          <option key={g.id} value={g.id}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">صورة الإعلان (اختياري)</label>
                    {imageUrl ? (
                      <div className="relative rounded-2xl overflow-hidden aspect-video group">
                        <img src={imageUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="ghost" className="text-white" onClick={() => setImageUrl('')}>تغيير الصورة</Button>
                        </div>
                      </div>
                    ) : (
                      <FileUpload 
                        path={`announcements/${profile?.uid}`}
                        label="ارفع صورة جذابة للإعلان"
                        onUploadComplete={(url) => setImageUrl(url)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-50">
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="rounded-xl font-black h-14 px-12 shadow-lg"
                  isLoading={isSubmitting}
                >
                  نشر الإعلان الآن 🚀
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-brand-primary" /></div>
        ) : announcements.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
             <Megaphone className="h-12 w-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-bold">لم تقم بنشر أي إعلانات حتى الآن.</p>
          </div>
        ) : announcements.map((ann) => (
          <Card key={ann.id} className="rounded-[2.5rem] border-none shadow-premium bg-white overflow-hidden group hover:shadow-2xl transition-all h-full flex flex-col">
            {ann.imageUrl && (
              <div className="relative aspect-video overflow-hidden">
                <img src={ann.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={ann.title} />
                <div className="absolute top-4 right-4 bg-brand-primary text-white px-3 py-1 rounded-lg text-[10px] font-black">
                  {GRADES[ann.stage]?.find((g: any) => g.id === ann.grade)?.label}
                </div>
              </div>
            )}
            <CardContent className="p-6 flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest">
                  <Calendar className="h-3 w-3" />
                  {new Date(ann.createdAt).toLocaleDateString('en-US')}
                </div>
                <button 
                  onClick={() => handleDelete(ann.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="text-xl font-black text-slate-800 leading-tight">{ann.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3">{ann.content}</p>
              
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="h-6 w-6 bg-brand-primary/10 rounded-full flex items-center justify-center">
                     <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" />
                   </div>
                   <span className="text-[10px] font-black text-slate-400">نشط حالياً</span>
                </div>
                <span className="text-[10px] font-black text-slate-400 px-2 py-1 bg-slate-50 rounded-lg">
                  {STAGES.find(s => s.id === ann.stage)?.label}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
