"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import ProtectedLayout from "@/components/app/protected-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, CheckSquare, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import type { Profile, Payment, Receivable, Task, Event } from "@/types/database";
import { PAYMENT_STAGES, TASK_PRIORITY_COLORS, EVENT_STATUS_LABELS } from "@/lib/constants";

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profData) setProfile(profData as Profile);

      const profileData = profData as Profile | null;
      const isAdmin = profileData?.role === "admin";
      const isGerente = profileData?.role === "gerente";
      const isColaborador = profileData?.role === "colaborador";

      let paymentQuery = supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50);
      if (isGerente && profileData?.filial) paymentQuery = paymentQuery.eq("filial", profileData.filial);
      if (isColaborador) paymentQuery = paymentQuery.or(`responsible_id.eq.${user.id},creator_id.eq.${user.id}`);
      const { data: pays } = await paymentQuery;
      if (pays) setPayments(pays);

      let receivableQuery = supabase.from("receivables").select("*").order("created_at", { ascending: false }).limit(50);
      if (isGerente && profileData?.filial) receivableQuery = receivableQuery.eq("responsible_id", user.id);
      const { data: recs } = await receivableQuery;
      if (recs) setReceivables(recs);

      let taskQuery = supabase.from("tasks").select("*").order("deadline", { ascending: true }).limit(50);
      if (isColaborador) taskQuery = taskQuery.or(`responsible_id.eq.${user.id},creator_id.eq.${user.id}`);
      if (isGerente && profileData?.filial) taskQuery = taskQuery.eq("filial", profileData.filial);
      const { data: tsks } = await taskQuery;
      if (tsks) setTasks(tsks);

      let eventQuery = supabase.from("events").select("*").order("event_date", { ascending: true }).limit(20);
      if (isGerente && profileData?.filial) eventQuery = eventQuery.eq("filial", profileData.filial);
      const { data: evts } = await eventQuery;
      if (evts) setEvents(evts);
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

  return (
    <ProtectedLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            {profile && (
              <p className="text-sm text-slate-400 mt-1">
                {profile.role === "admin" ? "Visão geral" :
                 profile.role === "gerente" ? `Visão da filial` :
                 "Visão pessoal"}
              </p>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-cyan-400" />
                Pipeline Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalPaymentsOpen)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Pagamentos Atrasados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalOverdue)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-400" />
                A Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalReceivable)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-yellow-400" />
                Tarefas Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-400">{overdueTasks.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pagamentos por estágio */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Pagamentos por Estágio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(PAYMENT_STAGES).map(([stage, info]) => {
                const total = byStage[stage] || 0;
                if (total === 0) return null;
                return (
                  <div key={stage} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${info.color}`} />
                      <span className="text-sm text-slate-300">{info.label}</span>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Próximos eventos */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-400" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{event.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(event.event_date).toLocaleDateString("pt-BR")}
                      {event.city ? ` · ${event.city}` : ""}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">
                    {EVENT_STATUS_LABELS[event.status]}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-slate-500">Nenhum evento cadastrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tarefas atrasadas */}
        {overdueTasks.length > 0 && (
          <Card className="bg-slate-900 border-red-800/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Tarefas Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`} />
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
