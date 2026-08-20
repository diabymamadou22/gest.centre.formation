import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  enableMultiTabIndexedDbPersistence, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Enable Firestore offline persistence for seamless offline mode
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, fall back to single-tab persistence
    enableIndexedDbPersistence(db).catch((e) => {
      console.warn("Firestore offline persistence error:", e);
    });
  } else if (err.code === 'unimplemented') {
    console.warn("Firestore offline persistence is not supported by this browser");
  }
});

// Validate connection to Firestore gracefully (handling offline mode gracefully)
async function testConnection() {
  try {
    const testDoc = doc(db, 'settings', 'general');
    await getDocFromServer(testDoc);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Application démarrée en mode hors ligne.");
    }
  }
}

testConnection();

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
