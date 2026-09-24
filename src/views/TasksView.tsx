import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Task, TaskPriority, TaskStatus } from '../types/tasks';
import { formatFriendlyDate, getTodayString } from '../services/dateUtils';
import {
  CheckSquare,
  Plus,
  Search,
  Circle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Calendar,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    members,
    config,
    getCategoryName,
    getMember,
  } = useFamily();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Modal for new/edit task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState('both');
  const [categoryKey, setCategoryKey] = useState('family');
  const [date, setDate] = useState(getTodayString());
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [relatedMemberId, setRelatedMemberId] = useState('');

  const openNewTaskModal = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setResponsibleId('both');
    setCategoryKey('family');
    setDate(getTodayString());
    setTime('');
    setPriority('medium');
    setStatus('pending');
    setRelatedMemberId('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setResponsibleId(task.responsibleId);
    setCategoryKey(task.categoryKey);
    setDate(task.date);
    setTime(task.time || '');
    setPriority(task.priority);
    setStatus(task.status);
    setRelatedMemberId(task.relatedMemberId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTaskId) {
      updateTask(editingTaskId, {
        title: title.trim(),
        description: description.trim() || undefined,
        responsibleId,
        categoryKey,
        date,
        time: time || undefined,
        priority,
        status,
        relatedMemberId: relatedMemberId || undefined,
      });
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        responsibleId,
        categoryKey,
        date,
        time: time || undefined,
        priority,
        status,
        relatedMemberId: relatedMemberId || undefined,
      });
    }

    setIsModalOpen(false);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMember =
      selectedMember === 'all' ||
      task.responsibleId === selectedMember ||
      task.relatedMemberId === selectedMember;

    const matchesCategory =
      selectedCategory === 'all' || task.categoryKey === selectedCategory;

    const matchesStatus =
      selectedStatus === 'all' || task.status === selectedStatus;

    const matchesPriority =
      selectedPriority === 'all' || task.priority === selectedPriority;

    return matchesSearch && matchesMember && matchesCategory && matchesStatus && matchesPriority;
  });

  const priorityColor = (p: TaskPriority) => {
    if (p === 'high') return <Badge variant="danger">Alta</Badge>;
    if (p === 'medium') return <Badge variant="warning">Media</Badge>;
    return <Badge variant="neutral">Baja</Badge>;
  };

  const statusColor = (s: TaskStatus) => {
    if (s === 'completed') return <Badge variant="success">Completada</Badge>;
    if (s === 'in_progress') return <Badge variant="info">En Progreso</Badge>;
    return <Badge variant="neutral">Pendiente</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">
              {config.modules.tasks.displayName}
            </h2>
            <span className="text-xs bg-stone-100 text-stone-600 font-semibold px-2.5 py-0.5 rounded-full">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Organiza los pendientes familiares de forma simple y visual
          </p>
        </div>

        <button
          onClick={openNewTaskModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-2xl border border-stone-200/60 focus-within:border-amber-400 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por título o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs focus:outline-hidden text-stone-800"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Member filter */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
              Responsable
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 focus:outline-hidden"
            >
              <option value="all">Todos los miembros</option>
              <option value="both">Mamá y Papá (Ambos)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 focus:outline-hidden"
            >
              <option value="all">Todas las categorías</option>
              {config.taskCategories.map((c) => (
                <option key={c.technicalKey} value={c.technicalKey}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
              Estado
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 focus:outline-hidden"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completada</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
              Prioridad
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 focus:outline-hidden"
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-800">No se encontraron tareas</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            Prueba ajustando los filtros o crea una nueva tarea para comenzar
          </p>
          <button
            onClick={openNewTaskModal}
            className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            + Crear Tarea
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const member = getMember(task.responsibleId);
            const relatedMember = task.relatedMemberId ? getMember(task.relatedMemberId) : undefined;
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl p-4 border transition-all ${
                  isCompleted
                    ? 'border-stone-200/50 bg-stone-50/40 opacity-70'
                    : 'border-stone-200/90 hover:shadow-xs hover:border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Check and details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-0.5 text-stone-400 hover:text-amber-500 transition-colors flex-shrink-0 cursor-pointer"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-bold text-stone-900 leading-snug break-words ${
                            isCompleted ? 'line-through text-stone-400' : ''
                          }`}
                        >
                          {task.title}
                        </span>
                        {statusColor(task.status)}
                        {priorityColor(task.priority)}
                        <Badge variant="neutral">
                          {getCategoryName('task', task.categoryKey)}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-stone-400 mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{formatFriendlyDate(task.date)}</span>
                        </span>

                        {task.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>{task.time}</span>
                          </span>
                        )}

                        {relatedMember && (
                          <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                            Para: {relatedMember.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Responsible avatar & actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Avatar
                      name={member ? member.name : task.responsibleId === 'both' ? 'Ambos' : 'Familia'}
                      emoji={member?.avatarEmoji || (task.responsibleId === 'both' ? '👫' : '🏡')}
                      color={member?.avatarColor || '#f59e0b'}
                      size="sm"
                    />

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar tarea"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar tarea"
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

      {/* Task Creation & Editing Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTaskId ? 'Editar Tarea' : 'Nueva Tarea Familiar'}
        subtitle="Organización rápida en 4 pasos"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              1. Tarea
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="¿Qué se necesita hacer?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                2. Responsable
              </label>
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="both">Mamá y Papá (Ambos)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                3. Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Categoría
              </label>
              <select
                value={categoryKey}
                onChange={(e) => setCategoryKey(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                {config.taskCategories.map((c) => (
                  <option key={c.technicalKey} value={c.technicalKey}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="high">Alta (Urgente)</option>
                <option value="medium">Media (Normal)</option>
                <option value="low">Baja (Tranquilo)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hora (opcional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Miembro relacionado (opcional)
            </label>
            <select
              value={relatedMemberId}
              onChange={(e) => setRelatedMemberId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
            >
              <option value="">Ninguno en específico</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  Para {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Descripción o notas adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Detalles útiles para no olvidar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {editingTaskId ? 'Guardar Cambios' : '4. Guardar Tarea'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
