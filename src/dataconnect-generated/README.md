# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*AllCourses*](#allcourses)
  - [*MyEnrollments*](#myenrollments)
- [**Mutations**](#mutations)
  - [*CreateLesson*](#createlesson)
  - [*UpdateUserBio*](#updateuserbio)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## AllCourses
You can execute the `AllCourses` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
allCourses(): QueryPromise<AllCoursesData, undefined>;

interface AllCoursesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<AllCoursesData, undefined>;
}
export const allCoursesRef: AllCoursesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
allCourses(dc: DataConnect): QueryPromise<AllCoursesData, undefined>;

interface AllCoursesRef {
  ...
  (dc: DataConnect): QueryRef<AllCoursesData, undefined>;
}
export const allCoursesRef: AllCoursesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the allCoursesRef:
```typescript
const name = allCoursesRef.operationName;
console.log(name);
```

### Variables
The `AllCourses` query has no variables.
### Return Type
Recall that executing the `AllCourses` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AllCoursesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `AllCourses`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, allCourses } from '@dataconnect/generated';


// Call the `allCourses()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await allCourses();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await allCourses(dataConnect);

console.log(data.courses);

// Or, you can use the `Promise` API.
allCourses().then((response) => {
  const data = response.data;
  console.log(data.courses);
});
```

### Using `AllCourses`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, allCoursesRef } from '@dataconnect/generated';


// Call the `allCoursesRef()` function to get a reference to the query.
const ref = allCoursesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = allCoursesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.courses);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.courses);
});
```

## MyEnrollments
You can execute the `MyEnrollments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
myEnrollments(): QueryPromise<MyEnrollmentsData, undefined>;

interface MyEnrollmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<MyEnrollmentsData, undefined>;
}
export const myEnrollmentsRef: MyEnrollmentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
myEnrollments(dc: DataConnect): QueryPromise<MyEnrollmentsData, undefined>;

interface MyEnrollmentsRef {
  ...
  (dc: DataConnect): QueryRef<MyEnrollmentsData, undefined>;
}
export const myEnrollmentsRef: MyEnrollmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the myEnrollmentsRef:
```typescript
const name = myEnrollmentsRef.operationName;
console.log(name);
```

### Variables
The `MyEnrollments` query has no variables.
### Return Type
Recall that executing the `MyEnrollments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `MyEnrollmentsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `MyEnrollments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, myEnrollments } from '@dataconnect/generated';


// Call the `myEnrollments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await myEnrollments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await myEnrollments(dataConnect);

console.log(data.enrollments);

// Or, you can use the `Promise` API.
myEnrollments().then((response) => {
  const data = response.data;
  console.log(data.enrollments);
});
```

### Using `MyEnrollments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, myEnrollmentsRef } from '@dataconnect/generated';


// Call the `myEnrollmentsRef()` function to get a reference to the query.
const ref = myEnrollmentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = myEnrollmentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.enrollments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.enrollments);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateLesson
You can execute the `CreateLesson` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createLesson(vars: CreateLessonVariables): MutationPromise<CreateLessonData, CreateLessonVariables>;

interface CreateLessonRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateLessonVariables): MutationRef<CreateLessonData, CreateLessonVariables>;
}
export const createLessonRef: CreateLessonRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createLesson(dc: DataConnect, vars: CreateLessonVariables): MutationPromise<CreateLessonData, CreateLessonVariables>;

interface CreateLessonRef {
  ...
  (dc: DataConnect, vars: CreateLessonVariables): MutationRef<CreateLessonData, CreateLessonVariables>;
}
export const createLessonRef: CreateLessonRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createLessonRef:
```typescript
const name = createLessonRef.operationName;
console.log(name);
```

### Variables
The `CreateLesson` mutation requires an argument of type `CreateLessonVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateLessonVariables {
  title: string;
  lessonType: string;
  orderIndex: number;
  courseId: UUIDString;
  contentUrl?: string | null;
  textContent?: string | null;
  duration?: number | null;
}
```
### Return Type
Recall that executing the `CreateLesson` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateLessonData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateLessonData {
  lesson_insert: Lesson_Key;
}
```
### Using `CreateLesson`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createLesson, CreateLessonVariables } from '@dataconnect/generated';

// The `CreateLesson` mutation requires an argument of type `CreateLessonVariables`:
const createLessonVars: CreateLessonVariables = {
  title: ..., 
  lessonType: ..., 
  orderIndex: ..., 
  courseId: ..., 
  contentUrl: ..., // optional
  textContent: ..., // optional
  duration: ..., // optional
};

// Call the `createLesson()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createLesson(createLessonVars);
// Variables can be defined inline as well.
const { data } = await createLesson({ title: ..., lessonType: ..., orderIndex: ..., courseId: ..., contentUrl: ..., textContent: ..., duration: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createLesson(dataConnect, createLessonVars);

console.log(data.lesson_insert);

// Or, you can use the `Promise` API.
createLesson(createLessonVars).then((response) => {
  const data = response.data;
  console.log(data.lesson_insert);
});
```

### Using `CreateLesson`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createLessonRef, CreateLessonVariables } from '@dataconnect/generated';

// The `CreateLesson` mutation requires an argument of type `CreateLessonVariables`:
const createLessonVars: CreateLessonVariables = {
  title: ..., 
  lessonType: ..., 
  orderIndex: ..., 
  courseId: ..., 
  contentUrl: ..., // optional
  textContent: ..., // optional
  duration: ..., // optional
};

// Call the `createLessonRef()` function to get a reference to the mutation.
const ref = createLessonRef(createLessonVars);
// Variables can be defined inline as well.
const ref = createLessonRef({ title: ..., lessonType: ..., orderIndex: ..., courseId: ..., contentUrl: ..., textContent: ..., duration: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createLessonRef(dataConnect, createLessonVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.lesson_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.lesson_insert);
});
```

## UpdateUserBio
You can execute the `UpdateUserBio` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateUserBio(vars: UpdateUserBioVariables): MutationPromise<UpdateUserBioData, UpdateUserBioVariables>;

interface UpdateUserBioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateUserBioVariables): MutationRef<UpdateUserBioData, UpdateUserBioVariables>;
}
export const updateUserBioRef: UpdateUserBioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateUserBio(dc: DataConnect, vars: UpdateUserBioVariables): MutationPromise<UpdateUserBioData, UpdateUserBioVariables>;

interface UpdateUserBioRef {
  ...
  (dc: DataConnect, vars: UpdateUserBioVariables): MutationRef<UpdateUserBioData, UpdateUserBioVariables>;
}
export const updateUserBioRef: UpdateUserBioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateUserBioRef:
```typescript
const name = updateUserBioRef.operationName;
console.log(name);
```

### Variables
The `UpdateUserBio` mutation requires an argument of type `UpdateUserBioVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateUserBioVariables {
  bio: string;
}
```
### Return Type
Recall that executing the `UpdateUserBio` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateUserBioData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateUserBioData {
  user_update?: User_Key | null;
}
```
### Using `UpdateUserBio`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateUserBio, UpdateUserBioVariables } from '@dataconnect/generated';

// The `UpdateUserBio` mutation requires an argument of type `UpdateUserBioVariables`:
const updateUserBioVars: UpdateUserBioVariables = {
  bio: ..., 
};

// Call the `updateUserBio()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateUserBio(updateUserBioVars);
// Variables can be defined inline as well.
const { data } = await updateUserBio({ bio: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateUserBio(dataConnect, updateUserBioVars);

console.log(data.user_update);

// Or, you can use the `Promise` API.
updateUserBio(updateUserBioVars).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

### Using `UpdateUserBio`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateUserBioRef, UpdateUserBioVariables } from '@dataconnect/generated';

// The `UpdateUserBio` mutation requires an argument of type `UpdateUserBioVariables`:
const updateUserBioVars: UpdateUserBioVariables = {
  bio: ..., 
};

// Call the `updateUserBioRef()` function to get a reference to the mutation.
const ref = updateUserBioRef(updateUserBioVars);
// Variables can be defined inline as well.
const ref = updateUserBioRef({ bio: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateUserBioRef(dataConnect, updateUserBioVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

