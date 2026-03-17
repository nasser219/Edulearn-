import { AllCoursesData, MyEnrollmentsData, CreateLessonData, CreateLessonVariables, UpdateUserBioData, UpdateUserBioVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useAllCourses(options?: useDataConnectQueryOptions<AllCoursesData>): UseDataConnectQueryResult<AllCoursesData, undefined>;
export function useAllCourses(dc: DataConnect, options?: useDataConnectQueryOptions<AllCoursesData>): UseDataConnectQueryResult<AllCoursesData, undefined>;

export function useMyEnrollments(options?: useDataConnectQueryOptions<MyEnrollmentsData>): UseDataConnectQueryResult<MyEnrollmentsData, undefined>;
export function useMyEnrollments(dc: DataConnect, options?: useDataConnectQueryOptions<MyEnrollmentsData>): UseDataConnectQueryResult<MyEnrollmentsData, undefined>;

export function useCreateLesson(options?: useDataConnectMutationOptions<CreateLessonData, FirebaseError, CreateLessonVariables>): UseDataConnectMutationResult<CreateLessonData, CreateLessonVariables>;
export function useCreateLesson(dc: DataConnect, options?: useDataConnectMutationOptions<CreateLessonData, FirebaseError, CreateLessonVariables>): UseDataConnectMutationResult<CreateLessonData, CreateLessonVariables>;

export function useUpdateUserBio(options?: useDataConnectMutationOptions<UpdateUserBioData, FirebaseError, UpdateUserBioVariables>): UseDataConnectMutationResult<UpdateUserBioData, UpdateUserBioVariables>;
export function useUpdateUserBio(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateUserBioData, FirebaseError, UpdateUserBioVariables>): UseDataConnectMutationResult<UpdateUserBioData, UpdateUserBioVariables>;
