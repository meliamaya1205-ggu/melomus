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

export function calculateAge(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : undefined;
}
