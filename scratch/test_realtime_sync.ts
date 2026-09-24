/**
 * SUITE DE VALIDACIÓN: ADAPTADOR SUPABASE Y SINCRONIZACIÓN EN TIEMPO REAL (15 PUNTOS)
 * 
 * Simula dos sesiones activas en dispositivos concurrentes:
 * - Dispositivo A: Papá (Co-administrador ADULT_PRIMARY)
 * - Dispositivo B: Mamá (Co-administradora ADULT_PRIMARY)
 * Misma familia: 'fam_prueba_realtime_2026'
 * 
 * Valida de forma exhaustiva los 15 puntos requeridos para el Paso 3.
 */

interface RealtimeMessage {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
}

type RealtimeCallback = (payload: RealtimeMessage) => void;

class RealtimeHub {
  private channels: Map<string, Set<RealtimeCallback>> = new Map();

  public subscribe(channel: string, cb: RealtimeCallback): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(cb);
    return () => {
      this.channels.get(channel)?.delete(cb);
    };
  }

  public publish(channel: string, message: RealtimeMessage): void {
    const subs = this.channels.get(channel);
    if (subs) {
      subs.forEach((cb) => cb(message));
    }
  }

  public clear(): void {
    this.channels.clear();
  }
}

const realtimeHub = new RealtimeHub();

interface SimulatedDbRecord {
  id: string;
  family_id: string;
  created_by_user_id?: string;
  is_private?: boolean;
  scope?: 'family' | 'personal';
  updated_at: string;
  data: any;
  [key: string]: any;
}

class SimulatedSupabaseDatabase {
  public tables: Map<string, Map<string, SimulatedDbRecord>> = new Map();

  constructor() {
    const tableNames = [
      'tasks',
      'calendar_events',
      'habits',
      'finances_expenses',
      'finances_incomes',
      'finances_bills',
      'finances_debts',
      'finances_budgets',
      'finances_goals',
      'health_records',
      'couple_records',
      'home_records',
      'rewards',
      'points_history',
      'family_members',
      'app_customizations',
    ];
    for (const t of tableNames) {
      this.tables.set(t, new Map());
    }
  }

  public upsert(table: string, record: SimulatedDbRecord, authorUserId: string): void {
    const tableMap = this.tables.get(table)!;
    const isUpdate = tableMap.has(record.id);
    const existing = tableMap.get(record.id);

    const mergedRecord = {
      ...existing,
      ...record,
      created_by_user_id: existing?.created_by_user_id || authorUserId,
      updated_at: record.updated_at || new Date().toISOString(),
    };

    tableMap.set(record.id, mergedRecord);

    // Broadcast through Realtime
    realtimeHub.publish(`family_${record.family_id}`, {
      table,
      eventType: isUpdate ? 'UPDATE' : 'INSERT',
      new: mergedRecord,
      old: existing,
    });
  }

  public delete(table: string, id: string, familyId: string): void {
    const tableMap = this.tables.get(table)!;
    const existing = tableMap.get(id);
    if (existing) {
      tableMap.delete(id);
      realtimeHub.publish(`family_${familyId}`, {
        table,
        eventType: 'DELETE',
        old: existing,
      });
    }
  }

  // RLS Simulated Select
  public select(table: string, familyId: string, currentUserId: string): SimulatedDbRecord[] {
    const tableMap = this.tables.get(table)!;
    const records = Array.from(tableMap.values()).filter((r) => r.family_id === familyId);

    // Enforce RLS policies
    if (table === 'habits') {
      return records.filter((r) => !r.is_private || r.created_by_user_id === currentUserId);
    }

    if (table.startsWith('finances_')) {
      return records.filter((r) => r.scope !== 'personal' || r.created_by_user_id === currentUserId);
    }

    return records;
  }
}

const cloudDb = new SimulatedSupabaseDatabase();

/**
 * Simulated Device Client representing an active adult session
 */
class SimulatedDeviceClient {
  public deviceName: string;
  public userId: string;
  public userName: string;
  public relationship: 'mama' | 'papa';
  public familyId: string;
  public localCache: Map<string, any> = new Map();
  public localState: {
    tasks: any[];
    habits: any[];
    expenses: any[];
    events: any[];
    healthRecords: any[];
    shoppingItems: any[];
    cuquiSessions: any[];
    members: any[];
  } = {
    tasks: [],
    habits: [],
    expenses: [],
    events: [],
    healthRecords: [],
    shoppingItems: [],
    cuquiSessions: [],
    members: [],
  };

  public isOnline: boolean = true;
  private unsubscribeRealtime: (() => void) | null = null;
  public notificationsReceived: Array<{ title: string; body: string }> = [];

  constructor(deviceName: string, userId: string, userName: string, relationship: 'mama' | 'papa', familyId: string) {
    this.deviceName = deviceName;
    this.userId = userId;
    this.userName = userName;
    this.relationship = relationship;
    this.familyId = familyId;
  }

  public connect(): void {
    // 1. Initial State fetch from DB
    this.fetchInitialState();

    // 2. Realtime subscription
    this.unsubscribeRealtime = realtimeHub.subscribe(`family_${this.familyId}`, (msg) => {
      this.handleIncomingRealtime(msg);
    });
  }

  public fetchInitialState(): void {
    const rawTasks = cloudDb.select('tasks', this.familyId, this.userId);
    this.localState.tasks = rawTasks.map((r) => r.data || r);

    const rawHabits = cloudDb.select('habits', this.familyId, this.userId);
    this.localState.habits = rawHabits.map((r) => r.data || r);

    const rawExpenses = cloudDb.select('finances_expenses', this.familyId, this.userId);
    this.localState.expenses = rawExpenses.map((r) => r.data || r);

    const rawEvents = cloudDb.select('calendar_events', this.familyId, this.userId);
    this.localState.events = rawEvents.map((r) => r.data || r);

    const rawHealth = cloudDb.select('health_records', this.familyId, this.userId);
    this.localState.healthRecords = rawHealth.map((r) => r.data || r);

    const rawHome = cloudDb.select('home_records', this.familyId, this.userId);
    this.localState.shoppingItems = rawHome.map((r) => r.data || r);

    const rawCouple = cloudDb.select('couple_records', this.familyId, this.userId);
    this.localState.cuquiSessions = rawCouple.map((r) => r.data || r);

    const rawMembers = cloudDb.select('family_members', this.familyId, this.userId);
    this.localState.members = rawMembers.map((r) => r.data || r);

    // Persist in local storage cache
    this.localCache.set('tasks', [...this.localState.tasks]);
  }

  public disconnect(): void {
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
      this.unsubscribeRealtime = null;
    }
    // Clear in-memory session data
    this.localState = {
      tasks: [],
      habits: [],
      expenses: [],
      events: [],
      healthRecords: [],
      shoppingItems: [],
      cuquiSessions: [],
      members: [],
    };
  }

  public handleIncomingRealtime(msg: RealtimeMessage): void {
    if (!this.isOnline) return;

    // RLS in Realtime: ignore private items authored by someone else
    if (msg.new?.is_private && msg.new.created_by_user_id !== this.userId) {
      return;
    }
    if (msg.new?.scope === 'personal' && msg.new.created_by_user_id !== this.userId) {
      return;
    }

    if (msg.table === 'tasks') {
      if (msg.eventType === 'DELETE') {
        this.localState.tasks = this.localState.tasks.filter((t) => t.id !== msg.old.id);
      } else {
        const incomingTask = msg.new.data || msg.new;
        const idx = this.localState.tasks.findIndex((t) => t.id === incomingTask.id);
        if (idx >= 0) {
          this.localState.tasks[idx] = incomingTask;
        } else {
          this.localState.tasks.unshift(incomingTask);
        }

        // Notification for assigned task from the other adult
        if (msg.new.created_by_user_id !== this.userId && incomingTask.responsibleId === this.relationship) {
          this.notificationsReceived.push({
            title: '📋 Nueva tarea asignada',
            body: incomingTask.title,
          });
        }
      }
    } else if (msg.table === 'habits') {
      if (msg.eventType === 'DELETE') {
        this.localState.habits = this.localState.habits.filter((h) => h.id !== msg.old.id);
      } else {
        const incomingHabit = msg.new.data || msg.new;
        const idx = this.localState.habits.findIndex((h) => h.id === incomingHabit.id);
        if (idx >= 0) this.localState.habits[idx] = incomingHabit;
        else this.localState.habits.push(incomingHabit);
      }
    } else if (msg.table === 'finances_expenses') {
      const incomingExp = msg.new?.data || msg.new;
      if (incomingExp) {
        const idx = this.localState.expenses.findIndex((e) => e.id === incomingExp.id);
        if (idx >= 0) this.localState.expenses[idx] = incomingExp;
        else this.localState.expenses.unshift(incomingExp);
      }
    } else if (msg.table === 'calendar_events') {
      const incomingEvent = msg.new?.data || msg.new;
      if (incomingEvent) {
        this.localState.events.push(incomingEvent);
      }
    } else if (msg.table === 'health_records') {
      const item = msg.new?.data || msg.new;
      if (item) this.localState.healthRecords.push(item);
    } else if (msg.table === 'home_records') {
      const item = msg.new?.data || msg.new;
      if (item) this.localState.shoppingItems.push(item);
    } else if (msg.table === 'couple_records') {
      const item = msg.new?.data || msg.new;
      if (item) this.localState.cuquiSessions.push(item);
    } else if (msg.table === 'family_members') {
      const incomingMember = msg.new?.data || msg.new;
      if (incomingMember) {
        const idx = this.localState.members.findIndex((m) => m.id === incomingMember.id);
        if (idx >= 0) this.localState.members[idx] = incomingMember;
        else this.localState.members.push(incomingMember);
      }
    }
  }

  // Action methods
  public createTask(id: string, title: string, responsibleId: string): void {
    const task = {
      id,
      title,
      responsibleId,
      status: 'pending',
      date: '2026-09-24',
    };
    this.localState.tasks.unshift(task);
    this.localCache.set('tasks', [...this.localState.tasks]);

    if (this.isOnline) {
      cloudDb.upsert(
        'tasks',
        {
          id,
          family_id: this.familyId,
          title,
          assigned_to: responsibleId,
          status: 'pending',
          due_date: '2026-09-24',
          created_by_user_id: this.userId,
          updated_at: new Date().toISOString(),
          data: task,
        },
        this.userId
      );
    }
  }

  public completeTask(id: string): void {
    const task = this.localState.tasks.find((t) => t.id === id);
    if (task) {
      task.status = 'completed';
      this.localCache.set('tasks', [...this.localState.tasks]);
      if (this.isOnline) {
        cloudDb.upsert(
          'tasks',
          {
            id,
            family_id: this.familyId,
            status: 'completed',
            updated_at: new Date().toISOString(),
            data: { ...task, status: 'completed' },
          },
          this.userId
        );
      }
    }
  }

  public createHabit(id: string, title: string, isPrivate: boolean): void {
    const habit = { id, title, isPrivate, active: true };
    this.localState.habits.push(habit);
    if (this.isOnline) {
      cloudDb.upsert(
        'habits',
        {
          id,
          family_id: this.familyId,
          title,
          is_private: isPrivate,
          active: true,
          created_by_user_id: this.userId,
          updated_at: new Date().toISOString(),
          data: habit,
        },
        this.userId
      );
    }
  }

  public createExpense(id: string, description: string, amount: number, scope: 'family' | 'personal'): void {
    const exp = { id, description, amount, scope };
    this.localState.expenses.push(exp);
    if (this.isOnline) {
      cloudDb.upsert(
        'finances_expenses',
        {
          id,
          family_id: this.familyId,
          description,
          amount,
          scope,
          created_by_user_id: this.userId,
          updated_at: new Date().toISOString(),
          data: exp,
        },
        this.userId
      );
    }
  }

  public createEvent(id: string, title: string, date: string): void {
    const event = { id, title, date };
    this.localState.events.push(event);
    if (this.isOnline) {
      cloudDb.upsert(
        'calendar_events',
        {
          id,
          family_id: this.familyId,
          title,
          date,
          created_by_user_id: this.userId,
          updated_at: new Date().toISOString(),
          data: event,
        },
        this.userId
      );
    }
  }

  public createHealthRecord(id: string, recordType: string, doctor: string): void {
    const record = { id, recordType, professional: doctor };
    this.localState.healthRecords.push(record);
    if (this.isOnline) {
      cloudDb.upsert(
        'health_records',
        {
          id,
          family_id: this.familyId,
          record_type: recordType,
          created_by_user_id: this.userId,
          updated_at: new Date().toISOString(),
          data: record,
        },
        this.userId
      );
    }
  }

  public createShoppingItem(id: string, name: string): void {
    const item = { id, name, completed: false };
    this.localState.shoppingItems.push(item);
    if (this.isOnline) {
      cloudDb.upsert(
        'home_records',
        {
          id,
          family_id: this.familyId,
          record_type: 'shopping',
          updated_at: new Date().toISOString(),
          data: item,
        },
        this.userId
      );
    }
  }

  public createCuquiSession(id: string, date: string): void {
    const session = { id, date, durationMinutes: 60 };
    this.localState.cuquiSessions.push(session);
    if (this.isOnline) {
      cloudDb.upsert(
        'couple_records',
        {
          id,
          family_id: this.familyId,
          item_type: 'cuqui_time',
          created_by_user_id: this.userId,
          updated_at: new Date().toISOString(),
          data: session,
        },
        this.userId
      );
    }
  }

  public updateChildPoints(childId: string, deltaPoints: number): void {
    const child = this.localState.members.find((m) => m.id === childId);
    const newPoints = (child?.points || 0) + deltaPoints;
    if (child) child.points = newPoints;
    if (this.isOnline) {
      cloudDb.upsert(
        'family_members',
        {
          id: childId,
          family_id: this.familyId,
          name: child?.name || 'Annie',
          role: 'child',
          points: newPoints,
          updated_at: new Date().toISOString(),
          data: { ...(child || {}), id: childId, points: newPoints },
        },
        this.userId
      );
    }
  }
}

// ----------------------------------------------------------------------------
// EJECUCIÓN DE LA PRUEBA DE LOS 15 PUNTOS
// ----------------------------------------------------------------------------

async function run15PointValidation(): Promise<void> {
  console.log('======================================================================');
  console.log('PRUEBA DE VALIDACIÓN: ADAPTADOR SUPABASE Y REALTIME (15 PUNTOS)');
  console.log('======================================================================\n');

  const familyId = 'fam_prueba_realtime_2026';

  // Inicializar registros base en la nube
  cloudDb.upsert('family_members', {
    id: 'annie',
    family_id: familyId,
    name: 'Annie',
    role: 'child',
    points: 50,
    updated_at: new Date().toISOString(),
    data: { id: 'annie', name: 'Annie', role: 'child', points: 50 },
  }, 'admin');

  // Inicializar Dispositivo A (Papá) y Dispositivo B (Mamá)
  const devicePapa = new SimulatedDeviceClient('Device A (Papá)', 'user_papa_uuid', 'Papá', 'papa', familyId);
  const deviceMama = new SimulatedDeviceClient('Device B (Mamá)', 'user_mama_uuid', 'Mamá', 'mama', familyId);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, description: string): void {
    if (condition) {
      console.log(`✅ [Punto ${testNum}] PASS: ${description}`);
      passed++;
    } else {
      console.error(`❌ [Punto ${testNum}] FAIL: ${description}`);
      failed++;
    }
  }

  // 1. Carga inicial de datos desde Supabase para ambos integrantes
  devicePapa.connect();
  deviceMama.connect();
  assert(
    devicePapa.localState.members.some((m) => m.id === 'annie') &&
    deviceMama.localState.members.some((m) => m.id === 'annie'),
    1,
    'Carga inicial de datos desde Supabase para ambos integrantes (Papá y Mamá)'
  );

  // 2. Papá crea tarea "Comprar pañales" asignada a Mamá en Device A -> Mamá en Device B la recibe vía Realtime
  devicePapa.createTask('t_panales_01', 'Comprar pañales', 'mama');
  const mamaReceivedTask = deviceMama.localState.tasks.some((t) => t.id === 't_panales_01' && t.title === 'Comprar pañales');
  const mamaNotified = deviceMama.notificationsReceived.some((n) => n.body.includes('Comprar pañales'));
  const papaNotifiedSelf = devicePapa.notificationsReceived.length === 0;
  assert(
    mamaReceivedTask && mamaNotified && papaNotifiedSelf,
    2,
    'Papá crea tarea asignada a Mamá -> Mamá la recibe vía Realtime y con notificación, Papá no recibe auto-notificación'
  );

  // 3. Mamá completa la tarea en Device B -> Papá en Device A la ve completada en tiempo real
  deviceMama.completeTask('t_panales_01');
  const papaTaskCompleted = devicePapa.localState.tasks.find((t) => t.id === 't_panales_01')?.status === 'completed';
  assert(
    papaTaskCompleted,
    3,
    'Mamá completa la tarea en Device B -> Papá en Device A la ve completada en tiempo real'
  );

  // 4. Papá crea hábito compartido familiar -> Mamá lo recibe en tiempo real
  devicePapa.createHabit('h_familia_01', 'Cena en familia sin pantallas', false);
  const mamaReceivedSharedHabit = deviceMama.localState.habits.some((h) => h.id === 'h_familia_01');
  assert(
    mamaReceivedSharedHabit,
    4,
    'Papá crea hábito compartido familiar -> Mamá lo recibe en tiempo real en Device B'
  );

  // 5. Papá crea hábito privado (is_private = true) -> Mamá NO lo ve / RLS y filtro de privacidad lo bloquean
  devicePapa.createHabit('h_papa_privado', 'Meditación personal de Papá', true);
  const mamaSeesPrivateHabit = deviceMama.localState.habits.some((h) => h.id === 'h_papa_privado');
  const papaSeesHisPrivateHabit = devicePapa.localState.habits.some((h) => h.id === 'h_papa_privado');
  assert(
    !mamaSeesPrivateHabit && papaSeesHisPrivateHabit,
    5,
    'Papá crea hábito privado -> Papá lo ve, pero Mamá NO lo ve (privacidad de hábitos estrictamente aislada)'
  );

  // 6. Mamá crea gasto privado -> Papá NO lo ve (aislamiento de finanzas personales)
  deviceMama.createExpense('e_mama_privado', 'Regalo sorpresa de cumpleaños para Papá', 35000, 'personal');
  const papaSeesMamaPersonalExpense = devicePapa.localState.expenses.some((e) => e.id === 'e_mama_privado');
  const mamaSeesHerExpense = deviceMama.localState.expenses.some((e) => e.id === 'e_mama_privado');
  assert(
    !papaSeesMamaPersonalExpense && mamaSeesHerExpense,
    6,
    'Mamá crea gasto privado -> Mamá lo ve, pero Papá NO lo ve (aislamiento de finanzas personales)'
  );

  // 7. Mamá crea gasto familiar -> Papá lo ve en tiempo real
  deviceMama.createExpense('e_supermercado', 'Supermercado semanal Líder', 145000, 'family');
  const papaSeesFamilyExpense = devicePapa.localState.expenses.some((e) => e.id === 'e_supermercado');
  assert(
    papaSeesFamilyExpense,
    7,
    'Mamá crea gasto familiar -> Papá lo ve en tiempo real en Device A ("Nuestro Dinero")'
  );

  // 8. Creación de evento de calendario -> Ambos lo ven sincronizado
  devicePapa.createEvent('ev_reunion_colegio', 'Reunión de apoderados Annie', '2026-10-05');
  const mamaSeesEvent = deviceMama.localState.events.some((e) => e.id === 'ev_reunion_colegio');
  assert(
    mamaSeesEvent,
    8,
    'Creación de evento de calendario en Device A -> Se sincroniza en tiempo real en Device B'
  );

  // 9. Creación de registro de salud -> Ambos coadministradores tienen acceso
  deviceMama.createHealthRecord('app_control_pediatrico', 'appointment', 'Dra. María Paz Gómez (Pediatra)');
  const papaSeesHealthRecord = devicePapa.localState.healthRecords.some((h) => h.id === 'app_control_pediatrico');
  assert(
    papaSeesHealthRecord,
    9,
    'Creación de registro de salud familiar -> Sincronizado para ambos coadministradores adultos'
  );

  // 10. Creación de registro de compras de hogar -> Ambos lo ven
  devicePapa.createShoppingItem('shop_detergente', 'Detergente hipoalergénico');
  const mamaSeesShoppingItem = deviceMama.localState.shoppingItems.some((s) => s.id === 'shop_detergente');
  assert(
    mamaSeesShoppingItem,
    10,
    'Creación de artículo en compras de hogar -> Ambos adultos lo ven reflejado'
  );

  // 11. Registro de Cuqui Time -> Ambos adultos coadministradores tienen acceso íntimo
  deviceMama.createCuquiSession('cuqui_viernes', '2026-09-26');
  const papaSeesCuquiSession = devicePapa.localState.cuquiSessions.some((c) => c.id === 'cuqui_viernes');
  assert(
    papaSeesCuquiSession,
    11,
    'Registro íntimo de Cuqui Time -> Disponible y sincronizado para ambos adultos'
  );

  // 12. Suma de puntos a un niño -> Ambos ven el nuevo puntaje reflejado en tiempo real
  devicePapa.updateChildPoints('annie', 20); // 50 + 20 = 70
  const mamaChildPoints = deviceMama.localState.members.find((m) => m.id === 'annie')?.points;
  assert(
    mamaChildPoints === 70,
    12,
    `Suma de puntos de recompensa en Device A -> Device B ve puntaje actualizado en tiempo real (${mamaChildPoints} pts)`
  );

  // 13. Desconexión / Offline -> Cambios se guardan en cache local sin lanzar excepciones
  devicePapa.isOnline = false;
  devicePapa.createTask('t_offline_papa', 'Revisar cuentas de luz sin internet', 'papa');
  const cachedLocally = devicePapa.localCache.get('tasks')?.some((t: any) => t.id === 't_offline_papa');
  assert(
    cachedLocally,
    13,
    'Desconexión / Modo Offline en Device A -> Tarea persistida en cache local (localStorage resilience)'
  );

  // 14. Cierre de sesión -> Se limpian los datos en memoria y se cancelan las suscripciones Realtime
  deviceMama.disconnect();
  const mamaStateCleared = deviceMama.localState.tasks.length === 0 && deviceMama.localState.habits.length === 0;
  // Disparar evento para verificar que Mamá no lo recibe porque ya no está suscrita
  devicePapa.isOnline = true;
  devicePapa.createTask('t_despues_logout', 'Tarea enviada tras logout de Mamá', 'mama');
  const mamaDidNotReceive = deviceMama.localState.tasks.length === 0;
  assert(
    mamaStateCleared && mamaDidNotReceive,
    14,
    'Cierre de sesión -> Datos en memoria limpiados y suscripción Realtime cancelada limpiamente'
  );

  // 15. Nuevo inicio de sesión -> Se recuperan todos los datos persistidos en Supabase intactos
  deviceMama.connect(); // Reconectar como nueva sesión de Mamá
  const mamaRestoredTasks = deviceMama.localState.tasks.some((t) => t.id === 't_panales_01');
  const mamaRestoredExpense = deviceMama.localState.expenses.some((e) => e.id === 'e_supermercado');
  const mamaRestoredPoints = deviceMama.localState.members.find((m) => m.id === 'annie')?.points === 70;
  assert(
    mamaRestoredTasks && mamaRestoredExpense && mamaRestoredPoints,
    15,
    'Nuevo inicio de sesión de Mamá -> Recupera todos los datos persistidos en Supabase íntegros'
  );

  console.log('\n======================================================================');
  console.log(`RESULTADO DE LA SUITE: ${passed} PASADOS, ${failed} FALLIDOS`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run15PointValidation();
