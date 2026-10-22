import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { Reward, RewardCategory } from '../types/rewards';
import { triggerConfetti } from '../components/common/ConfettiCelebration';
import { formatFriendlyDate } from '../services/dateUtils';
import {
  Plus,
  Trophy,
  History,
  IceCream,
  Film,
  Smile,
  Gift,
  CheckCircle,
  Edit2,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';

export const RewardsView: React.FC = () => {
  const {
    rewards,
    addReward,
    updateReward,
    deleteReward,
    redeemReward,
    pointsHistory,
    adjustMemberPoints,
    members,
    config,
    isAdultView,
  } = useFamily();

  const childrenMembers = members.filter((m) => m.role === 'child' && m.relationship !== 'bebe');
  const [selectedChildId, setSelectedChildId] = useState<string>(
    childrenMembers[0]?.id || 'annie'
  );

  // New / Edit reward modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCost, setNewCost] = useState<number>(15);
  const [newCategory, setNewCategory] = useState<RewardCategory>('activity');

  // Points adjustment modal state (Adults only)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustChildId, setAdjustChildId] = useState<string>(childrenMembers[0]?.id || 'annie');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Success message state
  const [redemptionSuccess, setRedemptionSuccess] = useState<string | null>(null);

  const activeChild = members.find((m) => m.id === selectedChildId);

  const handleRedeem = (reward: Reward) => {
    if (!activeChild) return;
    if (activeChild.points < reward.pointsCost) {
      alert(`¡A ${activeChild.name} le faltan ${reward.pointsCost - activeChild.points} puntos para este premio!`);
      return;
    }

    const success = redeemReward(reward.id, activeChild.id);
    if (success) {
      triggerConfetti();
      setRedemptionSuccess(`¡Felicidades! ${activeChild.name} ha canjeado: ${reward.title} 🎉`);
      setTimeout(() => setRedemptionSuccess(null), 5000);
    }
  };

  const openNewRewardModal = () => {
    setEditingRewardId(null);
    setNewTitle('');
    setNewDesc('');
    setNewCost(15);
    setNewCategory('activity');
    setIsModalOpen(true);
  };

  const openEditRewardModal = (reward: Reward) => {
    setEditingRewardId(reward.id);
    setNewTitle(reward.title);
    setNewDesc(reward.description || '');
    setNewCost(reward.pointsCost);
    setNewCategory(reward.category);
    setIsModalOpen(true);
  };

  const handleDeleteReward = (reward: Reward) => {
    if (window.confirm(`¿Estás seguro de eliminar la recompensa "${reward.title}"?`)) {
      deleteReward(reward.id);
    }
  };

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingRewardId) {
      updateReward(editingRewardId, {
        title: newTitle.trim(),
        description: newDesc.trim() || 'Recompensa familiar por esfuerzo y responsabilidad',
        pointsCost: Number(newCost) || 10,
        category: newCategory,
      });
    } else {
      addReward({
        title: newTitle.trim(),
        description: newDesc.trim() || 'Recompensa familiar por esfuerzo y responsabilidad',
        pointsCost: Number(newCost) || 10,
        icon: 'Gift',
        category: newCategory,
      });
    }

    setNewTitle('');
    setNewDesc('');
    setEditingRewardId(null);
    setIsModalOpen(false);
  };

  const targetAdjustChild = members.find((m) => m.id === adjustChildId);
  const currentChildPoints = targetAdjustChild?.points || 0;
  const projectedChildPoints =
    adjustType === 'add'
      ? currentChildPoints + (Number(adjustAmount) || 0)
      : Math.max(0, currentChildPoints - (Number(adjustAmount) || 0));

  const handleOpenAdjustModal = (childId?: string) => {
    if (childId) {
      setAdjustChildId(childId);
    } else {
      setAdjustChildId(selectedChildId || childrenMembers[0]?.id || 'annie');
    }
    setAdjustType('add');
    setAdjustAmount(5);
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleSavePointsAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAdjustChild || !adjustAmount || adjustAmount <= 0) return;

    const delta = adjustType === 'add' ? Number(adjustAmount) : -Number(adjustAmount);
    const reasonText =
      adjustReason.trim() ||
      (adjustType === 'add'
        ? 'Reconocimiento / Puntos adicionales'
        : 'Corrección / Ajuste manual de puntos');

    adjustMemberPoints(targetAdjustChild.id, delta, reasonText);
    setRedemptionSuccess(
      `Puntos actualizados para ${targetAdjustChild.name}: ${delta > 0 ? `+${delta}` : delta} pts (Nuevo saldo: ${Math.max(0, targetAdjustChild.points + delta)} pts)`
    );
    setTimeout(() => setRedemptionSuccess(null), 4500);
    setIsAdjustModalOpen(false);
  };

  const getRewardIcon = (cat: RewardCategory) => {
    if (cat === 'dessert') return <IceCream className="w-6 h-6 text-rose-500" />;
    if (cat === 'movie') return <Film className="w-6 h-6 text-purple-500" />;
    if (cat === 'activity') return <Smile className="w-6 h-6 text-amber-500" />;
    if (cat === 'special') return <Trophy className="w-6 h-6 text-emerald-500" />;
    return <Gift className="w-6 h-6 text-sky-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">
              {config.modules.rewards.displayName}
            </h2>
            <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              Alcancía Familiar
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Canjea premios y reconocimientos por hábitos completados en familia
          </p>
        </div>

        {isAdultView && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAdjustModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer hover:border-amber-300"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>Ajustar Puntos</span>
            </button>
            <button
              onClick={openNewRewardModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Recompensa</span>
            </button>
          </div>
        )}
      </div>

      {/* Success alert */}
      {redemptionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center gap-3 text-emerald-900 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{redemptionSuccess}</span>
        </div>
      )}

      {/* Child selector with current points balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {childrenMembers.map((child) => (
          <div
            key={child.id}
            onClick={() => setSelectedChildId(child.id)}
            className={`p-4 rounded-3xl border transition-all cursor-pointer select-none flex items-center justify-between ${
              selectedChildId === child.id
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                : 'bg-white border-stone-200/80 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={child.name}
                emoji={child.avatarEmoji}
                color={child.avatarColor}
                size="md"
              />
              <div>
                <span className="text-xs font-bold text-stone-900 block">{child.name}</span>
                <span className="text-[10px] text-stone-500">
                  {selectedChildId === child.id ? 'Seleccionado para canjear' : 'Toca para elegir'}
                </span>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className="text-lg font-black text-amber-600 block leading-tight">
                {child.points}
              </span>
              <span className="text-[10px] font-bold text-stone-400 uppercase">puntos</span>
              {isAdultView && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAdjustModal(child.id);
                  }}
                  className="mt-1 text-[10px] text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Ajustar o corregir puntos"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  <span>Ajustar</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rewards Catalog */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-amber-500" /> Catálogo de Premios
          </h3>
          <span className="text-xs text-stone-400 font-medium">
            Canjeando para: <strong className="text-stone-800">{activeChild?.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rewards.map((reward) => {
            const canAfford = activeChild ? activeChild.points >= reward.pointsCost : false;

            return (
              <div
                key={reward.id}
                className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                      {getRewardIcon(reward.category)}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/70 text-amber-900 font-black text-xs">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>{reward.pointsCost} pts</span>
                      </div>
                      {isAdultView && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditRewardModal(reward)}
                            className="p-1 text-stone-400 hover:text-amber-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar recompensa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReward(reward)}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar recompensa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-stone-900 mb-1 leading-snug">
                    {reward.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {reward.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:scale-102 active:scale-98'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? '¡Canjear Premio!' : `Faltan ${reward.pointsCost - (activeChild?.points || 0)} pts`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points History */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-stone-100 text-stone-600 rounded-xl">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-800">Historial de Puntos</h3>
            <p className="text-xs text-stone-400">Transparencia en misiones y premios</p>
          </div>
        </div>

        {pointsHistory.length === 0 ? (
          <p className="text-xs text-stone-400 bg-stone-50 p-4 rounded-2xl text-center">
            Aún no hay movimientos en la alcancía
          </p>
        ) : (
          <div className="space-y-2">
            {pointsHistory.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-black text-sm px-2 py-0.5 rounded-lg ${
                      entry.points > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {entry.points > 0 ? `+${entry.points}` : entry.points}
                  </span>
                  <div>
                    <span className="font-bold text-stone-900 block">{entry.childName}</span>
                    <span className="text-stone-500 text-[11px]">{entry.description}</span>
                  </div>
                </div>

                <span className="text-[10px] text-stone-400 font-medium">
                  {formatFriendlyDate(entry.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New / Edit Reward Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRewardId(null);
        }}
        title={editingRewardId ? 'Editar Recompensa' : 'Crear Nueva Recompensa'}
        subtitle={editingRewardId ? 'Modifica los detalles de este premio familiar' : 'Define un premio motivador para los niños'}
      >
        <form onSubmit={handleSaveReward} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre de la Recompensa
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Elegir postre, Tarde en la plaza, Ver película..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Puntos Necesarios
              </label>
              <input
                type="number"
                min={5}
                value={newCost}
                onChange={(e) => setNewCost(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as RewardCategory)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="dessert">🍨 Postre / Comida</option>
                <option value="movie">🎬 Cine / Película</option>
                <option value="activity">🚲 Paseo / Actividad</option>
                <option value="special">🎪 Actividad Especial</option>
                <option value="custom">⭐ Premio Personalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción</label>
            <textarea
              rows={2}
              placeholder="Ej: Elegir qué cenamos el sábado..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingRewardId(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingRewardId ? 'Guardar Cambios' : 'Guardar Recompensa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Points Adjustment Modal (Adult co-administration) */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Ajustar / Corregir Puntos"
        subtitle="Administra la alcancía familiar de los niños de forma transparente"
      >
        <form onSubmit={handleSavePointsAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Seleccionar Niño
            </label>
            <select
              value={adjustChildId}
              onChange={(e) => setAdjustChildId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            >
              {childrenMembers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Saldo actual: {c.points} pts)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tipo de Acción
              </label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as 'add' | 'subtract')}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
              >
                <option value="add">➕ Sumar Puntos (Premio / Bono)</option>
                <option value="subtract">➖ Restar Puntos (Corrección / Descuento)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cantidad de Puntos
              </label>
              <input
                type="number"
                min={1}
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          {/* Live balance preview */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-stone-600 font-medium">
              Saldo para <strong>{targetAdjustChild?.name}</strong>:
            </span>
            <div className="flex items-center gap-2 font-black">
              <span className="text-stone-500">{currentChildPoints} pts</span>
              <span>→</span>
              <span className={adjustType === 'add' ? 'text-emerald-700' : 'text-amber-700'}>
                {projectedChildPoints} pts
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Motivo o Justificación del Ajuste
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Bono por colaborar sin que se lo pidieran, Corrección de registro duplicado..."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Este movimiento quedará registrado en el historial de puntos con la fecha de hoy.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Aplicar Ajuste de Puntos
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
