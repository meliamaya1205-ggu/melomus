import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import {
  ShoppingCategory,
  ShoppingItem,
  CleaningTask,
  MaintenanceTask,
  HomeArea,
  FrequencyConfig,
  FrequencyType,
  MaintenanceCategory,
  formatFrequency,
  DEFAULT_HOME_AREAS,
} from '../types/home';
import { Modal } from '../components/common/Modal';
import {
  Sparkles,
  ShoppingCart,
  Wrench,
  Plus,
  Check,
  Circle,
  Trash2,
  CheckCircle2,
  Edit2,
  Pause,
  Play,
  Settings,
  AlertCircle,
  Calendar,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    shoppingItems,
    addShoppingItem,
    updateShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCompletedShopping,
    homeAreas,
    addHomeArea,
    updateHomeArea,
    deleteHomeArea,
    cleaningTasks,
    addCleaningTask,
    updateCleaningTask,
    deleteCleaningTask,
    toggleCleaningTask,
    togglePauseCleaningTask,
    maintenanceTasks,
    addMaintenanceTask,
    updateMaintenanceTask,
    deleteMaintenanceTask,
    toggleMaintenanceTask,
    togglePauseMaintenanceTask,
    config,
    getMember,
    isAdultView,
    members,
  } = useFamily();

  const [activeTab, setActiveTab] = useState<'shopping' | 'cleaning' | 'maintenance'>('shopping');

  // Feedback states
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. SHOPPING STATE
  // ---------------------------------------------------------------------------
  const [newShopName, setNewShopName] = useState('');
  const [newShopCategory, setNewShopCategory] = useState<ShoppingCategory>('produce');
  const [newShopQty, setNewShopQty] = useState('');
  const [newShopNotes, setNewShopNotes] = useState('');
  const [newShopUrgent, setNewShopUrgent] = useState(false);

  // Edit Shopping Modal
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState<ShoppingItem | null>(null);
  const [editShopName, setEditShopName] = useState('');
  const [editShopCategory, setEditShopCategory] = useState<ShoppingCategory>('produce');
  const [editShopQty, setEditShopQty] = useState('');
  const [editShopNotes, setEditShopNotes] = useState('');
  const [editShopUrgent, setEditShopUrgent] = useState(false);

  // ---------------------------------------------------------------------------
  // 2. CLEANING STATE
  // ---------------------------------------------------------------------------
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [editingCleanId, setEditingCleanId] = useState<string | null>(null);
  const [cleanTitle, setCleanTitle] = useState('');
  const [cleanDesc, setCleanDesc] = useState('');
  const [cleanAreaId, setCleanAreaId] = useState<string>('area_kitchen');
  const [cleanFreqType, setCleanFreqType] = useState<FrequencyType>('weekly');
  const [cleanFreqInterval, setCleanFreqInterval] = useState<number>(15);
  const [cleanFreqDays, setCleanFreqDays] = useState<number[]>([1, 3, 5]);
  const [cleanFreqCustomText, setCleanFreqCustomText] = useState<string>('');
  const [cleanAssignedId, setCleanAssignedId] = useState<string>('');
  const [cleanPriority, setCleanPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [cleanTimeOfDay, setCleanTimeOfDay] = useState<string>('morning');
  const [cleanNotes, setCleanNotes] = useState('');

  // ---------------------------------------------------------------------------
  // 3. MAINTENANCE STATE
  // ---------------------------------------------------------------------------
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCategory, setMaintCategory] = useState<MaintenanceCategory>('appliances');
  const [maintPriority, setMaintPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [maintAssignedId, setMaintAssignedId] = useState<string>('');
  const [maintDueDate, setMaintDueDate] = useState('');
  const [maintNextDate, setMaintNextDate] = useState('');
  const [maintFreqText, setMaintFreqText] = useState('');
  const [maintNotes, setMaintNotes] = useState('');

  // ---------------------------------------------------------------------------
  // 4. AREAS MANAGER MODAL STATE
  // ---------------------------------------------------------------------------
  const [isAreasModalOpen, setIsAreasModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaIcon, setNewAreaIcon] = useState('🏠');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editAreaName, setEditAreaName] = useState('');
  const [editAreaIcon, setEditAreaIcon] = useState('');

  const currentAreas = homeAreas && homeAreas.length > 0 ? homeAreas : DEFAULT_HOME_AREAS;

  // Helper to resolve area name and icon
  const getAreaMeta = (areaIdOrLegacy?: string): { name: string; icon: string } => {
    if (!areaIdOrLegacy) return { name: 'General', icon: '🏠' };
    const match = currentAreas.find(
      (a) => a.id === areaIdOrLegacy || a.id === `area_${areaIdOrLegacy}` || a.name.toLowerCase() === areaIdOrLegacy.toLowerCase()
    );
    if (match) return { name: match.name, icon: match.icon || '🏠' };
    return { name: areaIdOrLegacy, icon: '🏠' };
  };

  // ---------------------------------------------------------------------------
  // SHOPPING HANDLERS
  // ---------------------------------------------------------------------------
  const handleAddShopping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    addShoppingItem({
      name: newShopName.trim(),
      category: newShopCategory,
      quantity: newShopQty.trim() || undefined,
      notes: newShopNotes.trim() || undefined,
      urgent: newShopUrgent,
      completed: false,
      addedBy: 'Familia',
    });

    setNewShopName('');
    setNewShopQty('');
    setNewShopNotes('');
    setNewShopUrgent(false);
  };

  const openEditShopModal = (item: ShoppingItem) => {
    setEditingShopItem(item);
    setEditShopName(item.name);
    setEditShopCategory(item.category);
    setEditShopQty(item.quantity || '');
    setEditShopNotes(item.notes || '');
    setEditShopUrgent(item.urgent);
    setSaveError(null);
    setSaveSuccess(false);
    setIsEditShopOpen(true);
  };

  const handleUpdateShopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShopItem || !editShopName.trim()) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      updateShoppingItem(editingShopItem.id, {
        name: editShopName.trim(),
        category: editShopCategory,
        quantity: editShopQty.trim() || undefined,
        notes: editShopNotes.trim() || undefined,
        urgent: editShopUrgent,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditShopOpen(false);
        setEditingShopItem(null);
        setSaveLoading(false);
        setSaveSuccess(false);
      }, 400);
    } catch {
      setSaveLoading(false);
      setSaveError('No pudimos guardar los cambios. Inténtalo nuevamente.');
    }
  };

  // ---------------------------------------------------------------------------
  // CLEANING HANDLERS
  // ---------------------------------------------------------------------------
  const openNewCleanModal = () => {
    setEditingCleanId(null);
    setCleanTitle('');
    setCleanDesc('');
    setCleanAreaId(currentAreas[0]?.id || 'area_kitchen');
    setCleanFreqType('weekly');
    setCleanFreqInterval(15);
    setCleanFreqDays([1, 3, 5]);
    setCleanFreqCustomText('');
    setCleanAssignedId('');
    setCleanPriority('medium');
    setCleanTimeOfDay('morning');
    setCleanNotes('');
    setSaveError(null);
    setSaveSuccess(false);
    setIsCleanModalOpen(true);
  };

  const openEditCleanModal = (clean: CleaningTask) => {
    setEditingCleanId(clean.id);
    setCleanTitle(clean.title);
    setCleanDesc(clean.description || '');
    setCleanAreaId(clean.areaId || (clean.area ? `area_${clean.area}` : currentAreas[0]?.id || 'area_kitchen'));
    
    if (clean.frequencyConfig) {
      setCleanFreqType(clean.frequencyConfig.type);
      setCleanFreqInterval(clean.frequencyConfig.interval || 15);
      setCleanFreqDays(clean.frequencyConfig.daysOfWeek || [1, 3, 5]);
      setCleanFreqCustomText(clean.frequencyConfig.customText || '');
    } else if (clean.frequency === 'daily') {
      setCleanFreqType('daily');
    } else if (clean.frequency === 'monthly') {
      setCleanFreqType('monthly');
    } else {
      setCleanFreqType('weekly');
    }

    setCleanAssignedId(clean.assignedMemberId || '');
    setCleanPriority(clean.priority || 'medium');
    setCleanTimeOfDay(clean.timeOfDay || 'morning');
    setCleanNotes(clean.notes || '');
    setSaveError(null);
    setSaveSuccess(false);
    setIsCleanModalOpen(true);
  };

  const handleSaveClean = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanTitle.trim()) return;

    setSaveLoading(true);
    setSaveError(null);

    const freqConfig: FrequencyConfig = {
      type: cleanFreqType,
      interval: ['every_x_days', 'every_x_weeks', 'every_x_months'].includes(cleanFreqType) ? cleanFreqInterval : undefined,
      daysOfWeek: cleanFreqType === 'specific_days' ? cleanFreqDays : undefined,
      customText: cleanFreqType === 'custom' ? cleanFreqCustomText.trim() : undefined,
      timeOfDay: cleanTimeOfDay,
    };

    const formattedFreq = formatFrequency(undefined, freqConfig);

    try {
      if (editingCleanId) {
        updateCleaningTask(editingCleanId, {
          title: cleanTitle.trim(),
          description: cleanDesc.trim() || undefined,
          areaId: cleanAreaId,
          area: cleanAreaId,
          frequency: formattedFreq,
          frequencyConfig: freqConfig,
          assignedMemberId: cleanAssignedId || undefined,
          priority: cleanPriority,
          timeOfDay: cleanTimeOfDay,
          notes: cleanNotes.trim() || undefined,
        });
      } else {
        addCleaningTask({
          title: cleanTitle.trim(),
          description: cleanDesc.trim() || undefined,
          areaId: cleanAreaId,
          area: cleanAreaId,
          frequency: formattedFreq,
          frequencyConfig: freqConfig,
          assignedMemberId: cleanAssignedId || undefined,
          priority: cleanPriority,
          timeOfDay: cleanTimeOfDay,
          notes: cleanNotes.trim() || undefined,
          completedToday: false,
          isPaused: false,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setIsCleanModalOpen(false);
        setEditingCleanId(null);
        setSaveLoading(false);
        setSaveSuccess(false);
      }, 400);
    } catch {
      setSaveLoading(false);
      setSaveError('No pudimos guardar los cambios. Inténtalo nuevamente.');
    }
  };

  const handleDeleteClean = (clean: CleaningTask) => {
    if (window.confirm(`¿Estás seguro/a de eliminar la rutina "${clean.title}"?`)) {
      deleteCleaningTask(clean.id);
    }
  };

  // ---------------------------------------------------------------------------
  // MAINTENANCE HANDLERS
  // ---------------------------------------------------------------------------
  const openNewMaintModal = () => {
    setEditingMaintId(null);
    setMaintTitle('');
    setMaintDesc('');
    setMaintCategory('appliances');
    setMaintPriority('medium');
    setMaintAssignedId('');
    setMaintDueDate('');
    setMaintNextDate('');
    setMaintFreqText('');
    setMaintNotes('');
    setSaveError(null);
    setSaveSuccess(false);
    setIsMaintModalOpen(true);
  };

  const openEditMaintModal = (task: MaintenanceTask) => {
    setEditingMaintId(task.id);
    setMaintTitle(task.title);
    setMaintDesc(task.description || '');
    setMaintCategory(task.category || 'appliances');
    setMaintPriority(task.priority);
    setMaintAssignedId(task.assignedMemberId || '');
    setMaintDueDate(task.dueDate || '');
    setMaintNextDate(task.nextDate || '');
    setMaintFreqText(task.frequency || '');
    setMaintNotes(task.notes || '');
    setSaveError(null);
    setSaveSuccess(false);
    setIsMaintModalOpen(true);
  };

  const handleSaveMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintTitle.trim()) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      if (editingMaintId) {
        updateMaintenanceTask(editingMaintId, {
          title: maintTitle.trim(),
          description: maintDesc.trim() || undefined,
          category: maintCategory,
          priority: maintPriority,
          assignedMemberId: maintAssignedId || undefined,
          dueDate: maintDueDate || undefined,
          nextDate: maintNextDate || undefined,
          frequency: maintFreqText.trim() || undefined,
          notes: maintNotes.trim() || undefined,
        });
      } else {
        addMaintenanceTask({
          title: maintTitle.trim(),
          description: maintDesc.trim() || undefined,
          category: maintCategory,
          priority: maintPriority,
          assignedMemberId: maintAssignedId || undefined,
          dueDate: maintDueDate || undefined,
          nextDate: maintNextDate || undefined,
          frequency: maintFreqText.trim() || undefined,
          notes: maintNotes.trim() || undefined,
          completed: false,
          isPaused: false,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setIsMaintModalOpen(false);
        setEditingMaintId(null);
        setSaveLoading(false);
        setSaveSuccess(false);
      }, 400);
    } catch {
      setSaveLoading(false);
      setSaveError('No pudimos guardar los cambios. Inténtalo nuevamente.');
    }
  };

  const handleDeleteMaint = (task: MaintenanceTask) => {
    if (window.confirm(`¿Estás seguro/a de eliminar el mantenimiento "${task.title}"?`)) {
      deleteMaintenanceTask(task.id);
    }
  };

  // ---------------------------------------------------------------------------
  // AREAS MANAGER HANDLERS
  // ---------------------------------------------------------------------------
  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    addHomeArea({
      name: newAreaName.trim(),
      icon: newAreaIcon || '🏠',
      isSystem: false,
    });
    setNewAreaName('');
    setNewAreaIcon('🏠');
  };

  const handleUpdateArea = (id: string) => {
    if (!editAreaName.trim()) return;
    updateHomeArea(id, {
      name: editAreaName.trim(),
      icon: editAreaIcon || '🏠',
    });
    setEditingAreaId(null);
    setEditAreaName('');
    setEditAreaIcon('');
  };

  const handleDeleteArea = (area: HomeArea) => {
    if (area.isSystem) {
      alert('Las áreas principales del sistema no pueden eliminarse.');
      return;
    }
    if (window.confirm(`¿Eliminar el área "${area.name}"? Las rutinas asociadas se reasignarán a General automáticamente.`)) {
      deleteHomeArea(area.id);
    }
  };

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------
  const pendingShopping = shoppingItems.filter((s) => !s.completed);
  const completedShopping = shoppingItems.filter((s) => s.completed);

  const activeCleaning = cleaningTasks.filter((c) => !c.isPaused);
  const pausedCleaning = cleaningTasks.filter((c) => c.isPaused);
  const filteredCleaning = (selectedAreaFilter === 'all'
    ? cleaningTasks
    : cleaningTasks.filter(
        (c) => c.areaId === selectedAreaFilter || c.area === selectedAreaFilter || `area_${c.area}` === selectedAreaFilter
      )
  );
  const activeMaintenance = maintenanceTasks.filter((m) => !m.isPaused && !m.completed);

  const categoryNames: Record<ShoppingCategory, { label: string; icon: string }> = {
    produce: { label: 'Frutas y Verduras', icon: '🍎' },
    dairy: { label: 'Lácteos y Frío', icon: '🥛' },
    pantry: { label: 'Despensa y Abarrotes', icon: '🌾' },
    baby: { label: 'Bebé y Niños', icon: '👶' },
    cleaning: { label: 'Limpieza del Hogar', icon: '🧼' },
    meat: { label: 'Carnes y Proteínas', icon: '🥩' },
    bakery: { label: 'Panadería y Masas', icon: '🥖' },
    drinks: { label: 'Bebidas y Líquidos', icon: '🧃' },
    pharmacy: { label: 'Botiquín y Farmacia', icon: '💊' },
    other: { label: 'Otros', icon: '📦' },
  };

  const maintCategoryNames: Record<string, { label: string; icon: string }> = {
    appliances: { label: 'Electrodomésticos', icon: '🔌' },
    plumbing: { label: 'Gasfitería / Plomería', icon: '🔧' },
    electrical: { label: 'Electricidad', icon: '⚡' },
    vehicle: { label: 'Vehículo / Auto', icon: '🚗' },
    structure: { label: 'Estructura / Paredes', icon: '🧱' },
    garden: { label: 'Jardín / Exterior', icon: '🌳' },
    general: { label: 'General', icon: '📦' },
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
            Gestión completa de compras familiares, rutinas de limpieza y mantención del hogar
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
            <span>Compras ({pendingShopping.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('cleaning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'cleaning' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Limpieza ({activeCleaning.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'maintenance' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-sky-500" />
            <span>Mantención ({activeMaintenance.length})</span>
          </button>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 1. SHOPPING LIST TAB                                                   */}
      {/* ====================================================================== */}
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
                placeholder="Cant. (ej. 2 kg, 1 caja)"
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
                <option value="meat">🥩 Carnes y Proteínas</option>
                <option value="bakery">🥖 Panadería</option>
                <option value="drinks">🧃 Bebidas</option>
                <option value="pharmacy">💊 Farmacia</option>
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs text-stone-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newShopUrgent}
                  onChange={(e) => setNewShopUrgent(e.target.checked)}
                  className="rounded-md text-amber-500 border-stone-300"
                />
                <span>Marcar como compra urgente para hoy</span>
              </label>

              <input
                type="text"
                placeholder="Notas adicionales (opcional, ej. marca favorita)"
                value={newShopNotes}
                onChange={(e) => setNewShopNotes(e.target.value)}
                className="w-full sm:w-72 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
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
                        <button type="button" className="text-stone-300 hover:text-amber-500" title="Marcar comprado">
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
                          {item.notes && (
                            <p className="text-[10px] text-stone-500 mt-0.5 truncate italic">
                              "{item.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditShopModal(item)}
                          className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar producto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteShoppingItem(item.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar de lista"
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

          {/* Completed items with Edit and Delete options */}
          {completedShopping.length > 0 && (
            <div className="pt-4 border-t border-stone-200/60">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                Comprados recientemente ({completedShopping.length})
              </h3>
              <div className="space-y-1.5">
                {completedShopping.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/60 border border-stone-100 opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleShoppingItem(item.id)}
                      title="Clic para reabrir"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-stone-500 line-through truncate block">{item.name}</span>
                        {item.quantity && <span className="text-[10px] text-stone-400">{item.quantity}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditShopModal(item)}
                        className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                        title="Editar producto comprado"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteShoppingItem(item.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* 2. CLEANING TAB                                                        */}
      {/* ====================================================================== */}
      {activeTab === 'cleaning' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedAreaFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedAreaFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Todas las Áreas ({cleaningTasks.length})
              </button>
              {currentAreas.map((area) => {
                const count = cleaningTasks.filter(
                  (c) => c.areaId === area.id || c.area === area.id || `area_${c.area}` === area.id
                ).length;
                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedAreaFilter(area.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      selectedAreaFilter === area.id
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <span>{area.icon || '🏠'}</span>
                    <span>{area.name}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Actions for co-admins */}
            {isAdultView && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAreasModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  title="Personalizar áreas de la casa"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Gestionar Áreas</span>
                </button>
                <button
                  type="button"
                  onClick={openNewCleanModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nueva Rutina</span>
                </button>
              </div>
            )}
          </div>

          {filteredCleaning.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-stone-200/80 text-center">
              <span className="text-3xl block mb-2">✨</span>
              <p className="text-xs font-bold text-stone-700">Sin rutinas registradas en esta área</p>
              <p className="text-xs text-stone-400 mt-0.5">Agrega una tarea personalizada para mantener este espacio impecable.</p>
              {isAdultView && (
                <button
                  onClick={openNewCleanModal}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Rutina</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCleaning.map((clean) => {
                const assigned = clean.assignedMemberId ? getMember(clean.assignedMemberId) : undefined;
                const areaMeta = getAreaMeta(clean.areaId || clean.area);

                return (
                  <div
                    key={clean.id}
                    className={`p-4 rounded-3xl border transition-all select-none flex items-center justify-between gap-3 ${
                      clean.isPaused
                        ? 'bg-stone-50 border-stone-200 opacity-60'
                        : clean.completedToday
                        ? 'bg-emerald-50/70 border-emerald-200/80 shadow-xs'
                        : 'bg-white border-stone-200/80 hover:border-emerald-200'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => !clean.isPaused && toggleCleaningTask(clean.id)}
                    >
                      <div
                        className={`w-6 h-6 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                          clean.isPaused
                            ? 'bg-stone-200 text-stone-400'
                            : clean.completedToday
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-stone-300 hover:border-emerald-400'
                        }`}
                        title={clean.isPaused ? 'Rutina en pausa' : clean.completedToday ? 'Completado hoy' : 'Marcar completado hoy'}
                      >
                        {clean.completedToday && <Check className="w-4 h-4" />}
                        {clean.isPaused && <Pause className="w-3 h-3" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className={`text-xs font-bold leading-snug truncate ${
                              clean.isPaused
                                ? 'text-stone-400'
                                : clean.completedToday
                                ? 'line-through text-emerald-900'
                                : 'text-stone-800'
                            }`}
                          >
                            {clean.title}
                          </h4>
                          {clean.isPaused && (
                            <span className="text-[10px] bg-stone-200 text-stone-600 font-bold px-1.5 py-0.2 rounded-md">
                              Pausada
                            </span>
                          )}
                        </div>

                        {clean.description && (
                          <p className="text-[11px] text-stone-500 mt-0.5 truncate">{clean.description}</p>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-1 flex-wrap">
                          <span className="bg-stone-100 px-2 py-0.5 rounded-md font-medium text-stone-600 flex items-center gap-1">
                            <span>{areaMeta.icon}</span>
                            <span>{areaMeta.name}</span>
                          </span>
                          <span>Frecuencia: {clean.frequency}</span>
                          {assigned ? (
                            <span className="text-stone-600 font-medium">• {assigned.name}</span>
                          ) : (
                            <span>• Toda la familia</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        onClick={() => !clean.isPaused && toggleCleaningTask(clean.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                          clean.isPaused
                            ? 'bg-stone-200 text-stone-600'
                            : clean.completedToday
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {clean.isPaused ? 'Pausada' : clean.completedToday ? 'Listo Hoy' : 'Pendiente'}
                      </span>

                      {isAdultView && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePauseCleaningTask(clean.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              clean.isPaused
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                            }`}
                            title={clean.isPaused ? 'Reactivar rutina' : 'Pausar rutina temporalmente'}
                          >
                            {clean.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCleanModal(clean);
                            }}
                            className="p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar rutina"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClean(clean);
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar rutina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pausedCleaning.length > 0 && selectedAreaFilter === 'all' && (
            <div className="pt-2 text-xs text-stone-400 flex items-center gap-1.5">
              <Pause className="w-3.5 h-3.5" />
              <span>Hay {pausedCleaning.length} rutina(s) en pausa. Puedes reactivarlas en cualquier momento con el botón reproducir.</span>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* 3. MAINTENANCE TAB                                                     */}
      {/* ====================================================================== */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Reparaciones y Mantenimiento ({maintenanceTasks.length})
            </h3>
            {isAdultView && (
              <button
                type="button"
                onClick={openNewMaintModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nueva Tarea</span>
              </button>
            )}
          </div>

          {maintenanceTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-stone-200/80 text-center">
              <span className="text-3xl block mb-2">🛠️</span>
              <p className="text-xs font-bold text-stone-700">Sin tareas de mantenimiento</p>
              <p className="text-xs text-stone-400 mt-0.5">Registra revisiones periódicas de calefont, filtros, vehículo o arreglos del hogar.</p>
              {isAdultView && (
                <button
                  onClick={openNewMaintModal}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Mantenimiento</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {maintenanceTasks.map((task) => {
                const assigned = task.assignedMemberId ? getMember(task.assignedMemberId) : undefined;
                const catInfo = maintCategoryNames[task.category || 'appliances'] || { label: 'General', icon: '📦' };

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-3xl border transition-all flex items-start justify-between gap-3 ${
                      task.isPaused
                        ? 'bg-stone-50 border-stone-200 opacity-60'
                        : task.completed
                        ? 'bg-stone-50/60 border-stone-200/50 opacity-60'
                        : 'bg-white border-stone-200/80 shadow-xs hover:border-sky-300'
                    }`}
                  >
                    <div
                      className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => !task.isPaused && toggleMaintenanceTask(task.id)}
                    >
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                          task.isPaused
                            ? 'bg-stone-200 text-stone-400'
                            : task.completed
                            ? 'bg-emerald-500 text-white'
                            : 'border border-stone-300 hover:border-sky-400'
                        }`}
                        title={task.isPaused ? 'Mantenimiento en pausa' : task.completed ? 'Completado' : 'Marcar completado'}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5" />}
                        {task.isPaused && <Pause className="w-2.5 h-2.5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-xs font-bold ${
                              task.isPaused
                                ? 'text-stone-400'
                                : task.completed
                                ? 'line-through text-stone-500'
                                : 'text-stone-900'
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.isPaused && (
                            <span className="text-[10px] bg-stone-200 text-stone-600 font-bold px-1.5 py-0.2 rounded-md">
                              Pausada
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-stone-500 mt-0.5">{task.description}</p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px]">
                          <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                            {catInfo.icon} {catInfo.label}
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md ${
                              task.priority === 'high'
                                ? 'bg-rose-100 text-rose-800'
                                : task.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Prioridad {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                          {task.frequency && (
                            <span className="text-stone-400 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md">
                              🔄 {task.frequency}
                            </span>
                          )}
                          {task.nextDate && (
                            <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3" />
                              Próxima fecha: {task.nextDate}
                            </span>
                          )}
                          {assigned && (
                            <span className="text-stone-500 font-medium">
                              • Resp: {assigned.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        onClick={() => !task.isPaused && toggleMaintenanceTask(task.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                          task.isPaused
                            ? 'bg-stone-200 text-stone-600'
                            : task.completed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {task.isPaused ? 'Pausada' : task.completed ? 'Completado' : 'Pendiente'}
                      </span>

                      {isAdultView && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePauseMaintenanceTask(task.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              task.isPaused
                                ? 'text-sky-600 hover:bg-sky-50'
                                : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                            }`}
                            title={task.isPaused ? 'Reactivar tarea' : 'Pausar tarea temporalmente'}
                          >
                            {task.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditMaintModal(task);
                            }}
                            className="p-1.5 text-stone-400 hover:text-sky-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar tarea"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMaint(task);
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL: EDIT SHOPPING ITEM                                              */}
      {/* ====================================================================== */}
      <Modal
        isOpen={isEditShopOpen}
        onClose={() => {
          setIsEditShopOpen(false);
          setEditingShopItem(null);
        }}
        title="Editar Producto de Compras"
        subtitle="Actualiza los detalles o cantidad requerida"
      >
        <form onSubmit={handleUpdateShopping} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre del producto
            </label>
            <input
              type="text"
              required
              autoFocus
              value={editShopName}
              onChange={(e) => setEditShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cantidad / Unidad
              </label>
              <input
                type="text"
                placeholder="Ej. 2 kg, 1 caja"
                value={editShopQty}
                onChange={(e) => setEditShopQty(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Categoría
              </label>
              <select
                value={editShopCategory}
                onChange={(e) => setEditShopCategory(e.target.value as ShoppingCategory)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="produce">🍎 Frutas y Verduras</option>
                <option value="dairy">🥛 Lácteos y Frío</option>
                <option value="pantry">🌾 Despensa</option>
                <option value="baby">👶 Bebé y Niños</option>
                <option value="cleaning">🧼 Limpieza</option>
                <option value="meat">🥩 Carnes y Proteínas</option>
                <option value="bakery">🥖 Panadería</option>
                <option value="drinks">🧃 Bebidas</option>
                <option value="pharmacy">💊 Farmacia</option>
                <option value="other">📦 Otros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Notas adicionales (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Comprar en supermercado X, marca sin sal"
              value={editShopNotes}
              onChange={(e) => setEditShopNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-stone-600 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editShopUrgent}
              onChange={(e) => setEditShopUrgent(e.target.checked)}
              className="rounded-md text-amber-500 border-stone-300"
            />
            <span>Marcar como compra urgente para hoy</span>
          </label>

          {saveError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsEditShopOpen(false);
                setEditingShopItem(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saveLoading ? 'Guardando...' : saveSuccess ? '¡Cambios guardados!' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================== */}
      {/* MODAL: CLEANING TASK (CREATE / EDIT)                                   */}
      {/* ====================================================================== */}
      <Modal
        isOpen={isCleanModalOpen}
        onClose={() => {
          setIsCleanModalOpen(false);
          setEditingCleanId(null);
        }}
        title={editingCleanId ? 'Editar Rutina de Limpieza' : 'Nueva Rutina de Limpieza'}
        subtitle={editingCleanId ? 'Modifica los detalles de esta tarea del hogar' : 'Define una rutina recurrente para mantener el orden'}
      >
        <form onSubmit={handleSaveClean} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre de la Tarea / Rutina
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Limpiar refrigerador, Aspirar sala, Lavar cortinas..."
              value={cleanTitle}
              onChange={(e) => setCleanTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Descripción o pasos a seguir (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Sacar repisas, desinfectar con vinagre y secar bien"
              value={cleanDesc}
              onChange={(e) => setCleanDesc(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Área de la Casa
                </label>
                <button
                  type="button"
                  onClick={() => setIsAreasModalOpen(true)}
                  className="text-[10px] text-emerald-600 hover:underline font-bold"
                >
                  + Nueva Área
                </button>
              </div>
              <select
                value={cleanAreaId}
                onChange={(e) => setCleanAreaId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {currentAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.icon || '🏠'} {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Frecuencia
              </label>
              <select
                value={cleanFreqType}
                onChange={(e) => setCleanFreqType(e.target.value as FrequencyType)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="every_x_days">Cada X días (ej. cada 15 días)</option>
                <option value="every_x_weeks">Cada X semanas</option>
                <option value="every_x_months">Cada X meses (ej. cada 3 o 6 meses)</option>
                <option value="specific_days">Días específicos de la semana</option>
                <option value="once">Una sola vez</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>

          {/* Dynamic frequency controls */}
          {['every_x_days', 'every_x_weeks', 'every_x_months'].includes(cleanFreqType) && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3">
              <span className="text-xs text-emerald-900 font-semibold">Repetir cada:</span>
              <input
                type="number"
                min={1}
                max={365}
                value={cleanFreqInterval}
                onChange={(e) => setCleanFreqInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs text-center font-bold"
              />
              <span className="text-xs text-emerald-900 font-medium">
                {cleanFreqType === 'every_x_days' ? 'días' : cleanFreqType === 'every_x_weeks' ? 'semanas' : 'meses'}
              </span>
            </div>
          )}

          {cleanFreqType === 'specific_days' && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3">
              <label className="block text-xs font-semibold text-stone-700 mb-2">Selecciona los días:</label>
              <div className="flex gap-1.5">
                {[
                  { d: 1, label: 'L' },
                  { d: 2, label: 'M' },
                  { d: 3, label: 'M' },
                  { d: 4, label: 'J' },
                  { d: 5, label: 'V' },
                  { d: 6, label: 'S' },
                  { d: 0, label: 'D' },
                ].map(({ d, label }) => {
                  const active = cleanFreqDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setCleanFreqDays((prev) =>
                          active ? prev.filter((x) => x !== d) : [...prev, d].sort()
                        );
                      }}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        active ? 'bg-emerald-600 text-white' : 'bg-white border border-stone-200 text-stone-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {cleanFreqType === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Texto de frecuencia personalizada
              </label>
              <input
                type="text"
                placeholder="Ej. Fin de semana por medio, fines de mes..."
                value={cleanFreqCustomText}
                onChange={(e) => setCleanFreqCustomText(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Responsable
              </label>
              <select
                value={cleanAssignedId}
                onChange={(e) => setCleanAssignedId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="">Toda la familia (sin asignar)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === 'adult' ? 'Adulto' : 'Hijo/a'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Horario preferido
              </label>
              <select
                value={cleanTimeOfDay}
                onChange={(e) => setCleanTimeOfDay(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="morning">🌅 En la Mañana</option>
                <option value="afternoon">☀️ En la Tarde</option>
                <option value="evening">🌙 En la Noche</option>
                <option value="flexible">Cualquier momento</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Notas o recordatorios adicionales (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Usar guantes de goma, abrir ventanas para ventilar"
              value={cleanNotes}
              onChange={(e) => setCleanNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          {saveError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsCleanModalOpen(false);
                setEditingCleanId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saveLoading ? 'Guardando...' : saveSuccess ? '¡Cambios guardados!' : editingCleanId ? 'Guardar Cambios' : 'Guardar Rutina'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================== */}
      {/* MODAL: MAINTENANCE TASK (CREATE / EDIT)                                */}
      {/* ====================================================================== */}
      <Modal
        isOpen={isMaintModalOpen}
        onClose={() => {
          setIsMaintModalOpen(false);
          setEditingMaintId(null);
        }}
        title={editingMaintId ? 'Editar Tarea de Mantenimiento' : 'Nueva Tarea de Mantenimiento'}
        subtitle={editingMaintId ? 'Modifica los detalles de la mantención o reparación' : 'Registra un arreglo preventivo o correctivo del hogar'}
      >
        <form onSubmit={handleSaveMaint} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Título de la Tarea / Arreglo
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Revisar calefont, Cambiar filtro purificador, Mantención del auto..."
              value={maintTitle}
              onChange={(e) => setMaintTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Categoría
              </label>
              <select
                value={maintCategory}
                onChange={(e) => setMaintCategory(e.target.value as MaintenanceCategory)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="appliances">🔌 Electrodomésticos</option>
                <option value="plumbing">🔧 Gasfitería / Plomería</option>
                <option value="electrical">⚡ Electricidad</option>
                <option value="vehicle">🚗 Vehículo / Auto</option>
                <option value="structure">🧱 Estructura / Paredes</option>
                <option value="garden">🌳 Jardín / Exterior</option>
                <option value="general">📦 General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Prioridad
              </label>
              <select
                value={maintPriority}
                onChange={(e) => setMaintPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="high">🔴 Alta (Urgente)</option>
                <option value="medium">🟡 Media (Pronto)</option>
                <option value="low">🟢 Baja (Preventivo)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Responsable
              </label>
              <select
                value={maintAssignedId}
                onChange={(e) => setMaintAssignedId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="">Sin asignar (familiar responsable)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === 'adult' ? 'Adulto' : 'Hijo/a'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Frecuencia / Recurrencia
              </label>
              <input
                type="text"
                placeholder="Ej. Cada 6 meses, Anual, Cada 3 meses..."
                value={maintFreqText}
                onChange={(e) => setMaintFreqText(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fecha objetivo / límite
              </label>
              <input
                type="date"
                value={maintDueDate}
                onChange={(e) => setMaintDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Próxima revisión prevista
              </label>
              <input
                type="date"
                value={maintNextDate}
                onChange={(e) => setMaintNextDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Detalles o notas del arreglo
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Técnico contacto: Don Carlos +569..., repuesto código ABC..."
              value={maintDesc}
              onChange={(e) => setMaintDesc(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          {saveError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsMaintModalOpen(false);
                setEditingMaintId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saveLoading ? 'Guardando...' : saveSuccess ? '¡Cambios guardados!' : editingMaintId ? 'Guardar Cambios' : 'Guardar Tarea'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================== */}
      {/* MODAL: AREAS MANAGER (ÁREAS PERSONALIZABLES)                           */}
      {/* ====================================================================== */}
      <Modal
        isOpen={isAreasModalOpen}
        onClose={() => {
          setIsAreasModalOpen(false);
          setEditingAreaId(null);
        }}
        title="Gestionar Áreas de la Casa"
        subtitle="Agrega, renombra o elimina espacios del hogar para organizar tus rutinas"
      >
        <div className="space-y-4">
          {/* Quick add new area form */}
          <form onSubmit={handleAddArea} className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 flex items-center gap-2">
            <input
              type="text"
              placeholder="Emoji (ej. ☀️, 🚗)"
              value={newAreaIcon}
              onChange={(e) => setNewAreaIcon(e.target.value)}
              className="w-16 px-2 py-2 bg-white border border-stone-200 rounded-xl text-center text-sm"
              title="Emoji del área"
            />
            <input
              type="text"
              required
              placeholder="Nombre del área (ej. Terraza, Garaje, Bodega...)"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </form>

          {/* List of areas */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {currentAreas.map((area) => {
              const isEditing = editingAreaId === area.id;

              if (isEditing) {
                return (
                  <div key={area.id} className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                    <input
                      type="text"
                      value={editAreaIcon}
                      onChange={(e) => setEditAreaIcon(e.target.value)}
                      className="w-12 px-1.5 py-1 bg-white border border-emerald-300 rounded-lg text-center text-xs"
                    />
                    <input
                      type="text"
                      value={editAreaName}
                      onChange={(e) => setEditAreaName(e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateArea(area.id)}
                      className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAreaId(null)}
                      className="px-2 py-1 text-stone-500 text-xs hover:bg-stone-200/60 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={area.id}
                  className="p-2.5 bg-white border border-stone-200/70 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{area.icon || '🏠'}</span>
                    <span className="text-xs font-bold text-stone-800 truncate">{area.name}</span>
                    {area.isSystem && (
                      <span className="text-[9px] bg-stone-100 text-stone-500 font-medium px-1.5 py-0.2 rounded-md">
                        Sistema
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAreaId(area.id);
                        setEditAreaName(area.name);
                        setEditAreaIcon(area.icon || '🏠');
                      }}
                      className="p-1 text-stone-400 hover:text-emerald-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      title="Renombrar área"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!area.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteArea(area)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar área"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 flex justify-end border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsAreasModalOpen(false);
                setEditingAreaId(null);
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
