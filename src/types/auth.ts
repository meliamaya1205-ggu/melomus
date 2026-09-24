export type DataMode = 'local_demo' | 'cloud_sync';

export type AuthRole = 'FAMILY_ADULT' | 'SUPER_ADMIN';

export type PrimaryAdultRelationship = 'mama' | 'papa';

export interface AuthUser {
  id: string;
  familyId: string;
  email: string;
  name: string;
  role: AuthRole;
  relationship: PrimaryAdultRelationship;
  memberId: string; // Linked FamilyMember id ('mama' or 'papa')
  avatarColor: string;
  avatarEmoji: string;
}

export interface FamilyAccount {
  id: string;
  name: string;
  primaryAdultMamaId?: string;
  primaryAdultPapaId?: string;
  primaryAdultMamaEmail?: string;
  primaryAdultPapaEmail?: string;
  isBothCoAdminsActive: boolean;
  coAdminLinkingToken?: string;
  coAdminLinkingExpiresAt?: string;
  createdAt: string;
}

export interface CoAdminLinkPayload {
  token: string;
  relationship: PrimaryAdultRelationship;
  name: string;
  email: string;
}
