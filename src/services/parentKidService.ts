import { supabase, isSupabaseConfigured } from './supabaseClient';
import { KidDevice, PendingApprovalsState } from '../types/kids';

export const parentKidService = {
  /**
   * Genera un enlace individual de vinculación para el niño (válido por 15 min, un solo uso).
   */
  async createKidDeviceInvite(childId: string, deviceNameHint?: string): Promise<{
    success: boolean;
    token?: string;
    expiresAt?: string;
    childName?: string;
    error?: string;
  }> {
    if (!supabase || !isSupabaseConfigured()) {
      return {
        success: true,
        token: 'demo-token-' + Math.random().toString(36).substring(2, 15),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        childName: childId === 'derek' ? 'Derek' : 'Annie',
      };
    }

    try {
      const { data, error } = await supabase.rpc('create_kid_device_invite', {
        p_child_member_id: childId,
        p_device_name_hint: deviceNameHint || null,
      });

      if (error) return { success: false, error: error.message };
      if (!data?.success) return { success: false, error: data?.error || 'Error al generar invitación' };

      return {
        success: true,
        token: data.token,
        expiresAt: data.expires_at,
        childName: data.child_name,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error inesperado',
      };
    }
  },

  /**
   * Lista los dispositivos vinculados de un niño
   */
  async listKidDevices(childId: string): Promise<{ success: boolean; devices: KidDevice[]; error?: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return {
        success: true,
        devices: [
          {
            id: 'dev-demo-1',
            deviceName: 'Tablet Samsung de Annie',
            status: 'active',
            isActive: true,
            createdAt: '2026-10-18T10:00:00Z',
            lastActiveAt: '2026-10-18T18:30:00Z',
            failedPinAttempts: 0,
            isLocked: false,
          },
        ],
      };
    }

    try {
      const { data, error } = await supabase.rpc('list_kid_devices', {
        p_child_member_id: childId,
      });

      if (error) return { success: false, devices: [], error: error.message };

      return {
        success: true,
        devices: (data.devices || []).map((d: any) => ({
          id: d.id,
          deviceName: d.device_name,
          status: d.status,
          isActive: d.is_active,
          createdAt: d.created_at,
          lastActiveAt: d.last_active_at,
          approvedAt: d.approved_at,
          revokedAt: d.revoked_at,
          failedPinAttempts: d.failed_pin_attempts || 0,
          isLocked: d.is_locked || false,
        })),
      };
    } catch (err: unknown) {
      return { success: false, devices: [], error: err instanceof Error ? err.message : 'Error de comunicación' };
    }
  },

  /**
   * Aprueba explícitamente la activación de un dispositivo infantil
   */
  async approveKidDevice(deviceId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, message: 'Dispositivo aprobado en modo demo' };
    }

    try {
      const { data, error } = await supabase.rpc('approve_kid_device_link', {
        p_device_id: deviceId,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success, message: data.message };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al aprobar' };
    }
  },

  /**
   * Revoca permanentemente la autorización de un dispositivo infantil
   */
  async revokeKidDevice(deviceId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { data, error } = await supabase.rpc('revoke_kid_device', {
        p_device_id: deviceId,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al revocar' };
    }
  },

  /**
   * Restablece el PIN de 4 dígitos de un dispositivo infantil
   */
  async resetKidPin(deviceId: string, newPin: string): Promise<{ success: boolean; error?: string; message?: string }> {
    if (!/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'El PIN debe ser de 4 dígitos numéricos' };
    }

    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, message: 'PIN actualizado en modo demo' };
    }

    try {
      const { data, error } = await supabase.rpc('reset_kid_device_pin', {
        p_device_id: deviceId,
        p_new_pin: newPin,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success, message: data.message };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al restablecer PIN' };
    }
  },

  /**
   * Obtiene todas las solicitudes pendientes de los niños (Tareas, Canjes, Dispositivos)
   */
  async getPendingApprovals(): Promise<{ success: boolean; data: PendingApprovalsState; error?: string }> {
    const emptyState: PendingApprovalsState = {
      pendingTasks: [],
      pendingRedemptions: [],
      pendingDevices: [],
      totalCount: 0,
    };

    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, data: emptyState };
    }

    try {
      const { data, error } = await supabase.rpc('get_pending_kid_approvals');
      if (error) return { success: false, data: emptyState, error: error.message };

      const state: PendingApprovalsState = {
        pendingTasks: (data.pending_tasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          assignedTo: t.assigned_to,
          completedBy: t.completed_by,
          childName: t.child_name,
          pointsReward: t.points_reward ?? 5,
          dueDate: t.due_date,
          updatedAt: t.updated_at,
        })),
        pendingRedemptions: (data.pending_redemptions || []).map((r: any) => ({
          id: r.id,
          rewardId: r.reward_id,
          rewardTitle: r.reward_title,
          childId: r.child_id,
          childName: r.child_name,
          pointsCost: r.points_cost,
          status: 'pending',
          requestedAt: r.requested_at,
        })),
        pendingDevices: (data.pending_devices || []).map((d: any) => ({
          id: d.id,
          deviceName: d.device_name,
          childId: d.child_id,
          childName: d.child_name,
          createdAt: d.created_at,
        })),
        totalCount: data.total_count || 0,
      };

      return { success: true, data: state };
    } catch (err: unknown) {
      return { success: false, data: emptyState, error: err instanceof Error ? err.message : 'Error de consulta' };
    }
  },

  /**
   * Aprueba tarea de un niño y otorga los puntos correspondientes
   */
  async approveTask(taskId: string, points?: number): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, pointsAwarded: points || 10 };
    }

    try {
      const { data, error } = await supabase.rpc('approve_kid_task', {
        p_task_id: taskId,
        p_points: points || null,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success, pointsAwarded: data.points_awarded };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al aprobar tarea' };
    }
  },

  /**
   * Rechaza la entrega de una tarea
   */
  async rejectTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { data, error } = await supabase.rpc('reject_kid_task', {
        p_task_id: taskId,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al rechazar tarea' };
    }
  },

  /**
   * Aprueba canje de recompensa solicitado por un niño
   */
  async approveRewardRedemption(requestId: string): Promise<{ success: boolean; pointsDeducted?: number; error?: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, pointsDeducted: 30 };
    }

    try {
      const { data, error } = await supabase.rpc('approve_kid_reward_redemption', {
        p_request_id: requestId,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success, pointsDeducted: data.points_deducted };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al aprobar canje' };
    }
  },

  /**
   * Rechaza solicitud de canje de recompensa
   */
  async rejectRewardRedemption(requestId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { data, error } = await supabase.rpc('reject_kid_reward_redemption', {
        p_request_id: requestId,
      });

      if (error) return { success: false, error: error.message };
      return { success: data.success };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al rechazar canje' };
    }
  },

  // Aliases for convenience
  approveKidTask(taskId: string, points?: number) {
    return this.approveTask(taskId, points);
  },
  rejectKidTask(taskId: string) {
    return this.rejectTask(taskId);
  },
  resetKidDevicePin(deviceId: string, newPin: string) {
    return this.resetKidPin(deviceId, newPin);
  },
};
