export type ModuleKey = 
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'finance'
  | 'family'
  | 'couple'
  | 'health'
  | 'home'
  | 'reset'
  | 'habits'
  | 'rewards'
  | 'settings';

export interface CustomizationItem {
  technicalKey: string;
  displayName: string;
  icon?: string;
  color?: string;
  description?: string;
}

export interface AppCustomizationConfig {
  appName: string;
  familyName: string;
  modules: Record<ModuleKey, {
    technicalKey: ModuleKey;
    displayName: string;
    description: string;
    icon: string;
  }>;
  sections: Record<string, {
    technicalKey: string;
    displayName: string;
  }>;
  taskCategories: CustomizationItem[];
  expenseCategories: CustomizationItem[];
  incomeSources: CustomizationItem[];
  eventTypes: CustomizationItem[];
  appointmentTypes: CustomizationItem[];
  homeSections: CustomizationItem[];
  kidInterface: {
    welcomeTitle: string;
    habitsTitle: string;
    rewardsTitle: string;
    positiveQuote: string;
    resetTitle: string;
  };
  adultRoleNames: {
    mama: string;
    papa: string;
  };
}
