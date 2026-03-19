import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Calendar, 
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
  X,
  Loader2,
  Users,
  Target,
  Clock
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { STAGES, GRADES } from '../../lib/constants';
import { FileUpload } from '../ui/FileUpload';
import { cn } from '../../lib/utils';

export const AdminAnnouncements = () => {
  const { profile, user, hasPermission } = useEducatorsAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const isSuperAdmin = hasPermission('MANAGE_ADVERTISEMENTS');

  useEffect(() => {
    const qAll = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(qAll, (snap) => {
      // Filter only those created by an admin or marked as global for this view
      const allAnn = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Focus on admin announcements only
      setAnnouncements(allAnn.filter((a: any) => a.isAdminAnn === true));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'STUDENT' | 'TEACHER' | 'ALL'>('ALL');
  const [stage, setStage] = useState('');
  const [grade, setGrade] = useState('');
  const [mediaType, setMediaType] = useState<'NONE' | 'IMAGE' | 'VIDEO'>('NONE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [showOnLogin, setShowOnLogin] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert('عذراً، لا تملك صلاحية نشر الإعلانات. يرجى مراجعة المسؤول.');
      return;
    }
    if (!title || !content) {
      alert('الرجاء إدخال العنوان والمحتوى.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title || '',
        content: content || '',
        targetRole: targetRole || 'ALL',
        stage: targetRole === 'STUDENT' ? (stage || '') : '',
        grade: targetRole === 'STUDENT' ? (grade || '') : '',
        mediaType: mediaType || 'NONE',
        mediaUrl: mediaUrl || '',
        isAdminAnn: true,
        isGlobal: true,
        creatorId: user?.uid || profile?.uid || 'system-admin',
        creatorName: profile?.fullName || user?.displayName || 'الإدارة',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt || null,
        showOnLogin: showOnLogin || false
      });
      
      // Reset form
      setTitle('');
      setContent('');
      setTargetRole('ALL');
      setStage('');
      setGrade('');
      setMediaType('NONE');
      setMediaUrl('');
      setExpiresAt('');
      setShowOnLogin(false);
      setIsAdding(false);
    } catch (error: any) {
      console.error("Error adding announcement:", error);
      alert(`حدث خطأ أثناء إضافة الإعلان: ${error.message || 'خطأ غير معروف'}`);
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
             إدارة الإعلانات المستهدفة <Megaphone className="h-8 w-8 text-brand-primary" />
          </h2>
          <p className="text-slate-500 font-bold">قم بنشر إعلانات تظهر للطلاب أو المدرسين أو للجميع</p>
        </div>
        {isSuperAdmin && !isAdding && (
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
             <h3 className="text-xl font-black">تفاصيل الإعلان <Target className="h-5 w-5 inline ml-2 text-brand-primary" /></h3>
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
                      placeholder="عنوان جذاب للإعلان" 
                      className="rounded-2xl h-14 bg-slate-50 border-none font-bold"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">محتوى الإعلان</label>
                    <textarea 
                      placeholder="اكتب تفاصيل الإعلان هنا..." 
                      className="w-full h-32 rounded-2xl bg-slate-50 border-none p-4 font-bold text-sm outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all resize-none shadow-inner"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">استهداف الفئة</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                      {(['ALL', 'STUDENT', 'TEACHER'] as const).map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setTargetRole(role)}
                          className={cn(
                            "h-10 rounded-xl text-xs font-black transition-all",
                            targetRole === role ? "bg-brand-primary text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {role === 'ALL' ? 'للجميع' : role === 'STUDENT' ? 'طلاب' : 'معلمين'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {targetRole === 'STUDENT' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">المرحلة (اختياري)</label>
                        <select 
                          className="w-full h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold"
                          value={stage}
                          onChange={(e) => {
                            setStage(e.target.value);
                            setGrade('');
                          }}
                        >
                          <option value="">كل المراحل</option>
                          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">الصف (اختياري)</label>
                        <select 
                          className="w-full h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold disabled:opacity-50"
                          value={grade}
                          disabled={!stage}
                          onChange={(e) => setGrade(e.target.value)}
                        >
                          <option value="">كل الصفوف</option>
                          {stage && GRADES[stage]?.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">نوع المرفق</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['NONE', 'IMAGE', 'VIDEO'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setMediaType(type);
                            setMediaUrl('');
                          }}
                          className={cn(
                            "h-12 rounded-xl flex items-center justify-center gap-2 font-black text-xs border-2 transition-all",
                            mediaType === type ? "border-brand-primary bg-brand-primary/5 text-brand-primary" : "border-slate-50 bg-white text-slate-400 hover:border-slate-200"
                          )}
                        >
                          {type === 'NONE' ? <X className="h-4 w-4" /> : type === 'IMAGE' ? <ImageIcon className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />}
                          {type === 'NONE' ? 'بدون' : type === 'IMAGE' ? 'صورة' : 'فيديو'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {mediaType !== 'NONE' && (
                    <div className="space-y-2 animate-in slide-in-from-bottom-2">
                      <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">
                        {mediaType === 'IMAGE' ? 'صورة الإعلان' : 'فيديو الإعلان'}
                      </label>
                      {mediaUrl ? (
                         <div className="relative rounded-2xl overflow-hidden aspect-video group border-2 border-brand-primary/20">
                            {mediaType === 'IMAGE' ? (
                               <img src={mediaUrl} className="w-full h-full object-cover" />
                            ) : (
                               <video src={mediaUrl} className="w-full h-full object-cover" controls />
                            )}
                            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" className="bg-white/80 h-10 w-10 p-0 rounded-full text-red-500 hover:bg-white" onClick={() => setMediaUrl('')}>
                                <X className="h-5 w-5" />
                              </Button>
                            </div>
                         </div>
                      ) : (
                        <FileUpload 
                          path={`announcements-admin/${mediaType.toLowerCase()}`}
                          label={mediaType === 'IMAGE' ? "رفع صورة إعلانية" : "رفع فيديو إعلاني"}
                          onUploadComplete={(url) => setMediaUrl(url)}
                        />
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">تاريخ الانتهاء (اختياري)</label>
                      <Input 
                        type="date"
                        className="rounded-2xl h-14 bg-slate-50 border-none font-bold"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400 font-bold mr-2">سيختفي الإعلان تلقائياً بعد هذا التاريخ</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-sm font-black text-slate-700">عرض في صفحة الدخول</label>
                        <p className="text-[10px] text-slate-400 font-bold">تثبيت كإعلان ترويجي للمنصة</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={showOnLogin}
                        onChange={(e) => setShowOnLogin(e.target.checked)}
                        className="h-6 w-6 rounded-lg accent-brand-primary cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-50">
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="rounded-2xl font-black h-14 px-12 shadow-xl bg-brand-primary text-white"
                  isLoading={isSubmitting}
                >
                  نشر الإعلان المستهدف الآن 🚀
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
             <p className="text-slate-400 font-bold">لا يوجد إعلانات من الإدارة حالياً.</p>
          </div>
        ) : announcements.map((ann) => (
          <Card key={ann.id} className="rounded-[2.5rem] border-none shadow-premium bg-white overflow-hidden group hover:shadow-2xl transition-all h-full flex flex-col">
            <div className="relative">
              {ann.mediaType === 'IMAGE' && ann.mediaUrl && (
                <div className="aspect-video overflow-hidden">
                  <img src={ann.mediaUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={ann.title} />
                </div>
              )}
              {ann.mediaType === 'VIDEO' && ann.mediaUrl && (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <VideoIcon className="h-12 w-12 text-white/50" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                       <VideoIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              )}
              {!ann.mediaUrl && (
                <div className="aspect-video bg-slate-50 flex items-center justify-center">
                  <Megaphone className="h-12 w-12 text-slate-200" />
                </div>
              )}
              
              <div className="absolute top-4 right-4 flex gap-2">
                <div className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black text-white shadow-lg",
                  ann.targetRole === 'ALL' ? "bg-brand-primary" : ann.targetRole === 'STUDENT' ? "bg-blue-500" : "bg-orange-500"
                )}>
                  {ann.targetRole === 'ALL' ? 'للجميع' : ann.targetRole === 'STUDENT' ? 'طلاب' : 'معلمين'}
                </div>
                {ann.grade && (
                   <div className="bg-white/90 backdrop-blur-sm text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black shadow-sm">
                      {ann.grade}
                   </div>
                )}
                {ann.showOnLogin && (
                   <div className="bg-brand-mint text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-lg flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      معروض بالدخول
                   </div>
                )}
                {ann.expiresAt && (
                   <div className={cn(
                     "px-3 py-1 rounded-lg text-[10px] font-black shadow-lg flex items-center gap-1",
                     new Date(ann.expiresAt) < new Date() ? "bg-red-500 text-white" : "bg-slate-700 text-white"
                   )}>
                      <Clock className="h-3 w-3" />
                      {new Date(ann.expiresAt) < new Date() ? 'منتهي' : `ينتهي ${new Date(ann.expiresAt).toLocaleDateString('ar-EG')}`}
                   </div>
                )}
              </div>
            </div>

            <CardContent className="p-6 flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest">
                  <Calendar className="h-3 w-3" />
                  {new Date(ann.createdAt).toLocaleDateString('ar-EG')}
                </div>
                {isSuperAdmin && (
                  <button 
                    onClick={() => handleDelete(ann.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <h3 className="text-xl font-black text-slate-800 leading-tight">{ann.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3">{ann.content}</p>
              
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="h-6 w-6 bg-brand-primary/10 rounded-full flex items-center justify-center">
                     <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" />
                   </div>
                   <span className="text-[10px] font-black text-slate-400">إعلان من الإدارة 👑</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
