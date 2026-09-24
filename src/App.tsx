import React from 'react';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { QuickActionModal } from './components/layout/QuickActionModal';
import { FamilyResetModal } from './components/reset/FamilyResetModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { LinkCoAdminModal } from './components/auth/LinkCoAdminModal';

// Views
import { DashboardView } from './views/DashboardView';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { FinanceView } from './views/FinanceView';
import { FamilyView } from './views/FamilyView';
import { HealthView } from './views/HealthView';
import { HomeView } from './views/HomeView';
import { HabitsView } from './views/HabitsView';
import { RewardsView } from './views/RewardsView';
import { SettingsView } from './views/SettingsView';
import { CoupleView } from './views/CoupleView';
import { KidsDashboardView } from './components/kids/KidsDashboardView';

const MainContent: React.FC = () => {
  const {
    currentTab,
    isKidView,
    notificationDrawerOpen,
    setNotificationDrawerOpen,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    inviteToken,
    linkCoAdminModalOpen,
    setLinkCoAdminModalOpen,
    currentUser,
    config,
  } = useFamily();
  const { tokens } = useTheme();

  const renderActiveView = () => {
    // Defense-in-depth: If currently viewing as a child, restrict routing strictly to authorized kid areas
    if (isKidView) {
      if (currentTab === 'habits') {
        return <HabitsView />;
      }
      if (currentTab === 'rewards') {
        return <RewardsView />;
      }
      // Any unauthorized tab (finance, couple, health, family, tasks, settings, etc.) falls back safely to kids dashboard
      return <KidsDashboardView />;
    }

    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'tasks':
        return <TasksView />;
      case 'calendar':
        return <CalendarView />;
      case 'finance':
        return <FinanceView />;
      case 'family':
        return <FamilyView />;
      case 'couple':
        return <CoupleView />;
      case 'health':
        return <HealthView />;
      case 'home':
        return <HomeView />;
      case 'habits':
        return <HabitsView />;
      case 'rewards':
        return <RewardsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
      style={{ backgroundColor: tokens.background, color: tokens.textMain }}
    >
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-12">
        <Sidebar />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      <BottomNav />
      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      />
      <QuickActionModal />
      <FamilyResetModal />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        inviteToken={inviteToken}
      />
      <LinkCoAdminModal
        isOpen={linkCoAdminModalOpen}
        onClose={() => setLinkCoAdminModalOpen(false)}
        currentRelationship={currentUser?.relationship || 'mama'}
        familyName={config.familyName}
      />
    </div>
  );
};

const ThemedApp: React.FC = () => {
  const { activeProfileId, activeMember } = useFamily();
  return (
    <ThemeProvider
      activeProfileId={activeProfileId}
      activeRole={activeMember?.role || 'adult'}
    >
      <MainContent />
    </ThemeProvider>
  );
};

export default function App() {
  return (
    <FamilyProvider>
      <ThemedApp />
    </FamilyProvider>
  );
}
