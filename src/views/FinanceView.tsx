import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { formatCurrency } from '../services/currencyUtils';
import { formatFriendlyDate, getTodayString } from '../services/dateUtils';
import { Modal } from '../components/common/Modal';
import { Avatar } from '../components/common/Avatar';
import {
  PaymentMethod,
  FinanceScope,
  Expense,
} from '../types/finance';
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  PiggyBank,
  PieChart,
  Search,
  Trash2,
  Lock,
  CreditCard,
  Building,
  User,
  Pencil,
} from 'lucide-react';

type FinanceTab =
  | 'overview'
  | 'incomes'
  | 'expenses'
  | 'bills'
  | 'debts'
  | 'budgets'
  | 'goals'
  | 'transactions';

export const FinanceView: React.FC = () => {
  const {
    isAdultView,
    activeProfileId,
    incomes,
    addIncome,
    updateIncome,
    deleteIncome,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    bills,
    addBill,
    updateBill,
    toggleBillPaid,
    deleteBill,
    debts,
    addDebt,
    updateDebt,
    updateDebtBalance,
    deleteDebt,
    budgets,
    updateBudget,
    deleteBudget,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    config,
    members,
    getCategoryName,
    getMember,
    setActiveProfileId,
  } = useFamily();

  // Scope: 'family' (Nuestro Dinero) or 'personal' (Mi Organización)
  const [financeScope, setFinanceScope] = useState<FinanceScope>('family');
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  // Active Adult context
  const activeAdultId = activeProfileId === 'papa' ? 'papa' : 'mama';
  const activeAdult = members.find((m) => m.id === activeAdultId) || members[0];

  // Modals & Editing state
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudgetCatKey, setEditingBudgetCatKey] = useState<string>('');
  const [editingBudgetCatName, setEditingBudgetCatName] = useState<string>('');
  const [budgetLimitInput, setBudgetLimitInput] = useState<string>('');

  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // Income form state
  const [incSource, setIncSource] = useState('salary');
  const [incDesc, setIncDesc] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [incDate, setIncDate] = useState(getTodayString());
  const [incResp, setIncResp] = useState(activeAdultId);
  const [incRecurring] = useState(true);

  // Expense form state
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(getTodayString());
  const [expCat, setExpCat] = useState('food');
  const [expResp, setExpResp] = useState(activeAdultId);
  const [expMethod] = useState<PaymentMethod>('debit');
  const [expRecurring] = useState(false);

  // Bill form state
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(getTodayString());
  const [billCat, setBillCat] = useState('services');
  const [billResp, setBillResp] = useState(activeAdultId);
  const [billRecurrence] = useState<'monthly' | 'bimonthly' | 'annual' | 'single'>('monthly');

  // Debt form state
  const [debtName, setDebtName] = useState('');
  const [debtCreditor, setDebtCreditor] = useState('');
  const [debtOriginal, setDebtOriginal] = useState('');
  const [debtPending, setDebtPending] = useState('');
  const [debtInstallment, setDebtInstallment] = useState('');
  const [debtDay, setDebtDay] = useState(5);
  const [debtResp] = useState(activeAdultId);
  const [debtNotes, setDebtNotes] = useState('');

  // Goal form state
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalDate] = useState('');
  const [goalCategory] = useState<'emergency' | 'vacation' | 'debt_payoff' | 'purchase' | 'other'>('emergency');

  // Transactions search & filter
  const [txSearch, setTxSearch] = useState('');

  // Privacy Guard: Children profiles cannot view finances
  if (!isAdultView) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center max-w-md mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Sección Exclusiva para Adultos</h3>
        <p className="text-xs text-stone-500 mt-2 leading-relaxed">
          Las finanzas familiares están protegidas y solo pueden ser administradas por Mamá o Papá para mantener la tranquilidad del hogar.
        </p>
        <button
          onClick={() => setActiveProfileId('mama')}
          className="mt-6 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          Acceder con perfil de Mamá / Papá
        </button>
      </div>
    );
  }

  // --- Strict Scope Filtering ---
  // In family scope: only records with scope !== 'personal'
  // In personal scope: only records with scope === 'personal' belonging to activeAdultId
  const currentIncomes =
    financeScope === 'family'
      ? incomes.filter((i) => i.scope !== 'personal')
      : incomes.filter((i) => i.scope === 'personal' && i.responsibleId === activeAdultId);

  const currentExpenses =
    financeScope === 'family'
      ? expenses.filter((e) => e.scope !== 'personal')
      : expenses.filter((e) => e.scope === 'personal' && e.responsibleId === activeAdultId);

  const currentBills =
    financeScope === 'family'
      ? bills.filter((b) => b.scope !== 'personal')
      : bills.filter((b) => b.scope === 'personal' && b.responsibleId === activeAdultId);

  const currentDebts =
    financeScope === 'family'
      ? debts.filter((d) => d.scope !== 'personal')
      : debts.filter((d) => d.scope === 'personal' && d.responsibleId === activeAdultId);

  const currentBudgets =
    financeScope === 'family'
      ? budgets.filter((b) => b.scope !== 'personal')
      : budgets.filter((b) => b.scope === 'personal' && (b.responsibleId === activeAdultId || !b.responsibleId));

  const currentGoals =
    financeScope === 'family'
      ? goals.filter((g) => g.scope !== 'personal')
      : goals.filter((g) => g.scope === 'personal' && (g.ownerId === activeAdultId || g.responsibleId === activeAdultId));

  // Financial Calculations for current scope
  const totalIncome = currentIncomes.reduce((acc, i) => acc + i.amount, 0);
  const totalExpense = currentExpenses.reduce((acc, e) => acc + e.amount, 0);
  const pendingBills = currentBills.filter((b) => b.status === 'pending');
  const pendingBillsTotal = pendingBills.reduce((acc, b) => acc + b.amount, 0);
  const totalDebtBalance = currentDebts.reduce((acc, d) => acc + d.pendingBalance, 0);
  const estimatedAvailable = totalIncome - totalExpense - pendingBillsTotal;

  // Handlers for Incomes (Create & Edit)
  const openCreateIncome = () => {
    setEditingIncomeId(null);
    setIncSource('salary');
    setIncDesc('');
    setIncAmount('');
    setIncDate(getTodayString());
    setIncResp(activeAdultId);
    setIncomeModalOpen(true);
  };

  const openEditIncome = (inc: (typeof incomes)[0]) => {
    setEditingIncomeId(inc.id);
    setIncSource(inc.sourceKey);
    setIncDesc(inc.description);
    setIncAmount(String(inc.amount));
    setIncDate(inc.date);
    setIncResp(inc.responsibleId);
    setIncomeModalOpen(true);
  };

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(incAmount);
    if (!incDesc.trim() || isNaN(amountNum) || amountNum <= 0) return;

    if (editingIncomeId) {
      updateIncome(editingIncomeId, {
        sourceKey: incSource,
        description: incDesc.trim(),
        amount: amountNum,
        date: incDate,
        responsibleId: financeScope === 'personal' ? activeAdultId : incResp,
        isRecurring: incRecurring,
        scope: financeScope,
      });
      setEditingIncomeId(null);
    } else {
      addIncome({
        sourceKey: incSource,
        description: incDesc.trim(),
        amount: amountNum,
        date: incDate,
        responsibleId: financeScope === 'personal' ? activeAdultId : incResp,
        isRecurring: incRecurring,
        scope: financeScope,
      });
    }

    setIncDesc('');
    setIncAmount('');
    setIncomeModalOpen(false);
  };

  // Handlers for Expenses (Create & Edit)
  const openCreateExpense = () => {
    setEditingExpenseId(null);
    setExpDesc('');
    setExpAmount('');
    setExpDate(getTodayString());
    setExpCat('food');
    setExpResp(activeAdultId);
    setExpenseModalOpen(true);
  };

  const openEditExpense = (exp: (typeof expenses)[0]) => {
    setEditingExpenseId(exp.id);
    setExpDesc(exp.description);
    setExpAmount(String(exp.amount));
    setExpDate(exp.date);
    setExpCat(exp.categoryKey);
    setExpResp(exp.responsibleId);
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expAmount);
    if (!expDesc.trim() || isNaN(amountNum) || amountNum <= 0) return;

    if (editingExpenseId) {
      updateExpense(editingExpenseId, {
        description: expDesc.trim(),
        amount: amountNum,
        date: expDate,
        categoryKey: expCat,
        responsibleId: financeScope === 'personal' ? activeAdultId : expResp,
        paymentMethod: expMethod,
        isRecurring: expRecurring,
        scope: financeScope,
      });
      setEditingExpenseId(null);
    } else {
      addExpense({
        description: expDesc.trim(),
        amount: amountNum,
        date: expDate,
        categoryKey: expCat,
        responsibleId: financeScope === 'personal' ? activeAdultId : expResp,
        paymentMethod: expMethod,
        isRecurring: expRecurring,
        scope: financeScope,
      });
    }

    setExpDesc('');
    setExpAmount('');
    setExpenseModalOpen(false);
  };

  // Handlers for Bills (Create & Edit)
  const openCreateBill = () => {
    setEditingBillId(null);
    setBillName('');
    setBillAmount('');
    setBillDueDate(getTodayString());
    setBillCat('services');
    setBillResp(activeAdultId);
    setBillModalOpen(true);
  };

  const openEditBill = (bill: (typeof bills)[0]) => {
    setEditingBillId(bill.id);
    setBillName(bill.name);
    setBillAmount(String(bill.amount));
    setBillDueDate(bill.dueDate);
    setBillCat(bill.categoryKey);
    setBillResp(bill.responsibleId);
    setBillModalOpen(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(billAmount);
    if (!billName.trim() || isNaN(amountNum) || amountNum <= 0) return;

    if (editingBillId) {
      updateBill(editingBillId, {
        name: billName.trim(),
        amount: amountNum,
        dueDate: billDueDate,
        categoryKey: billCat,
        responsibleId: financeScope === 'personal' ? activeAdultId : billResp,
        recurrence: billRecurrence,
        scope: financeScope,
      });
      setEditingBillId(null);
    } else {
      addBill({
        name: billName.trim(),
        amount: amountNum,
        dueDate: billDueDate,
        categoryKey: billCat,
        responsibleId: financeScope === 'personal' ? activeAdultId : billResp,
        recurrence: billRecurrence,
        status: 'pending',
        scope: financeScope,
      });
    }

    setBillName('');
    setBillAmount('');
    setBillModalOpen(false);
  };

  // Handlers for Debts (Create & Edit)
  const openCreateDebt = () => {
    setEditingDebtId(null);
    setDebtName('');
    setDebtCreditor('');
    setDebtOriginal('');
    setDebtPending('');
    setDebtInstallment('');
    setDebtDay(5);
    setDebtNotes('');
    setDebtModalOpen(true);
  };

  const openEditDebt = (debt: (typeof debts)[0]) => {
    setEditingDebtId(debt.id);
    setDebtName(debt.name);
    setDebtCreditor(debt.creditor);
    setDebtOriginal(String(debt.originalAmount));
    setDebtPending(String(debt.pendingBalance));
    setDebtInstallment(String(debt.installmentAmount));
    setDebtDay(debt.paymentDay);
    setDebtNotes(debt.notes || '');
    setDebtModalOpen(true);
  };

  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const origNum = parseFloat(debtOriginal);
    const pendNum = parseFloat(debtPending);
    const instNum = parseFloat(debtInstallment);
    if (!debtName.trim() || isNaN(pendNum)) return;

    if (editingDebtId) {
      updateDebt(editingDebtId, {
        name: debtName.trim(),
        creditor: debtCreditor.trim() || 'Acreedor',
        originalAmount: isNaN(origNum) ? pendNum : origNum,
        pendingBalance: pendNum,
        installmentAmount: isNaN(instNum) ? 0 : instNum,
        paymentDay: debtDay,
        responsibleId: financeScope === 'personal' ? activeAdultId : debtResp,
        notes: debtNotes.trim() || undefined,
        scope: financeScope,
      });
      setEditingDebtId(null);
    } else {
      addDebt({
        name: debtName.trim(),
        creditor: debtCreditor.trim() || 'Acreedor',
        originalAmount: isNaN(origNum) ? pendNum : origNum,
        pendingBalance: pendNum,
        installmentAmount: isNaN(instNum) ? 0 : instNum,
        paymentDay: debtDay,
        frequency: 'monthly',
        responsibleId: financeScope === 'personal' ? activeAdultId : debtResp,
        notes: debtNotes.trim() || undefined,
        scope: financeScope,
      });
    }

    setDebtName('');
    setDebtCreditor('');
    setDebtOriginal('');
    setDebtPending('');
    setDebtInstallment('');
    setDebtNotes('');
    setDebtModalOpen(false);
  };

  // Handlers for Goals (Create & Edit)
  const openCreateGoal = () => {
    setEditingGoalId(null);
    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('0');
    setGoalModalOpen(true);
  };

  const openEditGoal = (goal: (typeof goals)[0]) => {
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setGoalTarget(String(goal.targetAmount));
    setGoalCurrent(String(goal.currentAmount));
    setGoalModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(goalTarget);
    const currentNum = parseFloat(goalCurrent) || 0;
    if (!goalName.trim() || isNaN(targetNum) || targetNum <= 0) return;

    if (editingGoalId) {
      updateGoal(editingGoalId, {
        name: goalName.trim(),
        targetAmount: targetNum,
        currentAmount: currentNum,
        targetDate: goalDate || undefined,
        category: goalCategory,
        scope: financeScope,
      });
      setEditingGoalId(null);
    } else {
      addGoal({
        name: goalName.trim(),
        targetAmount: targetNum,
        currentAmount: currentNum,
        targetDate: goalDate || undefined,
        category: goalCategory,
        ownerId: financeScope === 'personal' ? activeAdultId : undefined,
        responsibleId: financeScope === 'personal' ? activeAdultId : undefined,
        scope: financeScope,
      });
    }

    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('0');
    setGoalModalOpen(false);
  };

  // Handlers for Budgets (Edit Limit)
  const openEditBudget = (categoryKey: string, categoryName: string, currentLimit: number) => {
    setEditingBudgetCatKey(categoryKey);
    setEditingBudgetCatName(categoryName);
    setBudgetLimitInput(currentLimit > 0 ? String(currentLimit) : '');
    setBudgetModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(budgetLimitInput);
    if (!isNaN(limitNum) && limitNum >= 0 && editingBudgetCatKey) {
      updateBudget(editingBudgetCatKey, limitNum);
    }
    setBudgetModalOpen(false);
  };

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(contributeAmount);
    if (contributeGoalId && !isNaN(amt) && amt > 0) {
      contributeToGoal(contributeGoalId, amt);
      setContributeGoalId(null);
      setContributeAmount('');
    }
  };

  // Spending per category for budget view and charts
  const categorySpending = config.expenseCategories.map((cat) => {
    const total = currentExpenses
      .filter((e) => e.categoryKey === cat.technicalKey)
      .reduce((sum, e) => sum + e.amount, 0);
    const budget = currentBudgets.find((b) => b.categoryKey === cat.technicalKey);
    const limit = budget ? budget.monthlyLimit : 0;
    return {
      cat,
      total,
      limit,
      available: Math.max(0, limit - total),
      percent: limit > 0 ? (total / limit) * 100 : 0,
    };
  });

  // Dynamic Tabs depending on financeScope
  const familyTabs = [
    { id: 'overview', label: 'Resumen Mensual', icon: <PieChart className="w-3.5 h-3.5" /> },
    { id: 'incomes', label: 'Ingresos', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'expenses', label: 'Gastos', icon: <TrendingDown className="w-3.5 h-3.5" /> },
    { id: 'bills', label: 'Cuentas por Pagar', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'budgets', label: 'Presupuestos', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'debts', label: 'Deudas Familiares', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'goals', label: 'Metas de Ahorro', icon: <PiggyBank className="w-3.5 h-3.5" /> },
    { id: 'transactions', label: 'Movimientos', icon: <Search className="w-3.5 h-3.5" /> },
  ];

  const personalTabs = [
    { id: 'overview', label: 'Mi Resumen', icon: <PieChart className="w-3.5 h-3.5" /> },
    { id: 'incomes', label: 'Mis Ingresos', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'expenses', label: 'Mis Gastos', icon: <TrendingDown className="w-3.5 h-3.5" /> },
    { id: 'bills', label: 'Mis Pagos', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'debts', label: 'Mis Deudas', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'goals', label: 'Mis Metas', icon: <PiggyBank className="w-3.5 h-3.5" /> },
    { id: 'transactions', label: 'Mis Movimientos', icon: <Search className="w-3.5 h-3.5" /> },
  ];

  const visibleTabs = financeScope === 'family' ? familyTabs : personalTabs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">
              {config.modules.finance.displayName}
            </h2>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Privado de Adultos</span>
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {financeScope === 'family'
              ? 'Finanzas familiares compartidas: presupuestos, cuentas del hogar y ahorro en equipo'
              : `Espacio financiero personal de ${activeAdult.name}. Privado e independiente.`}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="flex items-center gap-1 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{financeScope === 'family' ? '+ Gasto' : '+ Mi Gasto'}</span>
          </button>

          <button
            onClick={() => setIncomeModalOpen(true)}
            className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{financeScope === 'family' ? '+ Ingreso' : '+ Mi Ingreso'}</span>
          </button>
        </div>
      </div>

      {/* Main Scope Selector: [Nuestro Dinero] [Mi Organización] */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="p-1 bg-stone-100 rounded-2xl flex items-center gap-1.5 border border-stone-200/80 shadow-2xs">
          <button
            onClick={() => {
              setFinanceScope('family');
              if (activeTab === 'incomes' || activeTab === 'expenses') setActiveTab('overview');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              financeScope === 'family'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Building className="w-4 h-4 text-emerald-600" />
            <span>Nuestro Dinero</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
              Familiar
            </span>
          </button>

          <button
            onClick={() => {
              setFinanceScope('personal');
              if (activeTab === 'budgets') setActiveTab('overview');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              financeScope === 'personal'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Avatar
              name={activeAdult.name}
              emoji={activeAdult.avatarEmoji}
              color={activeAdult.avatarColor}
              size="sm"
            />
            <span>Mi Organización</span>
            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold border border-purple-100">
              {activeAdult.name}
            </span>
          </button>
        </div>

        {/* Privacy Note */}
        {financeScope === 'personal' && (
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 bg-purple-50/70 border border-purple-100 px-3 py-1.5 rounded-xl font-medium">
            <Lock className="w-3.5 h-3.5 text-purple-600" />
            <span>Visible solo para {activeAdult.name}. Tu pareja no ve este espacio.</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation tabs for Current Scope */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl overflow-x-auto text-xs font-bold">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FinanceTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                {financeScope === 'family' ? 'Ingresos Familiares' : 'Mis Ingresos'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 block mt-1">
                {formatCurrency(totalIncome)}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                {currentIncomes.length} fuentes registradas
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                {financeScope === 'family' ? 'Gastos Familiares' : 'Mis Gastos'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-stone-800 block mt-1">
                {formatCurrency(totalExpense)}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                {currentExpenses.length} gastos realizados
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                {financeScope === 'family' ? 'Cuentas por Pagar' : 'Mis Pagos Pendientes'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 block mt-1">
                {formatCurrency(pendingBillsTotal)}
              </span>
              <span className="text-[10px] text-amber-700 block mt-0.5">
                {pendingBills.length} cuentas pendientes
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                {financeScope === 'family' ? 'Dinero Disponible Est.' : 'Mi Saldo Disponible'}
              </span>
              <span
                className={`text-xl sm:text-2xl font-black block mt-1 ${
                  estimatedAvailable >= 0 ? 'text-teal-700' : 'text-rose-600'
                }`}
              >
                {formatCurrency(estimatedAvailable)}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                Tras cubrir pagos pendientes
              </span>
            </div>
          </div>

          {/* Breakdown & Urgent Bills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Expense Breakdown */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <span>
                    {financeScope === 'family'
                      ? 'Concentración del Gasto Familiar'
                      : 'Concentración de Mi Gasto Personal'}
                  </span>
                </h3>
                <span className="text-xs text-stone-400">Total: {formatCurrency(totalExpense)}</span>
              </div>

              {currentExpenses.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-6">No hay gastos registrados este mes</p>
              ) : (
                <div className="space-y-3">
                  {categorySpending
                    .filter((c) => c.total > 0)
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 6)
                    .map((item) => {
                      const share = totalExpense > 0 ? (item.total / totalExpense) * 100 : 0;
                      return (
                        <div key={item.cat.technicalKey} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-stone-800">{item.cat.displayName}</span>
                            <span className="font-bold text-stone-900">
                              {formatCurrency(item.total)} ({share.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-2 rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Upcoming Bills Alert Card */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>
                    {financeScope === 'family'
                      ? 'Próximos Vencimientos Familiares'
                      : 'Mis Próximos Vencimientos'}
                  </span>
                </h3>
                <button
                  onClick={() => setActiveTab('bills')}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                >
                  Ver todos →
                </button>
              </div>

              {pendingBills.length === 0 ? (
                <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <span className="text-2xl block mb-1">🎉</span>
                  <p className="text-xs text-stone-600 font-semibold">¡Todos los pagos al día!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingBills.slice(0, 4).map((bill) => {
                    const member = getMember(bill.responsibleId);
                    return (
                      <div
                        key={bill.id}
                        className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-xs font-bold text-stone-900">{bill.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                            <span>Vence: {formatFriendlyDate(bill.dueDate)}</span>
                            {financeScope === 'family' && member && <span>• Resp: {member.name}</span>}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-amber-900 block">
                            {formatCurrency(bill.amount)}
                          </span>
                          <button
                            onClick={() => toggleBillPaid(bill.id)}
                            className="mt-1 px-2.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Marcar pagada
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. INGRESOS TAB */}
      {activeTab === 'incomes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                {financeScope === 'family' ? 'Fuentes de Ingreso Familiar' : `Ingresos Personales de ${activeAdult.name}`}
              </h3>
              <p className="text-xs text-stone-400">
                Total acumulado este mes: <strong className="text-emerald-700 font-bold">{formatCurrency(totalIncome)}</strong>
              </p>
            </div>
            <button
              onClick={openCreateIncome}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{financeScope === 'family' ? 'Nuevo Ingreso' : 'Mi Ingreso'}</span>
            </button>
          </div>

          {currentIncomes.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200/80">
              <p className="text-xs text-stone-400">No hay ingresos registrados en esta sección.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentIncomes.map((inc) => {
                const member = getMember(inc.responsibleId);
                return (
                  <div
                    key={inc.id}
                    className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{inc.description}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                          {getCategoryName('income', inc.sourceKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-1">
                        <span>{formatFriendlyDate(inc.date)}</span>
                        {inc.isRecurring && <span>• Recurrente ({inc.frequency || 'mensual'})</span>}
                        {financeScope === 'family' && member && <span>• Aporte: {member.name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-emerald-700">
                        {formatCurrency(inc.amount)}
                      </span>
                      <button
                        onClick={() => openEditIncome(inc)}
                        className="p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar ingreso"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Seguro que quieres eliminar este registro?')) {
                            deleteIncome(inc.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar ingreso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. GASTOS TAB */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                {financeScope === 'family' ? 'Gastos del Hogar' : `Gastos Personales de ${activeAdult.name}`}
              </h3>
              <p className="text-xs text-stone-400">
                Total gastado este mes: <strong className="text-stone-900 font-bold">{formatCurrency(totalExpense)}</strong>
              </p>
            </div>
            <button
              onClick={openCreateExpense}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{financeScope === 'family' ? 'Nuevo Gasto' : 'Mi Gasto'}</span>
            </button>
          </div>

          {currentExpenses.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200/80">
              <p className="text-xs text-stone-400">No hay gastos registrados en esta sección.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentExpenses.map((exp) => {
                const member = getMember(exp.responsibleId);
                return (
                  <div
                    key={exp.id}
                    className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{exp.description}</span>
                        <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-semibold">
                          {getCategoryName('expense', exp.categoryKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-1">
                        <span>{formatFriendlyDate(exp.date)}</span>
                        <span>• Pago: {exp.paymentMethod}</span>
                        {financeScope === 'family' && member && <span>• Pagó: {member.name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-stone-900">
                        {formatCurrency(exp.amount)}
                      </span>
                      <button
                        onClick={() => openEditExpense(exp)}
                        className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar gasto"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Seguro que quieres eliminar este registro?')) {
                            deleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. PRÓXIMOS PAGOS (BILLS) TAB */}
      {activeTab === 'bills' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                {financeScope === 'family' ? 'Compromisos Fijos y Cuentas Familiares' : `Pagos y Cuentas Personales de ${activeAdult.name}`}
              </h3>
              <p className="text-xs text-stone-400">
                Pendiente: <strong className="text-amber-700 font-bold">{formatCurrency(pendingBillsTotal)}</strong> ({pendingBills.length} por pagar)
              </p>
            </div>
            <button
              onClick={openCreateBill}
              className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>{financeScope === 'family' ? 'Nueva Cuenta' : 'Nuevo Pago'}</span>
            </button>
          </div>

          {currentBills.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200/80">
              <p className="text-xs text-stone-400">No hay pagos o cuentas registradas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentBills.map((bill) => {
                const member = getMember(bill.responsibleId);
                const isPaid = bill.status === 'paid';

                return (
                  <div
                    key={bill.id}
                    className={`p-4 rounded-3xl border transition-all ${
                      isPaid ? 'bg-stone-50/50 border-stone-200 opacity-60' : 'bg-white border-stone-200/90 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-stone-900">{bill.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPaid ? 'Pagada' : 'Pendiente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-1">
                          <span>Vence el {formatFriendlyDate(bill.dueDate)}</span>
                          <span>• Frecuencia: {bill.recurrence}</span>
                        </div>
                        {financeScope === 'family' && member && (
                          <p className="text-[10px] text-stone-500 mt-0.5">Responsable: {member.name}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-stone-900 block">
                          {formatCurrency(bill.amount)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-2 justify-end">
                          <button
                            onClick={() => toggleBillPaid(bill.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              isPaid
                                ? 'bg-stone-200 text-stone-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isPaid ? 'Reabrir' : 'Pagar'}
                          </button>
                          <button
                            onClick={() => openEditBill(bill)}
                            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar cuenta"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('¿Seguro que quieres eliminar este registro?')) {
                                deleteBill(bill.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. PRESUPUESTOS (BUDGETS) TAB (Only in Family Scope) */}
      {activeTab === 'budgets' && financeScope === 'family' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Presupuestos Mensuales Familiares por Categoría
              </h3>
              <p className="text-xs text-stone-400">
                Monitorea el gasto acumulado frente al límite establecido por la familia
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categorySpending.map((item) => {
              const isOver = item.total > item.limit && item.limit > 0;

              return (
                <div
                  key={item.cat.technicalKey}
                  className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">{item.cat.displayName}</h4>
                      <p className="text-[11px] text-stone-400">
                        Presupuesto: {formatCurrency(item.limit)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-stone-900 block">
                        {formatCurrency(item.total)}
                      </span>
                      <span
                        className={`text-[10px] font-bold block ${
                          isOver ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isOver
                          ? `Excedido por ${formatCurrency(item.total - item.limit)}`
                          : `Disponible: ${formatCurrency(item.available)}`}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isOver
                          ? 'bg-rose-500'
                          : item.percent > 85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                    <button
                      onClick={() => openEditBudget(item.cat.technicalKey, item.cat.displayName, item.limit)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{item.limit > 0 ? 'Editar Presupuesto' : 'Definir Presupuesto'}</span>
                    </button>
                    {item.limit > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm('¿Seguro que quieres eliminar el presupuesto de esta categoría?')) {
                            deleteBudget(item.cat.technicalKey);
                          }
                        }}
                        className="text-[11px] text-stone-400 hover:text-rose-600 cursor-pointer flex items-center gap-1 transition-colors"
                        title="Eliminar límite de presupuesto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Quitar límite</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. DEUDAS (DEBTS) TAB */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                {financeScope === 'family' ? 'Deudas y Créditos Familiares' : `Deudas Personales de ${activeAdult.name}`}
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Saldo pendiente total:{' '}
                <strong className="text-rose-600 text-sm font-black">
                  {formatCurrency(totalDebtBalance)}
                </strong>
              </p>
            </div>

            <button
              onClick={openCreateDebt}
              className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>{financeScope === 'family' ? 'Registrar Deuda' : 'Mi Deuda'}</span>
            </button>
          </div>

          {currentDebts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200/80">
              <span className="text-2xl block mb-1">🎉</span>
              <p className="text-xs text-stone-600 font-bold">¡Sin deudas registradas!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentDebts.map((debt) => {
                const member = getMember(debt.responsibleId);
                return (
                  <div
                    key={debt.id}
                    className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">{debt.name}</h4>
                        <p className="text-[11px] text-stone-500">Acreedor: {debt.creditor}</p>
                        {financeScope === 'family' && member && (
                          <p className="text-[10px] text-stone-400 mt-0.5">Resp: {member.name}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                          Saldo Pendiente
                        </span>
                        <span className="text-base font-black text-rose-600 block">
                          {formatCurrency(debt.pendingBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-stone-50 rounded-2xl text-[11px]">
                      <div>
                        <span className="text-stone-400 block">Cuota Mensual</span>
                        <span className="font-bold text-stone-800">
                          {formatCurrency(debt.installmentAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Día de Pago</span>
                        <span className="font-bold text-stone-800">Día {debt.paymentDay}</span>
                      </div>
                    </div>

                    {debt.notes && (
                      <p className="text-[11px] text-stone-500 italic bg-amber-50/50 p-2 rounded-xl">
                        {debt.notes}
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                      <button
                        onClick={() => {
                          const abono = prompt('¿Monto a amortizar / abonar al saldo de la deuda?');
                          if (abono) {
                            const val = parseFloat(abono);
                            if (!isNaN(val) && val > 0) {
                              updateDebtBalance(debt.id, debt.pendingBalance - val);
                            }
                          }
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                      >
                        + Registrar Abono
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditDebt(debt)}
                          className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar deuda"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('¿Seguro que quieres eliminar este registro?')) {
                              deleteDebt(debt.id);
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar deuda"
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

      {/* 7. METAS DE AHORRO (GOALS) TAB */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                {financeScope === 'family' ? 'Metas de Ahorro y Proyectos Familiares' : `Metas Personales de ${activeAdult.name}`}
              </h3>
              <p className="text-xs text-stone-400">
                {currentGoals.length} objetivos configurados
              </p>
            </div>
            <button
              onClick={openCreateGoal}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{financeScope === 'family' ? 'Nueva Meta' : 'Mi Meta'}</span>
            </button>
          </div>

          {currentGoals.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200/80">
              <span className="text-2xl block mb-1">🎯</span>
              <p className="text-xs text-stone-600 font-bold">Sin metas configuradas.</p>
              <p className="text-[11px] text-stone-400 mt-1">
                Define una meta de ahorro personal o familiar para comenzar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentGoals.map((goal) => {
                const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);

                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">🎯</span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          {percent.toFixed(0)}%
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-stone-900 mb-1">{goal.name}</h4>
                      {goal.notes && (
                        <p className="text-[11px] text-stone-500 mb-3">{goal.notes}</p>
                      )}

                      <div className="space-y-1 my-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Ahorrado:</span>
                          <strong className="text-emerald-700 font-black">
                            {formatCurrency(goal.currentAmount)}
                          </strong>
                        </div>
                        <div className="flex justify-between text-xs text-stone-400">
                          <span>Meta total:</span>
                          <span>{formatCurrency(goal.targetAmount)}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setContributeGoalId(goal.id)}
                        className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                      >
                        + Aportar
                      </button>
                      <button
                        onClick={() => openEditGoal(goal)}
                        className="p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar meta"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Seguro que quieres eliminar este registro?')) {
                            deleteGoal(goal.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. HISTORIAL MOVIMIENTOS (TRANSACTIONS) TAB */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-stone-200">
            <Search className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder={financeScope === 'family' ? 'Buscar en movimientos familiares...' : 'Buscar en mis movimientos personales...'}
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-hidden text-stone-800"
            />
          </div>

          {/* Unified movements list */}
          <div className="space-y-2">
            {[
              ...currentIncomes.map((i) => ({ ...i, type: 'income' as const })),
              ...currentExpenses.map((e) => ({ ...e, type: 'expense' as const })),
            ]
              .filter((tx) =>
                tx.description.toLowerCase().includes(txSearch.toLowerCase())
              )
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((tx) => {
                const member = getMember(tx.responsibleId);
                const isInc = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 bg-white rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                          isInc ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isInc ? '+' : '-'}
                      </div>
                      <div>
                        <span className="font-bold text-stone-900 block">{tx.description}</span>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                          <span>{formatFriendlyDate(tx.date)}</span>
                          {financeScope === 'family' && member && <span>• Resp: {member.name}</span>}
                          {!isInc && (
                            <span className="capitalize">
                              • Cat: {getCategoryName('expense', (tx as Expense).categoryKey)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-black ${
                          isInc ? 'text-emerald-700' : 'text-stone-900'
                        }`}
                      >
                        {isInc ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>

                      <button
                        onClick={() => {
                          if (isInc) {
                            const original = currentIncomes.find((i) => i.id === tx.id);
                            if (original) openEditIncome(original);
                          } else {
                            const original = currentExpenses.find((e) => e.id === tx.id);
                            if (original) openEditExpense(original);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar movimiento"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm('¿Seguro que quieres eliminar este registro?')) {
                            if (isInc) {
                              deleteIncome(tx.id);
                            } else {
                              deleteExpense(tx.id);
                            }
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer rounded-lg"
                        title="Eliminar movimiento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Modal Ingreso */}
      <Modal
        isOpen={incomeModalOpen}
        onClose={() => {
          setIncomeModalOpen(false);
          setEditingIncomeId(null);
        }}
        title={
          editingIncomeId
            ? 'Editar Ingreso'
            : financeScope === 'family'
            ? 'Registrar Ingreso Familiar'
            : `Registrar Ingreso Personal (${activeAdult.name})`
        }
        subtitle={
          editingIncomeId
            ? 'Modifica los valores del ingreso seleccionado'
            : financeScope === 'family'
            ? 'Añade sueldos, trabajos independientes, Uber o ventas familiares'
            : `Se guardará en tu espacio personal exclusivo de ${activeAdult.name}`
        }
      >
        <form onSubmit={handleSaveIncome} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Sueldo mensual, Asesoría, Venta..."
              value={incDesc}
              onChange={(e) => setIncDesc(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Monto ($)</label>
              <input
                type="number"
                required
                placeholder="Ej: 500000"
                value={incAmount}
                onChange={(e) => setIncAmount(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                value={incDate}
                onChange={(e) => setIncDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fuente</label>
              <select
                value={incSource}
                onChange={(e) => setIncSource(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {config.incomeSources.map((s) => (
                  <option key={s.technicalKey} value={s.technicalKey}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Responsable</label>
              {financeScope === 'personal' ? (
                <div className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-700 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  <span>{activeAdult.name} (Personal)</span>
                </div>
              ) : (
                <select
                  value={incResp}
                  onChange={(e) => setIncResp(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                >
                  <option value="mama">Mamá</option>
                  <option value="papa">Papá</option>
                  <option value="family">Familiar Compartido</option>
                </select>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIncomeModalOpen(false);
                setEditingIncomeId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingIncomeId ? 'Guardar Cambios' : 'Guardar Ingreso'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Gasto */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpenseId(null);
        }}
        title={
          editingExpenseId
            ? 'Editar Gasto'
            : financeScope === 'family'
            ? 'Registrar Gasto Familiar'
            : `Registrar Gasto Personal (${activeAdult.name})`
        }
        subtitle={
          editingExpenseId
            ? 'Modifica los valores del gasto seleccionado'
            : financeScope === 'family'
            ? 'Mantén el control diario de compras y pagos del hogar'
            : `Se registrará exclusivamente en el espacio personal de ${activeAdult.name}`
        }
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Curso personal, Materiales, Almuerzo..."
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Monto ($)</label>
              <input
                type="number"
                required
                placeholder="Ej: 35000"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha</label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <select
                value={expCat}
                onChange={(e) => setExpCat(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {config.expenseCategories.map((c) => (
                  <option key={c.technicalKey} value={c.technicalKey}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Responsable</label>
              {financeScope === 'personal' ? (
                <div className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-700 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  <span>{activeAdult.name} (Personal)</span>
                </div>
              ) : (
                <select
                  value={expResp}
                  onChange={(e) => setExpResp(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                >
                  <option value="mama">Mamá</option>
                  <option value="papa">Papá</option>
                </select>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setExpenseModalOpen(false);
                setEditingExpenseId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingExpenseId ? 'Guardar Cambios' : 'Guardar Gasto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cuenta / Pago */}
      <Modal
        isOpen={billModalOpen}
        onClose={() => {
          setBillModalOpen(false);
          setEditingBillId(null);
        }}
        title={
          editingBillId
            ? 'Editar Cuenta / Pago'
            : financeScope === 'family'
            ? 'Nueva Cuenta por Pagar'
            : `Nuevo Pago Personal (${activeAdult.name})`
        }
        subtitle={
          editingBillId
            ? 'Modifica los datos del pago programado'
            : financeScope === 'family'
            ? 'Registra compromisos y fechas de vencimiento del hogar'
            : `Suscripciones o pagos personales de ${activeAdult.name}`
        }
      >
        <form onSubmit={handleSaveBill} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre de la Cuenta / Pago</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Suscripción personal, Seguro, Cuota..."
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Monto ($)</label>
              <input
                type="number"
                required
                placeholder="Ej: 25000"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha de Vencimiento</label>
              <input
                type="date"
                required
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <select
                value={billCat}
                onChange={(e) => setBillCat(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {config.expenseCategories.map((c) => (
                  <option key={c.technicalKey} value={c.technicalKey}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Responsable</label>
              {financeScope === 'personal' ? (
                <div className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-700 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  <span>{activeAdult.name} (Personal)</span>
                </div>
              ) : (
                <select
                  value={billResp}
                  onChange={(e) => setBillResp(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                >
                  <option value="mama">Mamá</option>
                  <option value="papa">Papá</option>
                  <option value="both">Ambos</option>
                </select>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setBillModalOpen(false);
                setEditingBillId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingBillId ? 'Guardar Cambios' : 'Guardar Pago'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Deuda */}
      <Modal
        isOpen={debtModalOpen}
        onClose={() => {
          setDebtModalOpen(false);
          setEditingDebtId(null);
        }}
        title={
          editingDebtId
            ? 'Editar Deuda / Crédito'
            : financeScope === 'family'
            ? 'Registrar Deuda Familiar'
            : `Registrar Deuda Personal (${activeAdult.name})`
        }
        subtitle={
          editingDebtId
            ? 'Actualiza los montos, cuotas o acreedor'
            : financeScope === 'family'
            ? 'Lleva el control de créditos o compromisos familiares pendientes'
            : `Compromiso personal exclusivo de ${activeAdult.name}`
        }
      >
        <form onSubmit={handleSaveDebt} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre de la Deuda</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Tarjeta de crédito personal, Crédito..."
              value={debtName}
              onChange={(e) => setDebtName(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Acreedor / Banco</label>
              <input
                type="text"
                placeholder="Ej: Banco, Casa comercial..."
                value={debtCreditor}
                onChange={(e) => setDebtCreditor(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Saldo Pendiente ($)</label>
              <input
                type="number"
                required
                placeholder="Ej: 150000"
                value={debtPending}
                onChange={(e) => setDebtPending(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Cuota Mensual ($)</label>
              <input
                type="number"
                placeholder="Ej: 30000"
                value={debtInstallment}
                onChange={(e) => setDebtInstallment(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Día de Pago (1 - 31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={debtDay}
                onChange={(e) => setDebtDay(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Notas o Detalles (Opcional)</label>
            <input
              type="text"
              placeholder="Ej: Quedan 4 cuotas, tasa preferencial..."
              value={debtNotes}
              onChange={(e) => setDebtNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setDebtModalOpen(false);
                setEditingDebtId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingDebtId ? 'Guardar Cambios' : 'Guardar Deuda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Meta de Ahorro */}
      <Modal
        isOpen={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false);
          setEditingGoalId(null);
        }}
        title={
          editingGoalId
            ? 'Editar Meta de Ahorro'
            : financeScope === 'family'
            ? 'Crear Meta de Ahorro Familiar'
            : `Crear Meta Personal (${activeAdult.name})`
        }
        subtitle={
          editingGoalId
            ? 'Modifica los datos y monto objetivo de la meta'
            : financeScope === 'family'
            ? 'Un objetivo compartido para el bienestar del hogar'
            : `Un proyecto o sueño personal de ${activeAdult.name}`
        }
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre de la Meta</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Renovar equipo, Curso, Ahorro personal..."
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Monto Objetivo ($)</label>
              <input
                type="number"
                required
                placeholder="Ej: 300000"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {editingGoalId ? 'Monto Ahorrado Actual ($)' : 'Ahorro Inicial ($)'}
              </label>
              <input
                type="number"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setGoalModalOpen(false);
                setEditingGoalId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingGoalId ? 'Guardar Cambios' : 'Crear Meta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Presupuesto Mensual */}
      <Modal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title="Ajustar Límite de Presupuesto"
        subtitle={`Define el tope mensual para ${editingBudgetCatName}`}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
            <input
              type="text"
              readOnly
              value={editingBudgetCatName}
              className="w-full px-3.5 py-2 bg-stone-100 border border-stone-200 rounded-xl text-sm font-semibold text-stone-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Límite Mensual ($)</label>
            <input
              type="number"
              required
              autoFocus
              min={0}
              placeholder="Ej: 300000"
              value={budgetLimitInput}
              onChange={(e) => setBudgetLimitInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Ingresa el monto máximo que la familia planea gastar mensualmente en este rubro.
            </p>
          </div>

          <div className="pt-3 flex justify-between items-center border-t border-stone-100">
            {editingBudgetCatKey && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Seguro que quieres eliminar el presupuesto para esta categoría?')) {
                    deleteBudget(editingBudgetCatKey);
                    setBudgetModalOpen(false);
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Eliminar Límite
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setBudgetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Guardar Presupuesto
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Aportar a Meta */}
      {contributeGoalId && (
        <Modal
          isOpen={!!contributeGoalId}
          onClose={() => setContributeGoalId(null)}
          title="Aportar a Meta de Ahorro"
          subtitle="Suma dinero a este objetivo"
        >
          <form onSubmit={handleContribute} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Monto a Aportar ($)</label>
              <input
                type="number"
                required
                autoFocus
                placeholder="Ej: 20000"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setContributeGoalId(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Confirmar Aporte
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
