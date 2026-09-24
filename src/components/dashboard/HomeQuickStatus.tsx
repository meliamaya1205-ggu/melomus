import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useTheme } from '../../context/ThemeContext';
import { ShoppingCart, Sparkles, Check, Circle, AlertCircle } from 'lucide-react';

export const HomeQuickStatus: React.FC = () => {
  const {
    shoppingItems,
    toggleShoppingItem,
    cleaningTasks,
    toggleCleaningTask,
    setCurrentTab,
  } = useFamily();
  const { tokens, isMinimalista, isPremium } = useTheme();

  const pendingShopping = shoppingItems.filter((s) => !s.completed);
  const urgentShopping = pendingShopping.filter((s) => s.urgent);
  const regularShopping = pendingShopping.filter((s) => !s.urgent).slice(0, 3);
  const displayShopping = [...urgentShopping, ...regularShopping].slice(0, 4);

  const cleaningToday = cleaningTasks.slice(0, 3);

  return (
    <div
      className="theme-card p-5 space-y-5 transition-all duration-300"
      style={{
        backgroundColor: tokens.cardBg,
        border: tokens.cardBorder,
        borderRadius: tokens.cardRadius,
        boxShadow: tokens.cardShadow,
      }}
    >
      {/* Shopping preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="p-2 bg-amber-50 text-amber-600 flex items-center justify-center"
              style={{ borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius }}
            >
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">Lista de Compras</h3>
              <p className="text-xs text-stone-400">
                {pendingShopping.length} artículo{pendingShopping.length === 1 ? '' : 's'} por comprar
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab('home')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
          >
            Ver lista →
          </button>
        </div>

        {displayShopping.length === 0 ? (
          <p
            className="text-xs text-stone-400 p-3 border border-dashed border-stone-200 text-center"
            style={{
              backgroundColor: tokens.surfaceSecondary,
              borderRadius: tokens.innerRadius,
            }}
          >
            ¡Despensa al día! No hay compras pendientes
          </p>
        ) : (
          <div className="space-y-1.5">
            {displayShopping.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleShoppingItem(item.id)}
                className={`flex items-center justify-between p-2.5 transition-all cursor-pointer select-none ${
                  item.urgent
                    ? 'bg-amber-50/60 border border-amber-200 text-amber-950 font-medium'
                    : 'text-stone-800'
                }`}
                style={{
                  backgroundColor: item.urgent ? undefined : tokens.itemBg,
                  border: item.urgent ? undefined : tokens.itemBorder,
                  borderRadius: tokens.innerRadius,
                  boxShadow: isMinimalista
                    ? 'none'
                    : isPremium
                    ? '0 2px 6px -2px rgba(28,25,23,0.04)'
                    : undefined,
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button type="button" className="text-stone-400 hover:text-amber-500 shrink-0">
                    <Circle className="w-4 h-4" />
                  </button>
                  <span className="text-xs truncate">{item.name}</span>
                  {item.quantity && (
                    <span className="text-[10px] text-stone-400 shrink-0">({item.quantity})</span>
                  )}
                </div>

                {item.urgent && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 shrink-0 ml-2"
                    style={{ borderRadius: tokens.badgeRadius }}
                  >
                    <AlertCircle className="w-3 h-3" /> Urgente
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cleaning preview */}
      <div className="pt-2 border-t border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="p-2 bg-emerald-50 text-emerald-600 flex items-center justify-center"
              style={{ borderRadius: isMinimalista ? '0.375rem' : tokens.badgeRadius }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">Limpieza y Orden</h3>
              <p className="text-xs text-stone-400">Rutinas clave del hogar</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab('home')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            Ver áreas →
          </button>
        </div>

        <div className="space-y-1.5">
          {cleaningToday.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleCleaningTask(task.id)}
              className="flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none"
              style={{
                backgroundColor: tokens.itemBg,
                border: tokens.itemBorder,
                borderRadius: tokens.innerRadius,
              }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className={`w-4 h-4 flex items-center justify-center transition-colors shrink-0 ${
                    task.completedToday ? 'bg-emerald-500 text-white' : 'border border-stone-300'
                  }`}
                  style={{ borderRadius: isMinimalista ? '0.25rem' : '0.375rem' }}
                >
                  {task.completedToday && <Check className="w-3 h-3" />}
                </div>
                <span
                  className={`text-xs truncate ${
                    task.completedToday ? 'line-through text-stone-400' : 'text-stone-800 font-medium'
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <span
                className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 capitalize shrink-0 ml-2"
                style={{ borderRadius: tokens.badgeRadius }}
              >
                {task.area}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
