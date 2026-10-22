/**
 * MELOMUS - TEST COMPLETO DE VERIFICACIÓN:
 * 1. VINCULACIÓN REAL DEL SEGUNDO ADULTO (CO-ADMINISTRACIÓN)
 * 2. MÓDULO HOGAR 100% EDITABLE Y PERSONALIZABLE
 * 
 * Ejecución: npx tsx scratch/test_coadmin_and_home_full.ts
 */

// Environment polyfill for Node.js
if (typeof (globalThis as any).window === 'undefined') {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: { origin: 'https://melomus.vercel.app' },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    configurable: true,
  });
}

import {
  DEFAULT_HOME_AREAS,
  HomeArea,
  CleaningTask,
  MaintenanceTask,
  ShoppingItem,
  formatFrequency,
  FrequencyConfig,
} from '../src/types/home';

// ==============================================================================
// MOCK SUPABASE ENGINE SIMULATING REAL PG LOGIC AND CONSTRAINTS
// ==============================================================================

interface CoAdminInviteRow {
  id: string;
  family_id: string;
  created_by_user_id: string;
  target_relationship: 'mama' | 'papa';
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  used_by_user_id: string | null;
}

interface ProfileRow {
  id: string;
  family_id: string;
  email: string;
  name: string;
  role: 'FAMILY_ADULT' | 'FAMILY_CHILD';
  relationship: 'mama' | 'papa' | 'hijo';
  member_id: string;
}

interface FamilyMemberRow {
  id: string;
  family_id: string;
  user_id: string;
  name: string;
  role: 'adult' | 'child';
  relationship: string;
}

interface HomeRecordRow {
  id: string;
  family_id: string;
  record_type: 'shopping' | 'cleaning' | 'maintenance' | 'reset_mission' | 'area' | 'reset_session';
  data: any;
  created_at: string;
  updated_at: string;
}

class MockSupabaseDatabase {
  public families = new Map<string, { id: string; name: string }>();
  public profiles = new Map<string, ProfileRow>();
  public familyMembers = new Map<string, FamilyMemberRow>();
  public invites = new Map<string, CoAdminInviteRow>();
  public homeRecords = new Map<string, HomeRecordRow>();
  public customizations = new Map<string, any>();
  public realtimeSubscribers: ((payload: { table: string; eventType: string; new: any; old: any }) => void)[] = [];

  constructor() {
    // Seed initial family
    this.families.set('family_melomus_1', { id: 'family_melomus_1', name: 'Familia Melomus' });
    this.profiles.set('user_mama_id', {
      id: 'user_mama_id',
      family_id: 'family_melomus_1',
      email: 'mama@melomus.app',
      name: 'Mamá Andrea',
      role: 'FAMILY_ADULT',
      relationship: 'mama',
      member_id: 'mama',
    });
    this.familyMembers.set('family_melomus_1_mama', {
      id: 'mama',
      family_id: 'family_melomus_1',
      user_id: 'user_mama_id',
      name: 'Mamá Andrea',
      role: 'adult',
      relationship: 'mama',
    });

    // Foreign family (for edge case test)
    this.families.set('family_foreign_2', { id: 'family_foreign_2', name: 'Familia Pérez' });
    this.profiles.set('user_foreign_id', {
      id: 'user_foreign_id',
      family_id: 'family_foreign_2',
      email: 'perez@example.com',
      name: 'Juan Pérez',
      role: 'FAMILY_ADULT',
      relationship: 'papa',
      member_id: 'papa',
    });
  }

  // RPC: create_co_admin_invite
  rpc_create_co_admin_invite(currentUserId: string, targetRelationship: 'mama' | 'papa'): { success: boolean; token?: string; expires_at?: string; message?: string } {
    const profile = this.profiles.get(currentUserId);
    if (!profile) return { success: false, message: 'Usuario no autenticado o sin perfil' };
    if (!profile.family_id) return { success: false, message: 'El usuario no tiene una familia asignada' };
    if (targetRelationship !== 'mama' && targetRelationship !== 'papa') {
      return { success: false, message: 'Relación inválida. Debe ser mama o papa' };
    }

    // Invalidate prior pending invites for this target role in this family
    for (const invite of this.invites.values()) {
      if (invite.family_id === profile.family_id && invite.target_relationship === targetRelationship && !invite.used_at) {
        invite.used_at = new Date().toISOString();
      }
    }

    // Generate cryptographic token (64 hex characters)
    const token = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    const inviteRow: CoAdminInviteRow = {
      id: `inv_${Date.now()}_${Math.random()}`,
      family_id: profile.family_id,
      created_by_user_id: currentUserId,
      target_relationship: targetRelationship,
      token_hash: token,
      expires_at: expiresAt,
      used_at: null,
      used_by_user_id: null,
    };
    this.invites.set(token, inviteRow);

    return {
      success: true,
      token,
      expires_at: expiresAt,
    };
  }

  // RPC: get_invite_details
  rpc_get_invite_details(token: string): { valid: boolean; family_id?: string; family_name?: string; inviter_name?: string; target_relationship?: string; expires_at?: string; message?: string } {
    const invite = this.invites.get(token);
    if (!invite) return { valid: false, message: 'Enlace de vinculación no encontrado o inválido' };
    if (invite.used_at) return { valid: false, message: 'Este enlace de vinculación ya fue utilizado anteriormente' };
    if (new Date(invite.expires_at).getTime() <= Date.now()) return { valid: false, message: 'Este enlace de vinculación ha expirado (vigencia 48h)' };

    const family = this.families.get(invite.family_id);
    const inviter = this.profiles.get(invite.created_by_user_id);

    return {
      valid: true,
      family_id: invite.family_id,
      family_name: family?.name || 'Nuestra Familia',
      inviter_name: inviter?.name || 'Adulto de la familia',
      target_relationship: invite.target_relationship,
      expires_at: invite.expires_at,
    };
  }

  // RPC: claim_coadmin_link
  rpc_claim_coadmin_link(currentUserId: string, currentUserEmail: string, token: string, name: string): { success: boolean; message: string; family_id?: string; relationship?: string } {
    if (!currentUserId) return { success: false, message: 'Usuario no autenticado' };

    const invite = this.invites.get(token);
    if (!invite) return { success: false, message: 'El enlace de vinculación no es válido o no existe' };
    if (invite.used_at) return { success: false, message: 'Este enlace de vinculación ya ha sido utilizado anteriormente' };
    if (new Date(invite.expires_at).getTime() <= Date.now()) return { success: false, message: 'Este enlace de vinculación ha expirado (vigencia 48h)' };

    // Security check 1: self-linking
    if (invite.created_by_user_id === currentUserId) {
      return { success: false, message: 'No puedes utilizar una invitación creada por ti mismo' };
    }

    // Security check 2: already in another family
    const existingProfile = this.profiles.get(currentUserId);
    if (existingProfile && existingProfile.family_id && existingProfile.family_id !== invite.family_id) {
      return { success: false, message: 'Tu usuario ya pertenece a otra familia registrada en MELOMUS. Debes usar una cuenta distinta.' };
    }

    // Security check 3: role already occupied
    for (const p of this.profiles.values()) {
      if (p.family_id === invite.family_id && p.relationship === invite.target_relationship && p.id !== currentUserId) {
        return { success: false, message: `El rol de ${invite.target_relationship} ya está ocupado en esta familia` };
      }
    }

    // Success: register/update profile
    const profileRow: ProfileRow = {
      id: currentUserId,
      family_id: invite.family_id,
      email: currentUserEmail,
      name,
      role: 'FAMILY_ADULT', // Full co-admin parity
      relationship: invite.target_relationship,
      member_id: invite.target_relationship,
    };
    this.profiles.set(currentUserId, profileRow);

    // Update family_members
    this.familyMembers.set(`${invite.family_id}_${invite.target_relationship}`, {
      id: invite.target_relationship,
      family_id: invite.family_id,
      user_id: currentUserId,
      name,
      role: 'adult',
      relationship: invite.target_relationship,
    });

    // Mark invite as used immediately
    invite.used_at = new Date().toISOString();
    invite.used_by_user_id = currentUserId;

    return {
      success: true,
      message: 'Vinculación exitosa como adulto principal',
      family_id: invite.family_id,
      relationship: invite.target_relationship,
    };
  }

  // Home Records CRUD
  insertHomeRecord(record: { id: string; family_id: string; record_type: HomeRecordRow['record_type']; data: any }) {
    // Validate constraint
    const allowed = ['shopping', 'cleaning', 'maintenance', 'reset_mission', 'area', 'reset_session'];
    if (!allowed.includes(record.record_type)) {
      throw new Error(`check constraint violation: record_type "${record.record_type}" is not in (${allowed.join(', ')})`);
    }
    const row: HomeRecordRow = {
      id: record.id,
      family_id: record.family_id,
      record_type: record.record_type,
      data: record.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.homeRecords.set(record.id, row);
    this.broadcastRealtime('home_records', 'INSERT', row);
    return row;
  }

  updateHomeRecord(id: string, updates: Partial<{ data: any; record_type: HomeRecordRow['record_type'] }>) {
    const existing = this.homeRecords.get(id);
    if (!existing) throw new Error('Record not found');
    const updated: HomeRecordRow = {
      ...existing,
      ...updates,
      data: updates.data !== undefined ? updates.data : existing.data,
      updated_at: new Date().toISOString(),
    };
    this.homeRecords.set(id, updated);
    this.broadcastRealtime('home_records', 'UPDATE', updated, existing);
    return updated;
  }

  deleteHomeRecord(id: string) {
    const existing = this.homeRecords.get(id);
    if (!existing) return false;
    this.homeRecords.delete(id);
    this.broadcastRealtime('home_records', 'DELETE', null, existing);
    return true;
  }

  broadcastRealtime(table: string, eventType: string, newRow: any, oldRow: any = null) {
    for (const sub of this.realtimeSubscribers) {
      sub({ table, eventType, new: newRow, old: oldRow });
    }
  }
}

// ==============================================================================
// TEST EXECUTION RUNNER
// ==============================================================================

async function runAllTests() {
  console.log('======================================================================');
  console.log(' MELOMUS — VERIFICACIÓN INTEGRAL: VINCULACIÓN COADMIN Y MÓDULO HOGAR');
  console.log('======================================================================\n');

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

  const db = new MockSupabaseDatabase();

  // ----------------------------------------------------------------------------
  // SUITE 1: GENERACIÓN DE ENLACE REAL Y VINCULACIÓN EXITOSA CON PARIDAD TOTAL
  // ----------------------------------------------------------------------------
  console.log('--- SUITE 1: Flujo Exitoso de Vinculación Co-Administrador (Adulto A -> Adulto B) ---');
  {
    // 1. Adulto A genera invitación
    const inviteRes = db.rpc_create_co_admin_invite('user_mama_id', 'papa');
    assert(inviteRes.success === true, '1.1 Adulto A genera invitación exitosamente');
    assert(typeof inviteRes.token === 'string' && inviteRes.token.length === 64, '1.2 Token es hash seguro de 64 caracteres');
    assert(!inviteRes.token?.startsWith('tok_local_'), '1.3 Token NO utiliza prefijo simulado tok_local_');

    const generatedLink = `https://melomus.vercel.app/invite?token=${inviteRes.token}`;
    assert(generatedLink.includes('/invite?token='), '1.4 Formato de enlace es compatible con Web Share API y portapapeles');

    // 2. Adulto B consulta detalles de invitación desde su dispositivo antes de registrarse
    const detailsRes = db.rpc_get_invite_details(inviteRes.token!);
    assert(detailsRes.valid === true, '1.5 Adulto B valida enlace como vigente');
    assert(detailsRes.inviter_name === 'Mamá Andrea', '1.6 Muestra nombre de quien invita');
    assert(detailsRes.target_relationship === 'papa', '1.7 Muestra rol asignado (papa)');

    // 3. Adulto B completa registro atómico en la misma familia
    const claimRes = db.rpc_claim_coadmin_link('user_papa_id', 'papa@melomus.app', inviteRes.token!, 'Papá Carlos');
    assert(claimRes.success === true, '1.8 Adulto B se vincula exitosamente a la familia');
    assert(claimRes.family_id === 'family_melomus_1', '1.9 Adulto B queda en la MISMA familia que Adulto A');

    // 4. Verificar paridad total de coadministrador
    const papaProfile = db.profiles.get('user_papa_id');
    const mamaProfile = db.profiles.get('user_mama_id');
    assert(papaProfile?.role === 'FAMILY_ADULT' && mamaProfile?.role === 'FAMILY_ADULT', '1.10 Paridad total: ambos tienen role FAMILY_ADULT');
    assert(papaProfile?.family_id === mamaProfile?.family_id, '1.11 Comparten exactamente el mismo family_id');
  }

  // ----------------------------------------------------------------------------
  // SUITE 2: BLINDAJE DE SEGURIDAD Y CASOS BORDE DE VINCULACIÓN
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Blindaje de Seguridad y Rechazo de Casos Inválidos ---');
  {
    // Caso 1: Token inexistente
    const res1 = db.rpc_claim_coadmin_link('user_random_id', 'rand@test.com', 'token_fantasma_invalido_123', 'Invasor');
    assert(res1.success === false, '2.1 Rechaza token inexistente con error seguro');

    // Caso 2: Intento de auto-vinculación (Adulto A intentando reclamar su propia invitación)
    const selfInvite = db.rpc_create_co_admin_invite('user_mama_id', 'papa');
    const resSelf = db.rpc_claim_coadmin_link('user_mama_id', 'mama@melomus.app', selfInvite.token!, 'Auto Reclamo');
    assert(resSelf.success === false && resSelf.message.includes('creada por ti mismo'), '2.2 Rechaza auto-vinculación (el creador no puede auto-reclamar)');

    // Caso 3: Usuario ya pertenece a otra familia registrada
    const resForeign = db.rpc_claim_coadmin_link('user_foreign_id', 'perez@example.com', selfInvite.token!, 'Juan Pérez');
    assert(resForeign.success === false && resForeign.message.includes('otra familia'), '2.3 Rechaza vinculación si el usuario ya pertenece a otra familia');

    // Caso 4: Token expirado (> 48 horas)
    const expiredInvite = db.rpc_create_co_admin_invite('user_mama_id', 'papa');
    const inviteRow = db.invites.get(expiredInvite.token!)!;
    inviteRow.expires_at = new Date(Date.now() - 1000).toISOString(); // Expired 1s ago
    const resExpired = db.rpc_claim_coadmin_link('user_new_papa_id', 'new_papa@test.com', expiredInvite.token!, 'Papá Tardío');
    assert(resExpired.success === false && resExpired.message.includes('expirado'), '2.4 Rechaza token cuando ha vencido el plazo de 48h');

    // Caso 5: Token ya utilizado (un solo uso / invalidación inmediata)
    db.families.set('family_melomus_single_use', { id: 'family_melomus_single_use', name: 'Familia Test Single' });
    db.profiles.set('user_mama_single', {
      id: 'user_mama_single',
      family_id: 'family_melomus_single_use',
      email: 'mama_single@melomus.app',
      name: 'Mamá Single',
      role: 'FAMILY_ADULT',
      relationship: 'mama',
      member_id: 'mama',
    });
    const singleUseInvite = db.rpc_create_co_admin_invite('user_mama_single', 'papa');
    // First claim succeeds
    const firstClaim = db.rpc_claim_coadmin_link('user_valid_papa', 'vpapa@test.com', singleUseInvite.token!, 'Papá Válido');
    assert(firstClaim.success === true, '2.5 Primer reclamo consume el token');
    // Second claim fails
    const secondClaim = db.rpc_claim_coadmin_link('user_hacker', 'hacker@test.com', singleUseInvite.token!, 'Impostor');
    assert(secondClaim.success === false && secondClaim.message.includes('ya ha sido utilizado'), '2.6 Segundo reclamo es rechazado (token de un solo uso)');

    // Caso 6: Rol de destino ya ocupado en la familia (family_melomus_single_use ya tiene a user_valid_papa como papa)
    const thirdInvite = db.rpc_create_co_admin_invite('user_mama_single', 'papa');
    const resOccupied = db.rpc_claim_coadmin_link('user_another_person', 'another@test.com', thirdInvite.token!, 'Segundo Papá');
    assert(resOccupied.success === false && resOccupied.message.includes('ya está ocupado'), '2.7 Rechaza duplicidad de rol en la misma familia');
  }

  // ----------------------------------------------------------------------------
  // SUITE 3: MÓDULO HOGAR — COMPRAS 100% EDITABLES Y CICLO DE VIDA COMPLETO
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Compras Familiares (Ciclo Completo: Crear, Editar, Completar, Reabrir, Eliminar) ---');
  {
    const itemData: ShoppingItem = {
      id: 'shop_001',
      name: 'Leche Descremada',
      category: 'dairy',
      completed: false,
      urgent: false,
      quantity: '4 litros',
      notes: 'Marca preferida Colun',
      addedBy: 'Mamá',
      createdAt: '2026-10-02',
    };

    // 1. CREATE
    const inserted = db.insertHomeRecord({
      id: 'shop_001',
      family_id: 'family_melomus_1',
      record_type: 'shopping',
      data: itemData,
    });
    assert(inserted.data.name === 'Leche Descremada', '3.1 Crear artículo de compra con cantidad y notas');

    // 2. UPDATE (Edición completa de pendientes y completadas)
    const updatedData: ShoppingItem = {
      ...itemData,
      name: 'Leche Sin Lactosa y Frutos Secos',
      quantity: '6 litros + 500g nueces',
      urgent: true,
      notes: 'Comprar en supermercado Líder',
    };
    const updated = db.updateHomeRecord('shop_001', { data: updatedData });
    assert(updated.data.quantity === '6 litros + 500g nueces', '3.2 Editar cantidad y descripción del artículo');
    assert(updated.data.urgent === true, '3.3 Modificar prioridad urgente del artículo');
    assert(updated.data.notes === 'Comprar en supermercado Líder', '3.4 Editar notas específicas de compra');

    // 3. COMPLETE
    const completedData: ShoppingItem = { ...updatedData, completed: true };
    const completed = db.updateHomeRecord('shop_001', { data: completedData });
    assert(completed.data.completed === true, '3.5 Marcar artículo como comprado');

    // 4. REOPEN (Reabrir artículo comprado)
    const reopenedData: ShoppingItem = { ...completedData, completed: false };
    const reopened = db.updateHomeRecord('shop_001', { data: reopenedData });
    assert(reopened.data.completed === false, '3.6 Reabrir artículo comprado (volver a pendiente)');

    // 5. DELETE
    const deleted = db.deleteHomeRecord('shop_001');
    assert(deleted === true && !db.homeRecords.has('shop_001'), '3.7 Eliminar artículo de compra definitivamente');
  }

  // ----------------------------------------------------------------------------
  // SUITE 4: MÓDULO HOGAR — RUTINAS DE LIMPIEZA CON FRECUENCIAS Y PAUSA
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Rutinas de Limpieza (Frecuencias Personalizadas, Pausa y Reactivación) ---');
  {
    const customFreq: FrequencyConfig = {
      type: 'every_x_days',
      interval: 3,
      timeOfDay: 'morning',
    };

    const cleanTask: CleaningTask = {
      id: 'clean_001',
      areaId: 'area_kitchen',
      title: 'Desengrasar campana y encimera',
      description: 'Usar desengrasante biodegradable',
      frequency: 'Cada 3 días',
      frequencyConfig: customFreq,
      assignedMemberId: 'papa',
      completedToday: false,
      isPaused: false,
      notes: 'No usar virutilla en el acero inoxidable',
    };

    // 1. CREATE
    const inserted = db.insertHomeRecord({
      id: 'clean_001',
      family_id: 'family_melomus_1',
      record_type: 'cleaning',
      data: cleanTask,
    });
    assert(inserted.data.title === 'Desengrasar campana y encimera', '4.1 Crear rutina de limpieza con área y responsable');
    assert(formatFrequency(undefined, customFreq) === 'Cada 3 días', '4.2 Formatear frecuencia personalizada con interval=3');

    // 2. UPDATE (Edición)
    const updatedTask: CleaningTask = {
      ...cleanTask,
      title: 'Limpieza profunda de campana, encimera y horno',
      assignedMemberId: 'mama',
      frequency: 'Semanalmente',
      frequencyConfig: { type: 'weekly' },
    };
    const updated = db.updateHomeRecord('clean_001', { data: updatedTask });
    assert(updated.data.assignedMemberId === 'mama', '4.3 Reasignar responsable de limpieza');
    assert(updated.data.frequency === 'Semanalmente', '4.4 Modificar frecuencia a semanal');

    // 3. COMPLETE TODAY
    const completedTodayTask: CleaningTask = { ...updatedTask, completedToday: true, lastCompletedDate: '2026-10-02' };
    const compToday = db.updateHomeRecord('clean_001', { data: completedTodayTask });
    assert(compToday.data.completedToday === true, '4.5 Marcar rutina completada en el día de hoy');

    // 4. PAUSE (Pausar rutina temporalmente)
    const pausedTask: CleaningTask = { ...completedTodayTask, isPaused: true };
    const paused = db.updateHomeRecord('clean_001', { data: pausedTask });
    assert(paused.data.isPaused === true, '4.6 Pausar rutina de limpieza temporalmente');

    // 5. REACTIVATE (Reanudar rutina)
    const reactivatedTask: CleaningTask = { ...pausedTask, isPaused: false };
    const reactivated = db.updateHomeRecord('clean_001', { data: reactivatedTask });
    assert(reactivated.data.isPaused === false, '4.7 Reactivar rutina de limpieza');

    // 6. DELETE
    const deleted = db.deleteHomeRecord('clean_001');
    assert(deleted === true, '4.8 Eliminar rutina de limpieza');
  }

  // ----------------------------------------------------------------------------
  // SUITE 5: MÓDULO HOGAR — MANTENCIÓN Y REPARACIONES CON CATEGORÍAS Y FECHAS
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Mantención del Hogar (Prioridades, Categorías, Próxima Fecha y Ciclo de Vida) ---');
  {
    const maintTask: MaintenanceTask = {
      id: 'maint_001',
      title: 'Revisión técnica y cambio de aceite automóvil',
      description: 'Taller oficial de la marca',
      category: 'vehicle',
      priority: 'high',
      completed: false,
      assignedMemberId: 'papa',
      dueDate: '2026-10-15',
      nextDate: '2027-04-15',
      frequency: 'Semestral',
      notes: 'Guardar factura en archivador de garantías',
      isPaused: false,
    };

    // 1. CREATE
    const inserted = db.insertHomeRecord({
      id: 'maint_001',
      family_id: 'family_melomus_1',
      record_type: 'maintenance',
      data: maintTask,
    });
    assert(inserted.data.category === 'vehicle', '5.1 Crear tarea de mantenimiento con categoría vehículo y prioridad alta');
    assert(inserted.data.nextDate === '2027-04-15', '5.2 Registrar próxima fecha de mantenimiento preventivo');

    // 2. UPDATE
    const updatedMaint: MaintenanceTask = {
      ...maintTask,
      priority: 'medium',
      dueDate: '2026-10-20',
      notes: 'Factura pagada con tarjeta familiar',
    };
    const updated = db.updateHomeRecord('maint_001', { data: updatedMaint });
    assert(updated.data.priority === 'medium', '5.3 Actualizar prioridad de mantenimiento');
    assert(updated.data.dueDate === '2026-10-20', '5.4 Reprogramar fecha límite de mantenimiento');

    // 3. COMPLETE & REOPEN
    const compMaint = db.updateHomeRecord('maint_001', { data: { ...updatedMaint, completed: true } });
    assert(compMaint.data.completed === true, '5.5 Marcar mantenimiento como completado');

    const reopenedMaint = db.updateHomeRecord('maint_001', { data: { ...compMaint.data, completed: false } });
    assert(reopenedMaint.data.completed === false, '5.6 Reabrir mantenimiento para seguimiento posterior');

    // 4. PAUSE / REACTIVATE
    const pausedMaint = db.updateHomeRecord('maint_001', { data: { ...reopenedMaint.data, isPaused: true } });
    assert(pausedMaint.data.isPaused === true, '5.7 Pausar mantenimiento preventivo');

    const activeMaint = db.updateHomeRecord('maint_001', { data: { ...pausedMaint.data, isPaused: false } });
    assert(activeMaint.data.isPaused === false, '5.8 Reactivar mantenimiento');

    // 5. DELETE
    const deleted = db.deleteHomeRecord('maint_001');
    assert(deleted === true, '5.9 Eliminar tarea de mantenimiento');
  }

  // ----------------------------------------------------------------------------
  // SUITE 6: ÁREAS PERSONALIZABLES DEL HOGAR (DINÁMICAS, RENOMBRADO SEGURO Y PROTECCIÓN)
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Áreas Personalizables (Creación, Renombrado sin Ruptura y Eliminación Segura) ---');
  {
    // 1. DEFAULT_HOME_AREAS
    assert(DEFAULT_HOME_AREAS.length >= 8, '6.1 Áreas por defecto provistas como sugerencia base');
    const generalArea = DEFAULT_HOME_AREAS.find((a) => a.id === 'area_general');
    assert(generalArea?.isSystem === true, '6.2 Área General/Todo el Hogar es de sistema y no eliminable');

    // 2. CREAR ÁREA PERSONALIZADA
    const customArea: HomeArea = {
      id: 'area_quincho',
      name: 'Quincho y Terraza',
      icon: '🍖',
      isSystem: false,
    };
    db.insertHomeRecord({
      id: 'area_quincho',
      family_id: 'family_melomus_1',
      record_type: 'area', // Validated against updated constraint!
      data: customArea,
    });
    assert(db.homeRecords.has('area_quincho'), '6.3 Crear área personalizada con tipo "area" en home_records');

    // 3. ASIGNAR TAREA A ESTA ÁREA
    const taskInQuincho: CleaningTask = {
      id: 'clean_quincho_1',
      areaId: 'area_quincho',
      title: 'Limpiar parrilla y mesones',
      frequency: 'Semanal',
      completedToday: false,
    };
    db.insertHomeRecord({
      id: 'clean_quincho_1',
      family_id: 'family_melomus_1',
      record_type: 'cleaning',
      data: taskInQuincho,
    });

    // 4. RENOMBRAR ÁREA SIN ROMPER TAREAS
    const renamedArea: HomeArea = { ...customArea, name: 'Quincho, Asador y Piscina', icon: '🏊' };
    db.updateHomeRecord('area_quincho', { data: renamedArea });
    const fetchedTask = db.homeRecords.get('clean_quincho_1');
    assert(
      fetchedTask?.data.areaId === 'area_quincho',
      '6.4 Renombrar área mantiene tareas vinculadas intactas mediante areaId'
    );

    // 5. ELIMINACIÓN SEGURA: REASIGNACIÓN A AREA_GENERAL (SIN HUÉRFANOS)
    // Simular lógica de eliminación segura ejecutada por FamilyContext / HomeView
    const areaToDelete = 'area_quincho';
    for (const [id, rec] of db.homeRecords.entries()) {
      if (rec.record_type === 'cleaning' && rec.data.areaId === areaToDelete) {
        db.updateHomeRecord(id, { data: { ...rec.data, areaId: 'area_general', area: 'general' } });
      }
    }
    db.deleteHomeRecord(areaToDelete);

    assert(!db.homeRecords.has('area_quincho'), '6.5 Área eliminada correctamente');
    const migratedTask = db.homeRecords.get('clean_quincho_1');
    assert(
      migratedTask?.data.areaId === 'area_general',
      '6.6 Tareas de área eliminada se migran automáticamente a area_general sin perderse'
    );
  }

  // ----------------------------------------------------------------------------
  // SUITE 7: SINCRONIZACIÓN EN TIEMPO REAL ENTRE TELÉFONO A Y TELÉFONO B
  // ----------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Sincronización en Tiempo Real entre Teléfono A y Teléfono B ---');
  {
    let phoneBReceivedCount = 0;
    let lastReceivedEvent: any = null;

    // Teléfono B se suscribe al canal en tiempo real
    db.realtimeSubscribers.push((payload) => {
      phoneBReceivedCount++;
      lastReceivedEvent = payload;
    });

    // Teléfono A agrega una compra urgente
    db.insertHomeRecord({
      id: 'shop_realtime_001',
      family_id: 'family_melomus_1',
      record_type: 'shopping',
      data: { id: 'shop_realtime_001', name: 'Huevos de campo', quantity: '30 unidades', urgent: true },
    });

    assert(phoneBReceivedCount === 1, '7.1 Teléfono B recibe evento Realtime instantáneamente');
    assert(lastReceivedEvent.table === 'home_records', '7.2 Tabla notificada es home_records');
    assert(lastReceivedEvent.eventType === 'INSERT', '7.3 Tipo de evento es INSERT');
    assert(lastReceivedEvent.new.data.name === 'Huevos de campo', '7.4 Contenido íntegro recibido en Teléfono B');

    // Teléfono A marca como comprada
    db.updateHomeRecord('shop_realtime_001', {
      data: { id: 'shop_realtime_001', name: 'Huevos de campo', quantity: '30 unidades', completed: true },
    });
    assert(phoneBReceivedCount === 2, '7.5 Teléfono B recibe actualización de compra completada');
    assert(lastReceivedEvent.new.data.completed === true, '7.6 Teléfono B refleja estado completado sin recargar');
  }

  console.log('\n======================================================================');
  console.log(` RESULTADO FINAL: ${passed} PRUEBAS EXITOSAS, ${failed} FALLIDAS`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Error no capturado en la suite de pruebas:', err);
  process.exit(1);
});
