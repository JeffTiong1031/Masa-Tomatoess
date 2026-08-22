import type { UserName } from '@/lib/identity';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealSource = 'photo' | 'typed';
export type Confidence = 'high' | 'medium' | 'low';
export type Portion = 'smaller' | 'normal' | 'larger';

export interface MealPhoto {
  fullPath: string;
  thumbPath: string;
}

export interface MealEntry {
  id: string;
  owner: UserName;
  date: string;
  atTime: string | null;
  slot: MealSlot;
  photo: MealPhoto | null;
  dish: string;
  calories: number;
  source: MealSource;
  updatedAt: string;
}

export interface MealDay {
  date: string;
  owner: UserName;
  sealed: boolean;
}

export interface MealReview {
  weekStart: string;
  owner: UserName;
  body: string;
  stale: boolean;
  createdAt: string;
}

export interface WeekTotals {
  byDate: Record<string, number>;
  total: number;
  sealedCount: number;
}

export interface Estimate {
  dish: string;
  detail: string;
  calories: number;
  confidence: Confidence;
}
