import React, { useState, useEffect } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import {
  VisualStyle,
  PersonalColor,
} from '../../types/theme';
import {
  VISUAL_STYLE_OPTIONS,
  ADULT_COLOR_OPTIONS,
  KID_COLOR_OPTIONS,
} from '../../services/themeTokens';
import { ThemePreview } from './ThemePreview';
import { Avatar } from '../common/Avatar';
import {
  Sparkles,
  Palette,
  Check,
  Save,
  CheckCircle2,
  Compass,
  Smile,
  Home,
  Feather,
  Sun,
  Wand2,
  Trees,
} from 'lucide-react';

const STYLE_ICONS: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-4 h-4" />,
  Feather: <Feather className="w-4 h-4" />,
  Home: <Home className="w-4 h-4" />,
  Sun: <Sun className="w-4 h-4" />,
  Smile: <Smile className="w-4 h-4" />,
  Compass: <Compass className="w-4 h-4" />,
  Trees: <Trees className="w-4 h-4" />,
  Wand2: <Wand2 className="w-4 h-4" />,
};

interface ThemeSelectorProps {
  forcedMemberId?: string; // If embedded directly in kids view
  onSaved?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  forcedMemberId,
  onSaved,
}) => {
  const { members, activeProfileId, getMember, isAdultView } = useFamily();
  const {
    savePreference,
    setPreviewTheme,
    getPreferenceForMember,
    tokens,
  } = useTheme();

  // Target member to customize: default to activeProfileId or forcedMemberId
  const initialTarget = forcedMemberId || (activeProfileId === 'family' ? 'mama' : activeProfileId);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialTarget);
  const [prevMemberId, setPrevMemberId] = useState<string>(initialTarget);

  const targetMember = getMember(selectedMemberId) || members[0];
  const isTargetChild = targetMember?.role === 'child';

  // Local state for style and color
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(() => {
    return getPreferenceForMember(selectedMemberId, isTargetChild ? 'child' : 'adult').visualStyle;
  });

  const [selectedColor, setSelectedColor] = useState<PersonalColor>(() => {
    return getPreferenceForMember(selectedMemberId, isTargetChild ? 'child' : 'adult').personalColor;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync style and color during render when selectedMemberId changes
  if (selectedMemberId !== prevMemberId) {
    setPrevMemberId(selectedMemberId);
    const pref = getPreferenceForMember(selectedMemberId, isTargetChild ? 'child' : 'adult');
    setSelectedStyle(pref.visualStyle);
    setSelectedColor(pref.personalColor);
  }

  // Sync external preview when selectedMemberId changes
  useEffect(() => {
    const pref = getPreferenceForMember(selectedMemberId, isTargetChild ? 'child' : 'adult');
    setPreviewTheme(pref);
    return () => {
      setPreviewTheme(null);
    };
  }, [selectedMemberId, isTargetChild, getPreferenceForMember, setPreviewTheme]);

  // Handle changing style
  const handleStyleSelect = (style: VisualStyle) => {
    setSelectedStyle(style);
    setSavedSuccess(false);
    setPreviewTheme({
      memberId: selectedMemberId,
      visualStyle: style,
      personalColor: selectedColor,
    });
  };

  // Handle changing color
  const handleColorSelect = (color: PersonalColor) => {
    setSelectedColor(color);
    setSavedSuccess(false);
    setPreviewTheme({
      memberId: selectedMemberId,
      visualStyle: selectedStyle,
      personalColor: color,
    });
  };

  // Save changes
  const handleSave = () => {
    savePreference(selectedMemberId, selectedStyle, selectedColor);
    setSavedSuccess(true);
    if (onSaved) onSaved();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Available style options according to role
  const availableStyles = VISUAL_STYLE_OPTIONS.filter((s) =>
    isTargetChild ? s.targetRole === 'child' : s.targetRole === 'adult'
  );

  // Available color options according to role
  const availableColors = isTargetChild ? KID_COLOR_OPTIONS : ADULT_COLOR_OPTIONS;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: tokens.primary }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
              Personalización Visual de MELOMUS
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Cada integrante de la familia cuenta con su propio Estilo Visual y Color Personal independiente.
            </p>
          </div>
        </div>

        {/* Member Selector Bar (Only show if not forced and in adult view) */}
        {!forcedMemberId && isAdultView && (
          <div className="mt-5 pt-4 border-t border-stone-100">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2.5">
              Personalizando perfil de:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {members.map((member) => {
                const isSelected = member.id === selectedMemberId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200/80 hover:bg-stone-100'
                    }`}
                  >
                    <Avatar
                      name={member.name}
                      emoji={member.avatarEmoji}
                      color={member.avatarColor}
                      size="sm"
                    />
                    <span>{member.name}</span>
                    <span className="text-[10px] opacity-75">
                      ({member.role === 'adult' ? 'Adulto' : 'Niño'})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Styles & Colors (Left) + Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Estilo Visual */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <span>1. Estilo Visual</span>
                  <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                    {isTargetChild ? 'Modo Infantil' : 'Modo Adultos'}
                  </span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Define la personalidad, sombras, bordes y ambientación general.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableStyles.map((style) => {
                const isSelected = selectedStyle === style.id;
                return (
                  <div
                    key={style.id}
                    onClick={() => handleStyleSelect(style.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none relative ${
                      isSelected
                        ? 'border-2 shadow-xs'
                        : 'bg-stone-50/60 hover:bg-stone-50 border-stone-200/70'
                    }`}
                    style={{
                      borderColor: isSelected ? tokens.primary : undefined,
                      backgroundColor: isSelected ? tokens.primarySoft : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                          style={{
                            backgroundColor: isSelected ? tokens.primary : '#f5f5f4',
                            color: isSelected ? '#ffffff' : '#57534e',
                          }}
                        >
                          {STYLE_ICONS[style.icon] || <Sparkles className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900">{style.name}</h4>
                          <span className="text-[10px] text-stone-400 font-medium">
                            {style.badge}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: tokens.primary }}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-stone-500 mt-2.5 leading-snug">
                      {style.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Color Personal */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-stone-900">
                2. Color Personal
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Acento identificador para botones, insignias, tarjetas y navegación.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {availableColors.map((color) => {
                const isSelected = selectedColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleColorSelect(color.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-2 shadow-xs'
                        : 'bg-stone-50/60 hover:bg-stone-50 border-stone-200/70'
                    }`}
                    style={{
                      borderColor: isSelected ? color.hex : undefined,
                      backgroundColor: isSelected ? color.secondaryHex : undefined,
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full shrink-0 shadow-2xs flex items-center justify-center text-white"
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                    <span className="text-xs font-semibold text-stone-800 capitalize truncate">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 px-5 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
              style={{ backgroundColor: tokens.primary }}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Guardado exitosamente para {targetMember?.name}!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar personalización para {targetMember?.name}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: tokens.primary }} />
                <span>Vista Previa en Tiempo Real</span>
              </span>
              <span className="text-[11px] text-stone-400 font-medium">
                {targetMember?.name}
              </span>
            </div>

            <ThemePreview memberName={targetMember?.name} />

            <p className="text-[11px] text-stone-400 text-center font-medium">
              Al tocar cualquier estilo o color, verás cómo se adapta toda la aplicación inmediatamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
