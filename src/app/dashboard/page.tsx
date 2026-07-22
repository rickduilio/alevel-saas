"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import ProtectedLayout from "@/components/app/protected-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, CheckSquare, Calendar, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import type { Profile, Payment, Receivable, Task, Event } from "@/types/database";
import { PAYMENT_STAGES, TASK_PRIORITY_COLORS, EVENT_STATUS_LABELS, FILIAIS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getTimeRemaining(deadline: string): string {
  const now = Date.now();
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return `${Math.abs(Math.floor(diff / 3600000))}h atrasada`;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${minutes}min`;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const profileData = profRaw as Profile | null;
      if (profileData) setProfile(profileData);

      const isAdmin = profileData?.role === "admin";
      const isGerente = profileData?.role === "gerente";
      const isColab = profileData?.role === "colaborador";

      // Payments
      let payQuery = supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50);
      if (isGerente && profileData?.filial) payQuery = payQuery.eq("filial", profileData.filial);
      if (isColab) payQuery = payQuery.or(`responsible_id.eq.${user.id},creator_id.eq.${user.id}`);
      const { data: pays } = await payQuery;
      if (pays) setPayments(pays as Payment[]);

      // Receivables
      let recQuery = supabase.from("receivables").select("*").limit(50);
      const { data: recs } = await recQuery;
      if (recs) setReceivables(recs as Receivable[]);

      // All tasks visible to user
      let taskQuery = supabase.from("tasks").select("*").order("deadline", { ascending: true }).limit(50);
      if (isColab) taskQuery = taskQuery.or(`responsible_id.eq.${user.id},creator_id.eq.${user.id}`);
      if (isGerente && profileData?.filial) taskQuery = taskQuery.eq("filial", profileData.filial);
      const { data: tsks } = await taskQuery;
      if (tsks) setTasks(tsks as Task[]);

      // My personal tasks
      const { data: mine } = await supabase
        .from("tasks")
        .select("*")
        .or(`responsible_id.eq.${user.id},creator_id.eq.${user.id}`)
        .neq("status", "done")
        .order("deadline", { ascending: true })
        .limit(10);
      if (mine) setMyTasks(mine as Task[]);

      // Events
      let evQuery = supabase.from("events").select("*").order("event_date", { ascending: true }).limit(20);
      if (isGerente && profileData?.filial) evQuery = evQuery.eq("filial", profileData.filial);
      const { data: evts } = await evQuery;
      if (evts) setEvents(evts as Event[]);
    };
    load();
  }, []);

  const totalPaymentsOpen = payments.filter((p) => !p.closed).reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = payments.filter((p) => p.stage === "overdue").reduce((s, p) => s + Number(p.amount), 0);
  const totalReceivable = receivables.filter((r) => r.stage !== "received" && r.stage !== "cancelled").reduce((s, r) => s + Number(r.balance), 0);
  const overdueTasks = tasks.filter((t) => t.status !== "done" && new Date(t.deadline) < new Date());

  const byStage = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.stage] = (acc[p.stage] || 0) + Number(p.amount);
    return acc;
  }, {});

  const isAdminManager = profile?.role === "admin" || profile?.role === "gerente";

  return (
    <ProtectedLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {profile?.role === "colaborador" ? "Meu Painel" : "Dashboard"}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {profile?.name}
              {profile?.filial && ` · ${FILIAIS.find(f => f.value === profile.filial)?.label}`}
              {profile?.role === "colaborador" ? " · Visão pessoal" : ""}
            </p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-cyan-400" /> Pipeline Pagamentos
            </CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalPaymentsOpen)}</p>
              <p className="text-xs text-slate-500 mt-1">{payments.length} pagamentos</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Atrasados
            </CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totalOverdue)}</p>
              <p className="text-xs text-slate-500 mt-1">{payments.filter(p => p.stage === "overdue").length} pagamentos</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-green-400" /> A Receber
            </CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalReceivable)}</p>
              <p className="text-xs text-slate-500 mt-1">{receivables.length} registros</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-yellow-400" /> Tarefas Atrasadas
            </CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-400">{overdueTasks.length}</p>
              <p className="text-xs text-slate-500 mt-1">{tasks.length} total</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Minhas Tarefas (para todos os roles) */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900 border-slate-800 h-full">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-cyan-400" />
                  Minhas Tarefas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {myTasks.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-6">Nenhuma tarefa pendente 🎉</p>
                )}
                {myTasks.map((task) => {
                  const overdue = new Date(task.deadline) < new Date();
                  return (
                    <div key={task.id} className={cn(
                      "p-2.5 rounded-lg border transition-colors cursor-pointer hover:border-slate-600",
                      overdue ? "bg-red-900/10 border-red-800/30" : "bg-slate-800/50 border-slate-700"
                    )}>
                      <div className="flex items-start gap-2">
                        <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", TASK_PRIORITY_COLORS[task.priority])} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn("text-[10px] h-4", TASK_PRIORITY_COLORS[task.priority])}>
                              {task.priority}
                            </Badge>
                            <span className={cn("text-[10px] flex items-center gap-0.5", overdue ? "text-red-400" : "text-slate-500")}>
                              <Clock className="h-2.5 w-2.5" /> {getTimeRemaining(task.deadline)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Pagamentos por estágio (admin/gerente) */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800 h-full">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                  Pagamentos por Estágio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAdminManager ? (
                  <div className="space-y-3">
                    {Object.entries(PAYMENT_STAGES).map(([stage, info]) => {
                      const total = byStage[stage] || 0;
                      const count = payments.filter(p => p.stage === stage).length;
                      const maxVal = Math.max(...Object.values(byStage), 1);
                      const pct = (total / maxVal) * 100;
                      if (total === 0 && count === 0) return null;
                      return (
                        <div key={stage} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", info.color)} />
                              <span className="text-slate-300">{info.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">{count}</span>
                              <span className="text-white font-medium w-24 text-right">{formatCurrency(total)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", info.color)}
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm">Acesso restrito a administradores e gerentes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Próximos Eventos */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {events.slice(0, 4).map((event) => (
                <div key={event.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-sm text-white font-medium">{event.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(event.event_date).toLocaleDateString("pt-BR")}
                    {event.city ? ` · ${event.city}` : ""}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge className={cn(
                      "text-[10px]",
                      event.status === "confirmed" && "bg-cyan-600",
                      event.status === "planned" && "bg-slate-600",
                      event.status === "done" && "bg-green-600"
                    )}>{EVENT_STATUS_LABELS[event.status]}</Badge>
                    <span className="text-xs text-slate-500">
                      {FILIAIS.find(f => f.value === event.filial)?.label}
                    </span>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-xs text-slate-600 col-span-full text-center py-4">Nenhum evento cadastrado</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tarefas atrasadas globais */}
        {isAdminManager && overdueTasks.length > 0 && (
          <Card className="bg-slate-900 border-red-800/30">
            <CardHeader>
              <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Tarefas Atrasadas ({overdueTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", TASK_PRIORITY_COLORS[task.priority])} />
                    <span className="text-sm text-slate-300">{task.title}</span>
                  </div>
                  <span className="text-xs text-red-400">
                    {Math.round((Date.now() - new Date(task.deadline).getTime()) / 3600000)}h atrasada
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}
