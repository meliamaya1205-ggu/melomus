import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../services/currencyUtils';
import { Wallet, AlertCircle, ArrowRight } from 'lucide-react';

export const FinanceQuickSummary: React.FC = () => {
  const { incomes, expenses, bills, setCurrentTab, isAdultView } = useFamily();
  const { tokens, isMinimalista, isPremium } = useTheme();

  if (!isAdultView) return null;

  const familyIncomes = incomes.filter((i) => i.scope !== 'personal');
  const familyExpenses = expenses.filter((e) => e.scope !== 'personal');
  const familyBills = bills.filter((b) => b.scope !== 'personal');

  const totalIncome = familyIncomes.reduce((acc, i) => acc + i.amount, 0);
  const totalExpense = familyExpenses.reduce((acc, e) => acc + e.amount, 0);
  const pendingBills = familyBills.filter((b) => b.status === 'pending');
  const pendingBillsTotal = pendingBills.reduce((acc, b) => acc + b.amount, 0);
  const estimatedAvailable = totalIncome - totalExpense - pendingBillsTotal;

  return (
    <div
      className="theme-card p-5 transition-all duration-300"
      style={{
        backgroundColor: isMinimalista ? '#ffffff' : tokens.surfaceSecondary,
        border: tokens.cardBorder,
        borderRadius: tokens.cardRadius,
        boxShadow: tokens.cardShadow,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="p-2 bg-emerald-600 text-white flex items-center justify-center"
            style={{ borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius }}
          >
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-stone-900">Finanzas Familiares</h3>
              <span
                className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5"
                style={{ borderRadius: tokens.badgeRadius }}
              >
                Adultos
              </span>
            </div>
            <p className="text-xs text-stone-500">Resumen rápido del mes</p>
          </div>
        </div>

        <button
          onClick={() => setCurrentTab('finance')}
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
        >
          <span>Ir a finanzas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-3">
        <div
          className="p-3 border min-w-0"
          style={{
            backgroundColor: '#ffffff',
            borderColor: isMinimalista ? '#e4e4e7' : tokens.borderSubtle,
            borderRadius: tokens.innerRadius,
            boxShadow: isMinimalista
              ? 'none'
              : isPremium
              ? '0 2px 6px -2px rgba(28,25,23,0.04)'
              : undefined,
          }}
        >
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block truncate">
            Dinero Disponible Est.
          </span>
          <span className={`text-sm sm:text-base font-black truncate block mt-0.5 ${estimatedAvailable >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatCurrency(estimatedAvailable)}
          </span>
        </div>

        <div
          className="p-3 border min-w-0"
          style={{
            backgroundColor: '#ffffff',
            borderColor: isMinimalista ? '#e4e4e7' : tokens.borderSubtle,
            borderRadius: tokens.innerRadius,
            boxShadow: isMinimalista
              ? 'none'
              : isPremium
              ? '0 2px 6px -2px rgba(28,25,23,0.04)'
              : undefined,
          }}
        >
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block truncate">
            Gastos Acumulados
          </span>
          <span className="text-sm sm:text-base font-black text-stone-800 truncate block mt-0.5">
            {formatCurrency(totalExpense)}
          </span>
        </div>

        <div
          className="p-3 border col-span-1 xs:col-span-2 sm:col-span-1 min-w-0"
          style={{
            backgroundColor: '#ffffff',
            borderColor: isMinimalista ? '#e4e4e7' : tokens.borderSubtle,
            borderRadius: tokens.innerRadius,
            boxShadow: isMinimalista
              ? 'none'
              : isPremium
              ? '0 2px 6px -2px rgba(28,25,23,0.04)'
              : undefined,
          }}
        >
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block truncate">
            Cuentas por Pagar
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-sm sm:text-base font-black text-amber-700 truncate">
              {formatCurrency(pendingBillsTotal)}
            </span>
            {pendingBills.length > 0 && (
              <span
                className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 flex items-center gap-0.5 shrink-0"
                style={{ borderRadius: tokens.badgeRadius }}
              >
                <AlertCircle className="w-2.5 h-2.5" /> {pendingBills.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
