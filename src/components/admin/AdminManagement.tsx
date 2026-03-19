import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, setDoc, doc, deleteDoc, getDocs, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  Settings, 
  Users, 
  BookOpen, 
  FileCheck, 
  CreditCard, 
  Megaphone,
  Plus
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { PROTECTED_EMAILS, isProtectedAdmin } from './SuperAdminDashboard';

interface AdminRole {
  id: string; // Email
  role: 'SUPER' | 'MODERATOR';
  permissions: string[];
  addedAt: string;
}

const PERMISSIONS = [
  { id: 'MANAGE_USERS', label: 'إدارة المستخدمين', icon: Users, desc: 'قبول وتفعيل الطلاب والمدرسين' },
  { id: 'MANAGE_COURSES', label: 'إدارة الكورسات', icon: BookOpen, desc: 'إضافة وتعديل محتوى المواد' },
  { id: 'MANAGE_EXAMS', label: 'إدارة الامتحانات', icon: FileCheck, desc: 'التحكم في بنك الأسئلة والنتائج' },
  { id: 'VIEW_REVENUE', label: 'تقارير الأرباح', icon: CreditCard, desc: 'مشاهدة المبيعات والتقارير المالية' },
  { id: 'MANAGE_ADVERTISEMENTS', label: 'إدارة الإعلانات', icon: Megaphone, desc: 'نشر الإعلانات المستهدفة' },
];

export const AdminManagement = () => {
  const [localAdminRoles, setLocalAdminRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'SUPER' | 'MODERATOR'>('MODERATOR');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useEducatorsAuth();

  useEffect(() => {
    return onSnapshot(collection(db, 'admin_roles'), (snap) => {
      setLocalAdminRoles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminRole)));
      setLoading(false);
    });
  }, []);

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // 1. Update/Set the admin role document
      await setDoc(doc(db, 'admin_roles', normalizedEmail), {
        role: selectedRole,
        permissions: selectedRole === 'SUPER' ? PERMISSIONS.map(p => p.id) : selectedPermissions,
        addedAt: new Date().toISOString(),
        addedBy: user?.email
      });

      // 2. Try to find the user and update their global role to 'ADMIN'
      const userQuery = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { role: 'ADMIN' });
      }
      
      setEmail('');
      setSelectedPermissions([]);
      setIsAdding(false);
      alert('تم إضافة الصلاحية وتحديث رتبة الحساب بنجاح! ✅');
    } catch (error) {
      console.error("Error adding admin role:", error);
      alert('حدث خطأ أثناء إضافة الصلاحية.');
    }
  };

  const handleDeleteRole = async (email: string) => {
    if (email === user?.email) {
      alert("لا يمكنك حذف صلاحياتك بنفسك! 🛡️");
      return;
    }
    if (isProtectedAdmin(email)) {
      alert("لا يمكن حذف حساب السوبر أدمن الأساسي! 🛡️");
      return;
    }
    if (!window.confirm(`هل أنت متأكد من سحب الصلاحيات من ${email}؟`)) return;
    
    try {
      await deleteDoc(doc(db, 'admin_roles', email));

      // FIX: Downgrade the user's role to STUDENT in the global users collection
      const userQuery = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { role: 'STUDENT' });
      }

    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
               إدارة الصلاحيات والمشرفين 🛡️
            </h2>
            <p className="text-slate-500 font-bold">تحكم في من يمكنه الوصول لوحة التحكم وما يمكنه فعله</p>
         </div>
         <Button 
            variant={isAdding ? "ghost" : "primary"}
            onClick={() => setIsAdding(!isAdding)}
            className="rounded-2xl font-black h-14 px-8"
         >
            {isAdding ? 'إلغاء' : (
               <>
                  <UserPlus className="h-5 w-5 ml-2" />
                  إضافة مشرف جديد
               </>
            )}
         </Button>
      </div>

      {isAdding && (
         <Card className="rounded-[2.5rem] border-none shadow-premium bg-slate-900 text-white overflow-hidden animate-in slide-in-from-top-4 duration-500">
            <CardContent className="p-10 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <label className="text-sm font-black text-slate-400 mr-2 uppercase tracking-widest">البريد الإلكتروني</label>
                     <Input 
                        placeholder="example@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-16 bg-white/10 border-white/20 text-white rounded-2xl font-bold placeholder:text-slate-600 focus:bg-white/20"
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-sm font-black text-slate-400 mr-2 uppercase tracking-widest">نوع الحساب</label>
                     <div className="flex gap-4">
                        <button 
                           onClick={() => setSelectedRole('MODERATOR')}
                           className={cn(
                              "flex-1 h-16 rounded-2xl font-black transition-all border-2",
                              selectedRole === 'MODERATOR' ? "bg-brand-primary border-brand-primary text-white" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                           )}
                        >
                           مشرف (صلاحيات محددة)
                        </button>
                        <button 
                           onClick={() => setSelectedRole('SUPER')}
                           className={cn(
                              "flex-1 h-16 rounded-2xl font-black transition-all border-2",
                              selectedRole === 'SUPER' ? "bg-amber-500 border-amber-500 text-white" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                           )}
                        >
                           سوبر أدمن (صلاحيات كاملة)
                        </button>
                     </div>
                  </div>
               </div>

               {selectedRole === 'MODERATOR' && (
                  <div className="space-y-6">
                     <label className="text-sm font-black text-slate-400 mr-2 uppercase tracking-widest block">المهام الموكلة (Permissions)</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {PERMISSIONS.map((perm) => (
                           <button
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className={cn(
                                 "p-6 rounded-[2rem] border-2 text-right transition-all group",
                                 selectedPermissions.includes(perm.id) 
                                    ? "bg-white/10 border-brand-primary ring-1 ring-brand-primary" 
                                    : "bg-white/5 border-white/5 hover:bg-white/10"
                              )}
                           >
                              <div className="flex items-center gap-4 mb-3">
                                 <div className={cn(
                                    "p-2.5 rounded-xl transition-colors",
                                    selectedPermissions.includes(perm.id) ? "bg-brand-primary text-white" : "bg-white/10 text-slate-400"
                                 )}>
                                    <perm.icon className="h-5 w-5" />
                                 </div>
                                 <span className={cn(
                                    "font-black text-lg",
                                    selectedPermissions.includes(perm.id) ? "text-white" : "text-slate-300"
                                 )}>{perm.label}</span>
                                 {selectedPermissions.includes(perm.id) && <CheckCircle2 className="h-5 w-5 mr-auto text-brand-primary" />}
                              </div>
                              <p className="text-xs font-bold text-slate-500 leading-relaxed pr-2">{perm.desc}</p>
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               <div className="pt-6 border-t border-white/10 flex justify-end">
                  <Button 
                     onClick={handleAddRole}
                     size="lg"
                     className="bg-brand-primary h-14 px-12 rounded-2xl font-black shadow-2xl shadow-brand-primary/20"
                  >
                     حفظ وإضافة الآن 🚀
                  </Button>
               </div>
            </CardContent>
         </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {/* عرض السوبر أدمن الأساسيين (أصحاب النظام المحميين) الثابتين في الكود */}
         {PROTECTED_EMAILS.map((protectedEmail) => (
            <Card key={`protected-${protectedEmail}`} className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 group hover:shadow-2xl transition-all overflow-hidden h-full flex flex-col relative text-white">
                <div className="absolute -top-10 -right-10 h-32 w-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <CardContent className="p-8 space-y-6 flex-1 flex flex-col relative z-10">
                   <div className="flex items-center justify-between">
                      <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
                         مالك النظام الأساسي 👑
                      </div>
                      <ShieldCheck className="h-5 w-5 text-amber-400" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-lg font-black text-white break-all">{protectedEmail}</p>
                      <p className="text-xs font-bold text-slate-400">حساب محمي (لا يمكن حذفه)</p>
                   </div>
                   <div className="space-y-3 pt-4 border-t border-white/10 flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">الصلاحيات الممنوحة</p>
                      <div className="w-full p-4 rounded-2xl bg-amber-500/10 text-amber-400 font-black text-xs text-center border border-amber-500/20 italic">
                         يملك كافة صلاحيات التحكم القصوى
                      </div>
                   </div>
                </CardContent>
            </Card>
         ))}

         {/* عرض المشرفين المضافين والديناميكيين */}
         {loading ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold">جاري تحميل المشرفين...</div>
         ) : localAdminRoles.filter(admin => !isProtectedAdmin(admin.id)).map((admin) => (
            <Card key={admin.id} className="rounded-[2.5rem] border-none shadow-premium bg-white group hover:shadow-2xl transition-all overflow-hidden h-full flex flex-col">
               <CardContent className="p-8 space-y-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                     <div className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        admin.role === 'SUPER' ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"
                     )}>
                        {admin.role === 'SUPER' ? 'سوبر أدمن 👑' : 'مشرف منصة 🛠️'}
                     </div>
                     <button 
                        onClick={() => handleDeleteRole(admin.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                     >
                        <Trash2 className="h-5 w-5" />
                     </button>
                  </div>

                  <div className="space-y-1">
                     <p className="text-lg font-black text-slate-900 break-all">{admin.id}</p>
                     <p className="text-xs font-bold text-slate-400">انضم {new Date(admin.addedAt).toLocaleDateString('ar-EG')}</p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-50 flex-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">الصلاحيات الممنوحة</p>
                     <div className="flex flex-wrap gap-2">
                        {admin.role === 'SUPER' ? (
                           <div className="w-full p-4 rounded-2xl bg-amber-50 text-amber-700 font-black text-xs text-center border border-amber-100 italic">
                             يملك كافة صلاحيات التحكم بالمنصة
                           </div>
                        ) : admin.permissions.length > 0 ? (
                           admin.permissions.map(pId => {
                              const perm = PERMISSIONS.find(p => p.id === pId);
                              return perm ? (
                                 <div key={pId} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl text-[10px] font-black text-slate-600 border border-slate-100">
                                    <perm.icon className="h-3 w-3 text-indigo-500" />
                                    {perm.label}
                                 </div>
                              ) : null;
                           })
                        ) : (
                           <p className="text-xs font-bold text-red-400 italic">لم يتم تحديد صلاحيات</p>
                        )}
                     </div>
                  </div>
               </CardContent>
            </Card>
         ))}
      </div>
    </div>
  );
};
