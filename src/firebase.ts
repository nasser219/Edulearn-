import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyChB9XGKHY6euwv1y29IUOc_T_Ky-0VJ3M",
  authDomain: "edulearn-88430.firebaseapp.com",
  projectId: "edulearn-88430",
  storageBucket: "edulearn-88430.firebasestorage.app",
  messagingSenderId: "997969990893",
  appId: "1:997969990893:web:fd9a80701f2b5b28eca8e4",
  measurementId: "G-5Q8M7HLKTZ"
};

export const VAPID_KEY = "BAFUh-114nhQwWyMymjt_APgQDEG_YQz_tOQIn-IWmrryZm6gMsRqgTTil57mrW62oMyDQdGBvQgRT_JhFeimQs";

// Initialize Firebase SDK safely for HMR
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
  // If the current app's project ID doesn't match our config, we need to re-initialize
  if (app.options.projectId !== firebaseConfig.projectId) {
    console.warn("Firebase Project Mismatch detected. Re-initializing...");
    // We can't easily delete the app in all SDK versions, so we use a named app or force a reload
    window.location.reload(); 
  }
}

// Initialize Firestore safely
let dbInstance;
const DATABASE_ID = "edulearn";

try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, DATABASE_ID);
} catch (e) {
  // If already initialized with different settings, get current instance
  dbInstance = getFirestore(app, DATABASE_ID);
}

export const db = dbInstance;

// Initialize Auth safely
export const auth = getAuth(app);
auth.setPersistence(browserLocalPersistence);

// Initialize Storage
export const storage = getStorage(app);

export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const functions = getFunctions(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
