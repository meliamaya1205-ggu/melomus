import React from 'react';
import { useFamily } from '../context/FamilyContext';
import { GreetingCard } from '../components/dashboard/GreetingCard';
import { FamilyMembersSummary } from '../components/dashboard/FamilyMembersSummary';
import { NeedsAttentionSection } from '../components/dashboard/NeedsAttentionSection';
import { TodayTasksList } from '../components/dashboard/TodayTasksList';
import { UpcomingEvents } from '../components/dashboard/UpcomingEvents';
import { KidsHabitSummary } from '../components/dashboard/KidsHabitSummary';
import { HomeQuickStatus } from '../components/dashboard/HomeQuickStatus';
import { FinanceQuickSummary } from '../components/dashboard/FinanceQuickSummary';

export const DashboardView: React.FC = () => {
  const { isAdultView } = useFamily();

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Saludo Hero Cálido, Dinámico & Métricas Rápidas */}
      <GreetingCard />

      {/* 2. Integrantes de la Familia & Estado de Actividades */}
      <FamilyMembersSummary />

      {/* 3. Bloque Prioritario: Necesita tu Atención */}
      <NeedsAttentionSection />

      {/* 4. Grid Principal Responsivo de Dos Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Tareas del Día & Hábitos */}
        <div className="space-y-6">
          <TodayTasksList />
          <KidsHabitSummary />
        </div>

        {/* Columna Derecha: Citas Médicas, Eventos & Hogar */}
        <div className="space-y-6">
          <UpcomingEvents />
          <HomeQuickStatus />
        </div>
      </div>

      {/* 5. Finanzas Familiares: Sección secundaria y sobria al pie (solo adultos) */}
      {isAdultView && <FinanceQuickSummary />}
    </div>
  );
};
