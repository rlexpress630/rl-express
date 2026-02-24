
export type UserRole = 'ADMIN' | 'MOTOBOY';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export enum DeliveryStatus {
  PENDING = 'PENDING',    // Newly added by Admin
  IN_ROUTE = 'IN_ROUTE',  // Dispatched to Driver
  DELIVERED = 'DELIVERED',// Completed by Driver
  FAILED = 'FAILED'       // Unsuccessful attempt
}

export interface Delivery {
  id: string;
  address: string;
  receiverName?: string;
  document?: string;
  photoUrl?: string;
  status: DeliveryStatus;
  createdAt: string;
  completedAt?: string;
  lat?: number;
  lng?: number;
  order: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  accentColor: 'indigo' | 'blue' | 'rose' | 'emerald' | 'amber';
}
