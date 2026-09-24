export type CheckInMood = 
  | 'muy_bien' 
  | 'bien' 
  | 'regular' 
  | 'necesito_apoyo' 
  | 'necesito_conexion';

export interface CoupleCheckIn {
  id: string;
  memberId: string; // 'mama' | 'papa'
  memberName: string;
  mood: CheckInMood;
  need: string; // e.g. 'Que me escuche', 'Un abrazo', 'Tiempo juntos', etc.
  note?: string;
  isPrivate: boolean; // true = solo visible para quien lo creó; false = compartido
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export type ConversationStatus = 'pending' | 'talked' | 'agreement' | 'resolved';

export interface CoupleConversation {
  id: string;
  title: string;
  description?: string;
  categoryKey: string; // 'familia', 'crianza', 'dinero', 'hogar', 'tiempo_juntos', 'intimidad', 'planes_futuros', 'preocupacion', 'agradecimiento', 'otro'
  createdBy: string; // 'mama' | 'papa'
  date: string; // YYYY-MM-DD
  status: ConversationStatus;
  notes?: string;
  agreementId?: string;
  isPrivate?: boolean; // true = solo visible para quien lo creó; false = compartido
}

export type CoupleDateStatus = 'planned' | 'completed' | 'cancelled';

export interface CoupleDate {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number; // 5, 15, 30, 60, 120, 240
  typeKey: string; // 'cita', 'cena', 'pelicula', 'caminata', 'conversacion', 'cafe', 'salida', 'devocional', 'sin_celulares', 'aniversario', 'cumpleanos', 'otro'
  notes?: string;
  hasReminder: boolean;
  status: CoupleDateStatus;
  syncedToCalendar?: boolean;
}

export interface CoupleGesture {
  id: string;
  title: string;
  description: string;
  category: 'afecto' | 'palabras' | 'servicio' | 'tiempo' | 'sorpresa';
  completedCount: number;
  lastDoneDate?: string;
  lastDoneBy?: string; // 'mama' | 'papa'
}

export type AgreementStatus = 'active' | 'review' | 'fulfilled' | 'finished';

export interface CoupleAgreement {
  id: string;
  title: string;
  description: string;
  categoryKey: string; // 'hogar', 'crianza', 'dinero', 'tiempo', 'familia', 'comunicacion', 'proyectos', 'personal', 'otro'
  responsibleId: string; // 'both' | 'mama' | 'papa'
  date: string; // YYYY-MM-DD
  frequency: 'daily' | 'weekly' | 'monthly' | 'permanent';
  status: AgreementStatus;
  notes?: string;
}

export type SpiritualItemType = 
  | 'prayer_request' 
  | 'gratitude' 
  | 'devotional' 
  | 'bible_verse' 
  | 'spiritual_goal';

export type SpiritualItemStatus = 'pending' | 'in_progress' | 'fulfilled';

export interface CoupleSpiritualItem {
  id: string;
  type: SpiritualItemType;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  status: SpiritualItemStatus;
  addedBy: string; // 'mama' | 'papa' | 'both'
  notes?: string;
}

export type CuquiTimeStatus = 'planned' | 'confirmed' | 'rescheduled' | 'completed';

export interface CuquiTimeSession {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number; // 15, 30, 60, 120, 480
  privateNotes?: string;
  hasReminder: boolean;
  status: CuquiTimeStatus;
  hideDetails: boolean; // if true, preview shows only "❤️ Tiempo de pareja"
  preparations: string[]; // e.g. ['cena', 'musica', 'pelicula', 'ducha', 'velas', 'habitacion', 'sin_celulares']
}

export interface CoupleMemory {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: 'first_date' | 'anniversary' | 'birthday' | 'trip' | 'family_moment' | 'milestone' | 'other';
  emoji?: string;
  imageUrl?: string;
  notes?: string;
}
