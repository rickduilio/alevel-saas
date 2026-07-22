"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  MessageSquare,
  Send,
  User,
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import type { Task, Profile, TaskComment } from "@/types/database";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, FILIAIS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

function getSlaHours(priority: string): number {
  switch (priority) {
    case "P0": return 3;
    case "P1": return 6;
    case "P2": return 12;
    case "P3": return 24;
    default: return 24;
  }
}

function getTimeRemaining(deadline: string): string {
  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const diff = deadlineMs - now;

  if (diff <= 0) {
    const hours = Math.abs(Math.floor(diff / 3600000));
    return `${hours}h atrasada`;
  }

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}min`;
}

function isOverdue(deadline: string): boolean {
  return new Date(deadline).getTime() < Date.now();
}

// ─── New Task Dialog ───
function NewTaskDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const priority = form.get("priority") as string;
    const slaHours = getSlaHours(priority);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + slaHours);

    const payload = {
      title: form.get("title") as string,
      description: form.get("description") as string || null,
      priority,
      sla_hours: slaHours,
      deadline: deadline.toISOString(),
      status: "todo",
      filial: form.get("filial") as string || null,
    };

    await supabase.from("tasks").insert(payload as never);
    setLoading(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Título *</label>
            <input
              name="title"
              required
              className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300">Descrição</label>
            <textarea
              name="description"
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">Prioridade</label>
              <select
                name="priority"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="P0">P0 — Urgente (3h)</option>
                <option value="P1">P1 — Alta (6h)</option>
                <option value="P2">P2 — Média (12h)</option>
                <option value="P3" selected>P3 — Baixa (24h)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-300">Filial</label>
              <select
                name="filial"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Selecione</option>
                {FILIAIS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            SLA calculado automaticamente baseado na prioridade. A tarefa será criada com status "A Fazer".
          </p>
          <Button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700"
            disabled={loading}
          >
            {loading ? "Criando..." : "Criar Tarefa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Detail Dialog ───
function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onUpdated,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!taskId || !open) return;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (prof) setProfile(prof as Profile);
      }

      const { data: t } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (t) setTask(t as Task);

      const { data: c } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (c) setComments(c as TaskComment[]);
    };
    load();
  }, [taskId, open]);

  const handleStatusChange = async (status: string) => {
    if (!task) return;
    await supabase.from("tasks").update({ status } as never).eq("id", task.id);
    setTask({ ...task, status: status as Task["status"] });
    onUpdated();
  };

  const handleComment = async () => {
    if (!comment.trim() || !task) return;
    setSending(true);
    await supabase.from("task_comments").insert({
      task_id: task.id,
      content: comment,
      author_id: profile?.id,
    } as never);
    setComment("");
    setSending(false);

    const { data: c } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });
    if (c) setComments(c as TaskComment[]);
  };

  if (!task) return null;

  const overdue = isOverdue(task.deadline);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">{task.title}</DialogTitle>
              <p className="text-sm text-slate-400 mt-1">
                Prioridade {task.priority} · SLA {task.sla_hours}h
              </p>
            </div>
            <div className="flex gap-1">
              {task.status === "todo" && (
                <Button size="sm" className="bg-yellow-600 h-8" onClick={() => handleStatusChange("in_progress")}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Iniciar
                </Button>
              )}
              {task.status === "in_progress" && (
                <Button size="sm" className="bg-green-600 h-8" onClick={() => handleStatusChange("done")}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status + Timer */}
          <div className="flex items-center gap-3">
            <Badge className={cn(
              task.status === "todo" && "bg-slate-600",
              task.status === "in_progress" && "bg-yellow-600",
              task.status === "done" && "bg-green-600"
            )}>
              {task.status === "todo" ? "A Fazer" : task.status === "in_progress" ? "Em Andamento" : "Concluída"}
            </Badge>
            <Badge className={cn("flex items-center gap-1", overdue ? "bg-red-600" : "bg-slate-700")}>
              <Clock className="h-3 w-3" />
              {getTimeRemaining(task.deadline)}
            </Badge>
            <Badge className={cn("flex items-center gap-1", TASK_PRIORITY_COLORS[task.priority])}>
              {task.priority}
            </Badge>
          </div>

          {task.description && (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-300">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Deadline</p>
              <p className="text-slate-200">{formatDateTime(task.deadline)}</p>
            </div>
            {task.filial && (
              <div>
                <p className="text-xs text-slate-500">Filial</p>
                <p className="text-slate-200">{FILIAIS.find((f) => f.value === task.filial)?.label}</p>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Comentários</h4>
            <div className="flex gap-2 mb-3">
              <Textarea
                placeholder="Escreva um comentário..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white flex-1 min-h-[50px] text-sm"
              />
              <Button
                size="icon"
                className="bg-cyan-600 hover:bg-cyan-700 self-end"
                onClick={handleComment}
                disabled={sending || !comment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-xs text-slate-600">Nenhum comentário</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="p-2 bg-slate-800/30 rounded text-sm">
                  <p className="text-slate-200">{c.content}</p>
                  <p className="text-xs text-slate-600 mt-1">{formatDateTime(c.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Tasks Page ───
export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterFilial, setFilterFilial] = useState<string>("all");

  const loadTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const profileData = prof as Profile | null;
    if (profileData) setProfile(profileData);

    let query = supabase.from("tasks").select("*").order("deadline", { ascending: true });

    if (profileData?.role === "colaborador") {
      query = query.or(`responsible_id.eq.${user.id},creator_id.eq.${user.id}`);
    } else if (profileData?.role === "gerente" && profileData.filial) {
      query = query.eq("filial", profileData.filial);
    }

    const { data } = await query;
    if (data) setTasks(data as Task[]);

    // Set view mode based on role
    if (profileData?.role === "colaborador" || profileData?.role === "visualizador") {
      setViewMode("list");
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterFilial !== "all" && t.filial !== filterFilial) return false;
    return true;
  });

  const kanbanStatuses = ["todo", "in_progress", "done"];
  const statusLabels: Record<string, string> = {
    todo: "A Fazer",
    in_progress: "Em Andamento",
    done: "Concluída",
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tarefas</h1>
          <p className="text-sm text-slate-400 mt-1">
            {filteredTasks.length} tarefas · {tasks.filter((t) => isOverdue(t.deadline) && t.status !== "done").length} atrasadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.role !== "colaborador" && profile?.role !== "visualizador" && (
            <div className="flex bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={cn("px-3 py-1.5 rounded text-xs", viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-400")}
              >
                Lista
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn("px-3 py-1.5 rounded text-xs", viewMode === "kanban" ? "bg-slate-700 text-white" : "text-slate-400")}
              >
                Kanban
              </button>
            </div>
          )}
          <Button onClick={() => setNewTaskOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
        >
          <option value="all">Todos os status</option>
          <option value="todo">A Fazer</option>
          <option value="in_progress">Em Andamento</option>
          <option value="done">Concluída</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
        >
          <option value="all">Todas prioridades</option>
          <option value="P0">P0 - Urgente</option>
          <option value="P1">P1 - Alta</option>
          <option value="P2">P2 - Média</option>
          <option value="P3">P3 - Baixa</option>
        </select>
        <select
          value={filterFilial}
          onChange={(e) => setFilterFilial(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
        >
          <option value="all">Todas filiais</option>
          {FILIAIS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanStatuses.map((status) => {
            const tasksInCol = filteredTasks.filter((t) => t.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-80 bg-slate-900/50 rounded-lg border border-slate-800">
                <div className="p-3 border-b border-slate-800">
                  <h3 className="text-sm font-medium text-white">{statusLabels[status]}</h3>
                  <p className="text-xs text-slate-500 mt-1">{tasksInCol.length} tarefas</p>
                </div>
                <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {tasksInCol.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task.id)} overdue={isOverdue(task.deadline)} />
                  ))}
                  {tasksInCol.length === 0 && (
                    <p className="text-center py-6 text-xs text-slate-600">Nenhuma tarefa</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">Nenhuma tarefa encontrada</p>
            </div>
          )}
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task.id)} overdue={isOverdue(task.deadline)} listView />
          ))}
        </div>
      )}

      <NewTaskDialog open={newTaskOpen} onOpenChange={setNewTaskOpen} onCreated={loadTasks} />
      <TaskDetailDialog taskId={selectedTask} open={!!selectedTask} onOpenChange={(o) => { if (!o) setSelectedTask(null); }} onUpdated={loadTasks} />
    </div>
  );
}

// ─── Task Card ───
function TaskCard({
  task,
  onClick,
  overdue,
  listView,
}: {
  task: Task;
  onClick: () => void;
  overdue: boolean;
  listView?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-slate-800 rounded-lg p-3 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors",
        overdue && task.status !== "done" && "border-red-700/50",
        listView && "flex items-center gap-3"
      )}
    >
      {listView ? (
        <>
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", TASK_PRIORITY_COLORS[task.priority])} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{task.title}</p>
            <p className="text-xs text-slate-500">
              {task.priority} · {task.status === "todo" ? "A Fazer" : task.status === "in_progress" ? "Em Andamento" : "Concluída"}
              {task.filial && ` · ${FILIAIS.find((f) => f.value === task.filial)?.label}`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={cn(overdue && task.status !== "done" ? "text-red-400" : "text-slate-400")}>
              <Clock className="h-3 w-3 inline mr-1" />
              {getTimeRemaining(task.deadline)}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-2.5 h-2.5 rounded-full", TASK_PRIORITY_COLORS[task.priority])} />
            <Badge className={cn(
              task.status === "todo" && "bg-slate-600",
              task.status === "in_progress" && "bg-yellow-600",
              task.status === "done" && "bg-green-600"
            )}>
              {task.priority}
            </Badge>
            {task.filial && (
              <span className="text-xs text-slate-500">{FILIAIS.find((f) => f.value === task.filial)?.label}</span>
            )}
          </div>
          <p className="text-sm text-white font-medium mb-2">{task.title}</p>
          {task.description && (
            <p className="text-xs text-slate-400 mb-2 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className={cn("text-xs flex items-center gap-1", overdue && task.status !== "done" ? "text-red-400" : "text-slate-400")}>
              <Clock className="h-3 w-3" />
              {getTimeRemaining(task.deadline)}
            </span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              task.status === "todo" && "text-slate-400",
              task.status === "in_progress" && "text-yellow-400 bg-yellow-400/10",
              task.status === "done" && "text-green-400 bg-green-400/10"
            )}>
              {task.status === "todo" ? "A Fazer" : task.status === "in_progress" ? "Em Andamento" : "Concluída"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
