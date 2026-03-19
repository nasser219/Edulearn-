import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { getStageLabel, getGradeLabel } from '../../lib/constants';

export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  fullName: string;
  phone: string;
  fatherPhone?: string;
  stage?: string;
  stageLabel?: string;
  grade?: string;
  gradeLabel?: string;
  stages?: string[];
  grades?: string[];
  nationalId?: string;
  parentPhone?: string;
  address?: string;
  schoolName?: string;
  isApproved: boolean;
  paymentInfo?: {
    instapay?: string;
    vodafoneCash?: string;
    bankAccount?: string;
    whatsapp?: string;
  };
  subject?: string;
  entranceCode?: string | null;
  isProfileComplete: boolean;
  isSuspended: boolean;
  enrolledCourses: string[];
  photoURL?: string;
  points?: number;
  gems?: number;
  bio?: string;
  whatsappEmail?: string;
  whatsappPassword?: string;
  whatsappToken?: string;
  whatsappTemplateSubscription?: string;
  whatsappTemplateNewCourse?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  completeProfile: (data: UserProfile) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
  isStudent: () => boolean;
  hasRole: (roles: ('STUDENT' | 'TEACHER' | 'ADMIN')[]) => boolean;
  hasPermission: (permission: string) => boolean;
  allAdminRoles: Record<string, { role: 'SUPER' | 'MODERATOR', permissions: string[] }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Safety timeout: If auth takes more than 4 seconds, force stop loading
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization timed out (4s). Forcing UI load for diagnostics.");
        setLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If we have a user, start/stay in loading state while we get the profile
      if (firebaseUser) {
        setLoading(true);
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Add descriptive labels
            const enrichedProfile = {
              ...data,
              stageLabel: getStageLabel(data.stage),
              gradeLabel: getGradeLabel(data.grade)
            };
            setProfile(enrichedProfile);
          } else {
            console.log("No profile found for user:", firebaseUser.uid);
            setProfile(null);
          }
        } catch (error: any) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
          if (error.message?.includes('Database') || error.message?.includes('not found')) {
            setAuthError("عذراً، قاعدة البيانات غير مفعلة حالياً. يرجى مراجعة المسؤول.");
          }
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const getStageLabelLocal = (stage?: string) => getStageLabel(stage);
  const getGradeLabelLocal = (grade?: string) => getGradeLabel(grade);
/* Removed old switch/object maps as they are now in constants.ts */

  const [allAdminRoles, setAllAdminRoles] = useState<Record<string, { role: 'SUPER' | 'MODERATOR', permissions: string[] }>>({});

  useEffect(() => {
    return onSnapshot(collection(db, 'admin_roles'), (snap: any) => {
      const roles: any = {};
      snap.forEach((doc: any) => {
        roles[doc.id.toLowerCase()] = doc.data();
      });
      setAllAdminRoles(roles);
    });
  }, []);

  const login = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed (Code):", error.code);
      console.error("Login failed (Message):", error.message);
      setAuthError(error.message || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (error: any) {
      console.error("Email login failed:", error.code);
      setAuthError(error.code === 'auth/invalid-credential' ? 'بيانات الدخول غير صحيحة.' : 'فشل تسجيل الدخول.');
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signup = async (email: string, password: string, role: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      // Store the role in session storage temporarily to persist across the initial auth event
      sessionStorage.setItem('pending_role', role);
      await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (error: any) {
      console.error("Signup failed:", error.code);
      setAuthError(error.code === 'auth/email-already-in-use' ? 'هذا البريد مستخدم بالفعل.' : 'فشل إنشاء الحساب.');
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const completeProfile = async (data: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', data.uid), data);
      const enrichedProfile = {
        ...data,
        stageLabel: getStageLabel(data.stage),
        gradeLabel: getGradeLabel(data.grade)
      };
      setProfile(enrichedProfile);
    } catch (error) {
      console.error("Error completing profile:", error);
      throw error;
    }
  };

  const updateProfileLocal = async (data: Partial<UserProfile>) => {
    if (!profile?.uid) return;
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', profile.uid), data);
      
      setProfile(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...data };
        return {
          ...updated,
          stageLabel: getStageLabel(updated.stage),
          gradeLabel: getGradeLabel(updated.grade)
        };
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const isAdmin = () => {
    const userEmailNormalized = (user?.email || profile?.email)?.trim().toLowerCase();
    if (!userEmailNormalized) return profile?.role === 'ADMIN';
    
    // Hardcoded safety for the main developer/owner just in case
    const ownerEmails = ['ayaayad147258@gmail.com', 'nasseryasser832000@gmail.com', 'admin@edu.com'];
    if (ownerEmails.includes(userEmailNormalized)) return true;

    const adminData = allAdminRoles[userEmailNormalized];
    return profile?.role === 'ADMIN' || !!adminData || false;
  };

  const hasPermission = (permission: string) => {
    const userEmailNormalized = (user?.email || profile?.email)?.trim().toLowerCase();
    
    // 1. Owners get universal access
    const ownerEmails = ['ayaayad147258@gmail.com', 'nasseryasser832000@gmail.com', 'admin@edu.com'];
    if (userEmailNormalized && ownerEmails.includes(userEmailNormalized)) return true;

    if (!userEmailNormalized) return false;

    // 2. Fetch specific dynamic admin permissions
    const adminData = allAdminRoles[userEmailNormalized];
    
    // 3. SUPER admins get universal access automatically
    if (adminData?.role === 'SUPER') return true;

    // 4. Moderators must explicitly have the permission
    return adminData?.permissions?.includes(permission) || false;
  };

  const isTeacher = () => profile?.role === 'TEACHER';
  const isStudent = () => profile?.role === 'STUDENT';
  const hasRole = (roles: ('STUDENT' | 'TEACHER' | 'ADMIN')[]) => {
    if (isAdmin()) return true; 
    return profile ? roles.includes(profile.role) : false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isLoggingIn, 
      authError, 
      login, 
      loginWithEmail,
      signup,
      logout,
      completeProfile,
      updateProfile: updateProfileLocal,
      isAdmin,
      isTeacher,
      isStudent,
      hasRole,
      hasPermission,
      allAdminRoles
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useEducatorsAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useEducatorsAuth must be used within an AuthProvider');
  }
  return context;
};
