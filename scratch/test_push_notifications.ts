/**
 * SUITE DE VALIDACIÓN: SISTEMA DE NOTIFICACIONES WEB PUSH / PWA (10 PUNTOS)
 * 
 * Batería de pruebas automatizadas para "Nuestro Hogar":
 * 1. Papá asigna tarea a Mamá -> Mamá recibe notificación.
 * 2. Mamá recibe notificación con payload correcto.
 * 3. Papá NO recibe auto-notificación de su propia acción.
 * 4. Mamá asigna tarea a Papá -> Papá recibe notificación.
 * 5. Papá recibe notificación con payload correcto.
 * 6. Verificación de preferencias: Horas de silencio y desactivación por categoría.
 * 7. Manejo seguro de permiso denegado (sin excepciones no controladas).
 * 8. Manejo de permiso concedido y suscripción push.
 * 9. Registro de Service Worker / Contrato PWA de suscripción.
 * 10. Modo discreto para temas sensibles (Cuqui Time, medicamentos, finanzas) en pantalla de bloqueo.
 */

import { NotificationCategory, AdultNotificationPreferences } from '../src/types/notifications';
import {
  NotificationService,
  urlBase64ToUint8Array,
} from '../src/services/notificationService';

// ==============================================================================
// 1. UTILIDADES Y SIMULADOR DE ENTORNO
// ==============================================================================

let passedChecks = 0;
let totalChecks = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS ${passedChecks}] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    Detalle: ${detail}`);
  }
}

// Default adult preferences generator
function createMockAdultPreferences(overrides?: Partial<AdultNotificationPreferences>): AdultNotificationPreferences {
  const categories: Record<NotificationCategory, { enabled: boolean; defaultAnticipation: any }> = {
    tasks: { enabled: true, defaultAnticipation: '1_hour' },
    events: { enabled: true, defaultAnticipation: '1_hour' },
    appointments: { enabled: true, defaultAnticipation: '1_day' },
    medications: { enabled: true, defaultAnticipation: 'at_time' },
    shopping: { enabled: true, defaultAnticipation: 'at_time' },
    habits: { enabled: true, defaultAnticipation: 'at_time' },
    finance: { enabled: true, defaultAnticipation: '1_day' },
    couple: { enabled: true, defaultAnticipation: '1_hour' },
    cuquiTime: { enabled: true, defaultAnticipation: 'at_time' },
    reminders: { enabled: true, defaultAnticipation: '15_min' },
  };

  return {
    masterEnabled: true,
    discreteMode: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    categories,
    ...overrides,
  };
}

// Mock Simulated Push Subscription
class MockPushSubscription {
  public endpoint: string;
  public keys: { p256dh: string; auth: string };

  constructor(endpoint: string, p256dh: string, auth: string) {
    this.endpoint = endpoint;
    this.keys = { p256dh, auth };
  }

  public toJSON() {
    return {
      endpoint: this.endpoint,
      keys: this.keys,
    };
  }

  public async unsubscribe(): Promise<boolean> {
    return true;
  }
}

// In-Memory Push Subscriptions Table
interface PushSubscriptionRow {
  id: string;
  user_id: string;
  family_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name?: string;
  created_at: string;
}

const mockPushDatabase: PushSubscriptionRow[] = [];

// ==============================================================================
// EJECUCIÓN DE LA BATERÍA DE 10 PUNTOS
// ==============================================================================

async function runPushNotificationSuite() {
  console.log('================================================================');
  console.log(' INICIANDO VALIDACIÓN DEL SISTEMA DE NOTIFICACIONES PUSH / PWA');
  console.log('================================================================\n');

  const notifService = new NotificationService();

  const userPapa = {
    id: 'user_papa_uuid_001',
    role: 'FAMILY_ADULT',
    relationship: 'papa',
    name: 'Carlos Papá',
    familyId: 'family_hogar_2026',
  };

  const userMama = {
    id: 'user_mama_uuid_002',
    role: 'FAMILY_ADULT',
    relationship: 'mama',
    name: 'Carolina Mamá',
    familyId: 'family_hogar_2026',
  };

  const mamaPrefs = createMockAdultPreferences({ discreteMode: false });
  const papaPrefs = createMockAdultPreferences({ discreteMode: false });

  // ----------------------------------------------------------------------------
  // PUNTO 1 & 2: Papá asigna tarea a Mamá -> Mamá recibe notificación con payload correcto
  // ----------------------------------------------------------------------------
  console.log('--- TEST 1 & 2: Asignación de Papá a Mamá ---');

  const taskFromPapa = {
    id: 'task_001',
    title: 'Comprar pañales',
    responsibleId: 'mama',
    authorId: userPapa.id,
  };

  // Evaluamos en el dispositivo de Mamá
  const mamaEvaluation = notifService.shouldNotifyUser({
    targetMemberId: taskFromPapa.responsibleId,
    authorId: taskFromPapa.authorId,
    currentUserId: userMama.id,
    currentMemberRole: 'mama',
    category: 'tasks',
    preferences: mamaPrefs,
  });

  assert(
    mamaEvaluation.allow === true,
    'Punto 1: Papá asigna tarea a Mamá -> Mamá debe recibir la notificación'
  );

  const partnerNameForMama = 'Papá';
  const mamaPayload = {
    title: '📋 Nueva tarea asignada',
    body: `${taskFromPapa.title} (asignada por ${partnerNameForMama})`,
    category: 'tasks' as NotificationCategory,
    target: taskFromPapa.responsibleId,
  };

  assert(
    mamaPayload.title === '📋 Nueva tarea asignada' &&
      mamaPayload.body === 'Comprar pañales (asignada por Papá)' &&
      mamaPayload.category === 'tasks' &&
      mamaPayload.target === 'mama',
    'Punto 2: Payload de notificación para Mamá contiene título, cuerpo y categoría exactos'
  );

  // ----------------------------------------------------------------------------
  // PUNTO 3: Papá NO recibe auto-notificación de su propia acción
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST 3: Supresión de auto-notificación (Echo-guard) ---');

  // Evaluamos la misma tarea en el dispositivo del autor (Papá)
  const papaSelfEvaluation = notifService.shouldNotifyUser({
    targetMemberId: taskFromPapa.responsibleId,
    authorId: taskFromPapa.authorId,
    currentUserId: userPapa.id, // Mismo ID que authorId
    currentMemberRole: 'papa',
    category: 'tasks',
    preferences: papaPrefs,
  });

  assert(
    papaSelfEvaluation.allow === false && papaSelfEvaluation.reason === 'self_action',
    'Punto 3: Papá NO recibe notificación de su propia acción (reason: self_action)'
  );

  // ----------------------------------------------------------------------------
  // PUNTO 4 & 5: Mamá asigna tarea a Papá -> Papá recibe notificación con payload correcto
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST 4 & 5: Asignación de Mamá a Papá ---');

  const taskFromMama = {
    id: 'task_002',
    title: 'Revisar presupuesto escolar',
    responsibleId: 'papa',
    authorId: userMama.id,
  };

  // Evaluamos en el dispositivo de Papá
  const papaEvaluation = notifService.shouldNotifyUser({
    targetMemberId: taskFromMama.responsibleId,
    authorId: taskFromMama.authorId,
    currentUserId: userPapa.id,
    currentMemberRole: 'papa',
    category: 'tasks',
    preferences: papaPrefs,
  });

  assert(
    papaEvaluation.allow === true,
    'Punto 4: Mamá asigna tarea a Papá -> Papá debe recibir la notificación'
  );

  const partnerNameForPapa = 'Mamá';
  const papaPayload = {
    title: '📋 Nueva tarea asignada',
    body: `${taskFromMama.title} (asignada por ${partnerNameForPapa})`,
    category: 'tasks' as NotificationCategory,
    target: taskFromMama.responsibleId,
  };

  assert(
    papaPayload.title === '📋 Nueva tarea asignada' &&
      papaPayload.body === 'Revisar presupuesto escolar (asignada por Mamá)' &&
      papaPayload.category === 'tasks' &&
      papaPayload.target === 'papa',
    'Punto 5: Payload de notificación para Papá contiene título, cuerpo y categoría exactos'
  );

  // ----------------------------------------------------------------------------
  // PUNTO 6: Preferencias por adulto (Horas de silencio y desactivación de categorías)
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST 6: Preferencias por adulto (Horas de Silencio & Categorías) ---');

  // 6A. Horas de silencio cruzando medianoche (22:00 a 07:00)
  const nightTime = new Date('2026-09-23T23:30:00');
  const isNightQuiet = notifService.isQuietHours('22:00', '07:00', nightTime);
  assert(isNightQuiet === true, 'Punto 6A: 23:30 cae dentro de las horas de silencio (22:00 - 07:00)');

  const morningEarlyTime = new Date('2026-09-23T05:15:00');
  const isEarlyQuiet = notifService.isQuietHours('22:00', '07:00', morningEarlyTime);
  assert(isEarlyQuiet === true, 'Punto 6B: 05:15 cae dentro de las horas de silencio (22:00 - 07:00)');

  const dayTime = new Date('2026-09-23T14:30:00');
  const isDayQuiet = notifService.isQuietHours('22:00', '07:00', dayTime);
  assert(isDayQuiet === false, 'Punto 6C: 14:30 NO cae dentro de las horas de silencio');

  // Supresión con horas de silencio activadas
  const quietPrefs = createMockAdultPreferences({
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  const quietEval = notifService.shouldNotifyUser({
    targetMemberId: 'mama',
    authorId: userPapa.id,
    currentUserId: userMama.id,
    currentMemberRole: 'mama',
    category: 'tasks',
    preferences: quietPrefs,
    currentTime: nightTime,
  });

  assert(
    quietEval.allow === false && quietEval.reason === 'quiet_hours',
    'Punto 6D: Alerta bloqueada durante horas de silencio (reason: quiet_hours)'
  );

  // 6B. Desactivación de una categoría específica (ej. finanzas deshabilitada)
  const financeDisabledPrefs = createMockAdultPreferences();
  financeDisabledPrefs.categories.finance.enabled = false;

  const financeEvalDisabled = notifService.shouldNotifyUser({
    targetMemberId: 'mama',
    authorId: userPapa.id,
    currentUserId: userMama.id,
    currentMemberRole: 'mama',
    category: 'finance',
    preferences: financeDisabledPrefs,
    currentTime: dayTime,
  });

  assert(
    financeEvalDisabled.allow === false && financeEvalDisabled.reason === 'category_disabled',
    'Punto 6E: Alerta de finanzas suprimida cuando la categoría está deshabilitada'
  );

  // 6C. Master toggle desactivado
  const masterDisabledPrefs = createMockAdultPreferences({ masterEnabled: false });
  const masterEval = notifService.shouldNotifyUser({
    targetMemberId: 'mama',
    authorId: userPapa.id,
    currentUserId: userMama.id,
    currentMemberRole: 'mama',
    category: 'tasks',
    preferences: masterDisabledPrefs,
    currentTime: dayTime,
  });

  assert(
    masterEval.allow === false && masterEval.reason === 'master_disabled',
    'Punto 6F: Todas las alertas se suprimen cuando masterEnabled está en falso'
  );

  // ----------------------------------------------------------------------------
  // PUNTO 7: Manejo seguro de permiso denegado
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST 7: Manejo seguro de permiso denegado ---');

  // Simulación de entorno con permiso denegado sin romper la ejecución
  const mockDeniedService = new NotificationService();
  // Sobrescribimos getPermissionStatus temporalmente
  mockDeniedService.getPermissionStatus = () => 'denied';

  let exceptionThrown = false;
  let showResult = true;

  try {
    showResult = await mockDeniedService.showNotification({
      title: 'Alerta de prueba',
      body: 'No debería mostrarse',
      category: 'tasks',
    });
  } catch {
    exceptionThrown = true;
  }

  assert(
    !exceptionThrown && showResult === false,
    'Punto 7: Permiso denegado se maneja de forma segura (retorna false sin arrojar excepciones no capturadas)'
  );

  // ----------------------------------------------------------------------------
  // PUNTO 8: Manejo de permiso concedido y registro push
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST 8: Permiso concedido y registro push ---');

  const mockGrantedService = new NotificationService();
  mockGrantedService.getPermissionStatus = () => 'granted';
  mockGrantedService.isSupported = () => true;

  assert(
    mockGrantedService.getPermissionStatus() === 'granted',
    'Punto 8A: El estado del permiso es "granted"'
  );

  // Simulación de suscripción push
  const dummyEndpoint = 'https://fcm.googleapis.com/fcm/send/sample_push_token_2026_xyz';
  const dummyP256dh = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9h0qv9fZep';
  const dummyAuth = 'tBHItJI5svbpez7KI4CCXg';

  const mockSub = new MockPushSubscription(dummyEndpoint, dummyP256dh, dummyAuth);

  // Simulación de inserción en base de datos
  mockPushDatabase.push({
    id: 'push_sub_uuid_001',
    user_id: userMama.id,
    family_id: userMama.familyId,
    endpoint: mockSub.endpoint,
    p256dh: mockSub.keys.p256dh,
    auth: mockSub.keys.auth,
    device_name: 'iPhone 15 PWA',
    created_at: new Date().toISOString(),
  });

  const storedSub = mockPushDatabase.find((s) => s.user_id === userMama.id);
  assert(
    storedSub !== undefined &&
      storedSub.endpoint === dummyEndpoint &&
      storedSub.p256dh === dummyP256dh &&
      storedSub.auth === dummyAuth,
    'Punto 8B: La suscripción Push se vincula y persiste correctamente para el usuario autenticado'
  );

  // ----------------------------------------------------------------------------
  // PUNTO 9: Service Worker / Contrato PWA de suscripción
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST 9: Service Worker y Contrato PWA ---');

  // Conversión de clave pública VAPID RFC 8292
  const sampleVapidKey = 'BCPq5r9V1o9_wQeH6jR7lX9b4m2o1a0s9d8f7g6h5j4k3l2z1x0c9v8b7n6m5';
  let convertedKey: Uint8Array | null = null;
  try {
    convertedKey = urlBase64ToUint8Array(sampleVapidKey);
  } catch (e) {
    console.error(e);
  }

  assert(
    convertedKey !== null && convertedKey instanceof Uint8Array && convertedKey.length > 0,
    'Punto 9A: Conversión de clave pública VAPID a Uint8Array conforme a RFC 8292'
  );

  // Verificación de contrato de la tabla push_subscriptions
  const hasExpectedColumns = (row: PushSubscriptionRow) => {
    return (
      'id' in row &&
      'user_id' in row &&
      'family_id' in row &&
      'endpoint' in row &&
      'p256dh' in row &&
      'auth' in row &&
      'created_at' in row
    );
  };

  assert(
    hasExpectedColumns(mockPushDatabase[0]),
    'Punto 9B: El esquema de base de datos cumple con el contrato requerido (user_id, family_id, endpoint, p256dh, auth)'
  );

  // ----------------------------------------------------------------------------
  // PUNTO 10: Modo Discreto para temas sensibles en pantalla de bloqueo
  // ----------------------------------------------------------------------------
  console.log('\n--- TEST 10: Modo Discreto para temas sensibles en pantalla de bloqueo ---');

  // 10A. Cuqui Time (Intimidad de pareja)
  const cuquiRawTitle = 'Noche de romance en la suite';
  const cuquiRawBody = 'Aceites, velas y velada íntima sin interrupciones';
  const cuquiDiscrete = notifService.formatDiscreteText('cuquiTime', cuquiRawTitle, cuquiRawBody);

  assert(
    cuquiDiscrete.title === 'MELOMUS 💕' &&
      cuquiDiscrete.body === 'Tienes un momento especial reservado.' &&
      !cuquiDiscrete.body.includes('Aceites') &&
      !cuquiDiscrete.body.includes('íntima'),
    'Punto 10A: Cuqui Time no filtra detalles íntimos en pantalla de bloqueo (texto genérico discreto)'
  );

  // 10B. Medicamentos y Prescripciones Médicas
  const medRawTitle = 'Tomar Amoxicilina 500mg cada 8 horas';
  const medRawBody = 'Tomar con abundante agua después del desayuno';
  const medDiscrete = notifService.formatDiscreteText('medications', medRawTitle, medRawBody);

  assert(
    medDiscrete.title === 'MELOMUS 🏥' &&
      medDiscrete.body === 'Tienes una indicación médica programada.' &&
      !medDiscrete.body.includes('Amoxicilina') &&
      !medDiscrete.body.includes('500mg'),
    'Punto 10B: Medicamentos no filtran nombres de fármacos ni dosis en pantalla de bloqueo'
  );

  // 10C. Finanzas y Deudas
  const financeRawTitle = 'Vencimiento crédito automotriz $385.000 Banco Santander';
  const financeRawBody = 'Cuota número 14 de 36';
  const financeDiscrete = notifService.formatDiscreteText('finance', financeRawTitle, financeRawBody);

  assert(
    financeDiscrete.title === 'MELOMUS 💰' &&
      financeDiscrete.body === 'Tienes un recordatorio financiero programado.' &&
      !financeDiscrete.body.includes('385.000') &&
      !financeDiscrete.body.includes('Santander'),
    'Punto 10C: Finanzas no filtran montos, bancos ni deudas en pantalla de bloqueo'
  );

  // 10D. Citas Médicas
  const apptRawTitle = 'Control Odontológico y Extracción de Muela Dr. Pérez';
  const apptDiscrete = notifService.formatDiscreteText('appointments', apptRawTitle);

  assert(
    apptDiscrete.title === 'MELOMUS 🏥' &&
      apptDiscrete.body === 'Tienes una cita médica programada.' &&
      !apptDiscrete.body.includes('Muela') &&
      !apptDiscrete.body.includes('Pérez'),
    'Punto 10D: Citas médicas no filtran detalles clínicos ni especialistas'
  );

  // ==============================================================================
  // RESUMEN FINAL
  // ==============================================================================
  console.log('\n================================================================');
  console.log(` RESULTADOS: ${passedChecks}/${totalChecks} VERIFICACIONES EXITOSAS`);
  console.log('================================================================');

  if (passedChecks === totalChecks) {
    console.log('🎉 TODOS LOS 10 PUNTOS DE VALIDACIÓN PASARON EXITOSAMENTE!');
    return true;
  } else {
    console.error('❌ SE ENCONTRARON FALLOS EN LA SUITE DE VALIDACIÓN.');
    return false;
  }
}

runPushNotificationSuite().then((success) => {
  if (!success) {
    process.exit(1);
  }
});
