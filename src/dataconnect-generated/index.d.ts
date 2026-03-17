import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AllCoursesData {
  courses: ({
    id: UUIDString;
    title: string;
    description: string;
    difficultyLevel?: string | null;
    category?: string | null;
    imageUrl?: string | null;
    averageRating?: number | null;
    creator?: {
      displayName: string;
      email: string;
    };
  } & Course_Key)[];
}

export interface Course_Key {
  id: UUIDString;
  __typename?: 'Course_Key';
}

export interface CreateLessonData {
  lesson_insert: Lesson_Key;
}

export interface CreateLessonVariables {
  title: string;
  lessonType: string;
  orderIndex: number;
  courseId: UUIDString;
  contentUrl?: string | null;
  textContent?: string | null;
  duration?: number | null;
}

export interface Enrollment_Key {
  id: UUIDString;
  __typename?: 'Enrollment_Key';
}

export interface Lesson_Key {
  id: UUIDString;
  __typename?: 'Lesson_Key';
}

export interface MyEnrollmentsData {
  enrollments: ({
    id: UUIDString;
    enrollmentDate: TimestampString;
    progress: number;
    completionDate?: TimestampString | null;
    lastAccessed?: TimestampString | null;
    course?: {
      title: string;
      category?: string | null;
    };
  } & Enrollment_Key)[];
}

export interface Question_Key {
  id: UUIDString;
  __typename?: 'Question_Key';
}

export interface Quiz_Key {
  id: UUIDString;
  __typename?: 'Quiz_Key';
}

export interface UpdateUserBioData {
  user_update?: User_Key | null;
}

export interface UpdateUserBioVariables {
  bio: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface AllCoursesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<AllCoursesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<AllCoursesData, undefined>;
  operationName: string;
}
export const allCoursesRef: AllCoursesRef;

export function allCourses(): QueryPromise<AllCoursesData, undefined>;
export function allCourses(dc: DataConnect): QueryPromise<AllCoursesData, undefined>;

interface MyEnrollmentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<MyEnrollmentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<MyEnrollmentsData, undefined>;
  operationName: string;
}
export const myEnrollmentsRef: MyEnrollmentsRef;

export function myEnrollments(): QueryPromise<MyEnrollmentsData, undefined>;
export function myEnrollments(dc: DataConnect): QueryPromise<MyEnrollmentsData, undefined>;

interface CreateLessonRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateLessonVariables): MutationRef<CreateLessonData, CreateLessonVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateLessonVariables): MutationRef<CreateLessonData, CreateLessonVariables>;
  operationName: string;
}
export const createLessonRef: CreateLessonRef;

export function createLesson(vars: CreateLessonVariables): MutationPromise<CreateLessonData, CreateLessonVariables>;
export function createLesson(dc: DataConnect, vars: CreateLessonVariables): MutationPromise<CreateLessonData, CreateLessonVariables>;

interface UpdateUserBioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateUserBioVariables): MutationRef<UpdateUserBioData, UpdateUserBioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateUserBioVariables): MutationRef<UpdateUserBioData, UpdateUserBioVariables>;
  operationName: string;
}
export const updateUserBioRef: UpdateUserBioRef;

export function updateUserBio(vars: UpdateUserBioVariables): MutationPromise<UpdateUserBioData, UpdateUserBioVariables>;
export function updateUserBio(dc: DataConnect, vars: UpdateUserBioVariables): MutationPromise<UpdateUserBioData, UpdateUserBioVariables>;

