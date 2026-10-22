import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthUser, FamilyAccount, PrimaryAdultRelationship } from '../types/auth';

export interface InviteDetailsResult {
  valid: boolean;
  familyId?: string;
  familyName?: string;
  inviterName?: string;
  targetRelationship?: PrimaryAdultRelationship;
  expiresAt?: string;
  message?: string;
}

export interface CoAdminInviteResult {
  success: boolean;
  token?: string;
  inviteUrl?: string;
  expiresAt?: string;
  message?: string;
}

export interface AuthResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const LOCAL_AUTH_SESSION_KEY = 'melomus_local_auth_session';

function getLocalStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalStoredUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
    }
  } catch (e) {
    console.error('Error saving local auth session:', e);
  }
}

export const authService = {
  /**
   * Check if Supabase connection is active
   */
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  /**
   * Register the primary adult (Mamá or Papá) and automatically creates their family
   */
  async signUp(params: {
    email: string;
    password: string;
    name: string;
    relationship: PrimaryAdultRelationship;
    familyName?: string;
  }): Promise<AuthResponse<{ user: AuthUser; family: FamilyAccount }>> {
    if (!supabase) {
      const existing = getLocalStoredUser();
      const familyId = existing?.familyId || `fam_local_${Date.now()}`;
      const userProfile: AuthUser = {
        id: existing?.id || `user_local_${Date.now()}`,
        familyId,
        email: params.email,
        name: params.name,
        role: 'FAMILY_ADULT',
        relationship: params.relationship,
        memberId: params.relationship,
        avatarColor: params.relationship === 'papa' ? '#3b82f6' : '#ec4899',
        avatarEmoji: params.relationship === 'papa' ? '🌿' : '🌸',
      };

      const family: FamilyAccount = {
        id: familyId,
        name: params.familyName || 'Nuestra Familia',
        isBothCoAdminsActive: false,
        createdAt: new Date().toISOString(),
      };

      if (params.relationship === 'mama') {
        family.primaryAdultMamaId = userProfile.id;
        family.primaryAdultMamaEmail = userProfile.email;
      } else {
        family.primaryAdultPapaId = userProfile.id;
        family.primaryAdultPapaEmail = userProfile.email;
      }

      setLocalStoredUser(userProfile);
      return {
        success: true,
        data: { user: userProfile, family },
      };
    }

    try {
      // 1. Create auth user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            name: params.name,
            relationship: params.relationship,
          },
        },
      });

      if (authError || !authData.user) {
        const raw = authError?.message || '';
        let errorMsg = 'Error al crear la cuenta de usuario.';
        if (raw.toLowerCase().includes('already registered') || raw.toLowerCase().includes('already been registered') || raw.toLowerCase().includes('user already exists')) {
          errorMsg = 'Este correo electrónico ya está registrado. Por favor inicia sesión con tu contraseña.';
        } else if (raw.toLowerCase().includes('password') && (raw.toLowerCase().includes('character') || raw.toLowerCase().includes('short') || raw.toLowerCase().includes('least'))) {
          errorMsg = 'La contraseña debe contener al menos 6 caracteres.';
        } else if (raw) {
          errorMsg = raw;
        }
        return {
          success: false,
          error: errorMsg,
        };
      }

      // If session is immediately active (email confirmation disabled in dev/staging)
      // or after confirmation, register the family and profile atomically
      const { data: rpcData, error: rpcError } = await supabase.rpc('register_primary_adult', {
        p_name: params.name,
        p_relationship: params.relationship,
        p_family_name: params.familyName || 'Nuestra Familia',
      });

      if (rpcError) {
        return {
          success: false,
          error: rpcError.message,
        };
      }

      const userProfile: AuthUser = {
        id: authData.user.id,
        familyId: rpcData.family_id,
        email: params.email,
        name: params.name,
        role: 'FAMILY_ADULT',
        relationship: params.relationship,
        memberId: params.relationship,
        avatarColor: params.relationship === 'papa' ? '#3b82f6' : '#ec4899',
        avatarEmoji: params.relationship === 'papa' ? '🌿' : '🌸',
      };

      const family: FamilyAccount = {
        id: rpcData.family_id,
        name: params.familyName || 'Nuestra Familia',
        isBothCoAdminsActive: false,
        createdAt: new Date().toISOString(),
      };

      if (params.relationship === 'mama') {
        family.primaryAdultMamaId = userProfile.id;
        family.primaryAdultMamaEmail = userProfile.email;
      } else {
        family.primaryAdultPapaId = userProfile.id;
        family.primaryAdultPapaEmail = userProfile.email;
      }

      return {
        success: true,
        data: { user: userProfile, family },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error inesperado durante el registro.',
      };
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse<{ user: AuthUser; family: FamilyAccount }>> {
    if (!supabase) {
      const existing = getLocalStoredUser();
      const user: AuthUser = existing || {
        id: `user_local_${Date.now()}`,
        familyId: `fam_local_${Date.now()}`,
        email,
        name: 'Mamá',
        role: 'FAMILY_ADULT',
        relationship: 'mama',
        memberId: 'mama',
        avatarColor: '#ec4899',
        avatarEmoji: '🌸',
      };

      const family: FamilyAccount = {
        id: user.familyId,
        name: 'Nuestra Familia',
        isBothCoAdminsActive: true,
        createdAt: new Date().toISOString(),
      };

      setLocalStoredUser(user);
      return {
        success: true,
        data: { user, family },
      };
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        const raw = authError?.message || '';
        let friendly = 'El correo electrónico o la contraseña ingresada son incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.';
        if (raw.toLowerCase().includes('email not confirmed')) {
          friendly = 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o spam.';
        }
        return {
          success: false,
          error: friendly,
        };
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        return {
          success: false,
          error: 'No se encontró el perfil familiar asociado a esta cuenta.',
        };
      }

      const user: AuthUser = {
        id: profile.id,
        familyId: profile.family_id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        relationship: profile.relationship,
        memberId: profile.member_id,
        avatarColor: profile.avatar_color,
        avatarEmoji: profile.avatar_emoji,
      };

      // Fetch family account info and co-admins
      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('id', profile.family_id)
        .single();

      const { data: coAdmins } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', profile.family_id);

      const mama = coAdmins?.find((p) => p.relationship === 'mama');
      const papa = coAdmins?.find((p) => p.relationship === 'papa');

      const family: FamilyAccount = {
        id: profile.family_id,
        name: familyData?.name || 'Nuestra Familia',
        primaryAdultMamaId: mama?.id,
        primaryAdultMamaEmail: mama?.email,
        primaryAdultPapaId: papa?.id,
        primaryAdultPapaEmail: papa?.email,
        isBothCoAdminsActive: Boolean(mama && papa),
        createdAt: familyData?.created_at || new Date().toISOString(),
      };

      return {
        success: true,
        data: { user, family },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error inesperado durante el inicio de sesión.',
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    setLocalStoredUser(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
  },

  /**
   * Request password reset link
   */
  async resetPassword(email: string): Promise<AuthResponse<void>> {
    if (!supabase) {
      return {
        success: true,
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?reset_password=true`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al enviar enlace de recuperación.',
      };
    }
  },

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<AuthResponse<void>> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no está configurado en las variables de entorno.',
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al actualizar contraseña.',
      };
    }
  },

  /**
   * Fetch currently authenticated user and profile
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!supabase) {
      return getLocalStoredUser();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      return {
        id: profile.id,
        familyId: profile.family_id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        relationship: profile.relationship,
        memberId: profile.member_id,
        avatarColor: profile.avatar_color,
        avatarEmoji: profile.avatar_emoji,
      };
    } catch {
      return null;
    }
  },

  /**
   * Generate temporary single-use link to link the second primary adult
   */
  async createCoAdminInvite(targetRelationship: PrimaryAdultRelationship): Promise<CoAdminInviteResult> {
    if (!supabase) {
      return {
        success: false,
        message: 'No pudimos crear la invitación. La conexión con Supabase no está configurada o disponible. Inténtalo nuevamente.',
      };
    }

    try {
      const { data, error } = await supabase.rpc('create_co_admin_invite', {
        p_target_relationship: targetRelationship,
      });

      if (error || !data || !data.success) {
        return {
          success: false,
          message: data?.message || error?.message || 'No pudimos crear la invitación. Inténtalo nuevamente.',
        };
      }

      const inviteUrl = `${window.location.origin}/invite?token=${data.token}`;

      return {
        success: true,
        token: data.token,
        inviteUrl,
        expiresAt: data.expires_at,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'No pudimos crear la invitación. Inténtalo nuevamente.',
      };
    }
  },

  /**
   * Check invite validity before displaying the linking screen to the second adult
   */
  async getInviteDetails(token: string): Promise<InviteDetailsResult> {
    if (!supabase) {
      return {
        valid: false,
        message: 'La conexión con el servidor familiar no está disponible. No es posible validar la invitación sin conexión.',
      };
    }

    try {
      const { data, error } = await supabase.rpc('get_invite_details', {
        p_token: token,
      });

      if (error || !data) {
        return {
          valid: false,
          message: error?.message || 'Error al consultar la invitación.',
        };
      }

      if (!data.valid) {
        return {
          valid: false,
          message: data.message || 'El enlace de vinculación no es válido o ha expirado.',
        };
      }

      return {
        valid: true,
        familyId: data.family_id,
        familyName: data.family_name,
        inviterName: data.inviter_name,
        targetRelationship: data.target_relationship,
        expiresAt: data.expires_at,
      };
    } catch (err: unknown) {
      return {
        valid: false,
        message: err instanceof Error ? err.message : 'Error inesperado al consultar la invitación.',
      };
    }
  },

  /**
   * Claim invite to link the second adult to the family with total co-administration parity
   */
  async claimCoAdminInvite(token: string, name: string): Promise<AuthResponse<{ familyId: string; relationship: string }>> {
    if (!supabase) {
      return {
        success: false,
        error: 'No es posible vincularse sin conexión activa a Supabase.',
      };
    }

    try {
      const { data, error } = await supabase.rpc('claim_coadmin_link', {
        p_token: token,
        p_name: name,
      });

      if (error || !data || !data.success) {
        return {
          success: false,
          error: data?.message || error?.message || 'No fue posible vincular al adulto principal.',
        };
      }

      return {
        success: true,
        data: {
          familyId: data.family_id,
          relationship: data.relationship,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error inesperado al reclamar invitación.',
      };
    }
  },

  /**
   * Register a new user account specifically from a co-admin invitation,
   * directly associating them to the inviter's family without creating an orphaned family.
   */
  async signUpForInvite(params: {
    email: string;
    password: string;
    name: string;
    relationship: PrimaryAdultRelationship;
    inviteToken: string;
  }): Promise<AuthResponse<{ user: AuthUser; familyId: string; relationship: string }>> {
    if (!supabase) {
      return {
        success: false,
        error: 'La conexión con Supabase no está disponible para registrar la cuenta vinculada.',
      };
    }

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            name: params.name,
            relationship: params.relationship,
          },
        },
      });

      if (authError || !authData.user) {
        const raw = authError?.message || '';
        let errorMsg = 'Error al crear la cuenta.';
        if (raw.toLowerCase().includes('already registered') || raw.toLowerCase().includes('already been registered') || raw.toLowerCase().includes('user already exists')) {
          errorMsg = 'Este correo ya está registrado. Inicia sesión para vincularte a la familia.';
        } else if (raw.toLowerCase().includes('password') && (raw.toLowerCase().includes('character') || raw.toLowerCase().includes('short'))) {
          errorMsg = 'La contraseña debe contener al menos 6 caracteres.';
        } else if (raw) {
          errorMsg = raw;
        }
        return { success: false, error: errorMsg };
      }

      // 2. Claim co-admin link to associate directly to the target family
      const { data: claimData, error: claimError } = await supabase.rpc('claim_coadmin_link', {
        p_token: params.inviteToken,
        p_name: params.name,
      });

      if (claimError || !claimData || !claimData.success) {
        return {
          success: false,
          error: claimData?.message || claimError?.message || 'Error al vincular con la familia.',
        };
      }

      const userProfile: AuthUser = {
        id: authData.user.id,
        familyId: claimData.family_id,
        email: params.email,
        name: params.name,
        role: 'FAMILY_ADULT',
        relationship: params.relationship,
        memberId: params.relationship,
        avatarColor: params.relationship === 'papa' ? '#3b82f6' : '#ec4899',
        avatarEmoji: params.relationship === 'papa' ? '🌿' : '🌸',
      };

      setLocalStoredUser(userProfile);

      return {
        success: true,
        data: {
          user: userProfile,
          familyId: claimData.family_id,
          relationship: claimData.relationship,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error inesperado durante el registro.',
      };
    }
  },

  /**
   * Subscribe to Supabase Auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): { unsubscribe: () => void } {
    if (!supabase) {
      return { unsubscribe: () => {} };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });

    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  },
};
