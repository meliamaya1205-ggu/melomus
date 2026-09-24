import React, { useState } from 'react';
import { Mail, KeyRound, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '../../services/authService';

interface ResetPasswordViewProps {
  onBackToWelcome: () => void;
  onBackToSignIn: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  onBackToWelcome,
  onBackToSignIn,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.resetPassword(cleanEmail);
      setLoading(false);

      if (res.success) {
        setSuccessMessage('Hemos enviado las instrucciones para restablecer tu contraseña. Por favor revisa tu bandeja de entrada o carpeta de spam.');
      } else {
        setErrorMessage(res.error || 'No fue posible enviar el enlace de recuperación.');
      }
    } catch (err: unknown) {
      setLoading(false);
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado.');
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
          onClick={onBackToSignIn}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-stone-200/80 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-white shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a iniciar sesión</span>
        </button>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-[11px] font-bold text-amber-800">
          <KeyRound className="w-3 h-3 text-amber-600" />
          <span>Seguridad</span>
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
              Recuperar contraseña
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              Te enviaremos un enlace seguro para restablecerla.
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

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs rounded-2xl p-3.5 flex items-start gap-2.5 animate-in fade-in duration-150">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-[10px] text-stone-400">Ingresa la dirección asociada a tu cuenta familiar.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-amber-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}</span>
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col items-center gap-2 text-center">
          <button
            type="button"
            onClick={onBackToSignIn}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
          >
            ← Volver a Iniciar Sesión
          </button>

          <button
            type="button"
            onClick={onBackToWelcome}
            className="text-[11px] text-stone-400 hover:text-stone-600 font-medium transition-colors cursor-pointer mt-1"
          >
            Volver a la pantalla inicial
          </button>
        </div>
      </div>

      {/* Trust Tag */}
      <p className="text-[11px] text-stone-400 text-center z-10 mt-4">
        MELOMUS cuida la seguridad de tu hogar.
      </p>
    </div>
  );
};
