export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  deviceIds: string[];
  isSuspended: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  teacherId: string;
  price: number;
  sections: CourseSection[];
  createdAt: string;
}

export interface CourseSection {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'PDF' | 'QUIZ' | 'HOMEWORK';
  contentUrl?: string; // For Video/PDF
  duration?: string;
  quizId?: string;
  homeworkId?: string;
}

export interface Quiz {
  id: string;
  title: string;
  timeLimit: number; // in minutes
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
  options?: string[];
  correctAnswer?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  progress: number; // 0-100
  completedLessons: string[];
  enrolledAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  courseId: string;
  amount: number;
  method: 'INSTAPAY' | 'VODAFONE_CASH' | 'CARD';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transactionId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  lessonId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  content: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string; // Teacher ID
  courseId?: string;
  content: string;
  reply?: string;
  repliedAt?: string;
  status: 'PENDING' | 'REPLIED' | 'CANCELLED';
  createdAt: string;
}
