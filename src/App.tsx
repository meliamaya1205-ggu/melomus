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

import { WelcomeScreen } from './components/auth/WelcomeScreen';

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
import { KidsAppView } from './views/KidsAppView';
import { kidAuthService } from './services/kidAuthService';

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
    handleAuthSuccess,
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
        onAuthSuccess={handleAuthSuccess}
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
  const {
    activeProfileId,
    activeMember,
    authenticatedUser,
    isAuthLoading,
    inviteToken,
    handleAuthSuccess,
  } = useFamily();

  // Check if current device / URL should run in dedicated Kids mode
  const [isKidsView, setIsKidsView] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;
    const hasKidToken = search.includes('kid_token=') ||
                        hash.includes('kid_token=') ||
                        ((search.includes('token=') || hash.includes('token=')) && (path.includes('kids') || hash.includes('kids')));
    const isKidsPath = path.startsWith('/kids') || hash.startsWith('#/kids') || hash.includes('/kids');
    const isLinkedKidDevice = kidAuthService.getLinkedDevice() !== null;
    return (
      isKidsPath ||
      hasKidToken ||
      (isLinkedKidDevice &&
        !localStorage.getItem('melomus_active_profile_v1')?.includes('mama') &&
        !localStorage.getItem('melomus_active_profile_v1')?.includes('papa'))
    );
  });

  if (isKidsView) {
    return (
      <KidsAppView
        onExitToAdult={() => {
          setIsKidsView(false);
          const url = new URL(window.location.href);
          url.pathname = '/';
          url.searchParams.delete('token');
          url.searchParams.delete('kid_token');
          window.history.pushState({}, '', url.toString());
        }}
      />
    );
  }

  // 1. Sleek splash screen while checking session
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="relative mb-5 animate-pulse">
          <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg border border-stone-200/80 bg-white p-1">
            <img
              src="/logo.png"
              alt="MELOMUS"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 mb-1">MELOMUS</h1>
        <p className="text-xs text-stone-500 font-medium animate-pulse">Cargando tu espacio familiar...</p>
      </div>
    );
  }

  // 2. Unauthenticated user: Welcome & Dedicated Auth Screen Gate
  if (!authenticatedUser) {
    return (
      <WelcomeScreen
        initialView={inviteToken ? 'claim_invite' : 'welcome'}
        inviteToken={inviteToken}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // 3. Authenticated user: Full app with theme
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
