import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  MedicalAppointment,
  AppointmentStatus,
  Medication,
  MedicationStatus,
  DoseStatus,
} from '../types/health';
import { formatFriendlyDate, getTodayString, getCurrentTimeString } from '../services/dateUtils';
import {
  HeartPulse,
  Pill,
  Syringe,
  FileText,
  Plus,
  MapPin,
  Clock,
  Calendar,
  CheckCircle,
  Trash2,
  Edit2,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  HelpCircle,
  Check,
  Lock,
  ShieldCheck,
} from 'lucide-react';

type HealthTab = 'appointments' | 'medications' | 'vaccines' | 'records';

export const HealthView: React.FC = () => {
  const {
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    medications,
    addMedication,
    updateMedication,
    deleteMedication,
    doseLogs,
    logDose,
    pediatricQueries,
    addPediatricQuery,
    togglePediatricQuery,
    deletePediatricQuery,
    vaccineRecords,
    toggleVaccineStatus,
    members,
    config,
    getCategoryName,
    getMember,
    isAdultView,
    activeMember,
    setActiveProfileId,
  } = useFamily();

  const [activeTab, setActiveTab] = useState<HealthTab>('medications');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [selectedMedStatusFilter, setSelectedMedStatusFilter] = useState<'all' | 'active' | 'paused' | 'finished'>('all');

  const todayStr = getTodayString();
  const currentTime = getCurrentTimeString();

  // --- Modal: Appointment ---
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [appMemberId, setAppMemberId] = useState(members[2]?.id || 'annie');
  const [appTypeKey, setAppTypeKey] = useState('pediatric');
  const [appDate, setAppDate] = useState(todayStr);
  const [appTime, setAppTime] = useState('10:00');
  const [appProfessional, setAppProfessional] = useState('');
  const [appLocation, setAppLocation] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [appReminder, setAppReminder] = useState(true);
  const [appStatus, setAppStatus] = useState<AppointmentStatus>('upcoming');

  // --- Modal: Medication ---
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [medName, setMedName] = useState('');
  const [medMemberId, setMedMemberId] = useState(members[4]?.id || 'axel');
  const [medIndication, setMedIndication] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medUnit, setMedUnit] = useState('gotas');
  const [medFrequency, setMedFrequency] = useState('Cada 8 horas');
  const [medSchedules, setMedSchedules] = useState('08:00, 16:00, 00:00');
  const [medStartDate, setMedStartDate] = useState(todayStr);
  const [medEndDate, setMedEndDate] = useState('');
  const [medPrescribedBy, setMedPrescribedBy] = useState('');
  const [medNotes, setMedNotes] = useState('');
  const [medStatus, setMedStatus] = useState<MedicationStatus>('active');

  // --- Modal: Pediatric Query ("Confirmar con Pediatra") ---
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [queryMemberId, setQueryMemberId] = useState(members[4]?.id || 'axel');
  const [queryMedName, setQueryMedName] = useState('');
  const [queryQuestion, setQueryQuestion] = useState('');
  const [queryNotes, setQueryNotes] = useState('');

  // ----------------------------------------------------
  // Handlers: Appointment
  // ----------------------------------------------------
  const openNewAppModal = () => {
    setEditingAppId(null);
    setAppMemberId(members[2]?.id || 'annie');
    setAppTypeKey('pediatric');
    setAppDate(todayStr);
    setAppTime('10:00');
    setAppProfessional('');
    setAppLocation('');
    setAppNotes('');
    setAppReminder(true);
    setAppStatus('upcoming');
    setIsAppModalOpen(true);
  };

  const openEditAppModal = (app: MedicalAppointment) => {
    setEditingAppId(app.id);
    setAppMemberId(app.memberId);
    setAppTypeKey(app.appointmentTypeKey);
    setAppDate(app.date);
    setAppTime(app.time);
    setAppProfessional(app.professional);
    setAppLocation(app.location);
    setAppNotes(app.notes || '');
    setAppReminder(app.hasReminder);
    setAppStatus(app.status);
    setIsAppModalOpen(true);
  };

  const handleSaveApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appProfessional.trim()) return;

    if (editingAppId) {
      updateAppointment(editingAppId, {
        memberId: appMemberId,
        appointmentTypeKey: appTypeKey,
        date: appDate,
        time: appTime,
        professional: appProfessional.trim(),
        location: appLocation.trim() || 'Centro Médico',
        notes: appNotes.trim() || undefined,
        hasReminder: appReminder,
        status: appStatus,
      });
    } else {
      addAppointment({
        memberId: appMemberId,
        appointmentTypeKey: appTypeKey,
        date: appDate,
        time: appTime,
        professional: appProfessional.trim(),
        location: appLocation.trim() || 'Centro Médico',
        notes: appNotes.trim() || undefined,
        hasReminder: appReminder,
        status: appStatus,
      });
    }

    setIsAppModalOpen(false);
  };

  // ----------------------------------------------------
  // Handlers: Medication
  // ----------------------------------------------------
  const openNewMedModal = (prefillMemberId?: string) => {
    setEditingMedId(null);
    setMedName('');
    setMedMemberId(prefillMemberId || members[4]?.id || 'axel');
    setMedIndication('');
    setMedDose('');
    setMedUnit('gotas');
    setMedFrequency('Cada 8 horas');
    setMedSchedules('08:00, 16:00, 00:00');
    setMedStartDate(todayStr);
    setMedEndDate('');
    setMedPrescribedBy('');
    setMedNotes('');
    setMedStatus('active');
    setIsMedModalOpen(true);
  };

  const openEditMedModal = (med: Medication) => {
    setEditingMedId(med.id);
    setMedName(med.name);
    setMedMemberId(med.memberId);
    setMedIndication(med.indication);
    setMedDose(med.dose);
    setMedUnit(med.unit);
    setMedFrequency(med.frequency);
    setMedSchedules(med.schedules.join(', '));
    setMedStartDate(med.startDate);
    setMedEndDate(med.endDate || '');
    setMedPrescribedBy(med.prescribedBy);
    setMedNotes(med.notes || '');
    setMedStatus(med.status);
    setIsMedModalOpen(true);
  };

  const handleSaveMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim() || !medDose.trim()) return;

    const schedulesArray = medSchedules
      .split(',')
      .map((s) => s.trim())
      .filter((s) => Boolean(s));

    if (editingMedId) {
      updateMedication(editingMedId, {
        name: medName.trim(),
        memberId: medMemberId,
        indication: medIndication.trim() || 'Indicación médica',
        dose: medDose.trim(),
        unit: medUnit,
        frequency: medFrequency.trim(),
        schedules: schedulesArray.length > 0 ? schedulesArray : ['09:00'],
        startDate: medStartDate,
        endDate: medEndDate || undefined,
        prescribedBy: medPrescribedBy.trim() || 'Profesional de la salud',
        notes: medNotes.trim() || undefined,
        status: medStatus,
      });
    } else {
      addMedication({
        name: medName.trim(),
        memberId: medMemberId,
        indication: medIndication.trim() || 'Indicación médica',
        dose: medDose.trim(),
        unit: medUnit,
        frequency: medFrequency.trim(),
        schedules: schedulesArray.length > 0 ? schedulesArray : ['09:00'],
        startDate: medStartDate,
        endDate: medEndDate || undefined,
        prescribedBy: medPrescribedBy.trim() || 'Profesional de la salud',
        notes: medNotes.trim() || undefined,
        status: medStatus,
      });
    }

    setIsMedModalOpen(false);
  };

  const handleToggleMedStatus = (med: Medication) => {
    const nextStatus: MedicationStatus = med.status === 'active' ? 'paused' : 'active';
    updateMedication(med.id, { status: nextStatus });
  };

  const handleFinishMed = (medId: string) => {
    if (window.confirm('¿Deseas marcar este tratamiento como finalizado? Se archivará en el historial para consulta médica futura.')) {
      updateMedication(medId, { status: 'finished', endDate: todayStr });
    }
  };

  // ----------------------------------------------------
  // Handlers: Dose Tracking (Recordatorios de tomas)
  // ----------------------------------------------------
  const handleRecordDose = (
    medication: Medication,
    scheduledTime: string,
    status: DoseStatus
  ) => {
    logDose({
      medicationId: medication.id,
      medicationName: medication.name,
      memberId: medication.memberId,
      scheduledTime,
      date: todayStr,
      status,
      administeredAt: status === 'administered' ? currentTime : undefined,
      recordedBy: activeMember?.name || 'Adulto',
    });
  };

  // ----------------------------------------------------
  // Handlers: Pediatric Query
  // ----------------------------------------------------
  const handleSaveQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryQuestion.trim()) return;

    addPediatricQuery({
      memberId: queryMemberId,
      medicationName: queryMedName.trim() || undefined,
      question: queryQuestion.trim(),
      notes: queryNotes.trim() || undefined,
      reviewDate: todayStr,
      status: 'pending',
    });

    setQueryQuestion('');
    setQueryNotes('');
    setQueryMedName('');
    setIsQueryModalOpen(false);
  };

  // ----------------------------------------------------
  // Filtered lists
  // ----------------------------------------------------
  const filteredAppointments = appointments.filter((a) => {
    if (selectedMemberFilter !== 'all' && a.memberId !== selectedMemberFilter) return false;
    return true;
  });

  // Guard for adults only: children cannot manage medications or view private medical records
  if (!isAdultView) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center max-w-md mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center text-3xl mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Salud y Medicamentos Protegidos</h3>
        <p className="text-xs text-stone-500 mt-2 leading-relaxed">
          La administración de medicamentos, controles médicos y fichas de salud es de exclusiva responsabilidad de los adultos.
        </p>
        <button
          onClick={() => setActiveProfileId('mama')}
          className="mt-6 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          Acceder con perfil de Mamá / Papá
        </button>
      </div>
    );
  }

  const filteredMedications = medications.filter((m) => {
    if (selectedMemberFilter !== 'all' && m.memberId !== selectedMemberFilter) return false;
    if (selectedMedStatusFilter !== 'all' && m.status !== selectedMedStatusFilter) return false;
    return true;
  });

  const activeMedications = medications.filter((m) => m.status === 'active');

  // Today's scheduled takes from all active medications
  const todayDoses: {
    medication: Medication;
    scheduledTime: string;
    log?: (typeof doseLogs)[0];
  }[] = [];

  activeMedications.forEach((med) => {
    if (selectedMemberFilter !== 'all' && med.memberId !== selectedMemberFilter) return;

    med.schedules.forEach((time) => {
      const existingLog = doseLogs.find(
        (l) => l.medicationId === med.id && l.date === todayStr && l.scheduledTime === time
      );
      todayDoses.push({
        medication: med,
        scheduledTime: time,
        log: existingLog,
      });
    });
  });

  // Sort today's doses chronologically
  todayDoses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">
              {config.modules.health.displayName}
            </h2>
            <span className="text-xs bg-sky-50 text-sky-700 font-semibold px-2.5 py-0.5 rounded-full border border-sky-200">
              {activeMedications.length} medicamentos activos
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Organizador familiar de citas médicas, dosis indicadas, vacunas y fichas de salud
          </p>
        </div>

        {/* Action Button */}
        {isAdultView && (
          <div className="flex items-center gap-2">
            {activeTab === 'medications' && (
              <button
                onClick={() => openNewMedModal()}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Medicamento</span>
              </button>
            )}

            {activeTab === 'appointments' && (
              <button
                onClick={openNewAppModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Agendar Cita</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4 Tabs Navigation & Member Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2 sm:p-3 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'medications'
                ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-xs'
                : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <Pill className="w-4 h-4 text-sky-600" />
            <span>Medicamentos</span>
            {activeMedications.length > 0 && (
              <span className="text-[10px] bg-sky-200 text-sky-800 px-1.5 py-0.2 rounded-full">
                {activeMedications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-xs'
                : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Citas y Controles</span>
          </button>

          <button
            onClick={() => setActiveTab('vaccines')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'vaccines'
                ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-xs'
                : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <Syringe className="w-4 h-4 text-amber-500" />
            <span>Vacunas y Controles</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'records'
                ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-xs'
                : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-500" />
            <span>Fichas Médicas</span>
          </button>
        </div>

        {/* Member selector filter */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <span className="text-xs text-stone-400 font-medium">Ver integrante:</span>
          <select
            value={selectedMemberFilter}
            onChange={(e) => setSelectedMemberFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1 text-xs text-stone-800 font-semibold focus:outline-hidden"
          >
            <option value="all">Toda la familia</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role === 'adult' ? 'Adulto' : `${m.age ?? 0} años`})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: MEDICAMENTOS (NUEVO MÓDULO INTEGRAL)          */}
      {/* ==================================================== */}
      {activeTab === 'medications' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Important Medical Disclaimer & Privacy Note */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Registro informativo familiar:</strong> MELOMUS organiza los horarios y dosis indicados expresamente por el médico o pediatra. La aplicación <strong>no calcula ni modifica dosis médicas</strong>.
            </p>
          </div>

          {/* 1. SECCIÓN: RECORDATORIOS DE TOMAS DE HOY */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Tomas Programadas de Hoy</h3>
                  <p className="text-xs text-stone-400">
                    {todayDoses.filter((d) => d.log?.status === 'administered').length} de {todayDoses.length} tomas registradas
                  </p>
                </div>
              </div>

              <span className="text-xs text-stone-500 font-medium">Hoy: {formatFriendlyDate(todayStr)}</span>
            </div>

            {todayDoses.length === 0 ? (
              <div className="text-center py-6 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                <p className="text-xs text-stone-500">
                  No hay tomas recurrentes programadas para hoy en los medicamentos activos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {todayDoses.map((item, idx) => {
                  const { medication, scheduledTime, log } = item;
                  const member = getMember(medication.memberId);
                  const isDone = log?.status === 'administered';
                  const isSkipped = log?.status === 'skipped';

                  return (
                    <div
                      key={`${medication.id}-${scheduledTime}-${idx}`}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isDone
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : isSkipped
                          ? 'bg-stone-50 border-stone-200 opacity-60'
                          : 'bg-stone-50/80 border-stone-200/80 hover:bg-white hover:border-sky-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black text-stone-800 bg-white px-2 py-0.5 rounded-md border border-stone-200 font-mono">
                            ⏰ {scheduledTime} hrs
                          </span>

                          <Avatar
                            name={member ? member.name : 'Familia'}
                            emoji={member?.avatarEmoji}
                            color={member?.avatarColor}
                            size="sm"
                          />
                        </div>

                        <h4 className="text-xs font-bold text-stone-900 leading-snug">
                          {medication.name}
                        </h4>
                        <p className="text-xs text-sky-800 font-semibold mt-0.5">
                          Dosis: {medication.dose} {medication.unit}
                        </p>
                        <p className="text-[11px] text-stone-500">{member?.name} • {medication.frequency}</p>
                      </div>

                      {/* Status / Buttons */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                        {isDone ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Administrado {log?.administeredAt ? `(${log.administeredAt})` : ''}</span>
                          </div>
                        ) : isSkipped ? (
                          <span className="text-xs font-medium text-stone-500 italic">Omitido</span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700">Pendiente</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRecordDose(medication, scheduledTime, 'administered')}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                            title="Marcar como administrado"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleRecordDose(medication, scheduledTime, 'skipped')}
                            className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer"
                            title="Marcar como omitido"
                          >
                            Omitir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. SECCIÓN: LISTADO DE MEDICAMENTOS */}
          <div className="space-y-3">
            {/* Filter by status subchips */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-stone-400 font-medium">Estado:</span>
                {(['all', 'active', 'paused', 'finished'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedMedStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                      selectedMedStatusFilter === st
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {st === 'all'
                      ? 'Todos'
                      : st === 'active'
                      ? 'Activos'
                      : st === 'paused'
                      ? 'Pausados'
                      : 'Finalizados (Historial)'}
                  </button>
                ))}
              </div>

              <span className="text-xs text-stone-400">
                {filteredMedications.length} {filteredMedications.length === 1 ? 'medicamento' : 'medicamentos'}
              </span>
            </div>

            {filteredMedications.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mb-3">
                  <Pill className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-stone-800">No hay medicamentos en esta vista</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  Registra medicamentos con sus dosis y horarios indicados por el profesional
                </p>
                <button
                  onClick={() => openNewMedModal()}
                  className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  + Agregar Medicamento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMedications.map((med) => {
                  const member = getMember(med.memberId);
                  const isActive = med.status === 'active';
                  const isPaused = med.status === 'paused';
                  const isFinished = med.status === 'finished';

                  return (
                    <div
                      key={med.id}
                      className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                        isFinished
                          ? 'border-stone-200 bg-stone-50/50 opacity-70'
                          : isPaused
                          ? 'border-amber-200/80 bg-amber-50/30'
                          : 'border-sky-100/90 shadow-xs hover:border-sky-300'
                      }`}
                    >
                      <div>
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={member ? member.name : 'Familia'}
                              emoji={member?.avatarEmoji}
                              color={member?.avatarColor}
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold text-stone-900 leading-snug">
                                  {med.name}
                                </h4>
                              </div>
                              <p className="text-xs text-stone-500">
                                Para: <strong className="text-stone-800">{member?.name}</strong>
                                {member?.age !== undefined ? ` (${member.age} años)` : ''}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPaused
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {isActive ? 'Activo' : isPaused ? 'Pausado' : 'Finalizado'}
                          </span>
                        </div>

                        {/* Dose & indication pill box */}
                        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/70 space-y-1.5 my-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 font-medium">Dosis indicada:</span>
                            <span className="font-black text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                              {med.dose} {med.unit}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 font-medium">Frecuencia:</span>
                            <span className="font-bold text-stone-800">{med.frequency}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 font-medium">Horarios:</span>
                            <span className="font-mono text-sky-800 font-bold">
                              {med.schedules.join(', ')}
                            </span>
                          </div>

                          {med.indication && (
                            <p className="text-[11px] text-stone-600 pt-1 border-t border-stone-200/60">
                              <span className="font-semibold text-stone-700">Uso:</span> {med.indication}
                            </p>
                          )}
                        </div>

                        {/* Medical metadata */}
                        <div className="text-[11px] text-stone-500 space-y-0.5 mb-2">
                          <p>
                            <span className="font-medium text-stone-700">Indicado por:</span>{' '}
                            {med.prescribedBy}
                          </p>
                          <p>
                            <span className="font-medium text-stone-700">Inicio:</span>{' '}
                            {formatFriendlyDate(med.startDate)}
                            {med.endDate && ` • Término: ${formatFriendlyDate(med.endDate)}`}
                          </p>
                          {med.notes && (
                            <p className="text-stone-600 italic bg-amber-50/50 p-2 rounded-xl mt-1">
                              Nota: {med.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card actions */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {!isFinished && (
                            <button
                              onClick={() => handleToggleMedStatus(med)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                                isActive
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <PauseCircle className="w-3.5 h-3.5" />
                                  <span>Pausar</span>
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Reanudar</span>
                                </>
                              )}
                            </button>
                          )}

                          {!isFinished && (
                            <button
                              onClick={() => handleFinishMed(med.id)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Finalizar
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditMedModal(med)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('¿Eliminar registro de este medicamento?')) {
                                deleteMedication(med.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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
            )}
          </div>

          {/* 3. SECCIÓN: MEDICAMENTOS POR CONFIRMAR CON PEDIATRA */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Confirmar con Pediatra</h3>
                  <p className="text-xs text-stone-400">Preguntas o dudas pendientes para la próxima consulta</p>
                </div>
              </div>

              <button
                onClick={() => setIsQueryModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Pregunta</span>
              </button>
            </div>

            {pediatricQueries.length === 0 ? (
              <p className="text-xs text-stone-400 bg-stone-50 p-4 rounded-2xl text-center">
                No hay preguntas anotadas para el pediatra
              </p>
            ) : (
              <div className="space-y-2">
                {pediatricQueries.map((q) => {
                  const member = getMember(q.memberId);
                  const isResolved = q.status === 'resolved';

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isResolved
                          ? 'bg-stone-50/50 border-stone-200 opacity-60'
                          : 'bg-purple-50/40 border-purple-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => togglePediatricQuery(q.id)}
                          className={`mt-0.5 p-1 rounded-lg cursor-pointer ${
                            isResolved ? 'bg-emerald-500 text-white' : 'border border-stone-300'
                          }`}
                          title={isResolved ? 'Marcar pendiente' : 'Marcar como resuelta'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900">
                              {member ? member.name : 'Familiar'}
                            </span>
                            {q.medicationName && (
                              <span className="text-[10px] bg-white text-purple-700 px-2 py-0.5 rounded-md border border-purple-200 font-medium">
                                {q.medicationName}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs mt-1 leading-snug ${
                              isResolved ? 'line-through text-stone-500' : 'text-stone-800 font-semibold'
                            }`}
                          >
                            {q.question}
                          </p>
                          {q.notes && (
                            <p className="text-[11px] text-stone-500 mt-1">{q.notes}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => deletePediatricQuery(q.id)}
                        className="p-1 text-stone-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Eliminar pregunta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: CITAS Y CONTROLES (MÓDULO EXISTENTE INTACTO) */}
      {/* ==================================================== */}
      {activeTab === 'appointments' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mb-3">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">No hay citas médicas registradas</h3>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Registra controles del niño sano, pediatras o dentistas para tener todo a mano
              </p>
              <button
                onClick={openNewAppModal}
                className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Registrar Cita
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAppointments.map((app) => {
                const member = getMember(app.memberId);
                const isDone = app.status === 'completed';

                return (
                  <div
                    key={app.id}
                    className={`bg-white rounded-3xl p-5 border transition-all ${
                      isDone
                        ? 'border-stone-200/60 bg-stone-50/50 opacity-70'
                        : 'border-sky-100 shadow-xs hover:border-sky-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={member ? member.name : 'Familia'}
                          emoji={member?.avatarEmoji}
                          color={member?.avatarColor}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-stone-900">
                              {member ? member.name : 'Familiar'}
                            </span>
                            <Badge variant="info">
                              {getCategoryName('appointment', app.appointmentTypeKey)}
                            </Badge>
                          </div>
                          <p className="text-xs text-stone-500">
                            {formatFriendlyDate(app.date)} a las {app.time} hrs
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {isDone ? 'Realizada' : 'Próxima'}
                      </span>
                    </div>

                    <div className="bg-sky-50/40 rounded-2xl p-3 border border-sky-100/60 space-y-1.5">
                      <p className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
                        <span>{app.professional}</span>
                      </p>
                      <p className="text-xs text-stone-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>{app.location}</span>
                      </p>
                      {app.notes && (
                        <div className="mt-2 pt-2 border-t border-sky-100/60 text-xs text-stone-700 bg-white/60 p-2 rounded-xl">
                          <strong className="text-stone-900">Preguntas/Notas:</strong> {app.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                      <button
                        onClick={() => {
                          const nextStatus: AppointmentStatus =
                            app.status === 'upcoming' ? 'completed' : 'upcoming';
                          updateAppointment(app.id, { status: nextStatus });
                        }}
                        className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          isDone ? 'text-stone-500 hover:text-stone-700' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{isDone ? 'Marcar como pendiente' : 'Marcar como realizada'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditAppModal(app)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteAppointment(app.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: VACUNAS Y CONTROLES PEDIÁTRICOS               */}
      {/* ==================================================== */}
      {activeTab === 'vaccines' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Seguimiento de Vacunación Infantil</h3>
                <p className="text-xs text-stone-500">
                  Controla las dosis obligatorias y controles pediátricos por edad
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {vaccineRecords
                .filter((v) => selectedMemberFilter === 'all' || v.memberId === selectedMemberFilter)
                .map((vac) => {
                  const member = getMember(vac.memberId);
                  const isApplied = vac.status === 'applied';

                  return (
                    <div
                      key={vac.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isApplied ? 'bg-emerald-50/60 border-emerald-200' : 'bg-stone-50 border-stone-200/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          name={member ? member.name : 'Familia'}
                          emoji={member?.avatarEmoji}
                          color={member?.avatarColor}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900">{vac.vaccineName}</span>
                            <span className="text-[10px] bg-white text-stone-600 px-2 py-0.5 rounded-md border border-stone-200 font-semibold">
                              {vac.recommendedAge}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 mt-1">Para: {member?.name}</p>
                          {vac.notes && <p className="text-[11px] text-stone-500 mt-0.5">{vac.notes}</p>}
                          <p className="text-[10px] text-stone-400 mt-1">
                            {isApplied
                              ? `Aplicada el: ${formatFriendlyDate(vac.appliedDate || vac.dueDate)}`
                              : `Fecha prevista: ${formatFriendlyDate(vac.dueDate)}`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleVaccineStatus(vac.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isApplied
                            ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        {isApplied ? 'Al Día ✓' : 'Marcar Aplicada'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: FICHAS MÉDICAS POR INTEGRANTE                */}
      {/* ==================================================== */}
      {activeTab === 'records' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map((member) => {
              const memberMeds = medications.filter((m) => m.memberId === member.id && m.status === 'active');
              const memberNextApp = appointments
                .filter((a) => a.memberId === member.id && a.status === 'upcoming')
                .sort((a, b) => a.date.localeCompare(b.date))[0];
              const memberVaccines = vaccineRecords.filter((v) => v.memberId === member.id);
              const appliedVacCount = memberVaccines.filter((v) => v.status === 'applied').length;

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-stone-100 mb-3">
                      <Avatar
                        name={member.name}
                        emoji={member.avatarEmoji}
                        color={member.avatarColor}
                        size="md"
                      />
                      <div>
                        <h4 className="text-sm font-extrabold text-stone-900">{member.name}</h4>
                        <p className="text-xs text-stone-500">
                          {member.role === 'adult' ? 'Adulto' : `${member.age ?? 0} años`}
                          {member.relationship && ` • ${member.relationship}`}
                        </p>
                      </div>
                    </div>

                    {/* Summary metrics */}
                    <div className="space-y-2.5 text-xs">
                      {/* Próxima cita */}
                      <div className="p-2.5 bg-sky-50/50 rounded-xl border border-sky-100">
                        <span className="text-[10px] font-bold text-sky-800 uppercase block mb-0.5">
                          Próxima Cita Médica
                        </span>
                        {memberNextApp ? (
                          <div>
                            <span className="font-bold text-stone-900">{memberNextApp.professional}</span>
                            <span className="text-[11px] text-stone-500 block">
                              {formatFriendlyDate(memberNextApp.date)} a las {memberNextApp.time}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Sin citas pendientes</span>
                        )}
                      </div>

                      {/* Medicamentos activos */}
                      <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase">
                            Medicamentos Activos ({memberMeds.length})
                          </span>
                        </div>
                        {memberMeds.length > 0 ? (
                          <ul className="space-y-1 mt-1">
                            {memberMeds.map((m) => (
                              <li key={m.id} className="text-[11px] text-stone-800 font-semibold">
                                • {m.name} ({m.dose} {m.unit})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-stone-400 italic">Sin medicamentos activos</span>
                        )}
                      </div>

                      {/* Vacunas (para niños) */}
                      {member.role === 'child' && (
                        <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                          <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">
                            Vacunas
                          </span>
                          <span className="font-semibold text-stone-800">
                            {appliedVacCount} de {memberVaccines.length} registradas
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMemberFilter(member.id);
                      setActiveTab('medications');
                    }}
                    className="mt-4 w-full py-2 bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center border border-stone-200"
                  >
                    Ver Medicamentos de {member.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: REGISTRAR MEDICAMENTO                         */}
      {/* ==================================================== */}
      <Modal
        isOpen={isMedModalOpen}
        onClose={() => setIsMedModalOpen(false)}
        title={editingMedId ? 'Editar Medicamento' : 'Registrar Nuevo Medicamento'}
        subtitle="Ingresa la indicación, dosis y horarios recetados por el profesional"
      >
        <form onSubmit={handleSaveMed} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre del Medicamento
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Vitamina D3 gotas, Paracetamol infantil, Amoxicilina..."
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                ¿Para qué integrante?
              </label>
              <select
                value={medMemberId}
                onChange={(e) => setMedMemberId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === 'adult' ? 'Adulto' : `${m.age ?? 0} años`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Indicación / Motivo
              </label>
              <input
                type="text"
                placeholder="Ej: Fiebre, Control, Alergia..."
                value={medIndication}
                onChange={(e) => setMedIndication(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Dosis indicada
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 12, 5, 1..."
                value={medDose}
                onChange={(e) => setMedDose(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Unidad</label>
              <select
                value={medUnit}
                onChange={(e) => setMedUnit(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="gotas">Gotas</option>
                <option value="ml">ml (mililitros)</option>
                <option value="comprimido">Comprimido / Pastilla</option>
                <option value="cápsula">Cápsula</option>
                <option value="puff">Puff (inhalador)</option>
                <option value="sobre">Sobre</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Frecuencia</label>
              <input
                type="text"
                placeholder="Ej: Cada 8 horas, 1 vez al día, SOS..."
                value={medFrequency}
                onChange={(e) => setMedFrequency(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Horarios (separados por coma)
              </label>
              <input
                type="text"
                placeholder="Ej: 08:00, 16:00, 00:00"
                value={medSchedules}
                onChange={(e) => setMedSchedules(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={medStartDate}
                onChange={(e) => setMedStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fecha de término (opcional)
              </label>
              <input
                type="date"
                value={medEndDate}
                onChange={(e) => setMedEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Profesional que lo indicó
              </label>
              <input
                type="text"
                placeholder="Ej: Dra. Gómez (Pediatra)..."
                value={medPrescribedBy}
                onChange={(e) => setMedPrescribedBy(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Estado</label>
              <select
                value={medStatus}
                onChange={(e) => setMedStatus(e.target.value as MedicationStatus)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
              >
                <option value="active">Activo (En curso)</option>
                <option value="paused">Pausado / SOS</option>
                <option value="finished">Finalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Notas adicionales</label>
            <textarea
              rows={2}
              placeholder="Ej: Tomar con alimentos, mantener refrigerado..."
              value={medNotes}
              onChange={(e) => setMedNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsMedModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingMedId ? 'Guardar Cambios' : 'Guardar Medicamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL: PREGUNTA PEDIÁTRICA ("CONFIRMAR CON PEDIATRA") */}
      {/* ==================================================== */}
      <Modal
        isOpen={isQueryModalOpen}
        onClose={() => setIsQueryModalOpen(false)}
        title="Nueva Pregunta para el Pediatra"
        subtitle="Anota dudas para resolver en el próximo control"
      >
        <form onSubmit={handleSaveQuery} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                ¿Para qué integrante?
              </label>
              <select
                value={queryMemberId}
                onChange={(e) => setQueryMemberId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Medicamento asociado (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Vitamina D3, Paracetamol..."
                value={queryMedName}
                onChange={(e) => setQueryMedName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Pregunta o consulta
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: ¿Ajustar dosis según nuevo peso? ¿Suspender si no hay fiebre?"
              value={queryQuestion}
              onChange={(e) => setQueryQuestion(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Notas de apoyo</label>
            <textarea
              rows={2}
              placeholder="Detalles útiles para no olvidar en la consulta..."
              value={queryNotes}
              onChange={(e) => setQueryNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsQueryModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Anotar Pregunta
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL: AGENDAR CITA MÉDICA                           */}
      {/* ==================================================== */}
      <Modal
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        title={editingAppId ? 'Editar Cita Médica' : 'Agendar Cita Médica'}
        subtitle="Registra información de atención para no olvidar indicaciones"
      >
        <form onSubmit={handleSaveApp} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Integrante</label>
              <select
                value={appMemberId}
                onChange={(e) => setAppMemberId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === 'adult' ? 'Adulto' : `${m.age ?? 0} años`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Cita</label>
              <select
                value={appTypeKey}
                onChange={(e) => setAppTypeKey(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {config.appointmentTypes.map((a) => (
                  <option key={a.technicalKey} value={a.technicalKey}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Profesional o Especialista
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Dra. Gómez (Pediatra), Dr. Soto (Dentista)..."
              value={appProfessional}
              onChange={(e) => setAppProfessional(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={appDate}
                onChange={(e) => setAppDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hora</label>
              <input
                type="time"
                value={appTime}
                onChange={(e) => setAppTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Lugar / Centro Médico
            </label>
            <input
              type="text"
              placeholder="Ej: Centro Médico San Cristóbal, Piso 3, Consulta 304..."
              value={appLocation}
              onChange={(e) => setAppLocation(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Preguntas para el doctor / Notas
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Consultar por dosis de gotas, llevar carnet de vacunas..."
              value={appNotes}
              onChange={(e) => setAppNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsAppModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingAppId ? 'Guardar Cambios' : 'Agendar Cita'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
