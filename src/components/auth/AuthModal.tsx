import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { authService, InviteDetailsResult } from '../../services/authService';
import { AuthUser, PrimaryAdultRelationship } from '../../types/auth';
import { triggerConfetti } from '../common/ConfettiCelebration';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'reset' | 'claim_invite';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  inviteToken?: string | null;
  onAuthSuccess?: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  inviteToken = null,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(inviteToken ? 'claim_invite' : initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<PrimaryAdultRelationship>('mama');
  const [familyName, setFamilyName] = useState('Nuestra Familia');

  // Claim invite state
  const [manualToken, setManualToken] = useState('');
  const [inviteDetails, setInviteDetails] = useState<InviteDetailsResult | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(() => Boolean(isOpen && inviteToken));

  const verifyInvite = async (tokenInput: string) => {
    let cleanToken = tokenInput.trim();
    if (!cleanToken) return;
    try {
      if (cleanToken.includes('?')) {
        const url = new URL(cleanToken.startsWith('http') ? cleanToken : `https://${cleanToken}`);
        cleanToken = url.searchParams.get('vincular') || url.searchParams.get('token') || cleanToken;
      }
    } catch {
      // not a url, use cleanToken directly
    }
    setCheckingInvite(true);
    setErrorMessage(null);
    try {
      const details = await authService.getInviteDetails(cleanToken);
      setInviteDetails(details);
      if (details.valid && details.targetRelationship) {
        setRelationship(details.targetRelationship);
      } else {
        setErrorMessage(details.message || 'El enlace de vinculación no es válido.');
      }
    } catch {
      setErrorMessage('Error al consultar el enlace de vinculación.');
    } finally {
      setCheckingInvite(false);
    }
  };

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Reset form when opening
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (inviteToken) {
        setMode('claim_invite');
        setCheckingInvite(true);
      } else {
        setMode(initialMode);
        setCheckingInvite(false);
      }
    }
  }

  // Query invite details asynchronously when modal opens with inviteToken
  useEffect(() => {
    if (!isOpen || !inviteToken) return;
    let cancelled = false;

    let cleanToken = inviteToken.trim();
    if (!cleanToken) return;
    try {
      if (cleanToken.includes('?')) {
        const url = new URL(cleanToken.startsWith('http') ? cleanToken : `https://${cleanToken}`);
        cleanToken = url.searchParams.get('vincular') || url.searchParams.get('token') || cleanToken;
      }
    } catch {
      // not a url, use cleanToken directly
    }

    authService.getInviteDetails(cleanToken)
      .then((details) => {
        if (cancelled) return;
        setInviteDetails(details);
        if (details.valid && details.targetRelationship) {
          setRelationship(details.targetRelationship);
        } else {
          setErrorMessage(details.message || 'El enlace de vinculación no es válido.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMessage('Error al consultar el enlace de vinculación.');
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingInvite(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, inviteToken]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const res = await authService.signIn(email, password);
    setLoading(false);

    if (res.success && res.data) {
      triggerConfetti();
      onAuthSuccess?.(res.data.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Credenciales inválidas.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Por favor ingresa tu nombre.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const res = await authService.signUp({
      email,
      password,
      name,
      relationship,
      familyName,
    });
    setLoading(false);

    if (res.success && res.data) {
      triggerConfetti();
      setSuccessMessage('¡Cuenta y familia creadas con éxito!');
      onAuthSuccess?.(res.data.user);
      setTimeout(() => onClose(), 1200);
    } else {
      setErrorMessage(res.error || 'Error al registrar usuario.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const res = await authService.resetPassword(email);
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
    } else {
      setErrorMessage(res.error || 'No se pudo enviar el correo de recuperación.');
    }
  };

  const handleClaimInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = inviteToken || manualToken.trim();
    if (!activeToken) {
      setErrorMessage('Por favor ingresa un código o enlace de vinculación válido.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Por favor ingresa tu nombre.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await authService.claimInviteWithAccount({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        relationship,
        inviteToken: activeToken,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'No fue posible vincular tu cuenta con la familia.');
        setLoading(false);
        return;
      }

      const user = res.data.user;

      setLoading(false);
      triggerConfetti();
      setSuccessMessage('¡Vinculación exitosa! Ahora eres coadministrador/a de la familia.');
      if (user) {
        onAuthSuccess?.(user);
      }
      setTimeout(() => {
        // Clean URL token query param
        window.history.replaceState({}, document.title, window.location.pathname);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setLoading(false);
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'claim_invite'
          ? 'Vincularte como Adulto Principal'
          : mode === 'signup'
          ? 'Crear Cuenta Familiar en MELOMUS'
          : mode === 'reset'
          ? 'Recuperar Contraseña'
          : 'Iniciar Sesión en MELOMUS'
      }
    >
      <div className="space-y-4 text-stone-800">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
          <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs border border-stone-200/60 bg-white flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="MELOMUS" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-stone-900 tracking-tight leading-tight">MELOMUS</h3>
            <p className="text-[11px] text-stone-500 truncate">Organiza tu hogar, conecta a tu familia y simplifica tu día.</p>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ----------------- CLAIM INVITE MODE ----------------- */}
        {mode === 'claim_invite' && (
          <div className="space-y-4">
            {checkingInvite ? (
              <div className="text-center py-6 text-stone-500 text-xs">
                Verificando enlace seguro de vinculación...
              </div>
            ) : inviteDetails?.valid ? (
              <form onSubmit={handleClaimInvite} className="space-y-3.5">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">
                      Invitación para Co-administrar
                    </p>
                    <p>
                      <strong>{inviteDetails.inviterName}</strong> te ha invitado a unirte a la familia{' '}
                      <strong>&quot;{inviteDetails.familyName}&quot;</strong> con paridad total como{' '}
                      <strong>
                        {inviteDetails.targetRelationship === 'papa' ? 'Papá 🌿' : 'Mamá 🌸'}
                      </strong>.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">Tu Nombre</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={inviteDetails.targetRelationship === 'papa' ? 'Ej. Papá o tu nombre' : 'Ej. Mamá o tu nombre'}
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu-correo@ejemplo.com"
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">Contraseña</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400">Si ya tienes cuenta, ingresa tu contraseña habitual.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Vinculando cuenta...' : 'Vincular a Nuestra Familia'}</span>
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 text-xs text-stone-600 space-y-3">
                  <div className="flex items-center gap-2 text-stone-900 font-bold">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Unirte mediante Invitación</span>
                  </div>
                  <p className="leading-relaxed">
                    Si tu pareja te compartió un enlace seguro de WhatsApp o un código de vinculación, ingrésalo a continuación para unirte como segundo adulto principal:
                  </p>
                  <div>
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Pega el enlace o código (ej: tok_...)"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!manualToken.trim() || checkingInvite}
                    onClick={() => verifyInvite(manualToken)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{checkingInvite ? 'Verificando...' : 'Verificar Invitación'}</span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-xs text-amber-600 hover:underline font-bold cursor-pointer"
                  >
                    Volver a iniciar sesión tradicional
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- SIGN IN MODE ----------------- */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@nuestrohogar.com"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-stone-700">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-[11px] text-amber-600 hover:underline font-semibold"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 border-t border-stone-100">
              <p className="text-xs text-stone-500">
                ¿Aún no tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-amber-600 hover:underline cursor-pointer"
                >
                  Crear cuenta familiar
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ----------------- SIGN UP MODE ----------------- */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">¿Quién eres en el hogar?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRelationship('mama')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    relationship === 'mama'
                      ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span>🌸 Mamá</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRelationship('papa')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    relationship === 'papa'
                      ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span>🌿 Papá</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">Tu Nombre</label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Carolina o Matías"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">Nombre de tu Familia</label>
              <input
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Ej. Familia Pérez Soto"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Creando cuenta...' : 'Crear Cuenta Familiar'}</span>
            </button>

            <div className="text-center pt-2 border-t border-stone-100">
              <p className="text-xs text-stone-500">
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-bold text-amber-600 hover:underline cursor-pointer"
                >
                  Iniciar sesión
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ----------------- RESET PASSWORD MODE ----------------- */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <p className="text-xs text-stone-600 leading-relaxed">
              Ingresa el correo electrónico asociado a tu cuenta familiar para recibir un enlace de recuperación.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-xs text-stone-600 hover:underline font-semibold"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
