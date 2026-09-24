import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { ShoppingCategory } from '../types/home';
import {
  Sparkles,
  ShoppingCart,
  Wrench,
  Plus,
  Check,
  Circle,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    shoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCompletedShopping,
    cleaningTasks,
    toggleCleaningTask,
    maintenanceTasks,
    toggleMaintenanceTask,
    config,
    getMember,
  } = useFamily();

  const [activeTab, setActiveTab] = useState<'shopping' | 'cleaning' | 'maintenance'>('shopping');

  // New shopping item form inline
  const [newShopName, setNewShopName] = useState('');
  const [newShopCategory, setNewShopCategory] = useState<ShoppingCategory>('produce');
  const [newShopQty, setNewShopQty] = useState('');
  const [newShopUrgent, setNewShopUrgent] = useState(false);

  const handleAddShopping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    addShoppingItem({
      name: newShopName.trim(),
      category: newShopCategory,
      quantity: newShopQty.trim() || undefined,
      urgent: newShopUrgent,
      completed: false,
      addedBy: 'Familia',
    });

    setNewShopName('');
    setNewShopQty('');
    setNewShopUrgent(false);
  };

  const pendingShopping = shoppingItems.filter((s) => !s.completed);
  const completedShopping = shoppingItems.filter((s) => s.completed);

  const categoryNames: Record<ShoppingCategory, { label: string; icon: string }> = {
    produce: { label: 'Frutas y Verduras', icon: '🍎' },
    dairy: { label: 'Lácteos y Refrigerados', icon: '🥛' },
    pantry: { label: 'Despensa y Abarrotes', icon: '🌾' },
    baby: { label: 'Bebé y Niños', icon: '👶' },
    cleaning: { label: 'Limpieza del Hogar', icon: '🧼' },
    other: { label: 'Otros', icon: '📦' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">
              {config.modules.home.displayName}
            </h2>
            <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              {pendingShopping.length} compras pendientes
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Lista de compras compartida, rutinas de limpieza y mantenimiento de la casa
          </p>
        </div>

        {/* Subsection tabs */}
        <div className="flex items-center bg-stone-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'shopping' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
            <span>Compras</span>
          </button>
          <button
            onClick={() => setActiveTab('cleaning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'cleaning' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Limpieza</span>
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'maintenance' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-sky-500" />
            <span>Mantenimiento</span>
          </button>
        </div>
      </div>

      {/* 1. SHOPPING LIST TAB */}
      {activeTab === 'shopping' && (
        <div className="space-y-5">
          {/* Quick Add Form */}
          <form
            onSubmit={handleAddShopping}
            className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                required
                placeholder="¿Qué falta comprar? (ej. Huevos, Pan, Shampoo...)"
                value={newShopName}
                onChange={(e) => setNewShopName(e.target.value)}
                className="w-full sm:flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />

              <input
                type="text"
                placeholder="Cant. (ej. 2 kg)"
                value={newShopQty}
                onChange={(e) => setNewShopQty(e.target.value)}
                className="w-full sm:w-28 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />

              <select
                value={newShopCategory}
                onChange={(e) => setNewShopCategory(e.target.value as ShoppingCategory)}
                className="w-full sm:w-44 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="produce">🍎 Frutas y Verduras</option>
                <option value="dairy">🥛 Lácteos y Frío</option>
                <option value="pantry">🌾 Despensa</option>
                <option value="baby">👶 Bebé y Niños</option>
                <option value="cleaning">🧼 Limpieza</option>
                <option value="other">📦 Otros</option>
              </select>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-stone-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newShopUrgent}
                  onChange={(e) => setNewShopUrgent(e.target.checked)}
                  className="rounded-md text-amber-500 border-stone-300"
                />
                <span>Marcar como compra urgente para hoy</span>
              </label>
            </div>
          </form>

          {/* Pending items grouped by category */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Por Comprar ({pendingShopping.length})
              </h3>
              {completedShopping.length > 0 && (
                <button
                  onClick={clearCompletedShopping}
                  className="text-xs font-semibold text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                >
                  Limpiar comprados ({completedShopping.length})
                </button>
              )}
            </div>

            {pendingShopping.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-stone-200/80 text-center">
                <span className="text-3xl block mb-2">🛒</span>
                <p className="text-xs font-bold text-stone-700">¡Todo comprado!</p>
                <p className="text-xs text-stone-400 mt-0.5">La despensa familiar está al día.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingShopping.map((item) => {
                  const catInfo = categoryNames[item.category] || { label: item.category, icon: '📦' };

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        item.urgent
                          ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                          : 'bg-white border-stone-200/80 hover:border-amber-200'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => toggleShoppingItem(item.id)}
                      >
                        <button type="button" className="text-stone-300 hover:text-amber-500">
                          <Circle className="w-5 h-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-stone-900 truncate">
                              {item.name}
                            </span>
                            {item.urgent && (
                              <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-md">
                                Urgente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                            <span>{catInfo.icon} {catInfo.label}</span>
                            {item.quantity && <span>• {item.quantity}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteShoppingItem(item.id)}
                        className="p-1 text-stone-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Eliminar de lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed items */}
          {completedShopping.length > 0 && (
            <div className="pt-4 border-t border-stone-200/60">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                Comprados recientemente ({completedShopping.length})
              </h3>
              <div className="space-y-1.5">
                {completedShopping.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleShoppingItem(item.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/60 border border-stone-100 opacity-60 hover:opacity-100 transition-opacity cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      <span className="text-xs text-stone-500 line-through">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400">Comprado</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CLEANING TAB */}
      {activeTab === 'cleaning' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cleaningTasks.map((clean) => {
              const assigned = clean.assignedMemberId ? getMember(clean.assignedMemberId) : undefined;
              return (
                <div
                  key={clean.id}
                  onClick={() => toggleCleaningTask(clean.id)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                    clean.completedToday
                      ? 'bg-emerald-50/70 border-emerald-200/80 shadow-xs'
                      : 'bg-white border-stone-200/80 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-xl flex items-center justify-center transition-colors ${
                        clean.completedToday
                          ? 'bg-emerald-500 text-white'
                          : 'border-2 border-stone-300'
                      }`}
                    >
                      {clean.completedToday && <Check className="w-4 h-4" />}
                    </div>

                    <div>
                      <h4
                        className={`text-xs font-bold leading-snug ${
                          clean.completedToday ? 'line-through text-emerald-900' : 'text-stone-800'
                        }`}
                      >
                        {clean.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-1 capitalize">
                        <span className="bg-stone-100 px-2 py-0.5 rounded-md font-medium text-stone-600">
                          {clean.area}
                        </span>
                        <span>Frecuencia: {clean.frequency}</span>
                        {assigned && <span>• Asignado a: {assigned.name}</span>}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      clean.completedToday ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {clean.completedToday ? 'Listo Hoy' : 'Pendiente'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MAINTENANCE TAB */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {maintenanceTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleMaintenanceTask(task.id)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  task.completed
                    ? 'bg-stone-50/60 border-stone-200/50 opacity-60'
                    : 'bg-white border-stone-200/80 shadow-xs hover:border-sky-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center ${
                      task.completed ? 'bg-emerald-500 text-white' : 'border border-stone-300'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <h4
                      className={`text-xs font-bold ${
                        task.completed ? 'line-through text-stone-500' : 'text-stone-900'
                      }`}
                    >
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-stone-500 mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                        Prioridad {task.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    task.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {task.completed ? 'Completado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
