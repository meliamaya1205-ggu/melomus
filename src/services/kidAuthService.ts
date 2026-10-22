import { supabase, isSupabaseConfigured } from './supabaseClient';
import { KidLocalDeviceAuth, KidDeviceInviteDetails, KidDashboardData } from '../types/kids';

const KID_DEVICE_KEY = 'melomus_kid_device_auth_v1';

// Helper criptográfico para SHA-256 en navegadores modernos
async function sha256Hex(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function cleanKidToken(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim();
  if (clean.includes('?') || clean.includes('/')) {
    try {
      const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
      clean = url.searchParams.get('token') || url.searchParams.get('kid_token') || clean;
    } catch {
      // no es una url
    }
  }
  return clean;
}

export const kidAuthService = {
  /**
   * Obtiene la credencial no sensible del dispositivo almacenada localmente.
   * IMPORTANTE: El PIN NUNCA se almacena en el almacenamiento local.
   */
  getLinkedDevice(): KidLocalDeviceAuth | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(KID_DEVICE_KEY);
      if (!data) return null;
      return JSON.parse(data) as KidLocalDeviceAuth;
    } catch {
      return null;
    }
  },

  /**
   * Guarda los metadatos de autorización del dispositivo.
   */
  setLinkedDevice(auth: KidLocalDeviceAuth): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KID_DEVICE_KEY, JSON.stringify(auth));
  },

  /**
   * Elimina la vinculación del dispositivo del navegador.
   */
  clearLinkedDevice(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KID_DEVICE_KEY);
  },

  /**
   * Consulta los detalles de una invitación de vinculación
   */
  async getInviteDetails(rawToken: string): Promise<{ success: boolean; data?: KidDeviceInviteDetails; error?: string }> {
    const token = cleanKidToken(rawToken);
    if (!token) {
      return { success: false, error: 'Código de invitación no válido' };
    }

    if (!supabase || !isSupabaseConfigured()) {
      // Modo local simulado para pruebas de desarrollo
      return {
        success: true,
        data: {
          childId: 'annie',
          childName: 'Annie',
          avatarColor: '#8b5cf6',
          avatarEmoji: '🦄',
          familyName: 'Familia Melomus',
          deviceNameHint: 'Tablet de Annie',
        },
      };
    }

    try {
      const { data, error } = await supabase.rpc('get_kid_invite_details', { p_token: token });
      if (error) {
        return { success: false, error: error.message };
      }
      if (!data?.success) {
        return { success: false, error: data?.error || 'Enlace inválido o expirado' };
      }
      return {
        success: true,
        data: {
          childId: data.child_id,
          childName: data.child_name,
          avatarColor: data.avatar_color,
          avatarEmoji: data.avatar_emoji,
          familyName: data.family_name,
          deviceNameHint: data.device_name_hint,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al consultar la invitación',
      };
    }
  },

  /**
   * Paso 1 de vinculación: el niño elige su PIN y envía solicitud de registro
   * Genera el secreto de dispositivo y calcula su hash SHA-256.
   * Queda en estado 'pending_approval' hasta la aprobación de mamá o papá.
   */
  async registerDeviceRequest(params: {
    token: string;
    pin: string;
    deviceName: string;
    childDetails: KidDeviceInviteDetails;
  }): Promise<{ success: boolean; deviceId?: string; error?: string; message?: string }> {
    const cleanToken = cleanKidToken(params.token);
    if (!cleanToken) {
      return { success: false, error: 'Token de vinculación no válido' };
    }

    const deviceSecret = generateRandomSecret();
    const deviceSecretHash = await sha256Hex(deviceSecret);

    if (!supabase || !isSupabaseConfigured()) {
      // Simulación local de desarrollo
      const fakeDeviceId = 'sim-device-' + Date.now();
      this.setLinkedDevice({
        deviceId: fakeDeviceId,
        deviceTokenSecret: deviceSecret,
        childId: params.childDetails.childId,
        childName: params.childDetails.childName,
        avatarEmoji: params.childDetails.avatarEmoji,
        avatarColor: params.childDetails.avatarColor,
        familyName: params.childDetails.familyName,
      });
      return {
        success: true,
        deviceId: fakeDeviceId,
        message: '¡PIN configurado! Esperando aprobación de tus padres.',
      };
    }

    try {
      const { data, error } = await supabase.rpc('register_kid_device_request', {
        p_token: cleanToken,
        p_pin: params.pin,
        p_device_name: params.deviceName,
        p_device_token_hash: deviceSecretHash,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      if (!data?.success) {
        return { success: false, error: data?.error || 'Error al registrar el dispositivo' };
      }

      // Guardar el secreto de dispositivo localmente para futuras consultas
      this.setLinkedDevice({
        deviceId: data.device_id,
        deviceTokenSecret: deviceSecret,
        childId: params.childDetails.childId,
        childName: params.childDetails.childName,
        avatarEmoji: params.childDetails.avatarEmoji,
        avatarColor: params.childDetails.avatarColor,
        familyName: params.childDetails.familyName,
      });

      return {
        success: true,
        deviceId: data.device_id,
        message: data.message,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error de comunicación',
      };
    }
  },

  /**
   * Comprueba si el dispositivo ya fue aprobado por Mamá o Papá
   */
  async checkActivation(): Promise<{
    status: 'pending_approval' | 'active' | 'revoked' | 'not_found';
    childName?: string;
    error?: string;
  }> {
    const device = this.getLinkedDevice();
    if (!device) return { status: 'not_found' };

    if (!supabase || !isSupabaseConfigured()) {
      // En modo local simulado se asume aprobado para facilitar pruebas
      return { status: 'active', childName: device.childName };
    }

    try {
      const deviceTokenHash = await sha256Hex(device.deviceTokenSecret);
      const { data, error } = await supabase.rpc('check_kid_device_activation', {
        p_device_id: device.deviceId,
        p_device_token_hash: deviceTokenHash,
      });

      if (error || !data) {
        return { status: 'not_found', error: error?.message };
      }

      return {
        status: data.status,
        childName: data.child_name || device.childName,
        error: data.error,
      };
    } catch {
      return { status: 'pending_approval' };
    }
  },

  /**
   * Valida el PIN de 4 dígitos contra el servidor
   */
  async verifyPin(pin: string): Promise<{
    success: boolean;
    isLocked?: boolean;
    remainingAttempts?: number;
    error?: string;
    childName?: string;
    points?: number;
  }> {
    const device = this.getLinkedDevice();
    if (!device) {
      return { success: false, error: 'Dispositivo no vinculado' };
    }

    if (!supabase || !isSupabaseConfigured()) {
      // Modo local simulado
      if (pin === '1234') {
        return { success: true, childName: device.childName, points: 25 };
      }
      return { success: false, error: 'PIN incorrecto (usa 1234 en demo)', remainingAttempts: 3 };
    }

    try {
      const deviceTokenHash = await sha256Hex(device.deviceTokenSecret);
      const { data, error } = await supabase.rpc('verify_kid_pin', {
        p_device_id: device.deviceId,
        p_device_token_hash: deviceTokenHash,
        p_pin: pin,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      if (!data?.success) {
        return {
          success: false,
          isLocked: data?.is_locked,
          remainingAttempts: data?.remaining_attempts,
          error: data?.error || 'PIN incorrecto',
        };
      }

      return {
        success: true,
        childName: data.child_name,
        points: data.points,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al verificar PIN',
      };
    }
  },

  /**
   * Obtiene los datos completos y aislados del panel del niño
   */
  async getDashboardData(): Promise<{ success: boolean; data?: KidDashboardData; error?: string }> {
    const device = this.getLinkedDevice();
    if (!device) return { success: false, error: 'Dispositivo no vinculado' };

    if (!supabase || !isSupabaseConfigured()) {
      return {
        success: true,
        data: {
          child: {
            id: device.childId,
            name: device.childName,
            points: 25,
            avatarColor: device.avatarColor,
            avatarEmoji: device.avatarEmoji,
            familyName: device.familyName,
          },
          tasks: [
            {
              id: 't-demo-1',
              title: 'Ordenar los juguetes antes de cenar',
              description: 'Guardar autitos y piezas de lego',
              priority: 'medium',
              status: 'pending',
              pointsReward: 10,
              dueDate: new Date().toISOString().split('T')[0],
              categoryKey: 'kids',
              isPendingApproval: false,
              isCompleted: false,
            },
          ],
          habits: [
            {
              id: 'h-demo-1',
              title: 'Lavarse los dientes en la noche',
              icon: '🪥',
              color: '#3b82f6',
              frequency: 'daily',
              points: 5,
              completedDates: [],
              active: true,
            },
          ],
          pointsHistory: [
            {
              id: 'ph-demo-1',
              points: 10,
              reason: 'Ayudar a poner la mesa',
              date: new Date().toISOString().split('T')[0],
            },
          ],
          rewards: [
            {
              id: 'r-demo-1',
              title: 'Tarde de cine con palomitas',
              description: 'Elegir la película del viernes',
              pointsCost: 30,
              category: 'special',
              icon: '🍿',
            },
          ],
          redemptions: [],
          calendar: [],
        },
      };
    }

    try {
      const deviceTokenHash = await sha256Hex(device.deviceTokenSecret);
      const { data, error } = await supabase.rpc('get_kid_dashboard_data', {
        p_device_id: device.deviceId,
        p_device_token_hash: deviceTokenHash,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      if (!data?.success) {
        return { success: false, error: data?.error || 'No se pudieron cargar los datos' };
      }

      return {
        success: true,
        data: {
          child: data.child,
          tasks: data.tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            pointsReward: t.points_reward ?? 5,
            dueDate: t.due_date,
            categoryKey: t.category_key,
            isPendingApproval: t.is_pending_approval,
            isCompleted: t.is_completed,
          })),
          habits: data.habits.map((h: any) => ({
            id: h.id,
            title: h.title,
            icon: h.icon,
            color: h.color,
            frequency: h.frequency,
            points: h.points,
            completedDates: Array.isArray(h.completed_dates) ? h.completed_dates : [],
            active: h.active,
          })),
          pointsHistory: data.points_history.map((ph: any) => ({
            id: ph.id,
            points: ph.points,
            reason: ph.reason,
            date: ph.date,
          })),
          rewards: data.rewards.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            pointsCost: r.points_cost,
            category: r.category,
            icon: r.icon,
          })),
          redemptions: (data.redemptions || []).map((rq: any) => ({
            id: rq.id,
            rewardId: rq.reward_id,
            rewardTitle: rq.reward_title,
            childId: device.childId,
            pointsCost: rq.points_cost,
            status: rq.status,
            requestedAt: rq.requested_at,
          })),
          calendar: (data.calendar || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            date: c.date,
            time: c.time,
            category: c.category,
            color: c.color,
          })),
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al obtener panel infantil',
      };
    }
  },

  /**
   * Marcar tarea como «¡Terminé!»
   */
  async submitTaskCompletion(taskId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const device = this.getLinkedDevice();
    if (!device) return { success: false, error: 'Dispositivo no vinculado' };

    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, message: '¡Misión enviada a mamá y papá!' };
    }

    try {
      const deviceTokenHash = await sha256Hex(device.deviceTokenSecret);
      const { data, error } = await supabase.rpc('submit_kid_task_completion', {
        p_device_id: device.deviceId,
        p_device_token_hash: deviceTokenHash,
        p_task_id: taskId,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success, message: data.message };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al enviar tarea' };
    }
  },

  /**
   * Marcar o desmarcar hábito del día
   */
  async toggleHabit(habitId: string, date: string): Promise<{ success: boolean; isCompleted?: boolean; error?: string }> {
    const device = this.getLinkedDevice();
    if (!device) return { success: false, error: 'Dispositivo no vinculado' };

    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, isCompleted: true };
    }

    try {
      const deviceTokenHash = await sha256Hex(device.deviceTokenSecret);
      const { data, error } = await supabase.rpc('toggle_kid_habit_day', {
        p_device_id: device.deviceId,
        p_device_token_hash: deviceTokenHash,
        p_habit_id: habitId,
        p_date: date,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success, isCompleted: data.is_completed };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar hábito' };
    }
  },

  /**
   * Solicitar canje de recompensa
   */
  async requestRewardRedemption(rewardId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const device = this.getLinkedDevice();
    if (!device) return { success: false, error: 'Dispositivo no vinculado' };

    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, message: '¡Premio solicitado! Mamá o papá lo revisarán.' };
    }

    try {
      const deviceTokenHash = await sha256Hex(device.deviceTokenSecret);
      const { data, error } = await supabase.rpc('request_kid_reward_redemption', {
        p_device_id: device.deviceId,
        p_device_token_hash: deviceTokenHash,
        p_reward_id: rewardId,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success, message: data.message };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al solicitar premio' };
    }
  },
};
