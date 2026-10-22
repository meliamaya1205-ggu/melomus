import React, { useState, useEffect } from 'react';
import { useFamily } from '../context/FamilyContext';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { FamilyMember, FamilyRole, FamilyRelationship, calculateAge } from '../types/family';
import { formatFriendlyDate } from '../services/dateUtils';
import { parentKidService } from '../services/parentKidService';
import { supabase } from '../services/supabaseClient';
import { KidDevice, PendingApprovalsState } from '../types/kids';
import { triggerConfetti } from '../components/common/ConfettiCelebration';
import {
  Users,
  Plus,
  Heart,
  Smile,
  HeartPulse,
  CheckSquare,
  Trophy,
  Edit2,
  Trash2,
  AlertTriangle,
  Pill,
  Syringe,
  Lock,
  Smartphone,
  Check,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const FamilyView: React.FC = () => {
  const {
    members,
    addMember,
    updateMember,
    deleteMember,
    tasks,
    habits,
    appointments,
    events,
    medications,
    vaccineRecords,
    config,
    setActiveProfileId,
    setCurrentTab,
    isAdultView,
    adjustMemberPoints,
  } = useFamily();

  // Selected member for detail view
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  // Kid Device & Approvals Management states
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalsState>({
    pendingTasks: [],
    pendingRedemptions: [],
    pendingDevices: [],
    totalCount: 0,
  });
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [approvingRedemptionId, setApprovingRedemptionId] = useState<string | null>(null);

  const [kidDevices, setKidDevices] = useState<KidDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Kid Device Invite modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteChild, setInviteChild] = useState<FamilyMember | null>(null);
  const [deviceHint, setDeviceHint] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<{ token: string; expiresAt: string; link: string } | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // PIN Reset modal
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
  const [deviceToReset, setDeviceToReset] = useState<KidDevice | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [resetPinError, setResetPinError] = useState<string | null>(null);

  // Load pending approvals on mount
  const loadApprovals = async () => {
    setIsLoadingApprovals(true);
    try {
      const res = await parentKidService.getPendingApprovals();
      if (res.success) {
        setPendingApprovals(res.data);
      }
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  useEffect(() => {
    loadApprovals();

    if (typeof window !== 'undefined' && supabase) {
      const channel = supabase
        .channel('family_kid_approvals_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          loadApprovals();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kid_devices' }, () => {
          loadApprovals();
          if (selectedMember && selectedMember.role === 'child') {
            loadChildDevices(selectedMember.id);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kid_redemption_requests' }, () => {
          loadApprovals();
        })
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [selectedMember?.id]);

  // Load devices whenever selectedMember changes
  const loadChildDevices = async (childId: string) => {
    setIsLoadingDevices(true);
    try {
      const res = await parentKidService.listKidDevices(childId);
      if (res.success) {
        setKidDevices(res.devices);
      }
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (selectedMember && selectedMember.role === 'child') {
      loadChildDevices(selectedMember.id);
    } else {
      setKidDevices([]);
    }
  }, [selectedMember]);

  // Handlers for Task & Reward approvals
  const handleApproveTask = async (taskId: string, childId: string, points: number) => {
    setApprovingTaskId(taskId);
    try {
      const res = await parentKidService.approveKidTask(taskId);
      if (res.success) {
        triggerConfetti();
        adjustMemberPoints(childId, points, 'Misión infantil completada y aprobada');
        await loadApprovals();
      } else {
        alert(res.error || 'Error al aprobar la tarea');
      }
    } finally {
      setApprovingTaskId(null);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    setApprovingTaskId(taskId);
    try {
      const res = await parentKidService.rejectKidTask(taskId);
      if (res.success) {
        await loadApprovals();
      } else {
        alert(res.error || 'Error al rechazar la tarea');
      }
    } finally {
      setApprovingTaskId(null);
    }
  };

  const handleApproveRedemption = async (redemptionId: string) => {
    setApprovingRedemptionId(redemptionId);
    try {
      const res = await parentKidService.approveRewardRedemption(redemptionId);
      if (res.success) {
        triggerConfetti();
        await loadApprovals();
      } else {
        alert(res.error || 'Error al aprobar el canje');
      }
    } finally {
      setApprovingRedemptionId(null);
    }
  };

  const handleRejectRedemption = async (redemptionId: string) => {
    setApprovingRedemptionId(redemptionId);
    try {
      const res = await parentKidService.rejectRewardRedemption(redemptionId);
      if (res.success) {
        await loadApprovals();
      } else {
        alert(res.error || 'Error al rechazar el canje');
      }
    } finally {
      setApprovingRedemptionId(null);
    }
  };

  // Handlers for Kid Device Invites & Management
  const handleOpenInviteModal = (child: FamilyMember) => {
    setInviteChild(child);
    setDeviceHint(`Tablet / Celular de ${child.name}`);
    setGeneratedInvite(null);
    setCopyFeedback(false);
    setIsInviteModalOpen(true);
  };

  const handleGenerateInvite = async () => {
    if (!inviteChild) return;
    setIsGeneratingInvite(true);
    try {
      const res = await parentKidService.createKidDeviceInvite(inviteChild.id, deviceHint.trim());
      if (res.success && res.token) {
        const fullLink = `${window.location.origin}/kids?token=${res.token}`;
        setGeneratedInvite({
          token: res.token,
          expiresAt: res.expiresAt || '',
          link: fullLink,
        });
      } else {
        alert(res.error || 'No se pudo generar la invitación');
      }
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.link);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  const handleApproveDevice = async (deviceId: string) => {
    const res = await parentKidService.approveKidDevice(deviceId);
    if (res.success) {
      triggerConfetti();
      if (selectedMember) loadChildDevices(selectedMember.id);
      loadApprovals();
    } else {
      alert(res.error || 'No se pudo aprobar el dispositivo');
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (confirm('¿Estás seguro de que deseas desvincular este dispositivo? El niño ya no podrá acceder desde él.')) {
      const res = await parentKidService.revokeKidDevice(deviceId);
      if (res.success) {
        if (selectedMember) loadChildDevices(selectedMember.id);
      } else {
        alert(res.error || 'No se pudo desvincular el dispositivo');
      }
    }
  };

  const handleOpenResetPin = (device: KidDevice) => {
    setDeviceToReset(device);
    setNewPin('');
    setConfirmNewPin('');
    setResetPinError(null);
    setIsResetPinModalOpen(true);
  };

  const handleConfirmResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPinError(null);

    if (!/^\d{4}$/.test(newPin)) {
      setResetPinError('El PIN debe contener exactamente 4 dígitos numéricos.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setResetPinError('Los dos PIN ingresados no coinciden.');
      return;
    }
    if (!deviceToReset) return;

    setIsResettingPin(true);
    try {
      const res = await parentKidService.resetKidDevicePin(deviceToReset.id, newPin);
      if (res.success) {
        triggerConfetti();
        setIsResetPinModalOpen(false);
        if (selectedMember) loadChildDevices(selectedMember.id);
        alert('¡PIN actualizado correctamente y dispositivo desbloqueado!');
      } else {
        setResetPinError(res.error || 'Error al restablecer el PIN.');
      }
    } finally {
      setIsResettingPin(false);
    }
  };

  // Add/Edit Member Modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Member form state
  const [name, setName] = useState('');
  const [role, setRole] = useState<FamilyRole>('child');
  const [relationship, setRelationship] = useState<FamilyRelationship>('hijo');
  const [age, setAge] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [avatarColor, setAvatarColor] = useState('#8b5cf6');
  const [avatarEmoji, setAvatarEmoji] = useState('🌟');
  const [notes, setNotes] = useState('');

  const openAddMemberModal = () => {
    setEditingMemberId(null);
    setName('');
    setRole('child');
    setRelationship('hijo');
    setAge('');
    setBirthDate('');
    setAvatarColor('#f59e0b');
    setAvatarEmoji('🌟');
    setNotes('');
    setIsMemberModalOpen(true);
  };

  const openEditMemberModal = (member: FamilyMember) => {
    setEditingMemberId(member.id);
    setName(member.name);
    setRole(member.role);
    setRelationship(member.relationship);
    const derivedAge = member.birthDate ? calculateAge(member.birthDate) : member.age;
    setAge(derivedAge !== undefined ? String(derivedAge) : '');
    setBirthDate(member.birthDate || '');
    setAvatarColor(member.avatarColor);
    setAvatarEmoji(member.avatarEmoji);
    setNotes(member.notes || '');
    setIsMemberModalOpen(true);
  };

  const requestDeleteMember = (member: FamilyMember) => {
    if (member.role === 'adult') {
      const remainingAdults = members.filter((m) => m.role === 'adult' && m.id !== member.id);
      if (remainingAdults.length === 0) {
        setDeleteError('No puedes eliminar al único adulto del hogar. Siempre debe haber al menos un adulto administrador.');
        return;
      }
    }
    setDeleteError(null);
    setMemberToDelete(member);
  };

  const confirmDeleteMember = () => {
    if (!memberToDelete) return;
    deleteMember(memberToDelete.id);
    if (selectedMember?.id === memberToDelete.id) {
      setSelectedMember(null);
    }
    if (editingMemberId === memberToDelete.id) {
      setIsMemberModalOpen(false);
      setEditingMemberId(null);
    }
    setMemberToDelete(null);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const calculatedAge = birthDate ? calculateAge(birthDate) : undefined;
    const finalAge = calculatedAge !== undefined ? calculatedAge : (age ? parseInt(age, 10) : undefined);

    if (editingMemberId) {
      updateMember(editingMemberId, {
        name: name.trim(),
        role,
        relationship,
        age: finalAge,
        birthDate: birthDate || undefined,
        avatarColor,
        avatarEmoji,
        notes: notes.trim() || undefined,
      });
      if (selectedMember && selectedMember.id === editingMemberId) {
        setSelectedMember({
          ...selectedMember,
          name: name.trim(),
          role,
          relationship,
          age: finalAge,
          birthDate: birthDate || undefined,
          avatarColor,
          avatarEmoji,
          notes: notes.trim() || undefined,
        });
      }
    } else {
      addMember({
        name: name.trim(),
        role,
        relationship,
        age: finalAge,
        birthDate: birthDate || undefined,
        avatarColor,
        avatarEmoji,
        notes: notes.trim() || undefined,
      });
    }

    setIsMemberModalOpen(false);
  };

  // Color options
  const colorOptions = [
    '#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4',
    '#10b981', '#f59e0b', '#f97316', '#84cc16', '#64748b',
  ];

  // Emoji options
  const emojiOptions = ['🌸', '🌿', '🦄', '🦖', '👶', '🦁', '🌟', '🚀', '🎨', '⚽', '🧸', '🌈'];

  // Guard for adults only: children cannot manage family members, roles or view medical notes
  if (!isAdultView) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center max-w-md mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Gestión Familiar Protegida</h3>
        <p className="text-xs text-stone-500 mt-2 leading-relaxed">
          La administración de integrantes del hogar, roles y configuraciones solo puede ser realizada por los adultos.
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

  return (
    <div className="space-y-6">
      {/* Sub-nav dentro de la sección Familia */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl overflow-x-auto text-xs font-bold w-fit">
        <button
          onClick={() => setCurrentTab('family')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-900 shadow-xs cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-stone-700" />
          <span>Integrantes</span>
        </button>
        <button
          onClick={() => setCurrentTab('couple')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-colors cursor-pointer"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500" />
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
            <h2 className="text-xl font-bold text-stone-900">
              {config.modules.family.displayName}
            </h2>
            <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full border border-rose-200">
              {members.length} integrantes
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Cada miembro de nuestro hogar tiene su propio espacio de cuidado y hábitos
          </p>
        </div>

        <button
          onClick={openAddMemberModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Integrante</span>
        </button>
      </div>

      {/* Pending Kid Approvals Banner */}
      {(pendingApprovals.pendingTasks.length > 0 || pendingApprovals.pendingRedemptions.length > 0) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border-2 border-amber-300 rounded-3xl p-5 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                  <span>Aprobaciones Infantiles Pendientes</span>
                  <span className="text-[11px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                    {pendingApprovals.pendingTasks.length + pendingApprovals.pendingRedemptions.length}
                  </span>
                </h3>
                <p className="text-xs text-stone-500">
                  Los niños han terminado tareas o solicitado premios desde sus celulares/tablets
                </p>
              </div>
            </div>
            <button
              onClick={loadApprovals}
              disabled={isLoadingApprovals}
              className="p-1.5 hover:bg-amber-100 rounded-xl text-stone-600 transition cursor-pointer"
              title="Actualizar aprobaciones"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingApprovals ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Pending Tasks */}
            {pendingApprovals.pendingTasks.map((pt) => (
              <div
                key={pt.id}
                className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block mb-1">
                    {pt.childName} • Misión «¡Terminé!»
                  </span>
                  <h4 className="font-bold text-stone-900 leading-tight">{pt.title}</h4>
                  <span className="text-[11px] font-semibold text-amber-700">
                    Recompensa: +{pt.pointsReward} ⭐
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    disabled={approvingTaskId === pt.id}
                    onClick={() => handleApproveTask(pt.id, pt.assignedTo, pt.pointsReward)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aprobar</span>
                  </button>
                  <button
                    disabled={approvingTaskId === pt.id}
                    onClick={() => handleRejectTask(pt.id)}
                    className="p-1.5 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 font-bold rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
                    title="Rechazar tarea"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Pending Redemptions */}
            {pendingApprovals.pendingRedemptions.map((pr) => (
              <div
                key={pr.id}
                className="bg-white p-3.5 rounded-2xl border border-pink-200 shadow-xs flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="text-[10px] font-black uppercase text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md inline-block mb-1">
                    {pr.childName || 'Niño'} • Solicitud de Premio 🎁
                  </span>
                  <h4 className="font-bold text-stone-900 leading-tight">{pr.rewardTitle}</h4>
                  <span className="text-[11px] font-semibold text-pink-700">
                    Costo: {pr.pointsCost} ⭐
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    disabled={approvingRedemptionId === pr.id}
                    onClick={() => handleApproveRedemption(pr.id)}
                    className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aprobar</span>
                  </button>
                  <button
                    disabled={approvingRedemptionId === pr.id}
                    onClick={() => handleRejectRedemption(pr.id)}
                    className="p-1.5 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 font-bold rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
                    title="Rechazar canje"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {members.map((member) => {
          const memberTasks = tasks.filter(
            (t) => t.responsibleId === member.id || t.relatedMemberId === member.id
          );
          const memberHabits = habits.filter((h) => h.childId === member.id);
          const memberAppointments = appointments.filter((a) => a.memberId === member.id);
          const memberEvents = events.filter((e) => e.memberId === member.id);
          const memberMeds = medications.filter((m) => m.memberId === member.id && m.status === 'active');
          const memberVaccines = vaccineRecords.filter((v) => v.memberId === member.id);

          return (
            <div
              key={member.id}
              className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.name}
                      emoji={member.avatarEmoji}
                      color={member.avatarColor}
                      size="lg"
                    />
                    <div>
                      <h3 className="text-base font-bold text-stone-900 leading-tight">
                        {member.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-stone-500 font-medium">
                          {member.role === 'adult'
                            ? 'Adulto'
                            : `${member.birthDate ? calculateAge(member.birthDate) ?? member.age ?? 0 : member.age ?? 0} años`}
                        </span>
                        {member.relationship && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">
                            {member.relationship}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditMemberModal(member)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                      title="Editar datos"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => requestDeleteMember(member)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar integrante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {member.notes && (
                  <p className="text-xs text-stone-600 bg-stone-50/70 p-2.5 rounded-xl border border-stone-100 mb-4 leading-relaxed">
                    {member.notes}
                  </p>
                )}

                {/* Counts / Stats */}
                <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-b border-stone-100 mb-3">
                  <div>
                    <span className="text-sm font-black text-stone-800 block">
                      {memberTasks.length}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">Tareas</span>
                  </div>

                  <div>
                    <span className="text-sm font-black text-stone-800 block">
                      {member.role === 'child' ? memberHabits.length : memberEvents.length}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {member.role === 'child' ? 'Hábitos' : 'Eventos'}
                    </span>
                  </div>

                  <div>
                    <span className="text-sm font-black text-stone-800 block">
                      {member.role === 'child' ? member.points : memberAppointments.length}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {member.role === 'child' ? 'Puntos' : 'Citas'}
                    </span>
                  </div>
                </div>

                {/* Health badges if any */}
                {(memberMeds.length > 0 || memberVaccines.length > 0) && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {memberMeds.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-xl font-medium border border-rose-100">
                        <Pill className="w-3 h-3 text-rose-500" />
                        {memberMeds.length} med{memberMeds.length > 1 ? 's' : ''} activo{memberMeds.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {memberVaccines.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl font-medium border border-emerald-100">
                        <Syringe className="w-3 h-3 text-emerald-600" />
                        {memberVaccines.filter((v) => v.status === 'applied').length}/{memberVaccines.length} vacunas
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setSelectedMember(member)}
                  className="flex-1 py-2 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold rounded-xl border border-stone-200/80 transition-colors cursor-pointer text-center"
                >
                  Ver Ficha Completa
                </button>

                {member.role === 'child' && (
                  <>
                    <button
                      onClick={() => handleOpenInviteModal(member)}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Vincular tablet o celular para este niño"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                      <span>Vincular</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveProfileId(member.id);
                        setCurrentTab('dashboard');
                      }}
                      className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition-colors cursor-pointer"
                      title="Ver como este niño"
                    >
                      Ver interfaz
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title={`Ficha de ${selectedMember.name}`}
          subtitle={`Detalles y compromisos familiares de ${selectedMember.name}`}
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/60">
              <Avatar
                name={selectedMember.name}
                emoji={selectedMember.avatarEmoji}
                color={selectedMember.avatarColor}
                size="lg"
              />
              <div>
                <h4 className="text-base font-bold text-stone-900">{selectedMember.name}</h4>
                <p className="text-xs text-stone-500">
                  {selectedMember.role === 'adult'
                    ? 'Adulto del Hogar'
                    : `Niño • ${selectedMember.birthDate ? calculateAge(selectedMember.birthDate) ?? selectedMember.age : selectedMember.age} años`}
                  {selectedMember.birthDate && ` • Nació el ${selectedMember.birthDate}`}
                </p>
                {selectedMember.role === 'child' && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-full inline-flex">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>{selectedMember.points} puntos acumulados</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tasks of this member */}
            <div>
              <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-rose-500" /> Tareas asignadas
              </h5>
              {tasks.filter((t) => t.responsibleId === selectedMember.id || t.relatedMemberId === selectedMember.id).length === 0 ? (
                <p className="text-xs text-stone-400 bg-stone-50 p-3 rounded-xl border border-dashed text-center">
                  Sin tareas pendientes
                </p>
              ) : (
                <div className="space-y-1.5">
                  {tasks
                    .filter((t) => t.responsibleId === selectedMember.id || t.relatedMemberId === selectedMember.id)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60 flex items-center justify-between text-xs"
                      >
                        <span className={t.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-800 font-medium'}>
                          {t.title}
                        </span>
                        <span className="text-[10px] text-stone-500">{formatFriendlyDate(t.date)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Habits (if child) */}
            {selectedMember.role === 'child' && (
              <div>
                <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-purple-500" /> Rutinas y Hábitos
                </h5>
                <div className="space-y-1.5">
                  {habits
                    .filter((h) => h.childId === selectedMember.id)
                    .map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-purple-950">{h.title}</span>
                        <span className="text-[10px] font-bold bg-white text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                          +{h.points} pts
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Linked Devices for Kids */}
            {selectedMember.role === 'child' && (
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <span>Dispositivos Vinculados ({kidDevices.length})</span>
                  </h5>
                  <button
                    onClick={() => handleOpenInviteModal(selectedMember)}
                    className="text-[11px] font-bold text-amber-800 bg-amber-200/60 hover:bg-amber-200 px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Vincular Nuevo</span>
                  </button>
                </div>

                {isLoadingDevices ? (
                  <div className="flex items-center gap-2 text-xs text-amber-700 py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cargando dispositivos...</span>
                  </div>
                ) : kidDevices.length === 0 ? (
                  <div className="text-center py-3 bg-white/70 rounded-xl border border-dashed border-amber-300">
                    <p className="text-xs text-stone-500">No hay celulares ni tablets vinculados a este perfil.</p>
                    <button
                      onClick={() => handleOpenInviteModal(selectedMember)}
                      className="mt-2 text-xs font-bold text-amber-700 underline cursor-pointer"
                    >
                      Generar enlace de vinculación
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kidDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className="p-3 bg-white rounded-xl border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">{dev.deviceName}</span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                dev.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : dev.status === 'pending_approval'
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : 'bg-stone-100 text-stone-500'
                              }`}
                            >
                              {dev.status === 'active'
                                ? 'Activo'
                                : dev.status === 'pending_approval'
                                ? '⏳ Pendiente de Aprobación'
                                : 'Revocado'}
                            </span>
                            {dev.isLocked && (
                              <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                                🔒 Bloqueado
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            Vinculado el {formatFriendlyDate(dev.createdAt)}
                            {dev.lastActiveAt && ` • Último acceso: ${formatFriendlyDate(dev.lastActiveAt)}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {dev.status === 'pending_approval' && (
                            <button
                              onClick={() => handleApproveDevice(dev.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aprobar Dispositivo</span>
                            </button>
                          )}

                          {dev.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleOpenResetPin(dev)}
                                className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] rounded-xl border border-sky-200 transition cursor-pointer flex items-center gap-1"
                                title="Restablecer PIN de 4 dígitos"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>PIN</span>
                              </button>

                              <button
                                onClick={() => handleRevokeDevice(dev.id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1"
                                title="Desvincular este dispositivo"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Desvincular</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Appointments */}
            <div>
              <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-sky-500" /> Citas Médicas
              </h5>
              {appointments.filter((a) => a.memberId === selectedMember.id).length === 0 ? (
                <p className="text-xs text-stone-400 bg-stone-50 p-3 rounded-xl border border-dashed text-center">
                  Sin citas agendadas
                </p>
              ) : (
                <div className="space-y-1.5">
                  {appointments
                    .filter((a) => a.memberId === selectedMember.id)
                    .map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 bg-sky-50/50 rounded-xl border border-sky-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-sky-950">{a.professional}</p>
                          <p className="text-[11px] text-stone-500">{a.location}</p>
                        </div>
                        <span className="text-[11px] font-semibold text-sky-800">
                          {formatFriendlyDate(a.date)} {a.time}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Active Medications */}
            <div>
              <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-rose-500" /> Medicamentos Activos
              </h5>
              {medications.filter((m) => m.memberId === selectedMember.id && m.status === 'active').length === 0 ? (
                <p className="text-xs text-stone-400 bg-stone-50 p-3 rounded-xl border border-dashed text-center">
                  Sin medicamentos activos
                </p>
              ) : (
                <div className="space-y-1.5">
                  {medications
                    .filter((m) => m.memberId === selectedMember.id && m.status === 'active')
                    .map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-rose-950">{m.name}</p>
                          <p className="text-[11px] text-stone-500">
                            {m.dose} {m.unit} • {m.frequency}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-semibold text-rose-700 block">
                            {m.schedules.join(', ')}
                          </span>
                          <span className="text-[10px] text-stone-400">{m.indication}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Vaccines */}
            <div>
              <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Syringe className="w-4 h-4 text-emerald-500" /> Vacunas y Controles
              </h5>
              {vaccineRecords.filter((v) => v.memberId === selectedMember.id).length === 0 ? (
                <p className="text-xs text-stone-400 bg-stone-50 p-3 rounded-xl border border-dashed text-center">
                  Sin registro de vacunas
                </p>
              ) : (
                <div className="space-y-1.5">
                  {vaccineRecords
                    .filter((v) => v.memberId === selectedMember.id)
                    .map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-emerald-950">{v.vaccineName}</p>
                          <p className="text-[11px] text-stone-500">{v.recommendedAge}</p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            v.status === 'applied'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {v.status === 'applied' ? `Aplicada ${v.appliedDate || ''}` : 'Pendiente'}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setCurrentTab('health');
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer"
              >
                <HeartPulse className="w-4 h-4" />
                <span>Ver en Módulo Salud</span>
              </button>

              <button
                onClick={() => setSelectedMember(null)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title={editingMemberId ? 'Editar Integrante' : 'Agregar Nuevo Integrante'}
        subtitle="Agrega a Mamá, Papá, hijos u otro familiar"
      >
        <form onSubmit={handleSaveMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Sofía, Mateo, Abuelita..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as FamilyRole)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="adult">Adulto (Administrador)</option>
                <option value="child">Niño (Hábitos y recompensas)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Parentesco</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as FamilyRelationship)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="mama">Mamá</option>
                <option value="papa">Papá</option>
                <option value="hija">Hija</option>
                <option value="hijo">Hijo</option>
                <option value="bebe">Bebé</option>
                <option value="otro">Otro familiar</option>
              </select>
            </div>
          </div>

          {role === 'child' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Fecha de nacimiento (opcional)
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => {
                      const nextBirthDate = e.target.value;
                      setBirthDate(nextBirthDate);
                      const derived = calculateAge(nextBirthDate);
                      if (derived !== undefined) {
                        setAge(String(derived));
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Edad</label>
                  <input
                    type="number"
                    placeholder="Ej: 5"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>
              </div>
              {birthDate && calculateAge(birthDate) !== undefined && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  ✨ Edad calculada automáticamente: <strong>{calculateAge(birthDate)} años</strong>
                </p>
              )}
            </div>
          )}

          {/* Color selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Color identificador
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    avatarColor === c ? 'scale-115 border-stone-800 shadow-xs' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Emoji selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Icono / Emoji
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {emojiOptions.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatarEmoji(em)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg border transition-all cursor-pointer ${
                    avatarEmoji === em
                      ? 'bg-amber-100 border-amber-400 scale-110 shadow-xs'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Notas breves</label>
            <input
              type="text"
              placeholder="Ej: Le encantan los dinosaurios, alérgico al polen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-stone-100">
            {editingMemberId ? (
              <button
                type="button"
                onClick={() => {
                  const target = members.find((m) => m.id === editingMemberId);
                  if (target) requestDeleteMember(target);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar integrante</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {editingMemberId ? 'Guardar Cambios' : 'Guardar Integrante'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <Modal
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          title="Eliminar Integrante"
          subtitle={`¿Confirmas que deseas eliminar a ${memberToDelete.name}?`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-bold">Información protegida y segura</p>
                <p className="text-stone-600 leading-relaxed">
                  Las tareas pasadas, el historial médico, registros de vacunación y movimientos de puntos de{' '}
                  <strong>{memberToDelete.name}</strong> se mantendrán archivados de forma segura para no alterar la contabilidad familiar. Solo se retirará de los miembros activos del hogar.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteMember}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Confirmar y Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Error Alert Modal */}
      {deleteError && (
        <Modal
          isOpen={!!deleteError}
          onClose={() => setDeleteError(null)}
          title="Acción No Permitida"
          subtitle="Seguridad de la familia"
          maxWidth="sm"
        >
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed px-2">
              {deleteError}
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setDeleteError(null)}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Kid Device Invite Modal */}
      {isInviteModalOpen && inviteChild && (
        <Modal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title={`Vincular dispositivo para ${inviteChild.name}`}
          subtitle="Enlace infantil de un solo uso con expiración de 15 minutos"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <Avatar
                name={inviteChild.name}
                emoji={inviteChild.avatarEmoji}
                color={inviteChild.avatarColor}
                size="md"
              />
              <div>
                <h4 className="text-sm font-bold text-stone-900">{inviteChild.name}</h4>
                <p className="text-xs text-stone-500">
                  {inviteChild.age ? `${inviteChild.age} años • ` : ''}Acceso infantil protegido
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nombre de referencia para el dispositivo
              </label>
              <input
                type="text"
                value={deviceHint}
                onChange={(e) => setDeviceHint(e.target.value)}
                placeholder="Ej: Tablet de Annie, Celular de Derek"
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
              />
            </div>

            {!generatedInvite ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Vinculación con Aprobación en Dos Pasos</span>
                  </p>
                  <p className="text-stone-600 leading-relaxed">
                    1. Envía el enlace al celular o tablet del niño.<br />
                    2. El niño abre el enlace y elige un PIN secreto de 4 dígitos.<br />
                    3. Por seguridad, el dispositivo no se activará hasta que tú lo apruebes aquí en su ficha familiar.
                  </p>
                </div>

                <button
                  onClick={handleGenerateInvite}
                  disabled={isGeneratingInvite}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingInvite ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generando enlace seguro...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generar Enlace de 15 Minutos</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>¡Enlace generado exitosamente!</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>15 minutos</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Copia este enlace o envíalo por WhatsApp al dispositivo del niño:
                  </p>
                  <input
                    type="text"
                    readOnly
                    value={generatedInvite.link}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-stone-800 select-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyInviteLink}
                    className="py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copyFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Enlace</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `¡Hola! Aquí tienes tu enlace de Melomus Kids para vincular tu tablet o celular:\n\n${generatedInvite.link}\n\n(Válido por 15 minutos)`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reset Kid Device PIN Modal */}
      {isResetPinModalOpen && deviceToReset && (
        <Modal
          isOpen={isResetPinModalOpen}
          onClose={() => setIsResetPinModalOpen(false)}
          title="Restablecer PIN Infantil"
          subtitle={`Dispositivo: ${deviceToReset.deviceName}`}
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmResetPin} className="space-y-4">
            <p className="text-xs text-stone-600">
              Escribe un nuevo PIN de 4 dígitos para este dispositivo. Si estaba bloqueado por intentos fallidos, se desbloqueará de inmediato.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nuevo PIN (4 dígitos)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]*"
                  required
                  autoFocus
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-center text-lg font-black tracking-widest text-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Repite el PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]*"
                  required
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-center text-lg font-black tracking-widest text-stone-900 focus:bg-white"
                />
              </div>
            </div>

            {resetPinError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {resetPinError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsResetPinModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isResettingPin || newPin.length !== 4 || confirmNewPin.length !== 4}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isResettingPin ? 'Guardando...' : 'Guardar Nuevo PIN'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
