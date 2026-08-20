import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const studentsApi = {
  list: async () => {
    const path = 'students';
    try {
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  create: async (data: any) => {
    const path = 'students';
    const id = generateId();
    try {
      const now = serverTimestamp();
      const studentData = {
        ...data,
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(db, path, id), studentData);
      toast.success('Étudiant ajouté avec succès');
      return { id, ...studentData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, data: any) => {
    const path = `students/${id}`;
    try {
      await updateDoc(doc(db, 'students', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success('Étudiant mis à jour');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `students/${id}`;
    try {
      await deleteDoc(doc(db, 'students', id));
      toast.success('Étudiant supprimé');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const coursesApi = {
  list: async () => {
    const path = 'courses';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  create: async (data: any) => {
    const path = 'courses';
    const id = generateId();
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, path, id), {
        ...data,
        createdAt: now,
        updatedAt: now
      });
      toast.success('Cours créé');
      return { id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, data: any) => {
    const path = `courses/${id}`;
    try {
      await updateDoc(doc(db, 'courses', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success('Cours mis à jour');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `courses/${id}`;
    try {
      await deleteDoc(doc(db, 'courses', id));
      toast.success('Cours supprimé');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const enrollmentsApi = {
  list: async () => {
    const path = 'enrollments';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  create: async (data: any) => {
    const path = 'enrollments';
    const id = generateId();
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, path, id), {
        ...data,
        createdAt: now,
        updatedAt: now
      });
      toast.success('Inscription réussie');
      return { id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `enrollments/${id}`;
    try {
      await deleteDoc(doc(db, 'enrollments', id));
      toast.success('Inscription annulée');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const paymentsApi = {
  list: async () => {
    const path = 'payments';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  create: async (data: any) => {
    const path = 'payments';
    const id = generateId();
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, path, id), {
        ...data,
        createdAt: now,
        updatedAt: now
      });
      toast.success('Paiement enregistré');
      return { id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `payments/${id}`;
    try {
      await deleteDoc(doc(db, 'payments', id));
      toast.success('Paiement supprimé');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const teachersApi = {
  list: async () => {
    const path = 'teachers';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  create: async (data: any) => {
    const path = 'teachers';
    const id = generateId();
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, path, id), {
        ...data,
        createdAt: now,
        updatedAt: now
      });
      toast.success('Enseignant ajouté avec succès');
      return { id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, data: any) => {
    const path = `teachers/${id}`;
    try {
      await updateDoc(doc(db, 'teachers', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success('Enseignant mis à jour');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `teachers/${id}`;
    try {
      await deleteDoc(doc(db, 'teachers', id));
      toast.success('Enseignant supprimé');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const attendancesApi = {
  list: async () => {
    const path = 'attendances';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  create: async (data: any) => {
    const path = 'attendances';
    const id = generateId();
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, path, id), {
        ...data,
        createdAt: now,
        updatedAt: now
      });
      toast.success('Présence enregistrée');
      return { id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, data: any) => {
    const path = `attendances/${id}`;
    try {
      await updateDoc(doc(db, 'attendances', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success('Présence mise à jour');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `attendances/${id}`;
    try {
      await deleteDoc(doc(db, 'attendances', id));
      toast.success('Présence supprimée');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const gradesApi = {
  list: async () => {
    const path = 'grades';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  create: async (data: any) => {
    const path = 'grades';
    const id = generateId();
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, path, id), {
        ...data,
        createdAt: now,
        updatedAt: now
      });
      toast.success('Note enregistrée');
      return { id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  createBatch: async (gradesList: any[]) => {
    const path = 'grades';
    try {
      const now = serverTimestamp();
      const promises = gradesList.map(item => {
        const id = generateId();
        return setDoc(doc(db, path, id), {
          ...item,
          createdAt: now,
          updatedAt: now
        });
      });
      await Promise.all(promises);
      toast.success(`${gradesList.length} notes enregistrées avec succès`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, data: any) => {
    const path = `grades/${id}`;
    try {
      await updateDoc(doc(db, 'grades', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success('Note mise à jour');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `grades/${id}`;
    try {
      await deleteDoc(doc(db, 'grades', id));
      toast.success('Note supprimée');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const bulletinAppreciationsApi = {
  list: async () => {
    const path = 'bulletin_appreciations';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  save: async (studentId: string, period: string, data: { appreciation: string; decision: string }) => {
    const docId = `${studentId}_${period.toLowerCase().replace(/[^a-z0-9]/gi, '_')}`;
    const path = `bulletin_appreciations/${docId}`;
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, 'bulletin_appreciations', docId), {
        studentId,
        period,
        ...data,
        updatedAt: now
      }, { merge: true });
      toast.success('Appréciation enregistrée');
      return { id: docId, studentId, period, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};

export const resourcesApi = {
  list: async () => {
    const path = 'resources';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },
  create: async (data: any) => {
    const path = 'resources';
    const id = generateId();
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, path, id), {
        ...data,
        createdAt: now,
        updatedAt: now
      });
      toast.success('Ressource / Matériel ajouté');
      return { id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  update: async (id: string, data: any) => {
    const path = `resources/${id}`;
    try {
      await updateDoc(doc(db, 'resources', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success('Ressource mise à jour');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  delete: async (id: string) => {
    const path = `resources/${id}`;
    try {
      await deleteDoc(doc(db, 'resources', id));
      toast.success('Ressource supprimée');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

export const settingsApi = {
  get: async () => {
    const path = 'settings/general';
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // Initial setup for firestore if missing
        const initial = { centerName: 'kalan gest KG', accessCode: '00223' };
        await setDoc(doc(db, 'settings', 'general'), initial);
        return initial;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },
  update: async (data: any) => {
    const path = 'settings/general';
    try {
      await updateDoc(doc(db, 'settings', 'general'), data);
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};

export async function apiFetch(url: string, options: any = {}) {
  const parts = url.replace(/^\//, '').split('/');
  const base = parts[0];
  const col = parts[1];
  const id = parts[2];

  if (base === 'api') {
    if (col === 'settings' && id === 'general') {
       if (options.method === 'PUT') return settingsApi.update(JSON.parse(options.body));
       return settingsApi.get();
    }

    const apiMap: any = {
      students: studentsApi,
      courses: coursesApi,
      enrollments: enrollmentsApi,
      payments: paymentsApi,
      teachers: teachersApi,
      attendances: attendancesApi,
      grades: gradesApi,
      resources: resourcesApi
    };

    const api = apiMap[col];
    if (!api) {
      if (col === 'admins') return []; // Fallback for admins collection if not yet moved
      throw new Error(`Unknown collection: ${col}`);
    }

    if (id) {
      if (options.method === 'PUT') return api.update(id, JSON.parse(options.body));
      if (options.method === 'DELETE') return api.delete(id);
      return api.get ? api.get(id) : null;
    }

    if (options.method === 'POST') return api.create(JSON.parse(options.body));
    const listResult = await api.list();
    return Array.isArray(listResult) ? listResult : [];
  }
  
  throw new Error(`Invalid URL format: ${url}`);
}
