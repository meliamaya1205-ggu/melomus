import React, { useState, useEffect } from 'react';
import { UserPlus, LogIn, Link2, Heart, Shield, Sparkles } from 'lucide-react';
import { CreateFamilyView } from './CreateFamilyView';
import { SignInView } from './SignInView';
import { ClaimInviteView } from './ClaimInviteView';
import { ResetPasswordView } from './ResetPasswordView';
import { AuthUser } from '../../types/auth';

export type AuthScreenView = 'welcome' | 'signup' | 'signin' | 'claim_invite' | 'reset';

interface WelcomeScreenProps {
  initialView?: AuthScreenView;
  inviteToken?: string | null;
  onAuthSuccess: (user: AuthUser) => void;
  // Optional callbacks for compatibility
  onCreateFamily?: () => void;
  onSignIn?: () => void;
  onClaimInvite?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  initialView = 'welcome',
  inviteToken = null,
  onAuthSuccess,
  onCreateFamily,
  onSignIn,
  onClaimInvite,
}) => {
  const [currentView, setCurrentView] = useState<AuthScreenView>(
    inviteToken ? 'claim_invite' : initialView
  );

  // Sync if inviteToken arrives dynamically
  useEffect(() => {
    if (inviteToken) {
      setCurrentView('claim_invite');
    }
  }, [inviteToken]);

  // If a subview is requested, render the dedicated screen
  if (currentView === 'signup') {
    return (
      <CreateFamilyView
        onBackToWelcome={() => setCurrentView('welcome')}
        onGoToSignIn={() => setCurrentView('signin')}
        onAuthSuccess={onAuthSuccess}
      />
    );
  }

  if (currentView === 'signin') {
    return (
      <SignInView
        onBackToWelcome={() => setCurrentView('welcome')}
        onGoToSignUp={() => setCurrentView('signup')}
        onGoToResetPassword={() => setCurrentView('reset')}
        onAuthSuccess={onAuthSuccess}
      />
    );
  }

  if (currentView === 'claim_invite') {
    return (
      <ClaimInviteView
        initialToken={inviteToken}
        onBackToWelcome={() => setCurrentView('welcome')}
        onGoToSignIn={() => setCurrentView('signin')}
        onAuthSuccess={onAuthSuccess}
      />
    );
  }

  if (currentView === 'reset') {
    return (
      <ResetPasswordView
        onBackToWelcome={() => setCurrentView('welcome')}
        onBackToSignIn={() => setCurrentView('signin')}
      />
    );
  }

  // DEFAULT VIEW: WELCOME SCREEN
  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden select-none">
      {/* Decorative ambient gradient orbs */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-rose-400/10 blur-3xl pointer-events-none" />

      {/* Top Bar / Trust Badge */}
      <div className="w-full max-w-md flex justify-center z-10 animate-in fade-in duration-300">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-stone-200/70 shadow-xs backdrop-blur-xs text-[11px] font-semibold text-stone-600">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Espacio Familiar Co-administrado</span>
        </div>
      </div>

      {/* Center Hero Card */}
      <div className="w-full max-w-md my-auto py-6 flex flex-col items-center text-center z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Official MELOMUS Logo */}
        <div className="relative mb-5 group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-lg shadow-amber-900/5 border border-stone-200/80 bg-white p-1">
            <img
              src="/logo.png"
              alt="MELOMUS"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-amber-500 to-rose-500 text-white p-1.5 rounded-xl shadow-xs">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
        </div>

        {/* Brand Name & Primary Value Proposition */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight leading-none mb-3">
          MELOMUS
        </h1>
        <p className="text-sm sm:text-base text-stone-600 font-medium leading-relaxed max-w-xs sm:max-w-sm mb-2">
          Organiza tu hogar, conecta a tu familia y simplifica tu día.
        </p>

        {/* Elegant Closing Phrase */}
        <p className="text-xs text-stone-400 italic max-w-xs mb-8">
          Un espacio para organizar, conectar y cuidar lo que más importa.
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-3 px-2">
          {/* 1. PRINCIPAL: Crear mi familia */}
          <button
            type="button"
            onClick={() => {
              if (onCreateFamily) onCreateFamily();
              setCurrentView('signup');
            }}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-[0.99] shadow-md shadow-rose-900/10 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear mi familia</span>
          </button>

          {/* 2. SECUNDARIO: Iniciar sesión */}
          <button
            type="button"
            onClick={() => {
              if (onSignIn) onSignIn();
              setCurrentView('signin');
            }}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-stone-800 bg-white hover:bg-stone-50 active:scale-[0.99] border border-stone-200/90 shadow-xs hover:border-stone-300 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-stone-600" />
            <span>Iniciar sesión</span>
          </button>

          {/* 3. OPCIÓN DISCRETA: Me invitaron a una familia */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (onClaimInvite) onClaimInvite();
                setCurrentView('claim_invite');
              }}
              className="text-xs sm:text-sm text-stone-500 hover:text-amber-700 font-medium py-2 px-3 rounded-xl hover:bg-amber-50/60 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-stone-400" />
              <span>¿Te invitaron a una familia? Vincúlate aquí</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Trust Indicators */}
      <div className="w-full max-w-md pt-4 border-t border-stone-200/50 flex items-center justify-center gap-6 text-[11px] text-stone-400 z-10">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-stone-400" />
          <span>Privacidad familiar</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-stone-300" />
        <div className="flex items-center gap-1.5">
          <span>🌸 Mamá & 🌿 Papá</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-stone-300" />
        <div className="flex items-center gap-1.5">
          <span>PWA Multi-dispositivo</span>
        </div>
      </div>
    </div>
  );
};
