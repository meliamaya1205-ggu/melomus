export interface ResetMission {
  id: string;
  memberId: string;
  area: string; // Cocina, Sala, Habitación, Juguetes
  taskDescription: string;
  completed: boolean;
}

export interface ResetSessionConfig {
  durationMinutes: number; // 5, 10, 15
  missions: ResetMission[];
}
