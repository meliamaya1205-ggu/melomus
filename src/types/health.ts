export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled';

export interface MedicalAppointment {
  id: string;
  memberId: string; // child or adult id
  appointmentTypeKey: string; // matches CustomizationItem.technicalKey (pediatric, dental, routine, etc.)
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  professional: string; // Doctor or specialist
  location: string; // Clinic, hospital, office
  notes?: string; // Questions to ask, documents needed
  hasReminder: boolean;
  status: AppointmentStatus;
}

export type MedicationStatus = 'active' | 'paused' | 'finished';
export type DoseStatus = 'pending' | 'administered' | 'skipped';

export interface Medication {
  id: string;
  name: string; // e.g. "Vitamina D3 gotas", "Paracetamol gotas", "Amoxicilina"
  memberId: string; // "axel", "annie", "derek", "mama", "papa"
  indication: string; // e.g. "Control de crecimiento", "Fiebre / Dolor", "Alergia estacional"
  dose: string; // e.g. "12", "5", "1"
  unit: string; // e.g. "gotas", "ml", "comprimido", "cápsula", "puff"
  frequency: string; // e.g. "Cada 8 horas", "Una vez al día", "SOS según fiebre"
  schedules: string[]; // e.g. ["09:00"] o ["08:00", "16:00", "00:00"]
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  prescribedBy: string; // e.g. "Dra. María Paz Gómez (Pediatra)"
  notes?: string;
  status: MedicationStatus; // 'active' | 'paused' | 'finished'
  createdAt: string;
}

export interface MedicationDoseLog {
  id: string;
  medicationId: string;
  medicationName: string;
  memberId: string;
  scheduledTime: string; // HH:mm
  date: string; // YYYY-MM-DD
  status: DoseStatus; // 'administered' | 'skipped' | 'pending'
  administeredAt?: string; // HH:mm
  recordedBy: string; // 'Mamá' | 'Papá'
}

export interface PediatricQuery {
  id: string;
  memberId: string;
  medicationName?: string;
  question: string; // e.g. "¿Ajustar gotas según nuevo peso en control 6 meses?"
  reviewDate?: string;
  notes?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface VaccineRecord {
  id: string;
  memberId: string;
  vaccineName: string;
  recommendedAge: string; // e.g. "2 meses", "4 meses", "6 meses", "12 meses", "Escolar"
  dueDate: string;
  status: 'applied' | 'upcoming' | 'overdue';
  appliedDate?: string;
  notes?: string;
}
