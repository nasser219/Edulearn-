const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'edu',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const allCoursesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AllCourses');
}
allCoursesRef.operationName = 'AllCourses';
exports.allCoursesRef = allCoursesRef;

exports.allCourses = function allCourses(dc) {
  return executeQuery(allCoursesRef(dc));
};

const myEnrollmentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'MyEnrollments');
}
myEnrollmentsRef.operationName = 'MyEnrollments';
exports.myEnrollmentsRef = myEnrollmentsRef;

exports.myEnrollments = function myEnrollments(dc) {
  return executeQuery(myEnrollmentsRef(dc));
};

const createLessonRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateLesson', inputVars);
}
createLessonRef.operationName = 'CreateLesson';
exports.createLessonRef = createLessonRef;

exports.createLesson = function createLesson(dcOrVars, vars) {
  return executeMutation(createLessonRef(dcOrVars, vars));
};

const updateUserBioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateUserBio', inputVars);
}
updateUserBioRef.operationName = 'UpdateUserBio';
exports.updateUserBioRef = updateUserBioRef;

exports.updateUserBio = function updateUserBio(dcOrVars, vars) {
  return executeMutation(updateUserBioRef(dcOrVars, vars));
};
