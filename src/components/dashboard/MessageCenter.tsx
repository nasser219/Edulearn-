import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, User, Trash2, Reply, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { filterContent } from '../../lib/filter';
import { Message } from '../../types';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { cn } from '../../lib/utils';
import { createNotification } from '../../hooks/useNotifications';

export const MessageCenter = ({ preselectedContactId }: { preselectedContactId?: string | null }) => {
  const { profile } = useEducatorsAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);

  const isTeacher = profile?.role === 'TEACHER' || profile?.role === 'ADMIN';

  useEffect(() => {
    if (!profile?.uid) return;

    const q = isTeacher 
      ? query(collection(db, 'messages'), where('receiverId', '==', profile.uid), orderBy('createdAt', 'desc'))
      : query(collection(db, 'messages'), where('senderId', '==', profile.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, isTeacher]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTeacherId) return;

    if (!filterContent(newMessage)) {
      alert('عذراً، تحتوي رسالتك على كلمات غير لائقة. يرجى تعديله.');
      return;
    }

    try {
      if (!profile?.uid) return;
      await addDoc(collection(db, 'messages'), {
        senderId: profile.uid,
        senderName: profile.fullName || 'User',
        receiverId: selectedTeacherId,
        content: newMessage.trim(),
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
      setShowNewMessageModal(false);

      // Add In-App Notification for Receiver
      const receiverName = teachers.find(t => t.id === selectedTeacherId)?.fullName || 'معلم';
      await createNotification({
        userId: selectedTeacherId,
        title: 'رسالة جديدة 📨',
        message: `لقد استلمت رسالة جديدة من الطالب: ${profile?.fullName || 'طالب'}`,
        type: 'MESSAGE',
        senderName: profile?.fullName,
        link: 'MESSAGES'
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    try {
      await updateDoc(doc(db, 'messages', selectedMessage.id), {
        reply: replyText.trim(),
        repliedAt: new Date().toISOString(),
        status: 'REPLIED'
      });
      setReplyText('');
      setSelectedMessage(null);

      // Add In-App Notification for Student
      await createNotification({
        userId: selectedMessage.senderId,
        title: 'تم الرد على رسالتك! 📩',
        message: `لقد رد المعلم "${profile?.fullName || 'المعلم'}" على رسالتك: "${selectedMessage.content.substring(0, 30)}..."`,
        type: 'MESSAGE',
        senderName: profile?.fullName,
        link: 'MESSAGES'
      });
    } catch (error) {
      console.error('Error replying to message:', error);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleCancel = async (messageId: string) => {
    if (!window.confirm('هل تريد إلغاء هذه الرسالة؟')) return;
    try {
      await updateDoc(doc(db, 'messages', messageId), { status: 'CANCELLED' });
    } catch (error) {
      console.error('Error cancelling message:', error);
    }
  };

  // State for student to select a teacher (simplified for now)
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);

  useEffect(() => {
    if (!isTeacher && profile?.uid) {
      // Fetch teachers for students to message - ONLY for enrolled courses
      const fetchEnrolledTeachers = async () => {
        try {
          // 1. Get Enrollments
          const enrollQ = query(
            collection(db, 'enrollments'), 
            where('studentId', '==', profile.uid),
            where('status', '==', 'APPROVED')
          );
          const enrollSnap = await getDocs(enrollQ);
          const courseIds = enrollSnap.docs.map(doc => doc.data().courseId);

          if (courseIds.length === 0) {
            setTeachers([]);
            return;
          }

          // 2. Get Course Teacher IDs
          // Firestore 'in' query limited to 10. For more, we'd need batching.
          const coursesQ = query(
            collection(db, 'courses'), 
            where('__name__', 'in', courseIds.slice(0, 10))
          );
          const coursesSnap = await getDocs(coursesQ);
          const teacherIds = Array.from(new Set(coursesSnap.docs.map(doc => doc.data().teacherId).filter(Boolean)));

          if (teacherIds.length === 0) {
            setTeachers([]);
            return;
          }

          // 3. Get Teacher Profiles
          const teachersQ = query(
            collection(db, 'users'), 
            where('role', '==', 'TEACHER'),
            where('__name__', 'in', teacherIds.slice(0, 10))
          );
          
          const unsubscribe = onSnapshot(teachersQ, (snapshot) => {
            setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });
          return unsubscribe;
        } catch (error) {
          console.error("Error fetching enrolled teachers:", error);
        }
      };
      fetchEnrolledTeachers();
    }
  }, [isTeacher, profile]);

  // 3. Handle preselected contact
  useEffect(() => {
    if (preselectedContactId && isTeacher) {
      // For teachers, we want to find the student in messages or just start a new thread
      // But for now, we'll use it to filter/select if possible.
      // If we're a teacher and have a contactId, it's likely a student we want to message.
      setSelectedTeacherId(preselectedContactId); // Reusing variable name for destination
      setShowNewMessageModal(true);
    }
  }, [preselectedContactId, isTeacher]);

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      <div className="flex items-center justify-between px-2">
        <div className="text-right space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">مركز الرسائل</h2>
          <p className="text-slate-500 font-bold italic">
            {isTeacher ? 'تواصل مع طلابك ورد على استفساراتهم.' : 'أرسل أسئلتك لمعلميك وتابع الردود.'}
          </p>
        </div>
        {!isTeacher && (
          <Button 
            variant="primary" 
            onClick={() => setShowNewMessageModal(true)}
            className="rounded-2xl px-8 py-4 h-auto font-black shadow-lg shadow-brand-primary/30 flex items-center gap-2"
          >
            رسالة جديدة
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white h-[600px] flex flex-col">
            <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-50">
              <h3 className="font-black text-lg text-slate-800">قائمة الرسائل</h3>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {loading ? (
                <p className="p-10 text-center font-bold text-slate-400">جاري التحميل...</p>
              ) : messages.length === 0 ? (
                <div className="p-10 text-center">
                  <MessageSquare className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 font-bold">لا توجد رسائل حالياً.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {messages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => setSelectedMessage(message)}
                      className={cn(
                        "w-full p-6 text-right transition-all hover:bg-slate-50 flex flex-col gap-2",
                        selectedMessage?.id === message.id ? "bg-brand-primary/5 border-r-4 border-brand-primary" : ""
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800">
                          {isTeacher ? message.senderName : `إلى: ${teachers.find(t => t.id === message.receiverId)?.fullName || 'المعلم'}`}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(message.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1 font-medium">{message.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {message.status === 'REPLIED' ? (
                          <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> تم الرد
                          </span>
                        ) : message.status === 'CANCELLED' ? (
                          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1">
                            <X className="h-3 w-3" /> ملغاة
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> قيد الانتظار
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white h-[600px] flex flex-col">
              <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800">{isTeacher ? selectedMessage.senderName : 'تفاصيل الرسالة'}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">تاريخ الإرسال: {new Date(selectedMessage.createdAt).toLocaleString('ar-EG')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 flex-1 overflow-y-auto space-y-8">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 max-w-[80%]">
                  <p className="text-slate-800 font-bold mb-2">الرسالة:</p>
                  <p className="text-slate-600 font-medium leading-relaxed">{selectedMessage.content}</p>
                </div>

                {selectedMessage.reply && (
                  <div className="bg-brand-primary/5 p-6 rounded-[2rem] border border-brand-primary/10 mr-auto max-w-[80%]">
                    <p className="text-brand-primary font-black mb-2 flex items-center gap-2">
                      <Reply className="h-4 w-4" /> رد المعلم:
                    </p>
                    <p className="text-slate-600 font-medium leading-relaxed">{selectedMessage.reply}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-2">تاريخ الرد: {new Date(selectedMessage.repliedAt!).toLocaleString('ar-EG')}</p>
                  </div>
                )}

                {isTeacher && !selectedMessage.reply && selectedMessage.status === 'PENDING' && (
                  <form onSubmit={handleReply} className="mt-8 space-y-4">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب ردك هنا..."
                      className="w-full h-32 p-6 bg-slate-50 border-[3px] border-transparent rounded-[2rem] text-lg font-bold focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner resize-none text-right"
                    />
                    <Button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="w-full bg-brand-primary text-white py-6 rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all"
                    >
                      إرسال الرد 🚀
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <MessageSquare className="h-20 w-20 text-slate-200 mb-4" />
              <h3 className="text-xl font-black text-slate-400">اختر رسالة لعرض تفاصيلها</h3>
            </div>
          )}
        </div>
      </div>

      {showNewMessageModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800">إرسال رسالة جديدة</h3>
              <button onClick={() => setShowNewMessageModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 mr-2 uppercase tracking-widest">اختر المعلم</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-16 px-6 bg-slate-50 border-[3px] border-transparent rounded-3xl text-lg font-bold focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner appearance-none text-right"
                >
                  <option value="">-- اختر من القائمة --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName} ({t.subject || 'عام'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 mr-2 uppercase tracking-widest">الرسالة</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="اكتب رسالتك بوضوح..."
                  className="w-full h-40 p-6 bg-slate-50 border-[3px] border-transparent rounded-3xl text-lg font-bold focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner resize-none text-right"
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !selectedTeacherId}
                className="w-full h-16 bg-brand-primary text-white rounded-2xl font-black text-xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all"
              >
                إرسال الآن ✨
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
