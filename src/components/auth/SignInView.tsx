import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff, LogIn } from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthUser } from '../../types/auth';
import { triggerConfetti } from '../common/ConfettiCelebration';

interface SignInViewProps {
  onBackToWelcome: () => void;
  onGoToSignUp: () => void;
  onGoToResetPassword: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export const SignInView: React.FC<SignInViewProps> = ({
  onBackToWelcome,
  onGoToSignUp,
  onGoToResetPassword,
  onAuthSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.signIn(cleanEmail, password);
      setLoading(false);

      if (res.success && res.data) {
        triggerConfetti();
        onAuthSuccess(res.data.user);
      } else {
        setErrorMessage(
          res.error ||
          'El correo electrónico o la contraseña ingresada son incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.'
        );
      }
    } catch (err: unknown) {
      setLoading(false);
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado durante el inicio de sesión.');
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

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200/80 text-[11px] font-semibold text-stone-600">
          <LogIn className="w-3 h-3 text-stone-500" />
          <span>Acceso</span>
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
              Iniciar sesión
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              Bienvenido/a de vuelta a tu espacio familiar.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-200/90 text-rose-800 text-xs rounded-2xl p-3.5 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Correo Electrónico */}
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

          {/* 2. Contraseña con enlace ¿Olvidaste tu contraseña? */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-stone-700">Contraseña</label>
              <button
                type="button"
                onClick={onGoToResetPassword}
                className="text-[11px] text-amber-600 hover:text-amber-700 hover:underline font-semibold cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
          </div>

          {/* Botón Principal: Iniciar sesión */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-amber-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
          >
            <span>{loading ? 'Iniciando sesión...' : 'Iniciar sesión'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-stone-500">
            ¿Aún no tienes cuenta?{' '}
            <button
              type="button"
              onClick={onGoToSignUp}
              className="font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
            >
              Crear mi familia
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
        Acceso seguro para co-administradores de MELOMUS.
      </p>
    </div>
  );
};
