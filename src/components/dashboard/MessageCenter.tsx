import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageSquare, 
  User, 
  Trash2, 
  Reply, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight,
  MoreVertical,
  Paperclip,
  Search,
  ArrowRight
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { filterContent } from '../../lib/filter';
import { Message } from '../../types';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { cn } from '../../lib/utils';
import { createNotification } from '../../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

export const MessageCenter = ({ preselectedContactId }: { preselectedContactId?: string | null }) => {
  const { profile } = useEducatorsAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'LIST' | 'DETAIL'>('LIST');
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (selectedMessage) {
      scrollToBottom();
    }
  }, [selectedMessage]);

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
      
      const updatedMsg = { 
        ...selectedMessage, 
        reply: replyText.trim(), 
        repliedAt: new Date().toISOString(), 
        status: 'REPLIED' as const 
      };
      setSelectedMessage(updatedMsg);

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
      setSelectedMessage(null);
      setView('LIST');
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);

  useEffect(() => {
    if (!isTeacher && profile?.uid) {
      const fetchEnrolledTeachers = async () => {
        try {
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

  useEffect(() => {
    if (preselectedContactId && isTeacher) {
      setSelectedTeacherId(preselectedContactId);
      setShowNewMessageModal(true);
    }
  }, [preselectedContactId, isTeacher]);

  const selectMessage = (msg: Message) => {
    setSelectedMessage(msg);
    setView('DETAIL');
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/20 shadow-premium">
        <div className="text-right space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            مركز التواصل <MessageSquare className="h-8 w-8 text-brand-primary" />
          </h2>
          <p className="text-slate-500 font-bold italic">
            {isTeacher ? 'إدارة استفسارات الطلاب والتفاعل معهم.' : 'تواصل مباشر مع معلميك ومعالجة الذكاء الاصطناعي.'}
          </p>
        </div>
        {!isTeacher && (
          <Button 
            variant="primary" 
            onClick={() => setShowNewMessageModal(true)}
            className="rounded-2xl px-10 py-5 h-auto font-black shadow-xl shadow-brand-primary/30 hover:scale-105 transition-all text-lg group"
          >
            بدء محادثة جديدة <Send className="mr-2 h-5 w-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[750px] items-stretch">
        {/* Messages List Sidebar */}
        <div className={cn(
          "lg:col-span-1 space-y-6 h-full transition-all duration-300",
          view === 'DETAIL' ? "hidden lg:block" : "block"
        )}>
          <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white/80 backdrop-blur-md h-full flex flex-col border border-white/40">
            <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-800">صندوق الوارد</h3>
              <Search className="h-5 w-5 text-slate-400 cursor-pointer hover:text-brand-primary transition-colors" />
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
              {loading ? (
                <div className="p-10 space-y-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="h-10 w-10 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-black">لا توجد رسائل حالياً.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {messages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => selectMessage(message)}
                      className={cn(
                        "w-full p-6 text-right transition-all hover:bg-slate-50 flex flex-col gap-2 group relative overflow-hidden",
                        selectedMessage?.id === message.id ? "bg-brand-primary/5 border-r-[6px] border-brand-primary" : ""
                      )}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-sm">
                            {(isTeacher ? message.senderName : (teachers.find(t => t.id === message.receiverId)?.fullName || 'ط'))[0]}
                          </div>
                          <span className="font-black text-slate-800 text-lg">
                            {isTeacher ? message.senderName : teachers.find(t => t.id === message.receiverId)?.fullName || 'المعلم'}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                          {new Date(message.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1 font-bold pr-13">{message.content}</p>
                      
                      <div className="flex items-center gap-2 mt-1 pr-13">
                        {message.status === 'REPLIED' ? (
                          <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border border-emerald-100">
                             تم الرد
                          </span>
                        ) : message.status === 'CANCELLED' ? (
                          <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border border-rose-100">
                             ملغاة
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border border-amber-100">
                             قيد المراجعة
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

        {/* Message Content Area */}
        <div className={cn(
          "lg:col-span-2 h-full transition-all duration-300",
          view === 'LIST' ? "hidden lg:block" : "block"
        )}>
          {selectedMessage ? (
            <Card className="rounded-[2.5rem] border-none shadow-premium overflow-hidden bg-white h-full flex flex-col border border-slate-100 relative">
              <CardHeader className="bg-white p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setView('LIST')}
                    className="lg:hidden h-10 w-10 p-0 rounded-xl bg-slate-50"
                  >
                    <ArrowRight className="h-6 w-6" />
                  </Button>
                  <div className="h-12 w-12 bg-brand-primary/10 rounded-[1.2rem] flex items-center justify-center font-black text-brand-primary text-xl shadow-inner">
                    {(isTeacher ? selectedMessage.senderName : 'م')[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{isTeacher ? selectedMessage.senderName : 'تفاصيل المحادثة'}</h3>
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">نشط الآن</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-xl transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-slate-400 p-2.5 rounded-xl">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent 
                ref={scrollRef}
                className="p-8 flex-1 overflow-y-auto space-y-8 bg-[#fdfeff] scroll-smooth"
              >
                <div className="flex flex-col gap-4">
                  <div className="max-w-[85%] self-start space-y-2">
                    <div className="bg-white p-6 rounded-[1.8rem] rounded-tr-none shadow-sm border border-slate-100">
                      <p className="text-slate-700 font-bold leading-relaxed">{selectedMessage.content}</p>
                    </div>
                    <p className="text-[9px] text-slate-400 font-black mr-4 uppercase">
                      {new Date(selectedMessage.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {selectedMessage.reply && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-[85%] self-end space-y-2"
                    >
                      <div className="bg-brand-primary p-6 rounded-[1.8rem] rounded-tl-none shadow-lg shadow-brand-primary/20 text-white">
                        <p className="font-bold flex items-center gap-2 mb-2 text-xs opacity-75">
                           <Reply className="h-4 w-4" /> رد المعلم
                        </p>
                        <p className="font-bold leading-relaxed">{selectedMessage.reply}</p>
                      </div>
                      <p className="text-[9px] text-slate-400 font-black ml-4 uppercase text-left">
                        {new Date(selectedMessage.repliedAt!).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="h-4" />
              </CardContent>

              {/* Chat Input Area */}
              <div className="p-6 bg-white border-t border-slate-50">
                {isTeacher && !selectedMessage.reply && selectedMessage.status === 'PENDING' ? (
                  <form onSubmit={handleReply} className="relative flex items-end gap-3">
                    <div className="flex-1 relative">
                       <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="اكتب ردك هنا..."
                        className="w-full min-h-[60px] max-h-[150px] pr-6 pl-12 py-5 bg-slate-50 border-2 border-transparent rounded-[2rem] text-lg font-bold focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner resize-none text-right placeholder:text-slate-300"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReply(e);
                          }
                        }}
                      />
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        className="absolute left-4 bottom-4 h-10 w-10 p-0 rounded-full text-slate-400 hover:text-brand-primary"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </div>
                    <Button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="h-[60px] w-[60px] bg-brand-primary text-white p-0 rounded-full flex items-center justify-center shadow-xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all shrink-0"
                    >
                      <Send className="h-6 w-6" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-center py-4 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-black text-sm italic">
                      {selectedMessage.status === 'REPLIED' ? 'تم الرد على هذه المحادثة بنجاح.' : 'تم إرسال الرسالة، في انتظار مراجعة المعلم.'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white/50 rounded-[3rem] border-4 border-dashed border-white shadow-inner p-10 text-center">
              <div className="h-32 w-32 bg-white rounded-full flex items-center justify-center shadow-premium mb-6 animate-bounce duration-[3000ms]">
                <MessageSquare className="h-12 w-12 text-brand-primary opacity-50" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">اختر محادثة للبدء</h3>
              <p className="text-slate-400 font-bold max-w-xs">اختر أحد الطلاب أو المعلمين من القائمة اليمنى لعرض سجل المراسلات.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessageModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl"
            >
              <Card className="rounded-[3.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.2)] border-none bg-white">
                <CardHeader className="p-10 border-b border-slate-50 flex items-center justify-between bg-white relative z-10">
                  <h3 className="text-2xl font-black text-slate-800">إرسال استفسار جديد</h3>
                  <button onClick={() => setShowNewMessageModal(false)} className="h-12 w-12 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center transition-colors">
                    <X className="h-6 w-6 text-slate-400" />
                  </button>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                       <User className="h-4 w-4" /> اختر المعلم المستهدف
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full h-18 px-8 bg-slate-50 border-3 border-transparent rounded-[2rem] text-lg font-black focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner appearance-none text-right cursor-pointer"
                    >
                      <option value="">-- اضغط للاختيار --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.fullName} • {t.subject || 'عام'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                       <AlertCircle className="h-4 w-4" /> موضوع الرسالة
                    </label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="اشرح استفسارك بوضوح للمعلم..."
                      className="w-full h-44 p-8 bg-slate-50 border-3 border-transparent rounded-[2.5rem] text-lg font-bold focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner resize-none text-right placeholder:text-slate-300"
                    />
                  </div>

                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !selectedTeacherId}
                    className="w-full h-20 bg-brand-primary text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    إرسال الآن <Send className="h-6 w-6" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
