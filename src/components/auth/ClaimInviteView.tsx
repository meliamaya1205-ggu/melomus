import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Lock, User, Sparkles, AlertCircle, ArrowLeft, Eye, EyeOff, Link2 } from 'lucide-react';
import { authService, InviteDetailsResult } from '../../services/authService';
import { AuthUser, PrimaryAdultRelationship } from '../../types/auth';
import { triggerConfetti } from '../common/ConfettiCelebration';

interface ClaimInviteViewProps {
  initialToken?: string | null;
  onBackToWelcome: () => void;
  onGoToSignIn: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export const ClaimInviteView: React.FC<ClaimInviteViewProps> = ({
  initialToken = null,
  onBackToWelcome,
  onGoToSignIn,
  onAuthSuccess,
}) => {
  const [tokenInput, setTokenInput] = useState(initialToken || '');
  const [activeToken, setActiveToken] = useState<string | null>(initialToken);
  const [inviteDetails, setInviteDetails] = useState<InviteDetailsResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Form fields for registration/sign-in
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [targetRelationship, setTargetRelationship] = useState<PrimaryAdultRelationship>('papa');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cleanTokenFromInput = (input: string): string => {
    let clean = input.trim();
    if (!clean) return '';
    try {
      if (clean.includes('?') || clean.includes('/')) {
        const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
        clean = url.searchParams.get('vincular') || url.searchParams.get('token') || clean;
      }
    } catch {
      // not a full url, keep clean
    }
    return clean;
  };

  const verifyToken = async (rawToken: string) => {
    const clean = cleanTokenFromInput(rawToken);
    if (!clean) {
      setErrorMessage('Por favor ingresa un código o enlace de vinculación.');
      return;
    }

    setChecking(true);
    setErrorMessage(null);

    try {
      const details = await authService.getInviteDetails(clean);
      setInviteDetails(details);
      setActiveToken(clean);

      if (details.valid && details.targetRelationship) {
        setTargetRelationship(details.targetRelationship);
        if (!name) {
          setName(details.targetRelationship === 'papa' ? 'Papá' : 'Mamá');
        }
      } else {
        setErrorMessage(details.message || 'El enlace de vinculación no es válido o ha expirado.');
      }
    } catch {
      setErrorMessage('No fue posible consultar el enlace de vinculación.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      verifyToken(initialToken);
    }
  }, [initialToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeToken) {
      setErrorMessage('Se requiere un código o enlace de vinculación válido.');
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('Por favor ingresa tu nombre.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate user: Check current user or signIn, or signUp if account doesn't exist
      let user = await authService.getCurrentUser();

      if (!user) {
        // Try sign in first with the entered credentials
        const signInRes = await authService.signIn(email.trim().toLowerCase(), password);
        if (signInRes.success && signInRes.data) {
          user = signInRes.data.user;
        } else {
          // If sign in fails, create their account
          const signUpRes = await authService.signUp({
            email: email.trim().toLowerCase(),
            password,
            name: cleanName,
            relationship: targetRelationship,
            familyName: inviteDetails?.familyName || 'Nuestra Familia',
          });

          if (signUpRes.success && signUpRes.data) {
            user = signUpRes.data.user;
          } else {
            setErrorMessage(signUpRes.error || 'No fue posible autenticar la cuenta.');
            setLoading(false);
            return;
          }
        }
      }

      // 2. Claim co-admin link with total parity
      const claimRes = await authService.claimCoAdminInvite(activeToken, cleanName);
      setLoading(false);

      if (claimRes.success && claimRes.data) {
        triggerConfetti();
        setSuccessMessage('¡Vinculación familiar exitosa! Ahora eres co-administrador/a.');

        // Clean URL params if present
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const updatedUser: AuthUser = {
          ...user,
          familyId: claimRes.data.familyId,
          relationship: claimRes.data.relationship as PrimaryAdultRelationship,
          memberId: claimRes.data.relationship,
        };

        setTimeout(() => {
          onAuthSuccess(updatedUser);
        }, 800);
      } else {
        setErrorMessage(claimRes.error || 'El enlace de vinculación ha expirado o ya fue utilizado.');
      }
    } catch (err: unknown) {
      setLoading(false);
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado durante la vinculación.');
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-between items-center px-4 py-6 sm:py-10 relative overflow-hidden select-none">
      {/* Decorative ambient gradients */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-rose-400/10 blur-3xl pointer-events-none" />

      {/* Top Bar with Back Action */}
      <div className="w-full max-w-md flex items-center justify-between z-10 mb-4 animate-in fade-in duration-200">
        <button
          type="button"
          onClick={onBackToWelcome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-stone-200/80 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-white shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </button>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200/60 text-[11px] font-bold text-purple-800">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          <span>Segundo Adulto</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md my-auto bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/80 shadow-xl shadow-stone-900/5 p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Official Logo */}
        <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-stone-100">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs border border-stone-200/60 bg-white p-0.5 shrink-0">
            <img src="/logo.png" alt="MELOMUS" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight leading-tight">
              {inviteDetails?.valid ? 'Invitación confirmada' : 'Me invitaron a una familia'}
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              {inviteDetails?.valid
                ? 'Completa tus datos para unirte como co-administrador/a.'
                : 'Vinculación del segundo adulto con paridad de derechos.'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-200/90 text-rose-800 text-xs rounded-2xl p-3.5 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="leading-relaxed font-medium">
              <p>{errorMessage}</p>
              {!inviteDetails?.valid && (
                <p className="text-[11px] text-rose-700/80 mt-1">
                  Pídele a tu pareja que genere una nueva invitación desde Ajustes &gt; Vincular Adulto.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs rounded-2xl p-3.5 flex items-center gap-2.5 animate-in fade-in duration-150">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
          </div>
        )}

        {/* CASE 1: Valid Invite Details -> Display Family Invitation Card & Registration Form */}
        {inviteDetails?.valid ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-stone-700 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-stone-900 font-extrabold text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Invitación a Co-administrar</span>
              </div>
              <p className="leading-relaxed text-stone-600">
                <strong className="text-stone-900">{inviteDetails.inviterName}</strong> te ha invitado a unirte a la familia{' '}
                <strong className="text-stone-900">&quot;{inviteDetails.familyName}&quot;</strong> con paridad total de permisos como{' '}
                <strong className="text-stone-900">
                  {targetRelationship === 'papa' ? 'Papá 🌿' : 'Mamá 🌸'}
                </strong>.
              </p>
              <p className="text-[10px] text-stone-400">
                Ambos adultos tienen los mismos permisos en tareas, finanzas, calendario y cuidado del hogar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Tu Nombre</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={targetRelationship === 'papa' ? 'Ej. Papá o tu nombre' : 'Ej. Mamá o tu nombre'}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                    aria-label="Ver u ocultar contraseña"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-400">Si ya tenías una cuenta previa en MELOMUS, usa tu contraseña habitual.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-rose-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Vinculando tu cuenta...' : 'Vincular a Nuestra Familia'}</span>
              </button>
            </form>
          </div>
        ) : (
          /* CASE 2: No valid token yet -> Provide manual link/token entry card */
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 text-xs text-stone-600 space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold">
                <Link2 className="w-4 h-4 text-amber-600" />
                <span>Ingresa el enlace o código recibido</span>
              </div>
              <p className="leading-relaxed">
                Pega a continuación el enlace seguro de WhatsApp o el código de invitación generado por tu pareja:
              </p>
              <div>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="https://.../?vincular=tok_... o tok_..."
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all"
                />
              </div>

              <button
                type="button"
                disabled={!tokenInput.trim() || checking}
                onClick={() => verifyToken(tokenInput)}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{checking ? 'Verificando invitación...' : 'Verificar Invitación'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-stone-500">
            ¿Ya tienes tu cuenta configurada?{' '}
            <button
              type="button"
              onClick={onGoToSignIn}
              className="font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
            >
              Iniciar sesión
            </button>
          </p>

          <button
            type="button"
            onClick={onBackToWelcome}
            className="text-[11px] text-stone-400 hover:text-stone-600 font-medium transition-colors cursor-pointer mt-1"
          >
            ← Volver a la pantalla inicial
          </button>
        </div>
      </div>

      {/* Trust Tag */}
      <p className="text-[11px] text-stone-400 text-center z-10 mt-4">
        Modelo de igualdad total: sin jerarquías ni roles secundarios entre adultos.
      </p>
    </div>
  );
};
