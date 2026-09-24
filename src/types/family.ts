export type FamilyRole = 'adult' | 'child';
export type FamilyRelationship = 'mama' | 'papa' | 'hija' | 'hijo' | 'bebe' | 'otro';

export interface FamilyMember {
  id: string; // 'mama', 'papa', 'annie', 'derek', 'axel', or custom
  name: string;
  role: FamilyRole;
  relationship: FamilyRelationship;
  age?: number;
  birthDate?: string;
  avatarColor: string;
  avatarEmoji: string;
  points: number; // For kids points wallet
  notes?: string;
}

export type ActiveProfileId = 'mama' | 'papa' | 'family' | string;
