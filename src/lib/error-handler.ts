import { OperationType, FirestoreErrorInfo } from '../types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Get mock auth info from localStorage if available
  const mockUser = JSON.parse(localStorage.getItem('user') || 'null');
  
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: mockUser?.uid || null,
      email: mockUser?.email || null,
      emailVerified: true,
      isAnonymous: false,
    },
    operationType,
    path
  };
  console.error('API Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
