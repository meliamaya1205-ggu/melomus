export type FinanceScope = 'family' | 'personal';

export interface Income {
  id: string;
  sourceKey: string; // matches CustomizationItem.technicalKey (sueldo, uber, ventas, impresiones, otros)
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  responsibleId: string; // 'mama', 'papa', or 'family'
  isRecurring: boolean;
  frequency?: 'monthly' | 'biweekly' | 'occasional';
  scope?: FinanceScope; // 'family' (Nuestro Dinero) or 'personal' (Mi Organización)
}

export type PaymentMethod = 'debit' | 'credit' | 'transfer' | 'cash' | 'other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  categoryKey: string; // matches CustomizationItem.technicalKey
  responsibleId: string; // 'mama' | 'papa'
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  scope?: FinanceScope; // 'family' (Nuestro Dinero) or 'personal' (Mi Organización)
}

export type BillStatus = 'pending' | 'paid' | 'overdue';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  categoryKey: string;
  responsibleId: string;
  recurrence: 'monthly' | 'bimonthly' | 'annual' | 'single';
  status: BillStatus;
  paidDate?: string;
  scope?: FinanceScope; // 'family' (Nuestro Dinero) or 'personal' (Mi Organización)
}

export interface Debt {
  id: string;
  name: string;
  creditor: string;
  originalAmount: number;
  pendingBalance: number;
  installmentAmount: number;
  paymentDay: number; // day of month (1-31)
  frequency: 'monthly' | 'biweekly';
  responsibleId: string;
  notes?: string;
  scope?: FinanceScope; // 'family' (Nuestro Dinero) or 'personal' (Mi Organización)
}

export interface Budget {
  id: string;
  categoryKey: string;
  monthlyLimit: number;
  month: string; // YYYY-MM
  responsibleId?: string;
  scope?: FinanceScope;
}

export type GoalCategory = 'emergency' | 'vacation' | 'debt_payoff' | 'purchase' | 'other';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  category: GoalCategory;
  notes?: string;
  responsibleId?: string;
  ownerId?: string;
  scope?: FinanceScope; // 'family' (Nuestro Dinero) or 'personal' (Mi Organización)
}
