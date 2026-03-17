import React, { useState, useEffect } from 'react';
import { Send, User, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { filterContent } from '../../lib/filter';
import { Comment } from '../../types';

interface LessonCommentsProps {
  lessonId: string;
  courseId: string;
  profile: any;
}

export const LessonComments: React.FC<LessonCommentsProps> = ({ lessonId, courseId, profile }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('lessonId', '==', lessonId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [lessonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!filterContent(newComment)) {
      alert('عذراً، يحتوي تعليقك على كلمات غير لائقة. يرجى تعديله.');
      return;
    }

    try {
      await addDoc(collection(db, 'comments'), {
        lessonId,
        courseId,
        studentId: profile.uid,
        studentName: profile.fullName,
        studentAvatar: profile.photoURL || '',
        content: newComment.trim(),
        createdAt: new Date().toISOString()
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="mt-8 space-y-6 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-premium" dir="rtl">
      <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
        <span className="w-2 h-8 bg-brand-primary rounded-full"></span>
        التعليقات والمناقشات
      </h3>

      <form onSubmit={handleSubmit} className="relative group">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="اكتب تعليقك هنا..."
          className="w-full h-32 p-6 bg-slate-50 border-[3px] border-transparent rounded-[2rem] text-lg font-bold focus:outline-none focus:bg-white focus:border-brand-primary transition-all shadow-inner resize-none text-right"
        />
        <Button
          type="submit"
          disabled={!newComment.trim()}
          className="absolute left-4 bottom-4 bg-brand-primary text-white p-4 rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-105 transition-transform"
        >
          <Send className="h-6 w-6 rotate-180" />
        </Button>
      </form>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-slate-400 font-bold">جاري تحميل التعليقات...</p>
        ) : comments.length === 0 ? (
          <div className="text-center py-10">
            <User className="h-12 w-12 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 font-bold">كن أول من يعلق على هذا الدرس!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 p-6 bg-slate-50 rounded-[2rem] group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-white shadow-sm">
                {comment.studentAvatar ? (
                  <img src={comment.studentAvatar} alt={comment.studentName} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-brand-primary" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-800">{comment.studentName}</h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(comment.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <p className="text-slate-600 font-medium leading-relaxed">{comment.content}</p>
                
                {(profile.uid === comment.studentId || profile.role === 'TEACHER' || profile.role === 'ADMIN') && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-red-400 hover:text-red-600 transition-colors pt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="text-[10px] font-black">حذف</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
