import { useState, useEffect } from 'react';
import { Search, Filter, Users } from 'lucide-react';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { TeacherCard } from './TeacherCard';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { getFormattedStages } from '../../lib/constants';

interface TeacherData {
  id: string;
  fullName: string;
  subject: string;
  photoURL?: string;
  stages?: string[];
  grades?: string[];
  role: string;
}

export const TeachersList = ({ onSelectTeacher }: { onSelectTeacher: (teacherId: string) => void }) => {
  const { profile, isAdmin } = useEducatorsAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherCourseCounts, setTeacherCourseCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'TEACHER'));
    
    // 1. Fetch Teachers
    const unsubscribe = onSnapshot(q, (snap) => {
      const teachersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherData));
      setTeachers(teachersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teachers:", error);
      setLoading(false);
    });

    // 2. Fetch Course Counts (Independently for performance)
    const fetchCounts = async () => {
      try {
        const counts: Record<string, number> = {};
        const coursesSnap = await getDocs(collection(db, 'courses'));
        coursesSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.teacherId) {
            counts[data.teacherId] = (counts[data.teacherId] || 0) + 1;
          }
        });
        setTeacherCourseCounts(counts);
      } catch (err) {
        console.error("Error fetching course counts:", err);
      }
    };
    fetchCounts();

    return () => unsubscribe();
  }, []);

  const filteredTeachers = teachers.filter(teacher => {
    // 1. Student-specific filtering (Stage & Grade)
    // ONLY filter if the user is a STUDENT and has a complete profile
    if (profile?.role === 'STUDENT' && profile.isProfileComplete && !isAdmin()) {
      const teacherStages = Array.isArray(teacher.stages) ? teacher.stages : [];
      const teacherGrades = Array.isArray(teacher.grades) ? teacher.grades : [];
      
      const isRelevant = 
        (profile.stage && teacherStages.includes(profile.stage)) || 
        (profile.grade && teacherGrades.includes(profile.grade));
      
      if (!isRelevant) return false;
    }

    // 2. Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      teacher.fullName?.toLowerCase().includes(searchLower) ||
      teacher.subject?.toLowerCase().includes(searchLower);
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-12 w-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight text-right">
          {profile?.gradeLabel ? `مدرسو ${profile.gradeLabel}` : 'مدرسو المنصة'} 🎓
        </h2>
        <p className="text-slate-500 font-bold text-right">
          {profile?.stageLabel ? `تصفح أشهر المعلمين لـ ${profile.stageLabel}` : 'اكتشف أفضل المعلمين في جميع التخصصات'}
        </p>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-premium bg-white p-2 text-right">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن معلم أو مادة..." 
              className="pr-12 h-14 bg-slate-50 border-transparent rounded-2xl text-base focus:bg-white focus:ring-brand-primary/10 transition-all font-bold text-right" 
            />
          </div>
          <Button variant="outline" className="h-14 px-6 rounded-2xl border-slate-100 font-black flex items-center gap-2 hover:bg-slate-50">
            <Filter className="h-5 w-5" />
            تصفية النتائج
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTeachers.map((teacher) => (
          <TeacherCard 
            key={teacher.id}
            id={teacher.id}
            name={teacher.fullName}
            subject={teacher.subject}
            photoURL={teacher.photoURL}
            coursesCount={teacherCourseCounts[teacher.id] || 0}
            onClick={() => onSelectTeacher(teacher.id)}
            formattedStages={getFormattedStages(teacher.stages)}
          />
        ))}
      </div>

      {filteredTeachers.length === 0 && (
        <div className="text-center py-20 space-y-4 bg-white rounded-[3rem] shadow-premium">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <Users className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800">لا يوجد مدرسون حالياً</h3>
            <p className="text-slate-400 font-bold">عفواً، لم نجد معلمين يطابقون بحثك أو صفك الدراسي حالياً.</p>
          </div>
        </div>
      )}
    </div>
  );
};
