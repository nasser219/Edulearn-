import React from 'react';
import { ShieldAlert, ShieldCheck, Lock, Eye, AlertTriangle } from 'lucide-react';
import { SecurityMonitor } from '../security/SecurityMonitor';
import { Card, CardContent } from '../ui/Card';

export const Security = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
             </div>
             <h1 className="text-3xl font-black tracking-tight">مركز الأمان والخصوصية 🛡️</h1>
          </div>
          <p className="text-slate-400 font-bold mr-15">مراقبة فورية لأمن المنصة وحماية بيانات المستخدمين</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-white border-none shadow-premium p-8 flex items-center gap-6">
            <div className="h-14 w-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
               <Lock className="h-7 w-7" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تشفير البيانات</p>
               <h3 className="text-xl font-black text-slate-900">نشط (SSL/TLS)</h3>
            </div>
         </Card>
         <Card className="bg-white border-none shadow-premium p-8 flex items-center gap-6">
            <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
               <Eye className="h-7 w-7" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المراقبة الفورية</p>
               <h3 className="text-xl font-black text-slate-900">تعمل بامتياز</h3>
            </div>
         </Card>
         <Card className="bg-white border-none shadow-premium p-8 flex items-center gap-6">
            <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
               <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">محاولات الاختراق</p>
               <h3 className="text-xl font-black text-slate-900">0 (آخر 24 ساعة)</h3>
            </div>
         </Card>
      </div>

      <div className="bg-white rounded-[3rem] shadow-premium overflow-hidden">
        <SecurityMonitor />
      </div>
    </div>
  );
};
