export type RewardCategory = 'dessert' | 'movie' | 'activity' | 'special' | 'custom';

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  icon: string;
  category: RewardCategory;
}

export interface PointsHistoryEntry {
  id: string;
  childId: string;
  childName: string;
  points: number; // Positive if earned, negative if redeemed
  description: string;
  date: string; // ISO date string
}
