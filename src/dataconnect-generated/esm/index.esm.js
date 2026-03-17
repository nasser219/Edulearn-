import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'edu',
  location: 'us-east4'
};

export const allCoursesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AllCourses');
}
allCoursesRef.operationName = 'AllCourses';

export function allCourses(dc) {
  return executeQuery(allCoursesRef(dc));
}

export const myEnrollmentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'MyEnrollments');
}
myEnrollmentsRef.operationName = 'MyEnrollments';

export function myEnrollments(dc) {
  return executeQuery(myEnrollmentsRef(dc));
}

export const createLessonRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateLesson', inputVars);
}
createLessonRef.operationName = 'CreateLesson';

export function createLesson(dcOrVars, vars) {
  return executeMutation(createLessonRef(dcOrVars, vars));
}

export const updateUserBioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateUserBio', inputVars);
}
updateUserBioRef.operationName = 'UpdateUserBio';

export function updateUserBio(dcOrVars, vars) {
  return executeMutation(updateUserBioRef(dcOrVars, vars));
}

