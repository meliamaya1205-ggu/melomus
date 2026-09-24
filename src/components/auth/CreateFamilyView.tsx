import React, { useState } from 'react';
import { User, Mail, Lock, Heart, Sparkles, AlertCircle, ArrowLeft, Eye, EyeOff, Check } from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthUser, PrimaryAdultRelationship } from '../../types/auth';
import { triggerConfetti } from '../common/ConfettiCelebration';

interface CreateFamilyViewProps {
  onBackToWelcome: () => void;
  onGoToSignIn: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export const CreateFamilyView: React.FC<CreateFamilyViewProps> = ({
  onBackToWelcome,
  onGoToSignIn,
  onAuthSuccess,
}) => {
  const [relationship, setRelationship] = useState<PrimaryAdultRelationship>('mama');
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('Nuestra Familia');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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

    try {
      const res = await authService.signUp({
        email: email.trim().toLowerCase(),
        password,
        name: cleanName,
        relationship,
        familyName: familyName.trim() || 'Nuestra Familia',
      });

      setLoading(false);

      if (res.success && res.data) {
        triggerConfetti();
        onAuthSuccess(res.data.user);
      } else {
        setErrorMessage(res.error || 'No fue posible crear la cuenta familiar.');
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
          onClick={onBackToWelcome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-stone-200/80 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-white shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </button>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-[11px] font-bold text-amber-800">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Nueva Familia</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md my-auto bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/80 shadow-xl shadow-stone-900/5 p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-stone-100">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs border border-stone-200/60 bg-white p-0.5 shrink-0">
            <img src="/logo.png" alt="MELOMUS" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight leading-tight">
              Crear mi familia
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              Comienza a organizar tu hogar y conectar a tu familia.
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
          {/* 1. Tipo de adulto: Mamá / Papá */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 block">
              ¿Quién eres en el hogar?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRelationship('mama')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  relationship === 'mama'
                    ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                    : 'bg-stone-50/70 border-stone-200/80 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>🌸 Mamá</span>
                {relationship === 'mama' && <Check className="w-3.5 h-3.5 text-rose-600 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => setRelationship('papa')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  relationship === 'papa'
                    ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-2xs'
                    : 'bg-stone-50/70 border-stone-200/80 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>🌿 Papá</span>
                {relationship === 'papa' && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
              </button>
            </div>
          </div>

          {/* 2. Tu Nombre */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 block">Tu Nombre</label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Carolina o Matías"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* 3. Nombre de la Familia */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 block">Nombre de tu Familia</label>
            <div className="relative">
              <Heart className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Ej. Familia Pérez Soto"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* 4. Correo Electrónico */}
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

          {/* 5. Contraseña */}
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
            <p className="text-[10px] text-stone-400">Podrás invitar al segundo adulto co-administrador tras crear tu familia.</p>
          </div>

          {/* Botón Principal: Crear Cuenta Familiar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-rose-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Creando tu cuenta familiar...' : 'Crear Cuenta Familiar'}</span>
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-stone-500">
            ¿Ya tienes cuenta?{' '}
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
        MELOMUS protege tus datos familiares con cifrado y sincronización privada.
      </p>
    </div>
  );
};
