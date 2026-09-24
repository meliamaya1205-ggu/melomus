import {
  NotificationCategory,
  AnticipationOption,
  AdultNotificationPreferences,
} from '../types/notifications';
import { supabase } from './supabaseClient';

export interface ShouldNotifyOptions {
  targetMemberId?: string;
  authorId?: string;
  currentUserId?: string;
  currentMemberRole?: string;
  category: NotificationCategory;
  preferences?: AdultNotificationPreferences;
  currentTime?: Date;
}

export interface INotificationService {
  isSupported(): boolean;
  getPermissionStatus(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  showNotification(payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    category?: NotificationCategory;
    isDiscrete?: boolean;
  }): Promise<boolean>;
  formatDiscreteText(
    category: NotificationCategory,
    originalTitle: string,
    originalBody?: string
  ): { title: string; body: string };
  calculateTriggerTimestamp(dateStr: string, timeStr: string, anticipation: AnticipationOption): number;
  isDue(dateStr: string, timeStr: string, anticipation: AnticipationOption): boolean;
  registerServiceWorker(): Promise<ServiceWorkerRegistration | null>;
  subscribeToPush(vapidPublicKey?: string): Promise<PushSubscription | null>;
  getPushSubscription(): Promise<PushSubscription | null>;
  savePushSubscription(userId: string, familyId: string, subscription: PushSubscription, deviceName?: string): Promise<boolean>;
  unsubscribeFromPush(userId?: string): Promise<boolean>;
  isQuietHours(start?: string, end?: string, now?: Date): boolean;
  shouldNotifyUser(options: ShouldNotifyOptions): { allow: boolean; reason?: string };
}

/**
 * Utility to convert URL-safe base64 string to Uint8Array for VAPID applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const globalBuffer = (globalThis as unknown as { Buffer?: { from: (str: string, enc: string) => Uint8Array } }).Buffer;
  if (globalBuffer) {
    return new Uint8Array(globalBuffer.from(base64, 'base64'));
  }

  const decode =
    typeof atob === 'function'
      ? atob
      : typeof window !== 'undefined' && window.atob
      ? window.atob.bind(window)
      : (str: string) => str;
  const rawData = decode(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class NotificationService implements INotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) this.swRegistration = reg;
      });
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Error al solicitar permiso de notificaciones:', e);
      return 'denied';
    }
  }

  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.swRegistration = reg;
      return reg;
    } catch (e) {
      console.warn('No se pudo registrar Service Worker (posible entorno sin HTTPS/SW):', e);
      return null;
    }
  }

  /**
   * Subscribe browser to Web Push notifications
   */
  public async subscribeToPush(vapidPublicKey?: string): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    try {
      const reg = await this.registerServiceWorker();
      if (!reg) return null;

      // Check existing subscription
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        return existing;
      }

      const key = vapidPublicKey || (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_VAPID_PUBLIC_KEY;
      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        ...(key ? { applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource } : {}),
      };

      const newSub = await reg.pushManager.subscribe(subscribeOptions);
      return newSub;
    } catch (err) {
      console.warn('[NotificationService] No se pudo crear la suscripción push en el navegador:', err);
      return null;
    }
  }

  /**
   * Get active browser push subscription if any
   */
  public async getPushSubscription(): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return null;
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  }

  /**
   * Persist a push subscription into Supabase push_subscriptions table
   */
  public async savePushSubscription(
    userId: string,
    familyId: string,
    subscription: PushSubscription,
    deviceName?: string
  ): Promise<boolean> {
    if (!supabase) return false;
    try {
      const raw = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = raw.keys?.p256dh || '';
      const auth = raw.keys?.auth || '';

      if (!endpoint || !p256dh || !auth) return false;

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          family_id: familyId,
          endpoint,
          p256dh,
          auth,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          device_name: deviceName || (typeof navigator !== 'undefined' ? navigator.platform : 'Web Client'),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) {
        console.warn('[NotificationService] Error al guardar suscripción push en Supabase:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[NotificationService] Excepción al guardar suscripción push:', err);
      return false;
    }
  }

  /**
   * Unsubscribe from browser PushManager and remove from Supabase
   */
  public async unsubscribeFromPush(userId?: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return false;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (supabase && userId) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .match({ user_id: userId, endpoint });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[NotificationService] Error al cancelar suscripción push:', err);
      return false;
    }
  }

  /**
   * Checks whether the given time falls within the configured quiet hours window.
   * Handles windows crossing midnight (e.g. 22:00 to 07:00).
   */
  public isQuietHours(start?: string, end?: string, now?: Date): boolean {
    if (!start || !end) return false;
    const target = now || new Date();
    const currentMinutes = target.getHours() * 60 + target.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    if (isNaN(startH) || isNaN(endH)) return false;

    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (startMinutes === endMinutes) return false;

    if (startMinutes < endMinutes) {
      // Normal range within same calendar day, e.g. 13:00 to 15:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Spanning midnight, e.g. 22:00 to 07:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  /**
   * Evaluates if a notification should be presented to the user based on:
   * 1. Self-action suppression: Author never gets notified of their own actions.
   * 2. Target member check: Only relevant adult or shared recipient receives it.
   * 3. Master toggle.
   * 4. Specific category toggle.
   * 5. Quiet hours window suppression.
   */
  public shouldNotifyUser(options: ShouldNotifyOptions): { allow: boolean; reason?: string } {
    // 1. Self-action suppression
    if (options.authorId && options.currentUserId && options.authorId === options.currentUserId) {
      return { allow: false, reason: 'self_action' };
    }

    // 2. Target check: if specified and not 'all'/'both'/'family', it must match current member role
    if (options.targetMemberId && options.currentMemberRole) {
      const target = options.targetMemberId.toLowerCase();
      const current = options.currentMemberRole.toLowerCase();
      const isShared = target === 'all' || target === 'both' || target === 'family';
      if (!isShared && target !== current) {
        return { allow: false, reason: 'not_target' };
      }
    }

    // 3. Master toggle check
    if (options.preferences && options.preferences.masterEnabled === false) {
      return { allow: false, reason: 'master_disabled' };
    }

    // 4. Category toggle check
    if (options.preferences && options.preferences.categories?.[options.category]?.enabled === false) {
      return { allow: false, reason: 'category_disabled' };
    }

    // 5. Quiet hours check
    if (
      options.preferences?.quietHoursEnabled &&
      this.isQuietHours(
        options.preferences.quietHoursStart,
        options.preferences.quietHoursEnd,
        options.currentTime
      )
    ) {
      return { allow: false, reason: 'quiet_hours' };
    }

    return { allow: true };
  }

  /**
   * Formats discrete mode titles and bodies to never reveal private details on lock screens
   */
  public formatDiscreteText(
    category: NotificationCategory,
    originalTitle: string,
    originalBody?: string
  ): { title: string; body: string } {
    switch (category) {
      case 'cuquiTime':
        return {
          title: 'MELOMUS 💕',
          body: 'Tienes un momento especial reservado.',
        };
      case 'couple':
        return {
          title: 'MELOMUS 💕',
          body: 'Tienes un momento de conexión programado.',
        };
      case 'medications':
        return {
          title: 'MELOMUS 🏥',
          body: 'Tienes una indicación médica programada.',
        };
      case 'appointments':
        return {
          title: 'MELOMUS 🏥',
          body: 'Tienes una cita médica programada.',
        };
      case 'finance':
        return {
          title: 'MELOMUS 💰',
          body: 'Tienes un recordatorio financiero programado.',
        };
      default:
        return {
          title: originalTitle || 'MELOMUS 🏡',
          body: originalBody || 'Tienes un recordatorio pendiente.',
        };
    }
  }

  public calculateTriggerTimestamp(
    dateStr: string,
    timeStr: string = '09:00',
    anticipation: AnticipationOption = 'at_time'
  ): number {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const eventDate = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);

    let offsetMinutes = 0;
    switch (anticipation) {
      case '5_min':
        offsetMinutes = 5;
        break;
      case '15_min':
        offsetMinutes = 15;
        break;
      case '30_min':
        offsetMinutes = 30;
        break;
      case '1_hour':
        offsetMinutes = 60;
        break;
      case '1_day':
        offsetMinutes = 1440;
        break;
      case 'at_time':
      default:
        offsetMinutes = 0;
        break;
    }

    return eventDate.getTime() - offsetMinutes * 60 * 1000;
  }

  public isDue(
    dateStr: string,
    timeStr: string = '09:00',
    anticipation: AnticipationOption = 'at_time'
  ): boolean {
    const triggerTime = this.calculateTriggerTimestamp(dateStr, timeStr, anticipation);
    const now = Date.now();
    // Due if trigger time has passed and within last 24h
    return now >= triggerTime && (now - triggerTime) <= 24 * 60 * 60 * 1000;
  }

  public async showNotification(payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    category?: NotificationCategory;
    isDiscrete?: boolean;
  }): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    let finalTitle = payload.title;
    let finalBody = payload.body;

    if (payload.isDiscrete && payload.category) {
      const discrete = this.formatDiscreteText(payload.category, payload.title, payload.body);
      finalTitle = discrete.title;
      finalBody = discrete.body;
    }

    const options: NotificationOptions = {
      body: finalBody,
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/logo.png',
      tag: payload.tag || `melomus-${Date.now()}`,
      data: {
        url: payload.url || '/',
        category: payload.category,
      },
    };

    try {
      // 1. Try via Service Worker if available (best for mobile/PWA background notifications)
      if (this.swRegistration && 'showNotification' in this.swRegistration) {
        await this.swRegistration.showNotification(finalTitle, options);
        return true;
      }

      // 2. Fallback to standard Web Notification API
      new Notification(finalTitle, options);
      return true;
    } catch (e) {
      console.warn('No se pudo desplegar la notificación del sistema:', e);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
