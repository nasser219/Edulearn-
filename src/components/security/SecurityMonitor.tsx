import { ShieldAlert, User, Clock, MapPin, Monitor, Ban, FileSearch, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useEffect, useState } from 'react';
import { subscribeToSecurityLogs, SecurityEvent } from '../../lib/security';

export const SecurityMonitor = () => {
  const [logs, setLogs] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSecurityLogs((data) => {
      setLogs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'الآن';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-600" />
          مراقب الأمن ومكافحة القرصنة
        </h2>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">النظام متصل</div>
          <div className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">نظام الحماية نشط</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل سجلات الأمان...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            لا توجد تنبيهات أمنية حالياً ✨
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="animate-in slide-in-from-top-4 duration-500">
              <Card className={log.severity === 'critical' ? 'border-red-200 bg-red-50/30' : ''}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${
                      log.severity === 'critical' ? 'bg-red-100 text-red-600 box-shadow-red' : 
                      log.status === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{log.event}</p>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          log.severity === 'critical' ? 'bg-red-600 text-white' : 
                          log.severity === 'high' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-white'
                        }`}>
                          {log.severity === 'critical' ? 'حرج' : log.severity === 'high' ? 'عالي' : 'متوسط'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-bold text-slate-700"><User className="h-3 w-3 ml-1" /> {log.userName}</span>
                        <span className="flex items-center gap-1"><Monitor className="h-3 w-3 ml-1" /> {log.ip}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3 ml-1" /> {log.location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 ml-1" /> {formatTime(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold hover:bg-slate-50 flex items-center gap-2">
                        <FileSearch className="h-3 w-3" /> عرض السجلات
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-bold hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-200">
                        <Ban className="h-3 w-3" /> حظر المستخدم
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
