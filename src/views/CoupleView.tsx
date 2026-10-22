import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { formatFriendlyDate, getTodayString } from '../services/dateUtils';
import { Modal } from '../components/common/Modal';
import {
  CheckInMood,
  ConversationStatus,
  SpiritualItemType,
} from '../types/couple';
import {
  Heart,
  Calendar,
  MessageCircle,
  Sparkles,
  Gift,
  Smile,
  CheckCheck,
  Sun,
  Flame,
  Camera,
  Plus,
  Lock,
  Eye,
  EyeOff,
  Check,
  Clock,
  Trash2,
  Edit2,
  Users,
  HeartPulse,
  Trophy,
} from 'lucide-react';

type CoupleTab =
  | 'inicio'
  | 'checkin'
  | 'conversaciones'
  | 'tiempo'
  | 'gestos'
  | 'habitos'
  | 'acuerdos'
  | 'espiritual'
  | 'cuqui'
  | 'recuerdos';

export const CoupleView: React.FC = () => {
  const {
    isAdultView,
    activeProfileId,
    setActiveProfileId,
    setCurrentTab,
    members,
    config,
    habits,
    toggleHabitForToday,
    coupleCheckIns,
    addCoupleCheckIn,
    updateCoupleCheckIn,
    deleteCoupleCheckIn,
    coupleConversations,
    addCoupleConversation,
    updateCoupleConversation,
    deleteCoupleConversation,
    coupleDates,
    addCoupleDate,
    updateCoupleDate,
    deleteCoupleDate,
    coupleGestures,
    addCoupleGesture,
    updateCoupleGesture,
    deleteCoupleGesture,
    recordCoupleGesture,
    coupleAgreements,
    addCoupleAgreement,
    updateCoupleAgreement,
    deleteCoupleAgreement,
    coupleSpiritualItems,
    addCoupleSpiritualItem,
    updateCoupleSpiritualItem,
    toggleCoupleSpiritualItem,
    deleteCoupleSpiritualItem,
    cuquiTimeSessions,
    addCuquiTimeSession,
    updateCuquiTimeSession,
    deleteCuquiTimeSession,
    coupleMemories,
    addCoupleMemory,
    updateCoupleMemory,
    deleteCoupleMemory,
  } = useFamily();

  const [activeTab, setActiveTab] = useState<CoupleTab>('inicio');
  const todayStr = getTodayString();

  // Active Adult
  const activeAdultId = activeProfileId === 'papa' ? 'papa' : 'mama';
  const activeAdult = members.find((m) => m.id === activeAdultId) || members[0];
  const otherAdult = members.find((m) => m.role === 'adult' && m.id !== activeAdultId) || members[1];

  // Quick suggestion filter in Tiempo Juntos
  const [selectedDurationFilter, setSelectedDurationFilter] = useState<number | 'all'>('all');

  // Privacy toggle for Cuqui Time preview
  const [hideCuquiDetails, setHideCuquiDetails] = useState(true);

  // Modals state
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [convModalOpen, setConvModalOpen] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [spiritualModalOpen, setSpiritualModalOpen] = useState(false);
  const [cuquiModalOpen, setCuquiModalOpen] = useState(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);

  // Editing state for modals
  const [editingCheckInId, setEditingCheckInId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingAgrId, setEditingAgrId] = useState<string | null>(null);
  const [editingSpId, setEditingSpId] = useState<string | null>(null);
  const [editingCuquiId, setEditingCuquiId] = useState<string | null>(null);
  const [editingMemId, setEditingMemId] = useState<string | null>(null);

  // Gesture form state
  const [gstModalOpen, setGstModalOpen] = useState(false);
  const [editingGstId, setEditingGstId] = useState<string | null>(null);
  const [gstTitle, setGstTitle] = useState('');
  const [gstDescription, setGstDescription] = useState('');
  const [gstCategory, setGstCategory] = useState<'afecto' | 'palabras' | 'servicio' | 'tiempo' | 'sorpresa'>('afecto');
  const [justRecordedGstId, setJustRecordedGstId] = useState<string | null>(null);

  // Check-in form
  const [checkMood, setCheckMood] = useState<CheckInMood>('bien');
  const [checkNeed, setCheckNeed] = useState('Un abrazo');
  const [checkNote, setCheckNote] = useState('');
  const [checkPrivate, setCheckPrivate] = useState(false);

  // Conversation form
  const [convTitle, setConvTitle] = useState('');
  const [convDesc, setConvDesc] = useState('');
  const [convCategory, setConvCategory] = useState('tiempo_juntos');
  const [convStatus, setConvStatus] = useState<ConversationStatus>('pending');
  const [convNotes, setConvNotes] = useState('');
  const [convPrivate, setConvPrivate] = useState(false);

  // Date form
  const [dateTitle, setDateTitle] = useState('');
  const [dateDay, setDateDay] = useState(todayStr);
  const [dateTime, setDateTime] = useState('21:30');
  const [dateDuration, setDateDuration] = useState(60);
  const [dateType, setDateType] = useState('cena');
  const [dateNotes, setDateNotes] = useState('');
  const [dateSyncCalendar, setDateSyncCalendar] = useState(true);

  // Agreement form
  const [agrTitle, setAgrTitle] = useState('');
  const [agrDesc, setAgrDesc] = useState('');
  const [agrCategory, setAgrCategory] = useState('tiempo');
  const [agrFreq, setAgrFreq] = useState<'daily' | 'weekly' | 'monthly' | 'permanent'>('weekly');
  const [agrResp] = useState('both');
  const [agrNotes, setAgrNotes] = useState('');

  // Spiritual form
  const [spType, setSpType] = useState<SpiritualItemType>('prayer_request');
  const [spTitle, setSpTitle] = useState('');
  const [spContent, setSpContent] = useState('');
  const [spNotes, setSpNotes] = useState('');

  // Cuqui Time form
  const [cuquiDate, setCuquiDate] = useState(todayStr);
  const [cuquiTime, setCuquiTime] = useState('22:30');
  const [cuquiDuration, setCuquiDuration] = useState(60);
  const [cuquiNotes, setCuquiNotes] = useState('');
  const [cuquiPreps, setCuquiPreps] = useState<string[]>(['velas', 'musica', 'sin_celulares']);

  // Memory form
  const [memTitle, setMemTitle] = useState('');
  const [memDesc, setMemDesc] = useState('');
  const [memDate, setMemDate] = useState(todayStr);
  const [memCategory, setMemCategory] = useState<'first_date' | 'anniversary' | 'birthday' | 'trip' | 'family_moment' | 'milestone' | 'other'>('first_date');
  const [memEmoji] = useState('❤️');

  // Privacy Guard: Children profiles cannot view Couple module
  if (!isAdultView) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center max-w-md mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-4">
          <Heart className="w-8 h-8 fill-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Espacio Exclusivo de Pareja</h3>
        <p className="text-xs text-stone-500 mt-2 leading-relaxed">
          Este espacio es íntimo y privado para Mamá y Papá. Los niños no tienen acceso para resguardar la privacidad del hogar.
        </p>
        <button
          onClick={() => setActiveProfileId('mama')}
          className="mt-6 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          Acceder con perfil de Mamá / Papá
        </button>
      </div>
    );
  }

  // Filtered couple habits
  const coupleHabitsList = habits.filter((h) => h.routineType === 'couple' || h.isCouple);

  // Sub-tabs configuration
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'checkin', label: 'Check-in', icon: <Heart className="w-3.5 h-3.5" /> },
    { id: 'conversaciones', label: 'Conversaciones', icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { id: 'tiempo', label: 'Tiempo Juntos', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'gestos', label: 'Gestos de Cariño', icon: <Gift className="w-3.5 h-3.5" /> },
    { id: 'habitos', label: 'Hábitos', icon: <Smile className="w-3.5 h-3.5" /> },
    { id: 'acuerdos', label: 'Acuerdos', icon: <CheckCheck className="w-3.5 h-3.5" /> },
    { id: 'espiritual', label: 'Vida Espiritual', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'cuqui', label: '💕 Cuqui Time', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'recuerdos', label: 'Recuerdos', icon: <Camera className="w-3.5 h-3.5" /> },
  ];

  // Duration suggestions for Tiempo Juntos
  const durationSuggestions = [
    {
      min: 5,
      label: '5 minutos',
      icon: '⚡',
      ideas: ['Abrazo largo de 30 segundos en silencio', 'Mirarse a los ojos y darse las gracias', 'Respirar juntos antes de salir'],
    },
    {
      min: 15,
      label: '15 minutos',
      icon: '☕',
      ideas: ['Café o infusión caliente sin celulares', 'Masaje suave de hombros para aliviar el día', 'Conversar sobre cómo estuvo el día'],
    },
    {
      min: 30,
      label: '30 minutos',
      icon: '🍷',
      ideas: ['Copa de vino o postre rico en el living', 'Escuchar música tranquila juntos en el sillón', 'Paseo corto a la manzana'],
    },
    {
      min: 60,
      label: '1 hora',
      icon: '🕯️',
      ideas: ['Cena rica a la luz de las velas después de acostar a los niños', 'Ver un capítulo de serie juntos abrazados', 'Planificar sueños y vacaciones'],
    },
    {
      min: 120,
      label: '2 horas',
      icon: '🎬',
      ideas: ['Salida al cine o restaurante favorito', 'Caminata larga por el parque o café en la tarde', 'Cocinar una receta entretenida juntos'],
    },
    {
      min: 240,
      label: 'Una tarde',
      icon: '🌲',
      ideas: ['Escapada solos al parque o mirador', 'Tarde de spa casero o descanso en pareja', 'Visitar un lugar nuevo de la ciudad'],
    },
  ];

  // Handlers for saves and edits
  const openNewCheckIn = () => {
    setEditingCheckInId(null);
    setCheckMood('bien');
    setCheckNeed('Un abrazo');
    setCheckNote('');
    setCheckPrivate(false);
    setCheckInModalOpen(true);
  };

  const openEditCheckIn = (chk: any) => {
    setEditingCheckInId(chk.id);
    setCheckMood(chk.mood);
    setCheckNeed(chk.need);
    setCheckNote(chk.note || '');
    setCheckPrivate(chk.isPrivate || false);
    setCheckInModalOpen(true);
  };

  const handleSaveCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCheckInId) {
      updateCoupleCheckIn(editingCheckInId, {
        mood: checkMood,
        need: checkNeed,
        note: checkNote.trim() || undefined,
        isPrivate: checkPrivate,
      });
    } else {
      addCoupleCheckIn({
        memberId: activeAdultId,
        memberName: activeAdult.name,
        mood: checkMood,
        need: checkNeed,
        note: checkNote.trim() || undefined,
        isPrivate: checkPrivate,
        date: todayStr,
      });
    }
    setCheckNote('');
    setCheckInModalOpen(false);
  };

  const openNewConv = () => {
    setEditingConvId(null);
    setConvTitle('');
    setConvDesc('');
    setConvCategory('tiempo_juntos');
    setConvStatus('pending');
    setConvNotes('');
    setConvPrivate(false);
    setConvModalOpen(true);
  };

  const openEditConv = (conv: any) => {
    setEditingConvId(conv.id);
    setConvTitle(conv.title);
    setConvDesc(conv.description || '');
    setConvCategory(conv.categoryKey || 'tiempo_juntos');
    setConvStatus(conv.status || 'pending');
    setConvNotes(conv.notes || '');
    setConvPrivate(conv.isPrivate || false);
    setConvModalOpen(true);
  };

  const handleSaveConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convTitle.trim()) return;
    if (editingConvId) {
      updateCoupleConversation(editingConvId, {
        title: convTitle.trim(),
        description: convDesc.trim() || undefined,
        categoryKey: convCategory,
        status: convStatus,
        notes: convNotes.trim() || undefined,
        isPrivate: convPrivate,
      });
    } else {
      addCoupleConversation({
        title: convTitle.trim(),
        description: convDesc.trim() || undefined,
        categoryKey: convCategory,
        createdBy: activeAdultId,
        date: todayStr,
        status: convStatus,
        notes: convNotes.trim() || undefined,
        isPrivate: convPrivate,
      });
    }
    setConvTitle('');
    setConvDesc('');
    setConvNotes('');
    setConvPrivate(false);
    setConvModalOpen(false);
  };

  const openNewDate = () => {
    setEditingDateId(null);
    setDateTitle('');
    setDateDay(todayStr);
    setDateTime('21:30');
    setDateDuration(60);
    setDateType('cena');
    setDateNotes('');
    setDateSyncCalendar(true);
    setDateModalOpen(true);
  };

  const openEditDate = (d: any) => {
    setEditingDateId(d.id);
    setDateTitle(d.title);
    setDateDay(d.date);
    setDateTime(d.time || '21:30');
    setDateDuration(d.durationMinutes || 60);
    setDateType(d.typeKey || 'cena');
    setDateNotes(d.notes || '');
    setDateSyncCalendar(d.syncedToCalendar ?? true);
    setDateModalOpen(true);
  };

  const handleSaveDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTitle.trim()) return;
    if (editingDateId) {
      updateCoupleDate(editingDateId, {
        title: dateTitle.trim(),
        date: dateDay,
        time: dateTime,
        durationMinutes: dateDuration,
        typeKey: dateType,
        notes: dateNotes.trim() || undefined,
        syncedToCalendar: dateSyncCalendar,
      });
    } else {
      addCoupleDate({
        title: dateTitle.trim(),
        date: dateDay,
        time: dateTime,
        durationMinutes: dateDuration,
        typeKey: dateType,
        notes: dateNotes.trim() || undefined,
        hasReminder: true,
        status: 'planned',
        syncedToCalendar: dateSyncCalendar,
      });
    }
    setDateTitle('');
    setDateNotes('');
    setDateModalOpen(false);
  };

  const openNewAgr = () => {
    setEditingAgrId(null);
    setAgrTitle('');
    setAgrDesc('');
    setAgrCategory('tiempo');
    setAgrFreq('weekly');
    setAgrNotes('');
    setAgreementModalOpen(true);
  };

  const openEditAgr = (agr: any) => {
    setEditingAgrId(agr.id);
    setAgrTitle(agr.title);
    setAgrDesc(agr.description || '');
    setAgrCategory(agr.categoryKey || 'tiempo');
    setAgrFreq(agr.frequency || 'weekly');
    setAgrNotes(agr.notes || '');
    setAgreementModalOpen(true);
  };

  const handleSaveAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agrTitle.trim()) return;
    if (editingAgrId) {
      updateCoupleAgreement(editingAgrId, {
        title: agrTitle.trim(),
        description: agrDesc.trim(),
        categoryKey: agrCategory,
        frequency: agrFreq,
        notes: agrNotes.trim() || undefined,
      });
    } else {
      addCoupleAgreement({
        title: agrTitle.trim(),
        description: agrDesc.trim(),
        categoryKey: agrCategory,
        responsibleId: agrResp,
        date: todayStr,
        frequency: agrFreq,
        status: 'active',
        notes: agrNotes.trim() || undefined,
      });
    }
    setAgrTitle('');
    setAgrDesc('');
    setAgrNotes('');
    setAgreementModalOpen(false);
  };

  const openNewSp = () => {
    setEditingSpId(null);
    setSpType('prayer_request');
    setSpTitle('');
    setSpContent('');
    setSpNotes('');
    setSpiritualModalOpen(true);
  };

  const openEditSp = (sp: any) => {
    setEditingSpId(sp.id);
    setSpType(sp.type || 'prayer_request');
    setSpTitle(sp.title);
    setSpContent(sp.content || '');
    setSpNotes(sp.notes || '');
    setSpiritualModalOpen(true);
  };

  const handleSaveSpiritual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spTitle.trim()) return;
    if (editingSpId) {
      updateCoupleSpiritualItem(editingSpId, {
        type: spType,
        title: spTitle.trim(),
        content: spContent.trim(),
        notes: spNotes.trim() || undefined,
      });
    } else {
      addCoupleSpiritualItem({
        type: spType,
        title: spTitle.trim(),
        content: spContent.trim(),
        date: todayStr,
        status: 'pending',
        addedBy: activeAdultId,
        notes: spNotes.trim() || undefined,
      });
    }
    setSpTitle('');
    setSpContent('');
    setSpNotes('');
    setSpiritualModalOpen(false);
  };

  const openNewCuqui = () => {
    setEditingCuquiId(null);
    setCuquiDate(todayStr);
    setCuquiTime('22:30');
    setCuquiDuration(60);
    setCuquiNotes('');
    setCuquiPreps(['velas', 'musica', 'sin_celulares']);
    setCuquiModalOpen(true);
  };

  const openEditCuqui = (s: any) => {
    setEditingCuquiId(s.id);
    setCuquiDate(s.date);
    setCuquiTime(s.time || '22:30');
    setCuquiDuration(s.durationMinutes || 60);
    setCuquiNotes(s.privateNotes || '');
    setCuquiPreps(s.preparations || ['velas', 'musica', 'sin_celulares']);
    setCuquiModalOpen(true);
  };

  const handleSaveCuqui = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCuquiId) {
      updateCuquiTimeSession(editingCuquiId, {
        date: cuquiDate,
        time: cuquiTime,
        durationMinutes: cuquiDuration,
        privateNotes: cuquiNotes.trim() || undefined,
        preparations: cuquiPreps,
      });
    } else {
      addCuquiTimeSession({
        date: cuquiDate,
        time: cuquiTime,
        durationMinutes: cuquiDuration,
        privateNotes: cuquiNotes.trim() || undefined,
        hasReminder: true,
        status: 'planned',
        hideDetails: true,
        preparations: cuquiPreps,
      });
    }
    setCuquiNotes('');
    setCuquiModalOpen(false);
  };

  const openNewMem = () => {
    setEditingMemId(null);
    setMemTitle('');
    setMemDesc('');
    setMemDate(todayStr);
    setMemCategory('first_date');
    setMemoryModalOpen(true);
  };

  const openEditMem = (m: any) => {
    setEditingMemId(m.id);
    setMemTitle(m.title);
    setMemDesc(m.description || '');
    setMemDate(m.date);
    setMemCategory(m.category || 'first_date');
    setMemoryModalOpen(true);
  };

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memTitle.trim()) return;
    if (editingMemId) {
      updateCoupleMemory(editingMemId, {
        title: memTitle.trim(),
        description: memDesc.trim(),
        date: memDate,
        category: memCategory,
        emoji: memEmoji,
      });
    } else {
      addCoupleMemory({
        title: memTitle.trim(),
        description: memDesc.trim(),
        date: memDate,
        category: memCategory,
        emoji: memEmoji,
      });
    }
    setMemTitle('');
    setMemDesc('');
    setMemoryModalOpen(false);
  };

  // --- Gestures Handlers ---
  const handleRecordGesture = (gestureId: string) => {
    recordCoupleGesture(gestureId, activeAdultId);
    setJustRecordedGstId(gestureId);
    setTimeout(() => {
      setJustRecordedGstId(null);
    }, 2500);
  };

  const openNewGst = () => {
    setEditingGstId(null);
    setGstTitle('');
    setGstDescription('');
    setGstCategory('afecto');
    setGstModalOpen(true);
  };

  const openEditGst = (gst: any) => {
    setEditingGstId(gst.id);
    setGstTitle(gst.title);
    setGstDescription(gst.description || '');
    setGstCategory(gst.category || 'afecto');
    setGstModalOpen(true);
  };

  const handleSaveGesture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gstTitle.trim()) return;
    if (editingGstId) {
      updateCoupleGesture(editingGstId, {
        title: gstTitle.trim(),
        description: gstDescription.trim(),
        category: gstCategory,
      });
    } else {
      addCoupleGesture({
        title: gstTitle.trim(),
        description: gstDescription.trim(),
        category: gstCategory,
      });
    }
    setGstTitle('');
    setGstDescription('');
    setGstModalOpen(false);
  };

  const moodEmojis: Record<CheckInMood, { emoji: string; label: string }> = {
    muy_bien: { emoji: '😊', label: 'Muy bien' },
    bien: { emoji: '🙂', label: 'Bien' },
    regular: { emoji: '😐', label: 'Regular' },
    necesito_apoyo: { emoji: '😔', label: 'Necesito apoyo' },
    necesito_conexion: { emoji: '❤️', label: 'Necesito conexión' },
  };

  // Recent shared check-ins
  const visibleCheckIns = coupleCheckIns.filter(
    (c) => !c.isPrivate || c.memberId === activeAdultId
  );
  // Conversations: shared OR private belonging to active adult
  const visibleConversations = coupleConversations.filter(
    (c) => !c.isPrivate || c.createdBy === activeAdultId
  );
  const nextDate = coupleDates.find((d) => d.status === 'planned');
  const pendingConvs = visibleConversations.filter((c) => c.status === 'pending');
  const activeAgreements = coupleAgreements.filter((a) => a.status === 'active');
  const nextCuqui = cuquiTimeSessions.find((c) => c.status === 'planned');

  return (
    <div className="space-y-6">
      {/* Sub-nav dentro de la sección Familia */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl overflow-x-auto text-xs font-bold w-fit">
        <button
          onClick={() => setCurrentTab('family')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-colors cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-stone-700" />
          <span>Integrantes</span>
        </button>
        <button
          onClick={() => setCurrentTab('couple')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-rose-900 shadow-xs cursor-pointer"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-100" />
          <span>Pareja 💕</span>
        </button>
        <button
          onClick={() => setCurrentTab('health')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-colors cursor-pointer"
        >
          <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
          <span>Salud 🏥</span>
        </button>
        <button
          onClick={() => setCurrentTab('habits')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-colors cursor-pointer"
        >
          <Smile className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hábitos 🌱</span>
        </button>
        <button
          onClick={() => setCurrentTab('rewards')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-colors cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Recompensas 🏆</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <span>{config.modules.couple?.displayName || 'Pareja'}</span>
              <span className="text-rose-500">💕</span>
            </h2>
            <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
              <Lock className="w-3 h-3 text-rose-600" />
              <span>Privado de Adultos</span>
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Espacio íntimo, cálido y privado para cuidar y fortalecer la relación de Mamá y Papá
          </p>
        </div>

        {/* Quick Action button in header */}
        <div className="flex items-center gap-2">
          <button
            onClick={openNewCheckIn}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 fill-white" />
            <span>+ Check-in de Hoy</span>
          </button>
        </div>
      </div>

      {/* Inspiring Philosophy Banner */}
      <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 p-4 rounded-3xl border border-rose-100/80 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💍</span>
          <div>
            <p className="text-xs font-bold text-stone-900 italic">
              “No se trata de tener una relación perfecta. Se trata de seguir eligiéndose y cuidándose.”
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Cuidarnos también es parte de cuidar nuestro hogar y a nuestros hijos.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-white/80 px-3 py-1.5 rounded-2xl border border-rose-100">
          <span>{activeAdult.name} & {otherAdult.name}</span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl overflow-x-auto text-xs font-bold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CoupleTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-rose-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. INICIO (DASHBOARD) */}
      {activeTab === 'inicio' && (
        <div className="space-y-6">
          {/* Quick Access Action Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              onClick={() => setCheckInModalOpen(true)}
              className="p-3 bg-white hover:bg-rose-50/50 rounded-2xl border border-stone-200/80 text-left transition-all shadow-2xs group cursor-pointer"
            >
              <Heart className="w-4 h-4 text-rose-500 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-stone-900">+ Check-in</p>
              <p className="text-[10px] text-stone-400">¿Cómo estoy hoy?</p>
            </button>

            <button
              onClick={() => setConvModalOpen(true)}
              className="p-3 bg-white hover:bg-rose-50/50 rounded-2xl border border-stone-200/80 text-left transition-all shadow-2xs group cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-sky-500 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-stone-900">+ Conversar</p>
              <p className="text-[10px] text-stone-400">Tema pendiente</p>
            </button>

            <button
              onClick={() => setDateModalOpen(true)}
              className="p-3 bg-white hover:bg-rose-50/50 rounded-2xl border border-stone-200/80 text-left transition-all shadow-2xs group cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-purple-500 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-stone-900">+ Momento Juntos</p>
              <p className="text-[10px] text-stone-400">Cita o café a solas</p>
            </button>

            <button
              onClick={() => setAgreementModalOpen(true)}
              className="p-3 bg-white hover:bg-rose-50/50 rounded-2xl border border-stone-200/80 text-left transition-all shadow-2xs group cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-emerald-500 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-stone-900">+ Acuerdo</p>
              <p className="text-[10px] text-stone-400">Equipo familiar</p>
            </button>

            <button
              onClick={() => setCuquiModalOpen(true)}
              className="p-3 bg-white hover:bg-rose-50/50 rounded-2xl border border-rose-200 text-left transition-all shadow-2xs group cursor-pointer col-span-2 sm:col-span-1"
            >
              <Flame className="w-4 h-4 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-rose-900">+ Cuqui Time</p>
              <p className="text-[10px] text-rose-400">Momento íntimo</p>
            </button>
          </div>

          {/* Core Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Cómo estamos (Check-ins de hoy) */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>Cómo estamos</span>
                </h3>
                <button
                  onClick={() => setActiveTab('checkin')}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Ver todos →
                </button>
              </div>

              {visibleCheckIns.length === 0 ? (
                <div className="p-4 bg-stone-50 rounded-2xl text-center text-xs text-stone-400">
                  Sin check-in registrado hoy. ¿Cómo te sientes hoy?
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleCheckIns.slice(0, 2).map((chk) => (
                    <div
                      key={chk.id}
                      className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100/70 flex items-start gap-3"
                    >
                      <span className="text-2xl">{moodEmojis[chk.mood]?.emoji || '🙂'}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900">{chk.memberName}</span>
                          <span className="text-[10px] text-stone-400">
                            {chk.isPrivate ? '🔒 Privado' : '❤️ Compartido'}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-rose-700 mt-0.5">
                          Necesito: {chk.need}
                        </p>
                        {chk.note && (
                          <p className="text-[11px] text-stone-500 mt-0.5 italic">{chk.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 2: Próximo momento juntos */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span>Próximo momento juntos</span>
                </h3>
                <button
                  onClick={() => setActiveTab('tiempo')}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                >
                  Planificar →
                </button>
              </div>

              {nextDate ? (
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950">{nextDate.title}</span>
                    <span className="text-[10px] bg-white text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                      {nextDate.durationMinutes} min
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    <span>{formatFriendlyDate(nextDate.date)} a las {nextDate.time} hrs</span>
                  </div>
                  {nextDate.notes && (
                    <p className="text-[11px] text-stone-500 italic mt-1 bg-white/70 p-2 rounded-xl">
                      {nextDate.notes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-stone-50 rounded-2xl text-center text-xs text-stone-400">
                  <p>Sin citas agendadas.</p>
                  <button
                    onClick={() => setDateModalOpen(true)}
                    className="mt-2 text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    + Agendar un momento juntos
                  </button>
                </div>
              )}
            </div>

            {/* Card 3: Cuqui Time (Discreto y Privado) */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Cuqui Time</span>
                </h3>
                <button
                  onClick={() => setHideCuquiDetails(!hideCuquiDetails)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
                  title={hideCuquiDetails ? 'Mostrar detalles' : 'Ocultar detalles'}
                >
                  {hideCuquiDetails ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {nextCuqui ? (
                <div className="p-4 bg-gradient-to-br from-rose-50/60 via-pink-50/40 to-rose-100/50 rounded-2xl border border-rose-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-950">
                      {hideCuquiDetails ? '❤️ Tiempo de pareja' : '💕 Encuentro Íntimo'}
                    </span>
                    <span className="text-[10px] bg-white text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                      {nextCuqui.durationMinutes} min
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    {formatFriendlyDate(nextCuqui.date)} {nextCuqui.time && `• ${nextCuqui.time} hrs`}
                  </p>
                  {!hideCuquiDetails && nextCuqui.preparations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {nextCuqui.preparations.map((p) => (
                        <span key={p} className="text-[10px] bg-white/80 text-rose-800 px-2 py-0.5 rounded-md font-medium">
                          ✨ {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-stone-50 rounded-2xl text-center text-xs text-stone-400">
                  <p>Sin momento íntimo planificado.</p>
                  <button
                    onClick={() => setCuquiModalOpen(true)}
                    className="mt-2 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    + Planificar con amor
                  </button>
                </div>
              )}
            </div>

            {/* Card 4: Conversaciones pendientes */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-sky-500" />
                  <span>Conversaciones pendientes ({pendingConvs.length})</span>
                </h3>
                <button
                  onClick={() => setActiveTab('conversaciones')}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  Ver todas →
                </button>
              </div>

              {pendingConvs.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center bg-stone-50 rounded-2xl">
                  Sin temas pendientes. ¡Todo conversado!
                </p>
              ) : (
                <div className="space-y-1.5">
                  {pendingConvs.slice(0, 2).map((conv) => (
                    <div
                      key={conv.id}
                      className="p-2.5 bg-sky-50/40 rounded-xl border border-sky-100 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-stone-800">{conv.title}</span>
                      <span className="text-[10px] bg-white text-sky-700 px-2 py-0.5 rounded-full font-bold">
                        Pendiente
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 5: Hábitos de Pareja */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-amber-500" />
                  <span>Hábitos de pareja hoy</span>
                </h3>
                <button
                  onClick={() => setActiveTab('habitos')}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                >
                  Ver hábitos →
                </button>
              </div>

              <div className="space-y-1.5">
                {coupleHabitsList.slice(0, 3).map((h) => {
                  const isDone = h.completedDates.includes(todayStr);
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggleHabitForToday(h.id, todayStr)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 font-semibold'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>{h.title}</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                        isDone ? 'bg-emerald-500 text-white' : 'border border-stone-300'
                      }`}>
                        {isDone && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 6: Acuerdos activos */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                  <span>Acuerdos activos ({activeAgreements.length})</span>
                </h3>
                <button
                  onClick={() => setActiveTab('acuerdos')}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  Ver todos →
                </button>
              </div>

              {activeAgreements.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center bg-stone-50 rounded-2xl">
                  Sin acuerdos registrados.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {activeAgreements.slice(0, 2).map((agr) => (
                    <div
                      key={agr.id}
                      className="p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs"
                    >
                      <p className="font-semibold text-stone-800">{agr.title}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">{agr.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CHECK-IN DE PAREJA */}
      {activeTab === 'checkin' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Check-in de Pareja
              </h3>
              <p className="text-xs text-stone-400">
                Un momento diario para sintonizar con ternura y saber cómo está el otro
              </p>
            </div>
            <button
              onClick={openNewCheckIn}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Check-in</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleCheckIns.map((chk) => (
              <div
                key={chk.id}
                className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{moodEmojis[chk.mood]?.emoji}</span>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">{chk.memberName}</h4>
                      <p className="text-[10px] text-stone-400">{formatFriendlyDate(chk.date)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    chk.isPrivate ? 'bg-stone-100 text-stone-600' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {chk.isPrivate ? '🔒 Privado' : '❤️ Compartido'}
                  </span>
                </div>

                <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100 text-xs">
                  <span className="text-[10px] text-stone-400 block font-semibold">Hoy necesito:</span>
                  <p className="font-bold text-rose-950 mt-0.5">“{chk.need}”</p>
                </div>

                {chk.note && (
                  <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100 italic">
                    {chk.note}
                  </p>
                )}

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-stone-400">
                    {chk.memberId === activeAdultId ? 'Tu registro' : `De ${chk.memberName}`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditCheckIn(chk)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Editar check-in"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('¿Eliminar este check-in?')) {
                          deleteCoupleCheckIn(chk.id);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar check-in"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CONVERSACIONES */}
      {activeTab === 'conversaciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Temas para Conversar con Calma
              </h3>
              <p className="text-xs text-stone-400">
                Guarda temas que necesitan hablar para abordarlos en el momento oportuno
              </p>
            </div>
            <button
              onClick={openNewConv}
              className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Tema</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleConversations.map((conv) => {
              const statusBadges: Record<ConversationStatus, { label: string; color: string }> = {
                pending: { label: '🟡 Pendiente', color: 'bg-amber-100 text-amber-800' },
                talked: { label: '🔵 Conversado', color: 'bg-sky-100 text-sky-800' },
                agreement: { label: '🟢 Acuerdo', color: 'bg-emerald-100 text-emerald-800' },
                resolved: { label: '✅ Resuelto', color: 'bg-stone-100 text-stone-700' },
              };

              return (
                <div
                  key={conv.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-stone-900">{conv.title}</h4>
                        {conv.isPrivate && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 font-semibold px-1.5 py-0.5 rounded-md border border-amber-200">
                            🔒 Borrador Privado
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadges[conv.status]?.color}`}>
                        {statusBadges[conv.status]?.label}
                      </span>
                    </div>

                    {conv.description && (
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">{conv.description}</p>
                    )}

                    {conv.notes && (
                      <p className="text-[11px] text-stone-500 bg-sky-50/50 p-2 rounded-xl border border-sky-100 mt-2 italic">
                        Nota: {conv.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="text-stone-400 capitalize">
                      {conv.createdBy === 'mama' ? 'Agregó Mamá' : 'Agregó Papá'} • {formatFriendlyDate(conv.date)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={conv.status}
                        onChange={(e) => updateCoupleConversation(conv.id, { status: e.target.value as ConversationStatus })}
                        className="text-[10px] bg-stone-100 px-2 py-1 rounded-lg border border-stone-200 font-semibold cursor-pointer"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="talked">Conversado</option>
                        <option value="agreement">Acuerdo</option>
                        <option value="resolved">Resuelto</option>
                      </select>
                      <button
                        onClick={() => openEditConv(conv)}
                        className="p-1.5 text-stone-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Editar tema"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCoupleConversation(conv.id)}
                        className="p-1.5 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar tema"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TIEMPO JUNTOS */}
      {activeTab === 'tiempo' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Planificador de Citas y Momentos Juntos
              </h3>
              <p className="text-xs text-stone-400">
                Desde 5 minutos hasta una tarde completa para reconectar
              </p>
            </div>
            <button
              onClick={openNewDate}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Cita</span>
            </button>
          </div>

          {/* Duration Ideas & Filters */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Ideas según el tiempo disponible:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {durationSuggestions.map((item) => (
                <button
                  key={item.min}
                  onClick={() => setSelectedDurationFilter(selectedDurationFilter === item.min ? 'all' : item.min)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedDurationFilter === item.min
                      ? 'bg-purple-50 border-purple-300 shadow-xs'
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xl block mb-1">{item.icon}</span>
                  <span className="text-xs font-bold text-stone-900 block">{item.label}</span>
                  <span className="text-[10px] text-stone-400 block mt-0.5">{item.ideas[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* List of planned moments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupleDates.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-900">{d.title}</span>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1">
                      <Clock className="w-3.5 h-3.5 text-purple-500" />
                      <span>{formatFriendlyDate(d.date)} a las {d.time} hrs</span>
                      <span>• {d.durationMinutes} min</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {d.status === 'completed' ? 'Realizada' : 'Planificada'}
                  </span>
                </div>

                {d.notes && (
                  <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    {d.notes}
                  </p>
                )}

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => updateCoupleDate(d.id, { status: d.status === 'completed' ? 'planned' : 'completed' })}
                    className="text-xs font-bold text-purple-700 hover:text-purple-800 cursor-pointer"
                  >
                    {d.status === 'completed' ? 'Marcar como pendiente' : '✓ Marcar como realizada'}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditDate(d)}
                      className="p-1.5 text-stone-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                      title="Editar cita"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCoupleDate(d.id)}
                      className="p-1.5 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar cita"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. GESTOS DE CARIÑO */}
      {activeTab === 'gestos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Biblioteca de Gestos de Cariño
              </h3>
              <p className="text-xs text-stone-400">
                Pequeños detalles para nutrir el amor diario. Son sugerencias inspiradoras, no obligaciones.
              </p>
            </div>
            <button
              onClick={openNewGst}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Gesto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupleGestures.map((gst) => (
              <div
                key={gst.id}
                className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900 block">{gst.title}</span>
                    <span className="text-[10px] bg-rose-50 text-rose-800 font-semibold px-2 py-0.5 rounded-full capitalize">
                      {gst.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{gst.description}</p>
                  {gst.lastDoneBy && (
                    <span className="text-[10px] text-stone-400 block mt-1">
                      Último por: {gst.lastDoneBy === 'papa' ? 'Papá' : 'Mamá'} {gst.lastDoneDate ? `• ${formatFriendlyDate(gst.lastDoneDate)}` : ''}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 font-medium">
                    Hecho {gst.completedCount} {gst.completedCount === 1 ? 'vez' : 'veces'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRecordGesture(gst.id)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                        justRecordedGstId === gst.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      }`}
                    >
                      {justRecordedGstId === gst.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Registrado por {activeAdult?.name || 'ti'}! ❤️</span>
                        </>
                      ) : (
                        <span>Hice este gesto ❤️</span>
                      )}
                    </button>
                    <button
                      onClick={() => openEditGst(gst)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Editar gesto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar gesto "${gst.title}"?`)) {
                          deleteCoupleGesture(gst.id);
                        }
                      }}
                      className="p-1.5 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar gesto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. HÁBITOS DE PAREJA */}
      {activeTab === 'habitos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Hábitos y Rutinas de Pareja
              </h3>
              <p className="text-xs text-stone-400">
                Integrados con el sistema general de hábitos del hogar. Sin puntuaciones ni rankings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coupleHabitsList.map((h) => {
              const isDone = h.completedDates.includes(todayStr);

              return (
                <div
                  key={h.id}
                  className={`p-4 rounded-3xl border transition-all flex items-center justify-between ${
                    isDone ? 'bg-emerald-50/70 border-emerald-200 shadow-xs' : 'bg-white border-stone-200/90'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">{h.title}</h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Frecuencia: {h.frequency === 'daily' ? 'Diario' : 'Semanal'} {h.suggestedTime && `• ${h.suggestedTime} hrs`}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleHabitForToday(h.id, todayStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5" />}
                    <span>{isDone ? 'Hecho hoy' : 'Marcar hoy'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. ACUERDOS DE PAREJA */}
      {activeTab === 'acuerdos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Acuerdos y Compromisos del Equipo
              </h3>
              <p className="text-xs text-stone-400">
                Pactos explícitos para mantener la armonía, el orden y la tranquilidad familiar
              </p>
            </div>
            <button
              onClick={openNewAgr}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Acuerdo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupleAgreements.map((agr) => (
              <div
                key={agr.id}
                className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">{agr.title}</h4>
                    <p className="text-[10px] text-stone-400 mt-0.5 capitalize">
                      Categoría: {agr.categoryKey} • Frecuencia: {agr.frequency}
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 capitalize">
                    {agr.status}
                  </span>
                </div>

                <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100 leading-relaxed">
                  {agr.description}
                </p>

                {agr.notes && (
                  <p className="text-[11px] text-stone-500 italic">Nota: {agr.notes}</p>
                )}

                <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => openEditAgr(agr)}
                    className="p-1.5 text-stone-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Editar acuerdo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar acuerdo "${agr.title}"?`)) {
                        deleteCoupleAgreement(agr.id);
                      }
                    }}
                    className="p-1.5 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar acuerdo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. NUESTRA VIDA ESPIRITUAL */}
      {activeTab === 'espiritual' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Nuestra Vida Espiritual
              </h3>
              <p className="text-xs text-stone-400">
                Peticiones de oración, gratitud mutua, devocionales y versículos que nos inspiran
              </p>
            </div>
            <button
              onClick={openNewSp}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Petición / Versículo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupleSpiritualItems.map((sp) => {
              const typeLabels: Record<SpiritualItemType, string> = {
                prayer_request: '🙏 Petición de Oración',
                gratitude: '✨ Agradecimiento',
                devotional: '📖 Devocional',
                bible_verse: '📜 Versículo Bíblico',
                spiritual_goal: '🎯 Meta Espiritual',
              };

              return (
                <div
                  key={sp.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {typeLabels[sp.type]}
                      </span>
                      <span className="text-[10px] text-stone-400">{formatFriendlyDate(sp.date)}</span>
                    </div>

                    <h4 className="text-xs font-bold text-stone-900">{sp.title}</h4>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed bg-amber-50/30 p-2.5 rounded-xl border border-amber-100/60">
                      {sp.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => toggleCoupleSpiritualItem(sp.id)}
                      className={`text-xs font-bold transition-colors cursor-pointer ${
                        sp.status === 'fulfilled' ? 'text-emerald-700' : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      {sp.status === 'fulfilled' ? '✓ Respondido / Cumplido' : 'Marcar como respondido'}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditSp(sp)}
                        className="p-1.5 text-stone-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar este registro espiritual?`)) {
                            deleteCoupleSpiritualItem(sp.id);
                          }
                        }}
                        className="p-1.5 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. CUQUI TIME (SECCIÓN INTERNA EXCLUSIVA) */}
      {activeTab === 'cuqui' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-rose-50 to-pink-50 p-5 rounded-3xl border border-rose-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                  <span>Cuqui Time</span>
                  <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                </h3>
                <span className="text-[10px] bg-rose-200/80 text-rose-900 font-bold px-2 py-0.5 rounded-full">
                  Exclusivo e Íntimo
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                Planificación intencional de momentos de intimidad, afecto y complicidad consensuada entre adultos.
              </p>
            </div>

            <button
              onClick={openNewCuqui}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Programar Momento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cuquiTimeSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-3xl p-5 border border-rose-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💕</span>
                    <div>
                      <h4 className="text-xs font-bold text-rose-950">
                        {hideCuquiDetails ? '❤️ Tiempo de pareja' : 'Momento Íntimo Planificado'}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {formatFriendlyDate(session.date)} • {session.time} hrs
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                    {session.durationMinutes} min
                  </span>
                </div>

                {!hideCuquiDetails && (
                  <>
                    {session.privateNotes && (
                      <p className="text-xs text-stone-600 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 italic">
                        {session.privateNotes}
                      </p>
                    )}
                    {session.preparations?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {session.preparations.map((p) => (
                          <span
                            key={p}
                            className="text-[11px] bg-stone-100 text-stone-700 px-2.5 py-1 rounded-xl font-medium"
                          >
                            ✨ {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">
                    Notificación discreta: "❤️ Tiempo de pareja"
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditCuqui(session)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Editar momento"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('¿Eliminar esta sesión de Cuqui Time?')) {
                          deleteCuquiTimeSession(session.id);
                        }
                      }}
                      className="p-1.5 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar momento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. MOMENTOS ESPECIALES (RECUERDOS) */}
      {activeTab === 'recuerdos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Línea de Tiempo de Recuerdos
              </h3>
              <p className="text-xs text-stone-400">
                Hitos y momentos inolvidables de nuestra historia de amor
              </p>
            </div>
            <button
              onClick={openNewMem}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Recuerdo</span>
            </button>
          </div>

          <div className="relative border-l-2 border-rose-200 ml-4 pl-6 space-y-6">
            {coupleMemories
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((mem) => (
                <div key={mem.id} className="relative bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-2">
                  {/* Dot on timeline */}
                  <span className="absolute -left-[35px] top-6 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs border-2 border-white shadow-2xs">
                    {mem.emoji || '❤️'}
                  </span>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">{mem.title}</span>
                    <span className="text-[10px] text-stone-400 font-semibold">{formatFriendlyDate(mem.date)}</span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">{mem.description}</p>

                  {mem.notes && (
                    <p className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-xl border border-stone-100">
                      {mem.notes}
                    </p>
                  )}

                  <div className="pt-2 flex justify-end gap-1.5">
                    <button
                      onClick={() => openEditMem(mem)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Editar recuerdo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar recuerdo "${mem.title}"?`)) {
                          deleteCoupleMemory(mem.id);
                        }
                      }}
                      className="p-1.5 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar recuerdo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Modal Check-In */}
      <Modal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        title={editingCheckInId ? 'Editar Check-in Diario' : 'Check-in Diario de Pareja'}
        subtitle={editingCheckInId ? 'Modifica tu estado o necesidad' : `Comparte con ternura cómo estás hoy (${activeAdult.name})`}
      >
        <form onSubmit={handleSaveCheckIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              1. ¿Cómo estoy hoy?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['muy_bien', 'bien', 'regular', 'necesito_apoyo', 'necesito_conexion'] as CheckInMood[]).map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setCheckMood(mood)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    checkMood === mood
                      ? 'bg-rose-50 border-rose-300 shadow-2xs text-rose-900 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className="text-xl block mb-0.5">{moodEmojis[mood].emoji}</span>
                  <span className="text-[11px] leading-tight block">{moodEmojis[mood].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              2. ¿Qué necesito de mi pareja hoy?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Que me escuche',
                'Un abrazo',
                'Tiempo juntos',
                'Ayuda con algo',
                'Palabras de cariño',
                'Espacio personal',
              ].map((need) => (
                <button
                  key={need}
                  type="button"
                  onClick={() => setCheckNeed(need)}
                  className={`p-2 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    checkNeed === need
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  • {need}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nota o reflexión adicional (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="¿Algo más que quieras compartir?"
              value={checkNote}
              onChange={(e) => setCheckNote(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700">Privacidad del check-in:</span>
            <button
              type="button"
              onClick={() => setCheckPrivate(!checkPrivate)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                checkPrivate ? 'bg-stone-200 text-stone-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {checkPrivate ? '🔒 Solo para mí' : '❤️ Compartir con pareja'}
            </button>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setCheckInModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingCheckInId ? 'Guardar Cambios' : 'Guardar Check-in'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Conversación */}
      <Modal
        isOpen={convModalOpen}
        onClose={() => setConvModalOpen(false)}
        title={editingConvId ? 'Editar Tema para Conversar' : 'Nuevo Tema para Conversar'}
        subtitle="Guarda un asunto para abordarlo con calma y amor"
      >
        <form onSubmit={handleSaveConversation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Tema / Título</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Salidas de fin de semana, Crianza de Derek..."
              value={convTitle}
              onChange={(e) => setConvTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción</label>
            <textarea
              rows={2}
              placeholder="¿Qué te gustaría conversar o acordar?"
              value={convDesc}
              onChange={(e) => setConvDesc(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <select
                value={convCategory}
                onChange={(e) => setConvCategory(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="familia">Familia</option>
                <option value="crianza">Crianza</option>
                <option value="dinero">Dinero</option>
                <option value="hogar">Hogar</option>
                <option value="tiempo_juntos">Tiempo Juntos</option>
                <option value="intimidad">Intimidad</option>
                <option value="planes_futuros">Planes Futuros</option>
                <option value="preocupacion">Preocupación</option>
                <option value="agradecimiento">Agradecimiento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Estado Inicial</label>
              <select
                value={convStatus}
                onChange={(e) => setConvStatus(e.target.value as ConversationStatus)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="pending">🟡 Pendiente</option>
                <option value="talked">🔵 Conversado</option>
                <option value="agreement">🟢 Acuerdo</option>
                <option value="resolved">✅ Resuelto</option>
              </select>
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <div>
              <p className="text-xs font-bold text-stone-800">Privacidad del tema</p>
              <p className="text-[11px] text-stone-500">
                {convPrivate
                  ? '🔒 Solo visible para mí (borrador personal para reflexionar)'
                  : '❤️ Compartido (visible para ambos adultos)'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConvPrivate(!convPrivate)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                convPrivate
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {convPrivate ? '🔒 Privado' : '❤️ Compartido'}
            </button>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setConvModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingConvId ? 'Guardar Cambios' : 'Guardar Tema'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Momento Juntos */}
      <Modal
        isOpen={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        title={editingDateId ? 'Editar Momento Juntos' : 'Planificar Momento Juntos'}
        subtitle="Un tiempo dedicado exclusivamente a la pareja"
      >
        <form onSubmit={handleSaveDate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Actividad o Plan</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Café juntos, Caminata en el parque, Cena casera..."
              value={dateTitle}
              onChange={(e) => setDateTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={dateDay}
                onChange={(e) => setDateDay(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora</label>
              <input
                type="time"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Duración (minutos)</label>
              <select
                value={dateDuration}
                onChange={(e) => setDateDuration(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value={5}>5 min (Expresivo)</option>
                <option value={15}>15 min (Pausa dulce)</option>
                <option value={30}>30 min (Café / Copa)</option>
                <option value={60}>1 hora (Cena / Conversa)</option>
                <option value={120}>2 horas (Salida)</option>
                <option value={240}>Tarde completa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo</label>
              <select
                value={dateType}
                onChange={(e) => setDateType(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="cita">Cita</option>
                <option value="cena">Cena</option>
                <option value="pelicula">Película</option>
                <option value="caminata">Caminata</option>
                <option value="cafe">Café juntos</option>
                <option value="conversacion">Conversación</option>
                <option value="sin_celulares">Tiempo sin celulares</option>
                <option value="aniversario">Aniversario</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200">
            <input
              type="checkbox"
              id="syncCal"
              checked={dateSyncCalendar}
              onChange={(e) => setDateSyncCalendar(e.target.checked)}
              className="rounded-sm text-purple-600 cursor-pointer"
            />
            <label htmlFor="syncCal" className="text-xs text-stone-700 font-semibold cursor-pointer">
              Sincronizar como evento en el Calendario Familiar
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setDateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingDateId ? 'Guardar Cambios' : 'Agendar Momento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Acuerdo */}
      <Modal
        isOpen={agreementModalOpen}
        onClose={() => setAgreementModalOpen(false)}
        title={editingAgrId ? 'Editar Acuerdo de Pareja' : 'Registrar Acuerdo de Pareja'}
        subtitle="Un pacto amoroso para cuidar el equipo que forman"
      >
        <form onSubmit={handleSaveAgreement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Título del Acuerdo</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Revisar la semana juntos los domingos..."
              value={agrTitle}
              onChange={(e) => setAgrTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción y Compromiso</label>
            <textarea
              rows={2}
              required
              placeholder="¿Qué acordamos hacer en concreto?"
              value={agrDesc}
              onChange={(e) => setAgrDesc(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <select
                value={agrCategory}
                onChange={(e) => setAgrCategory(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="tiempo">Tiempo</option>
                <option value="hogar">Hogar</option>
                <option value="crianza">Crianza</option>
                <option value="dinero">Dinero</option>
                <option value="comunicacion">Comunicación</option>
                <option value="personal">Personal / Autocuidado</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Frecuencia</label>
              <select
                value={agrFreq}
                onChange={(e) => setAgrFreq(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="weekly">Semanal</option>
                <option value="daily">Diaria</option>
                <option value="monthly">Mensual</option>
                <option value="permanent">Permanente</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setAgreementModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingAgrId ? 'Guardar Cambios' : 'Guardar Acuerdo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Vida Espiritual */}
      <Modal
        isOpen={spiritualModalOpen}
        onClose={() => setSpiritualModalOpen(false)}
        title={editingSpId ? 'Editar Vida Espiritual' : 'Vida Espiritual de la Pareja'}
        subtitle="Oraciones, gratitud y versículos que sostienen el hogar"
      >
        <form onSubmit={handleSaveSpiritual} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo</label>
            <select
              value={spType}
              onChange={(e) => setSpType(e.target.value as SpiritualItemType)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            >
              <option value="prayer_request">🙏 Petición de Oración</option>
              <option value="gratitude">✨ Agradecimiento</option>
              <option value="bible_verse">📜 Versículo Bíblico</option>
              <option value="devotional">📖 Devocional</option>
              <option value="spiritual_goal">🎯 Meta Espiritual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Título o Referencia</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Paz en el hogar, Salmo 23, Gratitud por la salud..."
              value={spTitle}
              onChange={(e) => setSpTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Contenido / Texto</label>
            <textarea
              rows={3}
              required
              placeholder="Escribe la oración, el versículo o el motivo de gratitud..."
              value={spContent}
              onChange={(e) => setSpContent(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setSpiritualModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingSpId ? 'Guardar Cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cuqui Time */}
      <Modal
        isOpen={cuquiModalOpen}
        onClose={() => setCuquiModalOpen(false)}
        title={editingCuquiId ? 'Editar Cuqui Time 💕' : 'Planificar Cuqui Time 💕'}
        subtitle="Un momento de complicidad íntima consensuada entre adultos"
      >
        <form onSubmit={handleSaveCuqui} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={cuquiDate}
                onChange={(e) => setCuquiDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora aproximada</label>
              <input
                type="time"
                value={cuquiTime}
                onChange={(e) => setCuquiTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Tiempo disponible estimado</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[15, 30, 60, 120, 480].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setCuquiDuration(mins)}
                  className={`p-2 rounded-xl border text-xs text-center font-bold cursor-pointer transition-colors ${
                    cuquiDuration === mins
                      ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {mins === 480 ? 'Noche' : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Preparar el momento (sugerencias opcionales)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
              {[
                { id: 'velas', label: 'Velas aromáticas' },
                { id: 'musica', label: 'Música suave' },
                { id: 'sin_celulares', label: 'Sin celulares' },
                { id: 'cena', label: 'Cena o picoteo' },
                { id: 'ducha', label: 'Ducha tibia previa' },
                { id: 'habitacion', label: 'Habitación ordenada' },
              ].map((item) => {
                const isChecked = cuquiPreps.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCuquiPreps(
                        isChecked ? cuquiPreps.filter((p) => p !== item.id) : [...cuquiPreps, item.id]
                      );
                    }}
                    className={`p-2 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900 font-semibold'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    {isChecked ? '✓ ' : '+ '}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nota privada (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalles para consentir o coordinar con amor..."
              value={cuquiNotes}
              onChange={(e) => setCuquiNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-[11px] text-stone-500 leading-relaxed">
            🔒 <strong>Privacidad asegurada:</strong> Este registro nunca se mostrará a niños ni en tableros generales.
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setCuquiModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingCuquiId ? 'Guardar Cambios' : 'Guardar Momento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Recuerdo */}
      <Modal
        isOpen={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
        title={editingMemId ? 'Editar Momento Especial' : 'Guardar Momento Especial'}
        subtitle="Un recuerdo significativo para la historia de la pareja"
      >
        <form onSubmit={handleSaveMemory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Título del Recuerdo</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Aniversario en la playa, Primera cita..."
              value={memTitle}
              onChange={(e) => setMemTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={memDate}
                onChange={(e) => setMemDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <select
                value={memCategory}
                onChange={(e) => setMemCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="first_date">☕ Primera Cita</option>
                <option value="anniversary">💍 Matrimonio / Aniversario</option>
                <option value="trip">🌲 Viaje o Escapada</option>
                <option value="family_moment">👶 Momento Familiar</option>
                <option value="birthday">🎂 Cumpleaños</option>
                <option value="milestone">🏆 Logro Juntos</option>
                <option value="other">❤️ Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción / Historia</label>
            <textarea
              rows={3}
              required
              placeholder="¿Qué ocurrió? ¿Qué sintieron ese día?"
              value={memDesc}
              onChange={(e) => setMemDesc(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setMemoryModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingMemId ? 'Guardar Cambios' : 'Guardar Recuerdo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Gesto de Cariño */}
      <Modal
        isOpen={gstModalOpen}
        onClose={() => setGstModalOpen(false)}
        title={editingGstId ? 'Editar Gesto de Cariño' : 'Nuevo Gesto de Cariño'}
        subtitle="Un detalle tierno para inspirar el amor cotidiano"
      >
        <form onSubmit={handleSaveGesture} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre del Gesto</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Preparar su desayuno favorito, Masaje de hombros..."
              value={gstTitle}
              onChange={(e) => setGstTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
            <select
              value={gstCategory}
              onChange={(e) => setGstCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            >
              <option value="afecto">❤️ Afecto / Contacto Físico</option>
              <option value="palabras">💬 Palabras de Afirmación</option>
              <option value="servicio">🤝 Acto de Servicio</option>
              <option value="tiempo">⏳ Tiempo de Calidad</option>
              <option value="sorpresa">🎁 Detalle o Sorpresa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción o Idea</label>
            <textarea
              rows={3}
              required
              placeholder="¿En qué consiste este gesto y cómo hacerlo especial?"
              value={gstDescription}
              onChange={(e) => setGstDescription(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setGstModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingGstId ? 'Guardar Cambios' : 'Crear Gesto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
