import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { FamilyMember, FamilyRole, FamilyRelationship } from '../types/family';
import { formatFriendlyDate } from '../services/dateUtils';
import {
  Users,
  Plus,
  Heart,
  Smile,
  HeartPulse,
  CheckSquare,
  Trophy,
  Edit2,
  Pill,
  Syringe,
  Lock,
} from 'lucide-react';

export const FamilyView: React.FC = () => {
  const {
    members,
    addMember,
    updateMember,
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
  } = useFamily();

  // Selected member for detail view
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  // Add/Edit Member Modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

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
    setAge(member.age !== undefined ? String(member.age) : '');
    setBirthDate(member.birthDate || '');
    setAvatarColor(member.avatarColor);
    setAvatarEmoji(member.avatarEmoji);
    setNotes(member.notes || '');
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const ageNum = age ? parseInt(age, 10) : undefined;

    if (editingMemberId) {
      updateMember(editingMemberId, {
        name: name.trim(),
        role,
        relationship,
        age: ageNum,
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
          age: ageNum,
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
        age: ageNum,
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
                          {member.role === 'adult' ? 'Adulto' : `${member.age ?? 0} años`}
                        </span>
                        {member.relationship && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">
                            {member.relationship}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditMemberModal(member)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                    title="Editar datos"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
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
                  {selectedMember.role === 'adult' ? 'Adulto del Hogar' : `Niño • ${selectedMember.age} años`}
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
            <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Fecha de nacimiento (opcional)
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>
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

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
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
        </form>
      </Modal>
    </div>
  );
};
