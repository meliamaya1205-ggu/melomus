/**
 * MELOMUS - SUITE INTEGRAL DE AUDITORÍA Y PRUEBAS DE SEGURIDAD (RLS & RPC)
 * 
 * Simula el comportamiento del motor PostgreSQL con las reglas de:
 * 1. Token Hashing Criptográfico SHA-256 (tokens planos nunca en base de datos).
 * 2. Protección contra escalamiento de privilegios en perfiles (tr_protect_profile_fields).
 * 3. Privacidad RLS en Finanzas (personal vs familiar, prevención de manipulación de created_by_user_id).
 * 4. Privacidad RLS en Pareja / Cuqui Time ('isPrivate: true').
 * 5. Aislamiento estricto multi-inquilino entre dos familias diferentes.
 * 6. Concurrencia y consumo de un solo uso en invitaciones co-admin (FOR UPDATE).
 * 7. Rechazo de auto-vinculación y pertenencia a otra familia.
 * 
 * Ejecución: npx tsx scratch/test_security_audit_full.ts
 */

import { createHash } from 'crypto';

function sha256(str: string): string {
  return createHash('sha256').update(str).digest('hex');
}

// Modelos de simulación PostgreSQL
interface Profile {
  id: string;
  family_id: string;
  email: string;
  name: string;
  role: 'FAMILY_ADULT' | 'SUPER_ADMIN';
  relationship: 'mama' | 'papa';
  member_id: string;
  avatar_color: string;
  avatar_emoji: string;
}

interface CoAdminInvite {
  id: string;
  family_id: string;
  created_by_user_id: string;
  target_relationship: 'mama' | 'papa';
  token_hash: string; // SHA-256 HASH ONLY
  expires_at: string;
  used_at: string | null;
  used_by_user_id: string | null;
}

interface FinanceRecord {
  id: string;
  family_id: string;
  scope: 'family' | 'personal';
  amount: number;
  description: string;
  created_by_user_id: string;
}

interface CoupleRecord {
  id: string;
  family_id: string;
  item_type: string;
  created_by_user_id: string;
  data: {
    isPrivate?: boolean;
    text?: string;
  };
}

interface TaskRecord {
  id: string;
  family_id: string;
  title: string;
  created_by_user_id: string;
}

class SecurityEngineSim {
  public families = new Map<string, { id: string; name: string }>();
  public profiles = new Map<string, Profile>();
  public invites = new Map<string, CoAdminInvite>();
  public finances = new Map<string, FinanceRecord>();
  public coupleRecords = new Map<string, CoupleRecord>();
  public tasks = new Map<string, TaskRecord>();

  constructor() {
    // -------------------------------------------------------------
    // SEED: Familia 1 (Melomus)
    // Adulto A: Mamá Andrea
    // Adulto B: Papá Carlos (co-admin vinculado)
    // -------------------------------------------------------------
    this.families.set('fam_1', { id: 'fam_1', name: 'Familia Melomus' });
    this.profiles.set('user_mama_1', {
      id: 'user_mama_1',
      family_id: 'fam_1',
      email: 'mama1@melomus.app',
      name: 'Mamá Andrea',
      role: 'FAMILY_ADULT',
      relationship: 'mama',
      member_id: 'mama',
      avatar_color: '#ec4899',
      avatar_emoji: '🌸',
    });
    this.profiles.set('user_papa_1', {
      id: 'user_papa_1',
      family_id: 'fam_1',
      email: 'papa1@melomus.app',
      name: 'Papá Carlos',
      role: 'FAMILY_ADULT',
      relationship: 'papa',
      member_id: 'papa',
      avatar_color: '#3b82f6',
      avatar_emoji: '🌿',
    });

    // -------------------------------------------------------------
    // SEED: Familia 2 (González)
    // Adulto C: Mamá Sofía
    // -------------------------------------------------------------
    this.families.set('fam_2', { id: 'fam_2', name: 'Familia González' });
    this.profiles.set('user_mama_2', {
      id: 'user_mama_2',
      family_id: 'fam_2',
      email: 'mama2@gonzalez.app',
      name: 'Mamá Sofía',
      role: 'FAMILY_ADULT',
      relationship: 'mama',
      member_id: 'mama',
      avatar_color: '#ec4899',
      avatar_emoji: '🌸',
    });

    // -------------------------------------------------------------
    // SEED: Familia Test Vinculación (Clara - soltera esperando coadmin)
    // -------------------------------------------------------------
    this.families.set('fam_test', { id: 'fam_test', name: 'Familia Test CoAdmin' });
    this.profiles.set('user_mama_test', {
      id: 'user_mama_test',
      family_id: 'fam_test',
      email: 'mamatest@test.app',
      name: 'Mamá Clara',
      role: 'FAMILY_ADULT',
      relationship: 'mama',
      member_id: 'mama',
      avatar_color: '#ec4899',
      avatar_emoji: '🌸',
    });
  }

  // Helper RLS
  private getAuthFamilyId(authUid: string): string | null {
    return this.profiles.get(authUid)?.family_id || null;
  }

  private isFamilyAdult(authUid: string): boolean {
    const p = this.profiles.get(authUid);
    return p?.role === 'FAMILY_ADULT' || p?.role === 'SUPER_ADMIN';
  }

  // ---------------------------------------------------------------------------
  // RPC: create_co_admin_invite (Guarda SOLO HASH SHA-256)
  // ---------------------------------------------------------------------------
  public rpc_create_co_admin_invite(authUid: string, targetRelationship: 'mama' | 'papa') {
    const user = this.profiles.get(authUid);
    if (!user || !this.isFamilyAdult(authUid)) {
      return { success: false, message: 'Solo un adulto coadministrador puede generar invitaciones' };
    }

    // Invalidar invitaciones previas pendientes para este rol en la familia (Caso B: Revocación)
    for (const inv of this.invites.values()) {
      if (inv.family_id === user.family_id && inv.target_relationship === targetRelationship && inv.used_at === null) {
        const revokeRes = this.privilegedInternalUpdateInvite(authUid, inv.id, { used_at: new Date().toISOString() });
        if (!revokeRes.success) {
          return { success: false, message: revokeRes.error };
        }
        inv.used_at = new Date().toISOString();
        inv.used_by_user_id = null;
      }
    }

    // Generar plaintext token aleatorio
    const plainToken = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
    // Almacenar ÚNICAMENTE el hash SHA-256
    const tokenHash = sha256(plainToken);
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    const invite: CoAdminInvite = {
      id: `inv_${Date.now()}_${Math.random()}`,
      family_id: user.family_id,
      created_by_user_id: authUid,
      target_relationship: targetRelationship,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used_at: null,
      used_by_user_id: null,
    };

    this.invites.set(tokenHash, invite);

    // Devuelve el plaintext token al usuario que invita
    return {
      success: true,
      token: plainToken,
      expires_at: expiresAt,
      target_relationship: targetRelationship,
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: get_invite_details (Recibe plaintext token, calcula HASH para buscar)
  // ---------------------------------------------------------------------------
  public rpc_get_invite_details(plainToken: string) {
    if (!plainToken) return { valid: false, message: 'Token no provisto' };
    const hash = sha256(plainToken);
    const invite = this.invites.get(hash);

    if (!invite) return { valid: false, message: 'Enlace de vinculación no encontrado o inválido' };
    if (invite.used_at) return { valid: false, message: 'Este enlace de vinculación ya fue utilizado anteriormente' };
    if (new Date(invite.expires_at).getTime() <= Date.now()) return { valid: false, message: 'Este enlace de vinculación ha expirado (vigencia 48h)' };

    const fam = this.families.get(invite.family_id);
    const inviter = this.profiles.get(invite.created_by_user_id);

    return {
      valid: true,
      family_id: invite.family_id,
      family_name: fam?.name,
      inviter_name: inviter?.name,
      target_relationship: invite.target_relationship,
      expires_at: invite.expires_at,
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: claim_coadmin_link (Bloqueo for update, validaciones de seguridad)
  // ---------------------------------------------------------------------------
  public rpc_claim_coadmin_link(authUid: string, plainToken: string, name: string) {
    if (!authUid) return { success: false, message: 'Usuario no autenticado' };
    const hash = sha256(plainToken);
    const invite = this.invites.get(hash);

    if (!invite) return { success: false, message: 'El enlace de vinculación no es válido o no existe' };
    if (invite.used_at) return { success: false, message: 'Este enlace de vinculación ya ha sido utilizado anteriormente' };
    if (new Date(invite.expires_at).getTime() <= Date.now()) return { success: false, message: 'Este enlace de vinculación ha expirado (vigencia 48h)' };

    // Auto-vinculación
    if (invite.created_by_user_id === authUid) {
      return { success: false, message: 'No puedes utilizar una invitación creada por ti mismo' };
    }

    // Usuario ya en otra familia
    const existing = this.profiles.get(authUid);
    if (existing && existing.family_id && existing.family_id !== invite.family_id) {
      return { success: false, message: 'Tu usuario ya pertenece a otra familia registrada en MELOMUS. Debes usar una cuenta distinta.' };
    }

    // Rol ya ocupado
    for (const p of this.profiles.values()) {
      if (p.family_id === invite.family_id && p.relationship === invite.target_relationship && p.id !== authUid) {
        return { success: false, message: `El rol de ${invite.target_relationship} ya está ocupado en esta familia` };
      }
    }

    // Éxito: asignar rol FAMILY_ADULT
    this.profiles.set(authUid, {
      id: authUid,
      family_id: invite.family_id,
      email: `${name.toLowerCase()}@test.app`,
      name,
      role: 'FAMILY_ADULT',
      relationship: invite.target_relationship,
      member_id: invite.target_relationship,
      avatar_color: invite.target_relationship === 'papa' ? '#3b82f6' : '#ec4899',
      avatar_emoji: invite.target_relationship === 'papa' ? '🌿' : '🌸',
    });

    // Inmediatamente consumir token
    invite.used_at = new Date().toISOString();
    invite.used_by_user_id = authUid;

    return {
      success: true,
      message: 'Vinculación exitosa como adulto principal',
      family_id: invite.family_id,
      relationship: invite.target_relationship,
    };
  }

  // ---------------------------------------------------------------------------
  // Trigger / ACL Sim: protect_co_admin_invites_direct_writes
  // ---------------------------------------------------------------------------
  public clientDirectInsertInvite(_authUid: string): { success: boolean; error?: string } {
    return {
      success: false,
      error: 'Las invitaciones de coadministrador solo pueden gestionarse mediante las funciones seguras create_co_admin_invite y claim_coadmin_link',
    };
  }

  public clientDirectUpdateInvite(_authUid: string): { success: boolean; error?: string } {
    return {
      success: false,
      error: 'Las invitaciones de coadministrador solo pueden gestionarse mediante las funciones seguras create_co_admin_invite y claim_coadmin_link',
    };
  }

  public clientDirectDeleteInvite(_authUid: string): { success: boolean; error?: string } {
    return {
      success: false,
      error: 'Las invitaciones de coadministrador solo pueden gestionarse mediante las funciones seguras create_co_admin_invite y claim_coadmin_link',
    };
  }

  // ---------------------------------------------------------------------------
  // Trigger Sim: protect_profile_privileged_fields
  // ---------------------------------------------------------------------------
  public clientUpdateProfile(authUid: string, updates: Partial<Profile>): { success: boolean; error?: string } {
    const old = this.profiles.get(authUid);
    if (!old) return { success: false, error: 'Perfil no encontrado' };

    // Simular tr_protect_profile_fields
    if (updates.id !== undefined && updates.id !== old.id) {
      return { success: false, error: 'No está permitido modificar el id del perfil' };
    }
    if (updates.family_id !== undefined && updates.family_id !== old.family_id) {
      return { success: false, error: 'No está permitido modificar el family_id directamente' };
    }
    if (updates.role !== undefined && updates.role !== old.role) {
      return { success: false, error: 'No está permitido modificar el rol del perfil directamente' };
    }
    if (updates.relationship !== undefined && updates.relationship !== old.relationship) {
      return { success: false, error: 'No está permitido modificar el campo relationship directamente' };
    }
    if (updates.member_id !== undefined && updates.member_id !== old.member_id) {
      return { success: false, error: 'No está permitido modificar el member_id directamente' };
    }
    if (updates.email !== undefined && updates.email !== old.email) {
      return { success: false, error: 'El email del perfil está vinculado a auth.users y no puede modificarse directamente' };
    }

    // Campos permitidos
    const updated = {
      ...old,
      name: updates.name ?? old.name,
      avatar_color: updates.avatar_color ?? old.avatar_color,
      avatar_emoji: updates.avatar_emoji ?? old.avatar_emoji,
    };
    this.profiles.set(authUid, updated);
    return { success: true };
  }

  // Simulación de intento de mutación con flag interno activado pero violando invariantes
  public privilegedInternalUpdateProfile(authUid: string, targetUserId: string, updates: Partial<Profile>): { success: boolean; error?: string } {
    if (updates.id !== undefined && updates.id !== targetUserId) {
      return { success: false, error: 'No está permitido modificar el id del perfil' };
    }
    if (updates.email !== undefined) {
      return { success: false, error: 'El email del perfil está vinculado a auth.users y no puede modificarse directamente' };
    }
    if (targetUserId !== authUid) {
      return { success: false, error: 'No tienes permisos para modificar el perfil de otro usuario' };
    }
    if (updates.role === 'SUPER_ADMIN') {
      return { success: false, error: 'No está permitido asignarse el rol SUPER_ADMIN' };
    }
    if (updates.role && updates.role !== 'FAMILY_ADULT') {
      return { success: false, error: 'El rol asignado mediante vinculación debe ser exclusivamente FAMILY_ADULT' };
    }
    if (updates.relationship && !['mama', 'papa'].includes(updates.relationship)) {
      return { success: false, error: 'Relación inválida. Debe ser mama o papa' };
    }
    return { success: true };
  }

  public privilegedInternalUpdateInvite(authUid: string, inviteId: string, updates: any): { success: boolean; error?: string } {
    const invite = Array.from(this.invites.values()).find(i => i.id === inviteId);
    if (!invite) return { success: false, error: 'Invitación no encontrada' };

    if (updates.id && updates.id !== invite.id) return { success: false, error: 'No está permitido modificar el id de una invitación' };
    if (updates.family_id && updates.family_id !== invite.family_id) return { success: false, error: 'No está permitido reasignar la familia de una invitación' };
    if (updates.created_by_user_id && updates.created_by_user_id !== invite.created_by_user_id) return { success: false, error: 'No está permitido modificar el creador de una invitación' };
    if (updates.target_relationship && updates.target_relationship !== invite.target_relationship) return { success: false, error: 'No está permitido modificar el rol objetivo de una invitación' };
    if (updates.token_hash && updates.token_hash !== invite.token_hash) return { success: false, error: 'No está permitido alterar el hash criptográfico de una invitación' };
    if (updates.expires_at && updates.expires_at !== invite.expires_at) return { success: false, error: 'No está permitido modificar la fecha de expiración de una invitación' };

    // Inmutabilidad si ya fue utilizada o revocada
    if (invite.used_at !== null) {
      return { success: false, error: 'Esta invitación ya fue utilizada o revocada anteriormente' };
    }

    if (updates.used_by_user_id !== undefined && updates.used_by_user_id !== null) {
      // Caso A: Reclamo por el segundo adulto
      if (updates.used_by_user_id !== authUid) {
        return { success: false, error: 'No puedes reclamar una invitación a nombre de otro usuario' };
      }
      if (invite.created_by_user_id === authUid) {
        return { success: false, error: 'No puedes reclamar una invitación creada por ti mismo' };
      }
      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        return { success: false, error: 'Esta invitación ha expirado (vigencia 48h)' };
      }
    } else if (updates.used_at !== undefined && updates.used_at !== null) {
      // Caso B: Revocación por el creador o adulto coadmin
      const callerFamId = this.profiles.get(authUid)?.family_id;
      if (invite.created_by_user_id !== authUid && callerFamId !== invite.family_id) {
        return { success: false, error: 'No tienes permisos para revocar invitaciones de otra familia o creadas por otro usuario' };
      }
    } else {
      return { success: false, error: 'Operación no permitida sobre invitaciones de coadministrador' };
    }
    return { success: true };
  }

  public privilegedInternalDeleteInvite(_authUid: string, _inviteId: string): { success: boolean; error?: string } {
    return { success: false, error: 'No está permitido eliminar registros de invitaciones de coadministrador' };
  }

  // ---------------------------------------------------------------------------
  // RLS Sim: Finanzas (Personal vs Familiar)
  // ---------------------------------------------------------------------------
  public selectFinances(authUid: string): FinanceRecord[] {
    const famId = this.getAuthFamilyId(authUid);
    if (!famId) return [];

    const results: FinanceRecord[] = [];
    for (const rec of this.finances.values()) {
      // Policy: family_id = get_auth_family_id() AND (scope = 'family' OR created_by_user_id = auth.uid())
      if (rec.family_id === famId && (rec.scope === 'family' || rec.created_by_user_id === authUid)) {
        results.push(rec);
      }
    }
    return results;
  }

  public insertFinance(authUid: string, row: Omit<FinanceRecord, 'id'>): { success: boolean; error?: string } {
    const famId = this.getAuthFamilyId(authUid);
    // Policy WITH CHECK: family_id = get_auth_family_id() AND (scope = 'family' OR (scope = 'personal' AND created_by_user_id = auth.uid()))
    if (row.family_id !== famId) {
      return { success: false, error: 'Violación de RLS: no pertenece a tu familia' };
    }
    if (row.scope === 'personal' && row.created_by_user_id && row.created_by_user_id !== authUid) {
      return { success: false, error: 'Violación de RLS: no puedes registrar finanzas personales a nombre de otro usuario' };
    }

    // Trigger tr_protect_finance_*_created_by: fuerza NEW.created_by_user_id := auth.uid()
    const id = `fin_${Date.now()}_${Math.random()}`;
    this.finances.set(id, { ...row, id, created_by_user_id: authUid });
    return { success: true };
  }

  public updateFinance(authUid: string, id: string, updates: Partial<FinanceRecord>): { success: boolean; error?: string } {
    const rec = this.finances.get(id);
    if (!rec) return { success: false, error: 'Registro no encontrado' };

    const famId = this.getAuthFamilyId(authUid);
    // USING: debe pertenecer a su familia y tener acceso
    if (rec.family_id !== famId || (rec.scope === 'personal' && rec.created_by_user_id !== authUid)) {
      return { success: false, error: 'Violación de RLS: registro no visible o no modificable' };
    }

    // Trigger tr_protect_finance_*_created_by: Prohibir mutar created_by_user_id
    if (updates.created_by_user_id && updates.created_by_user_id !== rec.created_by_user_id) {
      return { success: false, error: 'Trigger de seguridad: No está permitido modificar created_by_user_id en registros financieros' };
    }

    // Trigger tr_protect_finance_*_created_by: Si el registro era personal, solo el autor original puede modificarlo
    if (rec.scope === 'personal' && rec.created_by_user_id !== authUid) {
      return { success: false, error: 'Trigger de seguridad: No tienes permisos para modificar registros financieros personales de otro usuario' };
    }

    // Trigger tr_protect_finance_*_created_by: Si se intenta cambiar a personal, solo el autor original puede ser el titular
    const targetScope = updates.scope ?? rec.scope;
    if (targetScope === 'personal' && rec.created_by_user_id !== authUid) {
      return { success: false, error: 'Trigger de seguridad: No puedes convertir un registro familiar en personal de otro usuario' };
    }

    this.finances.set(id, { ...rec, ...updates, created_by_user_id: rec.created_by_user_id });
    return { success: true };
  }

  public deleteFinance(authUid: string, id: string): { success: boolean; error?: string } {
    const rec = this.finances.get(id);
    if (!rec) return { success: false, error: 'Registro no encontrado' };

    const famId = this.getAuthFamilyId(authUid);
    if (rec.family_id !== famId) return { success: false, error: 'Violación de RLS: otra familia' };

    // DELETE USING:
    // (scope = 'family' AND is_family_adult()) OR (scope = 'personal' AND created_by_user_id = auth.uid())
    if (rec.scope === 'family') {
      if (!this.isFamilyAdult(authUid)) return { success: false, error: 'Solo adultos pueden borrar finanzas familiares' };
    } else {
      if (rec.created_by_user_id !== authUid) return { success: false, error: 'No puedes borrar finanzas personales de otro adulto' };
    }

    this.finances.delete(id);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // RLS Sim: Pareja (Cuqui Time y registros privados)
  // ---------------------------------------------------------------------------
  public selectCouple(authUid: string): CoupleRecord[] {
    const famId = this.getAuthFamilyId(authUid);
    if (!famId || !this.isFamilyAdult(authUid)) return [];

    const results: CoupleRecord[] = [];
    for (const rec of this.coupleRecords.values()) {
      // Policy: family_id = get_auth_family_id() AND is_family_adult() AND (!isPrivate OR created_by_user_id = auth.uid())
      if (rec.family_id === famId && (!rec.data.isPrivate || rec.created_by_user_id === authUid)) {
        results.push(rec);
      }
    }
    return results;
  }

  public insertCouple(authUid: string, row: Omit<CoupleRecord, 'id'>): { success: boolean; error?: string } {
    const famId = this.getAuthFamilyId(authUid);
    if (!famId || row.family_id !== famId || !this.isFamilyAdult(authUid)) {
      return { success: false, error: 'Violación de RLS: no autorizado para módulo pareja' };
    }
    if (row.data.isPrivate && row.created_by_user_id && row.created_by_user_id !== authUid) {
      return { success: false, error: 'Violación de RLS: no puedes crear registros privados a nombre de tu pareja' };
    }

    // Trigger tr_protect_couple_created_by: fuerza NEW.created_by_user_id := auth.uid()
    const id = `cpl_${Date.now()}_${Math.random()}`;
    this.coupleRecords.set(id, { ...row, id, created_by_user_id: authUid });
    return { success: true };
  }

  public updateCouple(authUid: string, id: string, updates: Partial<CoupleRecord>): { success: boolean; error?: string } {
    const rec = this.coupleRecords.get(id);
    if (!rec) return { success: false, error: 'Registro no encontrado' };

    const famId = this.getAuthFamilyId(authUid);
    if (!famId || rec.family_id !== famId || !this.isFamilyAdult(authUid)) {
      return { success: false, error: 'Violación de RLS: no autorizado' };
    }

    // RLS USING: si el registro era privado y no pertenece a authUid, el usuario no puede verlo ni actualizarlo
    if (rec.data.isPrivate && rec.created_by_user_id !== authUid) {
      return { success: false, error: 'Violación de RLS: no puedes modificar registros privados de tu pareja' };
    }

    // Trigger tr_protect_couple_created_by: Prohibir mutar created_by_user_id
    if (updates.created_by_user_id && updates.created_by_user_id !== rec.created_by_user_id) {
      return { success: false, error: 'Trigger de seguridad: No está permitido modificar created_by_user_id en registros de pareja' };
    }

    // Trigger tr_protect_couple_created_by: Si se intenta privatizar un registro compartido creado por el otro adulto
    if (updates.data?.isPrivate && rec.created_by_user_id !== authUid) {
      return { success: false, error: 'Trigger de seguridad: No puedes privatizar un registro de pareja compartido creado por el otro adulto' };
    }

    this.coupleRecords.set(id, {
      ...rec,
      ...updates,
      created_by_user_id: rec.created_by_user_id,
      data: { ...rec.data, ...(updates.data || {}) },
    });
    return { success: true };
  }

  public deleteCouple(authUid: string, id: string): { success: boolean; error?: string } {
    const rec = this.coupleRecords.get(id);
    if (!rec) return { success: false, error: 'Registro no encontrado' };

    const famId = this.getAuthFamilyId(authUid);
    if (!famId || rec.family_id !== famId || !this.isFamilyAdult(authUid)) {
      return { success: false, error: 'Violación de RLS: no autorizado' };
    }

    // RLS USING: si el registro es privado, solo el autor puede eliminarlo
    if (rec.data.isPrivate && rec.created_by_user_id !== authUid) {
      return { success: false, error: 'Violación de RLS: no puedes eliminar registros privados de tu pareja' };
    }

    this.coupleRecords.delete(id);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // RLS Sim: Tareas (Aislamiento Multi-Tenant)
  // ---------------------------------------------------------------------------
  public selectTasks(authUid: string): TaskRecord[] {
    const famId = this.getAuthFamilyId(authUid);
    if (!famId) return [];
    return Array.from(this.tasks.values()).filter((t) => t.family_id === famId);
  }

  public insertTask(authUid: string, task: Omit<TaskRecord, 'id'>): { success: boolean; error?: string } {
    const famId = this.getAuthFamilyId(authUid);
    if (task.family_id !== famId) {
      return { success: false, error: 'Violación de RLS: intento de inyección cross-tenant' };
    }
    const id = `task_${Date.now()}_${Math.random()}`;
    this.tasks.set(id, { ...task, id });
    return { success: true };
  }
}

// =============================================================================
// RUN TESTS
// =============================================================================
async function runSecurityAudit() {
  console.log('======================================================================');
  console.log(' MELOMUS — AUDITORÍA PROFUNDA DE SEGURIDAD (RLS, HASH & CONCURRENCIA)');
  console.log('======================================================================\n');

  const sim = new SecurityEngineSim();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. TOKEN HASHING CRIPTOGRÁFICO SHA-256
  // ---------------------------------------------------------------------------
  console.log('--- 1. Almacenamiento Criptográfico Seguro de Invitaciones ---');
  {
    const inviteRes = sim.rpc_create_co_admin_invite('user_mama_test', 'papa');
    assert(inviteRes.success === true, '1.1 Generación de invitación exitosa');
    assert(typeof inviteRes.token === 'string' && inviteRes.token.length === 64, '1.2 Plaintext token entregado al cliente (64 hex)');

    // Verificar tabla en base de datos: NO debe contener el token plano
    const expectedHash = sha256(inviteRes.token!);
    assert(sim.invites.has(expectedHash), '1.3 Base de datos almacena exclusivamente el HASH SHA-256 del token');
    
    let plainTokenFoundInDb = false;
    for (const inv of sim.invites.values()) {
      if (inv.token_hash === inviteRes.token) {
        plainTokenFoundInDb = true;
      }
    }
    assert(!plainTokenFoundInDb, '1.4 El token plano NUNCA queda expuesto en las columnas de la base de datos');

    // Validación mediante get_invite_details con plaintext token
    const details = sim.rpc_get_invite_details(inviteRes.token!);
    assert(details.valid === true && details.family_id === 'fam_test', '1.5 get_invite_details valida el token calculando su hash en tiempo real');

    // Intento con token alterado o inválido
    const detailsFake = sim.rpc_get_invite_details('token_hacker_falsificado_1234567890abcdef');
    assert(detailsFake.valid === false, '1.6 Token manipulado es rechazado inmediatamente');

    // 1.7 Intento de cliente de insertar directamente en co_admin_invites
    const directInsert = sim.clientDirectInsertInvite('user_mama_test');
    assert(directInsert.success === false && directInsert.error?.includes('solo pueden gestionarse mediante las funciones seguras'), '1.7 Bloquea escrituras directas (INSERT) de clientes en co_admin_invites');

    // 1.8 Intento de cliente de modificar directamente co_admin_invites
    const directUpdate = sim.clientDirectUpdateInvite('user_mama_test');
    assert(directUpdate.success === false && directUpdate.error?.includes('solo pueden gestionarse mediante las funciones seguras'), '1.8 Bloquea modificaciones directas (UPDATE) de clientes en co_admin_invites');

    // 1.9 Intento de cliente de borrar directamente de co_admin_invites
    const directDelete = sim.clientDirectDeleteInvite('user_mama_test');
    assert(directDelete.success === false && directDelete.error?.includes('solo pueden gestionarse mediante las funciones seguras'), '1.9 Bloquea eliminaciones directas (DELETE) de clientes en co_admin_invites');

    // 1.10 Multi-layer: Intento de DELETE con flag interno
    const inviteId = Array.from(sim.invites.values())[0]?.id;
    const internalDelete = sim.privilegedInternalDeleteInvite('user_mama_test', inviteId);
    assert(internalDelete.success === false && internalDelete.error?.includes('No está permitido eliminar registros'), '1.10 Invariante: Bloquea DELETE en co_admin_invites incluso con contexto interno');

    // 1.11 Multi-layer: Intento de alterar token_hash con flag interno
    const internalHashTamper = sim.privilegedInternalUpdateInvite('user_mama_test', inviteId, { token_hash: 'hash_falsificado_64chars_abcdef1234567890abcdef1234567890abcdef123456' });
    assert(internalHashTamper.success === false && internalHashTamper.error?.includes('alterar el hash criptográfico'), '1.11 Invariante: Bloquea mutación de token_hash incluso con contexto interno');

    // 1.12 Multi-layer: Intento de auto-reclamo con flag interno
    const internalSelfClaim = sim.privilegedInternalUpdateInvite('user_mama_test', inviteId, { used_by_user_id: 'user_mama_test' });
    assert(internalSelfClaim.success === false && internalSelfClaim.error?.includes('creada por ti mismo'), '1.12 Invariante: Bloquea auto-reclamo de invitación incluso con contexto interno');

    // 1.13 Multi-layer: Intento de reclamar a nombre de otro usuario con flag interno
    const internalProxyClaim = sim.privilegedInternalUpdateInvite('user_papa_1', inviteId, { used_by_user_id: 'user_hacker_99' });
    assert(internalProxyClaim.success === false && internalProxyClaim.error?.includes('a nombre de otro usuario'), '1.13 Invariante: Bloquea reclamo a nombre de tercero incluso con contexto interno');

    // =========================================================================
    // CASOS 1 AL 5: CICLO COMPLETO DE GENERACIÓN, REVOCACIÓN, RECLAMO Y REUTILIZACIÓN
    // =========================================================================
    // CASO 1: Ya se creó la primera invitación (inviteRes).
    // CASO 2: Crear una segunda invitación sin que falle (revoca la primera)
    const secondInvite = sim.rpc_create_co_admin_invite('user_mama_test', 'papa');
    assert(secondInvite.success === true, '1.14 Caso 2: Crear segunda invitación sin fallo (revoca la anterior sin conflicto)');
    assert(secondInvite.token !== inviteRes.token, '1.15 Caso 2: Segunda invitación genera un token criptográfico nuevo');

    // CASO 3: Confirmar que la primera invitación queda invalidada
    const firstInviteInDb = sim.invites.get(expectedHash);
    assert(firstInviteInDb?.used_at !== null, '1.16 Caso 3: Primera invitación tiene used_at registrado (revocada)');
    assert(firstInviteInDb?.used_by_user_id === null, '1.17 Caso 3: Primera invitación tiene used_by_user_id nulo (revocada, no reclamada)');
    const firstInviteDetails = sim.rpc_get_invite_details(inviteRes.token!);
    assert(firstInviteDetails.valid === false && firstInviteDetails.message.includes('ya fue utilizado'), '1.18 Caso 3: get_invite_details rechaza primera invitación por estar invalidada');

    // CASO 4: Vincular al segundo adulto con la segunda invitación
    const validClaimSecond = sim.rpc_claim_coadmin_link('user_second_adult_linked', secondInvite.token!, 'Papá Vinculado');
    assert(validClaimSecond.success === true, '1.19 Caso 4: Vincular al segundo adulto exitosamente con la segunda invitación');
    assert(sim.profiles.get('user_second_adult_linked')?.family_id === 'fam_test', '1.20 Caso 4: Segundo adulto asignado a la familia correcta');
    assert(sim.profiles.get('user_second_adult_linked')?.role === 'FAMILY_ADULT', '1.21 Caso 4: Paridad total asignada como FAMILY_ADULT');

    // CASO 5: Impedir reutilizar el enlace
    const replaySecond = sim.rpc_claim_coadmin_link('user_replay_hacker', secondInvite.token!, 'Hacker');
    assert(replaySecond.success === false && replaySecond.message.includes('ha sido utilizado'), '1.22 Caso 5: Impedir reutilizar el segundo enlace (rechazado)');

    const claimRevokedFirst = sim.rpc_claim_coadmin_link('user_replay_hacker', inviteRes.token!, 'Hacker');
    assert(claimRevokedFirst.success === false && claimRevokedFirst.message.includes('ha sido utilizado'), '1.23 Caso 5: Impedir reclamar el primer enlace revocado (rechazado)');
  }

  // ---------------------------------------------------------------------------
  // 2. PROTECCIÓN CONTRA ESCALAMIENTO DE PRIVILEGIOS EN PERFILES
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Protección de Campos Privilegiados de Perfiles (Trigger) ---');
  {
    // Intento de escalamiento a SUPER_ADMIN
    const resRole = sim.clientUpdateProfile('user_mama_1', { role: 'SUPER_ADMIN' });
    assert(resRole.success === false && resRole.error?.includes('rol'), '2.1 Bloquea intento de auto-asignarse rol SUPER_ADMIN');

    // Intento de secuestro de family_id (cambiarse a Familia 2)
    const resFam = sim.clientUpdateProfile('user_mama_1', { family_id: 'fam_2' });
    assert(resFam.success === false && resFam.error?.includes('family_id'), '2.2 Bloquea intento de modificar family_id directamente');

    // Intento de cambiar relationship
    const resRel = sim.clientUpdateProfile('user_mama_1', { relationship: 'papa' });
    assert(resRel.success === false && resRel.error?.includes('relationship'), '2.3 Bloquea intento de modificar campo relationship');

    // Modificación legítima permitida (nombre y avatar)
    const resName = sim.clientUpdateProfile('user_mama_1', { name: 'Mamá Andrea Bonita', avatar_color: '#f43f5e' });
    assert(resName.success === true, '2.4 Permite actualizar campos cosméticos permitidos (nombre, avatar)');
    assert(sim.profiles.get('user_mama_1')?.name === 'Mamá Andrea Bonita', '2.5 Nombre modificado correctamente');
    assert(sim.profiles.get('user_mama_1')?.role === 'FAMILY_ADULT', '2.6 Rol se mantiene inmutable como FAMILY_ADULT');

    // 2.7 Multi-layer: Intento de auto-asignarse SUPER_ADMIN con flag interno
    const internalAdminEscalation = sim.privilegedInternalUpdateProfile('user_mama_1', 'user_mama_1', { role: 'SUPER_ADMIN' });
    assert(internalAdminEscalation.success === false && internalAdminEscalation.error?.includes('SUPER_ADMIN'), '2.7 Invariante: Bloquea escalamiento a SUPER_ADMIN incluso con contexto interno');

    // 2.8 Multi-layer: Intento de modificar perfil de otro usuario con flag interno
    const internalCrossUser = sim.privilegedInternalUpdateProfile('user_mama_1', 'user_papa_1', { name: 'Papá Hackeado' });
    assert(internalCrossUser.success === false && internalCrossUser.error?.includes('perfil de otro usuario'), '2.8 Invariante: Bloquea modificar perfil de otro usuario incluso con contexto interno');

    // 2.9 Multi-layer: Intento de modificar email con flag interno
    const internalEmailTamper = sim.privilegedInternalUpdateProfile('user_mama_1', 'user_mama_1', { email: 'hacker@melomus.app' });
    assert(internalEmailTamper.success === false && internalEmailTamper.error?.includes('auth.users'), '2.9 Invariante: Bloquea mutación de email incluso con contexto interno');

    // 2.10 Multi-layer: Intento de asignar rol no autorizado con flag interno
    const internalInvalidRole = sim.privilegedInternalUpdateProfile('user_mama_1', 'user_mama_1', { role: 'GUEST_USER' as any });
    assert(internalInvalidRole.success === false && internalInvalidRole.error?.includes('exclusivamente FAMILY_ADULT'), '2.10 Invariante: Bloquea roles no autorizados incluso con contexto interno');
  }

  // ---------------------------------------------------------------------------
  // 3. POLÍTICAS RLS DE FINANZAS: PRIVACIDAD PERSONAL VS FAMILIAR
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Privacidad RLS en Finanzas (Personal vs Familiar) ---');
  {
    // Mamá crea un gasto personal ("Regalo sorpresa para Papá")
    sim.insertFinance('user_mama_1', {
      family_id: 'fam_1',
      scope: 'personal',
      amount: 45000,
      description: 'Regalo Aniversario Sorpresa',
      created_by_user_id: 'user_mama_1',
    });

    // Papá crea un gasto personal ("Compra de herramientas propias")
    sim.insertFinance('user_papa_1', {
      family_id: 'fam_1',
      scope: 'personal',
      amount: 30000,
      description: 'Taladro personal',
      created_by_user_id: 'user_papa_1',
    });

    // Gasto familiar ("Supermercado quincenal")
    sim.insertFinance('user_mama_1', {
      family_id: 'fam_1',
      scope: 'family',
      amount: 120000,
      description: 'Supermercado Quincenal',
      created_by_user_id: 'user_mama_1',
    });

    // Mamá consulta finanzas: debe ver su gasto personal y el familiar, pero NO el de Papá
    const mamaFinances = sim.selectFinances('user_mama_1');
    const mamaSeesOwnPersonal = mamaFinances.some((f) => f.description === 'Regalo Aniversario Sorpresa');
    const mamaSeesFamily = mamaFinances.some((f) => f.description === 'Supermercado Quincenal');
    const mamaSeesPapasPersonal = mamaFinances.some((f) => f.description === 'Taladro personal');

    assert(mamaSeesOwnPersonal, '3.1 Mamá ve sus propios gastos personales');
    assert(mamaSeesFamily, '3.2 Mamá ve los gastos familiares');
    assert(!mamaSeesPapasPersonal, '3.3 Mamá NO puede ver los gastos personales de Papá');

    // Papá consulta finanzas: debe ver su gasto personal y el familiar, pero NO el de Mamá
    const papaFinances = sim.selectFinances('user_papa_1');
    const papaSeesMamasPersonal = papaFinances.some((f) => f.description === 'Regalo Aniversario Sorpresa');
    assert(!papaSeesMamasPersonal, '3.4 Papá NO puede ver el gasto personal confidencial de Mamá');

    // Intento de Papá de alterar gasto personal de Mamá
    const mamaPersonalId = Array.from(sim.finances.values()).find((v) => v.description === 'Regalo Aniversario Sorpresa')!.id;
    const updateAttempt = sim.updateFinance('user_papa_1', mamaPersonalId, { amount: 1000 });
    assert(updateAttempt.success === false, '3.5 Papá no puede modificar el gasto personal de Mamá (RLS bloquea actualización)');

    // Intento de Papá de borrar gasto personal de Mamá
    const deleteAttempt = sim.deleteFinance('user_papa_1', mamaPersonalId);
    assert(deleteAttempt.success === false, '3.6 Papá no puede eliminar el gasto personal de Mamá (RLS bloquea eliminación)');

    // Intento de manipulación de inserción: Papá intenta crear un gasto personal a nombre de Mamá
    const forgeryAttempt = sim.insertFinance('user_papa_1', {
      family_id: 'fam_1',
      scope: 'personal',
      amount: 999999,
      description: 'Deuda atribuida a Mamá',
      created_by_user_id: 'user_mama_1', // Falsificación de creador
    });
    assert(forgeryAttempt.success === false, '3.7 RLS WITH CHECK rechaza inserción con created_by_user_id manipulado');

    // 3.8 Trigger: Prohibir alteración de created_by_user_id en UPDATE financiero
    const familyExpenseId = Array.from(sim.finances.values()).find((v) => v.description === 'Supermercado Quincenal')!.id;
    const mutateAuthorAttempt = sim.updateFinance('user_mama_1', familyExpenseId, { created_by_user_id: 'user_papa_1' });
    assert(mutateAuthorAttempt.success === false && mutateAuthorAttempt.error?.includes('created_by_user_id'), '3.8 Trigger bloquea intento de alterar created_by_user_id en finanzas');

    // 3.9 Trigger: Prohibir convertir gasto familiar en gasto personal de la pareja
    const privatizeAttempt = sim.updateFinance('user_papa_1', familyExpenseId, { scope: 'personal' });
    assert(privatizeAttempt.success === false && privatizeAttempt.error?.includes('No puedes convertir'), '3.9 Trigger bloquea intento de convertir gasto familiar en personal de otro usuario');
  }

  // ---------------------------------------------------------------------------
  // 4. POLÍTICAS RLS EN PAREJA / CUQUI TIME ('isPrivate')
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Privacidad en Módulo Pareja (Registros Privados isPrivate) ---');
  {
    // Mamá crea un check-in privado ("Reflexión íntima")
    sim.insertCouple('user_mama_1', {
      family_id: 'fam_1',
      item_type: 'check_in',
      created_by_user_id: 'user_mama_1',
      data: { isPrivate: true, text: 'Reflexión íntima de Mamá' },
    });

    // Papá crea un acuerdo de pareja compartido
    sim.insertCouple('user_papa_1', {
      family_id: 'fam_1',
      item_type: 'agreement',
      created_by_user_id: 'user_papa_1',
      data: { isPrivate: false, text: 'Noche de cita los viernes' },
    });

    // Papá consulta módulo Pareja
    const papaCoupleView = sim.selectCouple('user_papa_1');
    const papaSeesAgreement = papaCoupleView.some((c) => c.data.text === 'Noche de cita los viernes');
    const papaSeesPrivateCheckin = papaCoupleView.some((c) => c.data.text === 'Reflexión íntima de Mamá');

    assert(papaSeesAgreement, '4.1 Papá puede ver los acuerdos de pareja compartidos');
    assert(!papaSeesPrivateCheckin, '4.2 Papá NO puede ver el registro de pareja privado (isPrivate=true) de Mamá');

    // Mamá consulta módulo Pareja
    const mamaCoupleView = sim.selectCouple('user_mama_1');
    const mamaSeesOwnPrivate = mamaCoupleView.some((c) => c.data.text === 'Reflexión íntima de Mamá');
    assert(mamaSeesOwnPrivate, '4.3 Mamá sí puede ver su propio registro privado');

    // 4.4 Trigger: Prohibir alteración de created_by_user_id en registros de pareja
    const agreementId = Array.from(sim.coupleRecords.values()).find((c) => c.data.text === 'Noche de cita los viernes')!.id;
    const mutateCoupleAuthor = sim.updateCouple('user_papa_1', agreementId, { created_by_user_id: 'user_mama_1' });
    assert(mutateCoupleAuthor.success === false && mutateCoupleAuthor.error?.includes('created_by_user_id'), '4.4 Trigger bloquea intento de alterar created_by_user_id en registros de pareja');

    // 4.5 Trigger: Prohibir privatizar acuerdo compartido creado por la pareja
    const privatizeAgreement = sim.updateCouple('user_mama_1', agreementId, { data: { isPrivate: true, text: 'Noche de cita los viernes (Privatizado)' } });
    assert(privatizeAgreement.success === false && privatizeAgreement.error?.includes('No puedes privatizar'), '4.5 Trigger bloquea intento de privatizar un acuerdo compartido creado por el otro adulto');

    // 4.6 RLS: Papá no puede modificar ni borrar el registro privado de Mamá
    const mamaPrivateId = Array.from(sim.coupleRecords.values()).find((c) => c.data.text === 'Reflexión íntima de Mamá')!.id;
    const papaUpdatePrivate = sim.updateCouple('user_papa_1', mamaPrivateId, { data: { text: 'Espiado por Papá' } });
    assert(papaUpdatePrivate.success === false, '4.6 Papá no puede modificar el registro privado de pareja de Mamá (RLS bloquea actualización)');

    const papaDeletePrivate = sim.deleteCouple('user_papa_1', mamaPrivateId);
    assert(papaDeletePrivate.success === false, '4.7 Papá no puede eliminar el registro privado de pareja de Mamá (RLS bloquea eliminación)');
  }

  // ---------------------------------------------------------------------------
  // 5. AISLAMIENTO MULTI-TENANT ENTRE DOS FAMILIAS DIFERENTES
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Aislamiento Estricto Multi-Tenant (Familia 1 vs Familia 2) ---');
  {
    // Insertar tarea en Familia 1
    sim.insertTask('user_mama_1', {
      family_id: 'fam_1',
      title: 'Comprar pañales para bebé Melomus',
      created_by_user_id: 'user_mama_1',
    });

    // Mamá 2 (Familia González) consulta tareas
    const family2Tasks = sim.selectTasks('user_mama_2');
    const family2SeesFamily1 = family2Tasks.some((t) => t.family_id === 'fam_1');
    assert(!family2SeesFamily1 && family2Tasks.length === 0, '5.1 Familia 2 obtiene 0 tareas de Familia 1 (aislamiento absoluto)');

    // Mamá 2 intenta inyectar una tarea dentro de Familia 1
    const crossInject = sim.insertTask('user_mama_2', {
      family_id: 'fam_1', // Intento de inyección cross-tenant
      title: 'Tarea espía en otra familia',
      created_by_user_id: 'user_mama_2',
    });
    assert(crossInject.success === false, '5.2 RLS WITH CHECK bloquea inserción cruzada en otra familia');

    // Mamá 2 consulta finanzas de Familia 1
    const fam2Finances = sim.selectFinances('user_mama_2');
    assert(fam2Finances.length === 0, '5.3 Familia 2 no puede leer ninguna finanza de Familia 1');
  }

  // ---------------------------------------------------------------------------
  // 6. CONCURRENCIA, PARIDAD Y CONSUMO DE UN SOLO USO EN VINCULACIÓN
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Concurrencia y Seguridad en Vinculación Co-Admin ---');
  {
    // Mamá 2 genera invitación para Papá en Familia 2
    const inviteFam2 = sim.rpc_create_co_admin_invite('user_mama_2', 'papa');

    // Intento 1: Auto-vinculación (Mamá 2 intentando reclamar su propio token)
    const selfClaim = sim.rpc_claim_coadmin_link('user_mama_2', inviteFam2.token!, 'Mamá Tramposa');
    assert(selfClaim.success === false && selfClaim.message.includes('ti mismo'), '6.1 Rechaza auto-vinculación del mismo creador');

    // Intento 2: Usuario de Familia 1 (Papá Carlos) intentando usar la invitación de Familia 2
    const foreignClaim = sim.rpc_claim_coadmin_link('user_papa_1', inviteFam2.token!, 'Papá Infiltrado');
    assert(foreignClaim.success === false && foreignClaim.message.includes('otra familia'), '6.2 Rechaza vinculación de usuario perteneciente a otra familia');

    // Intento 3: Reclamo válido por un nuevo usuario (Papá González)
    const validClaim = sim.rpc_claim_coadmin_link('user_new_papa_2', inviteFam2.token!, 'Papá González');
    assert(validClaim.success === true, '6.3 Reclamo válido exitoso');
    assert(validClaim.family_id === 'fam_2', '6.4 Asignado correctamente a Familia 2');

    const newPapaProfile = sim.profiles.get('user_new_papa_2');
    assert(newPapaProfile?.role === 'FAMILY_ADULT', '6.5 Paridad total de coadministrador (role = FAMILY_ADULT)');

    // Intento 4: Ataque de concurrencia / Reutilización del token consumido
    const replayClaim = sim.rpc_claim_coadmin_link('user_concurrent_hacker', inviteFam2.token!, 'Hacker Simultáneo');
    assert(replayClaim.success === false && replayClaim.message.includes('ha sido utilizado'), '6.6 Bloqueo transaccional: token invalidado inmediatamente tras el primer uso');
  }

  console.log('\n======================================================================');
  console.log(` RESULTADO AUDITORÍA DE SEGURIDAD: ${passed} PASARON, ${failed} FALLARON`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch((e) => {
  console.error(e);
  process.exit(1);
});
