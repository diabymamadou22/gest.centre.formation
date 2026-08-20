export type StudentStatus = 'active' | 'inactive';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';
export type PaymentMethod = 'cash' | 'transfer' | 'check' | 'wave' | 'orange_money';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type ResourceType = 'document' | 'link' | 'equipment' | 'book';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  studentIdNumber?: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  registrationDate?: string;
  phoneNumber?: string;
  email?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  teacher?: string;
  teacherId?: string;
  schedule?: string;
  price: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  specialty?: string;
  teacherIdNumber?: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
  bio?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  courseId: string;
  title: string;
  grade: number;
  maxGrade: number;
  coefficient: number;
  date: string;
  comments?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  courseId?: string;
  assignedStudentId?: string;
  url?: string;
  status: 'available' | 'loaned' | 'archived';
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  startDate: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  courseId?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  description?: string;
  referenceNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Settings {
  id?: string;
  centerName: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  logoUrl?: string;
  accessCode?: string;
}

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
  }
}

