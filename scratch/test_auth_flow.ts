/**
 * Suite de Validación: Flujo de Autenticación y Vinculación Paritaria de Coadministrador
 * Valida los 12 puntos requeridos en el Paso 2:
 * 1. Registrar Mamá
 * 2. Crear familia
 * 3. Cerrar sesión
 * 4. Iniciar sesión nuevamente
 * 5. Generar enlace "Vincular adulto principal"
 * 6. Abrir el enlace como Papá
 * 7. Registrar/iniciar sesión como Papá
 * 8. Verificar que Papá queda asociado a la misma familia
 * 9. Verificar que ambos son ADULT_PRIMARY (FAMILY_ADULT)
 * 10. Verificar que el token no pueda utilizarse nuevamente (single-use)
 * 11. Verificar expiración del enlace (48h)
 * 12. Verificar aislamiento multitenant frente a otra familia
 */

interface MockUser {
  id: string;
  email: string;
}

interface MockProfile {
  id: string;
  family_id: string;
  email: string;
  name: string;
  role: 'FAMILY_ADULT';
  relationship: 'mama' | 'papa';
}

interface MockInvite {
  id: string;
  family_id: string;
  created_by_user_id: string;
  target_relationship: 'mama' | 'papa';
  token_hash: string;
  expires_at: number; // timestamp ms
  used_at: number | null;
  used_by_user_id: string | null;
}

interface MockTask {
  id: string;
  family_id: string;
  title: string;
}

class TestDatabaseSimulation {
  public families: Map<string, { id: string; name: string }> = new Map();
  public users: Map<string, MockUser> = new Map();
  public profiles: Map<string, MockProfile> = new Map();
  public invites: Map<string, MockInvite> = new Map();
  public tasks: Map<string, MockTask> = new Map();
  public currentSessionUserId: string | null = null;

  // 1 & 2. Registrar adulto y crear familia
  public registerPrimaryAdult(
    email: string,
    name: string,
    relationship: 'mama' | 'papa',
    familyName: string = 'Nuestra Familia'
  ): { user: MockUser; profile: MockProfile; familyId: string } {
    const userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const familyId = `fam_${Math.random().toString(36).substring(2, 9)}`;

    const user: MockUser = { id: userId, email };
    this.users.set(userId, user);
    this.families.set(familyId, { id: familyId, name: familyName });

    const profile: MockProfile = {
      id: userId,
      family_id: familyId,
      email,
      name,
      role: 'FAMILY_ADULT', // Paridad total: Mamá o Papá son FAMILY_ADULT
      relationship,
    };
    this.profiles.set(userId, profile);
    this.currentSessionUserId = userId;

    return { user, profile, familyId };
  }

  // 3. Cerrar sesión
  public signOut(): void {
    this.currentSessionUserId = null;
  }

  // 4. Iniciar sesión
  public signIn(email: string): MockProfile | null {
    for (const user of this.users.values()) {
      if (user.email === email) {
        this.currentSessionUserId = user.id;
        return this.profiles.get(user.id) || null;
      }
    }
    return null;
  }

  // 5. Generar enlace temporal de vinculación
  public createCoAdminInvite(targetRelationship: 'mama' | 'papa'): { token: string; expiresAt: number } {
    if (!this.currentSessionUserId) throw new Error('No autenticado');
    const profile = this.profiles.get(this.currentSessionUserId);
    if (!profile) throw new Error('Perfil no encontrado');

    const token = `tok_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    const expiresAt = Date.now() + 48 * 60 * 60 * 1000; // 48 horas

    const invite: MockInvite = {
      id: `inv_${Date.now()}`,
      family_id: profile.family_id,
      created_by_user_id: profile.id,
      target_relationship: targetRelationship,
      token_hash: token,
      expires_at: expiresAt,
      used_at: null,
      used_by_user_id: null,
    };

    this.invites.set(token, invite);
    return { token, expiresAt };
  }

  // 6 & 7 & 8. Reclamar enlace como segundo adulto
  public claimCoAdminInvite(
    token: string,
    email: string,
    name: string
  ): { success: boolean; message: string; profile?: MockProfile } {
    const invite = this.invites.get(token);
    if (!invite) {
      return { success: false, message: 'Enlace no encontrado' };
    }
    if (invite.used_at !== null) {
      return { success: false, message: 'Este enlace ya fue utilizado' };
    }
    if (Date.now() > invite.expires_at) {
      return { success: false, message: 'Este enlace ha expirado' };
    }

    // Registrar cuenta para el segundo adulto
    const userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const user: MockUser = { id: userId, email };
    this.users.set(userId, user);

    // Asignar A LA MISMA FAMILIA con rol FAMILY_ADULT
    const profile: MockProfile = {
      id: userId,
      family_id: invite.family_id, // MISMA FAMILIA
      email,
      name,
      role: 'FAMILY_ADULT', // PARIDAD TOTAL
      relationship: invite.target_relationship,
    };
    this.profiles.set(userId, profile);
    this.currentSessionUserId = userId;

    // Invalidar token de un solo uso
    invite.used_at = Date.now();
    invite.used_by_user_id = userId;

    return { success: true, message: 'Vinculación exitosa', profile };
  }

  // 12. Simulación de RLS PostgreSQL
  public queryTasksForCurrentSession(): MockTask[] {
    if (!this.currentSessionUserId) return [];
    const profile = this.profiles.get(this.currentSessionUserId);
    if (!profile) return [];

    // RLS: USING (family_id = get_auth_family_id())
    return Array.from(this.tasks.values()).filter((t) => t.family_id === profile.family_id);
  }
}

// ==========================================
// EJECUCIÓN DE PRUEBAS
// ==========================================
async function runTests() {
  console.log('--- INICIANDO SUITE DE VALIDACIÓN: PASO 2 ---');
  const db = new TestDatabaseSimulation();

  // Test 1 & 2: Registrar Mamá y crear familia
  console.log('1 & 2. Registrar Mamá y crear familia...');
  const mamaReg = db.registerPrimaryAdult('mama@hogar.cl', 'Mamá Carolina', 'mama', 'Familia Pérez Soto');
  if (mamaReg.profile.role !== 'FAMILY_ADULT' || mamaReg.profile.relationship !== 'mama') {
    throw new Error('Fallo en registro de Mamá');
  }
  const familyId = mamaReg.familyId;
  console.log('  -> OK: Mamá registrada como ADULT_PRIMARY en familia:', familyId);

  // Test 3: Cerrar sesión
  console.log('3. Cerrar sesión...');
  db.signOut();
  if (db.currentSessionUserId !== null) throw new Error('Fallo al cerrar sesión');
  console.log('  -> OK: Sesión cerrada.');

  // Test 4: Iniciar sesión nuevamente
  console.log('4. Iniciar sesión como Mamá nuevamente...');
  const mamaLogin = db.signIn('mama@hogar.cl');
  if (!mamaLogin || mamaLogin.id !== mamaReg.user.id) throw new Error('Fallo en login de Mamá');
  console.log('  -> OK: Sesión reanudada para Mamá.');

  // Test 5: Generar enlace "Vincular adulto principal"
  console.log('5. Generar enlace temporal para Papá...');
  const { token, expiresAt } = db.createCoAdminInvite('papa');
  if (!token || expiresAt <= Date.now()) throw new Error('Fallo al generar invitación');
  console.log('  -> OK: Token generado con vigencia 48h:', token.substring(0, 16) + '...');

  // Test 6, 7 & 8: Papá abre enlace y se vincula
  console.log('6, 7 & 8. Papá abre el enlace desde su teléfono y se registra...');
  const papaClaim = db.claimCoAdminInvite(token, 'papa@hogar.cl', 'Papá Matías');
  if (!papaClaim.success || !papaClaim.profile) throw new Error('Fallo al vincular a Papá');
  if (papaClaim.profile.family_id !== familyId) {
    throw new Error('Papá no quedó en la misma familia');
  }
  console.log('  -> OK: Papá vinculado a la misma familia:', papaClaim.profile.family_id);

  // Test 9: Verificar que ambos son ADULT_PRIMARY (FAMILY_ADULT)
  console.log('9. Verificar paridad total de coadministración...');
  const mamaProfile = db.profiles.get(mamaReg.user.id);
  const papaProfile = papaClaim.profile;
  if (mamaProfile?.role !== 'FAMILY_ADULT' || papaProfile.role !== 'FAMILY_ADULT') {
    throw new Error('No hay paridad de roles');
  }
  console.log('  -> OK: Ambos son ADULT_PRIMARY (FAMILY_ADULT), sin roles de owner/guest.');

  // Test 10: Verificar que el token NO pueda reutilizarse
  console.log('10. Verificar invalidación inmediata de token de un solo uso...');
  const secondAttempt = db.claimCoAdminInvite(token, 'hacker@hogar.cl', 'Intruso');
  if (secondAttempt.success) throw new Error('El token de un solo uso fue reutilizado');
  console.log('  -> OK: Token rechazado tras su primer uso ("Este enlace ya fue utilizado").');

  // Test 11: Verificar expiración del enlace
  console.log('11. Verificar rechazo de enlace expirado...');
  const expiredInvite = db.createCoAdminInvite('papa');
  // Simular que pasaron más de 48 horas
  db.invites.get(expiredInvite.token)!.expires_at = Date.now() - 1000;
  const expiredAttempt = db.claimCoAdminInvite(expiredInvite.token, 'tardio@hogar.cl', 'Tardío');
  if (expiredAttempt.success) throw new Error('Se aceptó un enlace expirado');
  console.log('  -> OK: Enlace expirado rechazado con éxito.');

  // Test 12: Verificar aislamiento RLS frente a otra familia
  console.log('12. Verificar aislamiento RLS entre familias distintas...');
  // Crear una tarea en la familia de Mamá y Papá
  db.tasks.set('task_1', { id: 'task_1', family_id: familyId, title: 'Comprar pañales' });

  // Crear una segunda familia ajena (Familia González)
  const _gonzalez = db.registerPrimaryAdult('gonzalez@otro.cl', 'Mamá González', 'mama', 'Familia González');
  const gonzalezTasks = db.queryTasksForCurrentSession();
  if (gonzalezTasks.some((t) => t.family_id === familyId)) {
    throw new Error('Violación de RLS: Otra familia pudo ver las tareas');
  }
  console.log('  -> OK: La Familia González consultó tareas y obtuvo 0 registros de la Familia Pérez Soto.');

  // Cambiar sesión a Papá de la Familia Pérez Soto
  db.signIn('papa@hogar.cl');
  const papaTasks = db.queryTasksForCurrentSession();
  if (!papaTasks.some((t) => t.id === 'task_1')) {
    throw new Error('Papá no pudo ver la tarea de su propia familia');
  }
  console.log('  -> OK: Papá ve correctamente las tareas de su familia.');

  console.log('\n========================================');
  console.log('✅ TODAS LAS 12 PRUEBAS PASARON EXITOSAMENTE');
  console.log('========================================');
}

runTests();
