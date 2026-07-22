"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { Bell, AlertTriangle, ArrowUpRight, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task, Payment } from "@/types/database";

interface Notification {
  id: string;
  type: "overdue_task" | "overdue_payment" | "new_payment";
  title: string;
  description: string;
  link: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationBell() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const profileData = profile as { role: string; filial: string } | null;

    // Overdue tasks assigned to user
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("responsible_id", user.id)
      .neq("status", "done")
      .lt("deadline", new Date().toISOString())
      .order("deadline", { ascending: true });

    // Overdue payments
    let paymentQuery = supabase
      .from("payments")
      .select("*")
      .eq("stage", "overdue")
      .limit(10);
    
    if (profileData?.role === "gerente" && profileData.filial) {
      paymentQuery = paymentQuery.eq("filial", profileData.filial);
    } else if (profileData?.role === "colaborador") {
      paymentQuery = paymentQuery.or(`responsible_id.eq.${user.id},creator_id.eq.${user.id}`);
    }

    const { data: overduePayments } = await paymentQuery;

    const allNotifications: Notification[] = [];

    (overdueTasks as Task[] | null)?.forEach((t) => {
      const hours = Math.round((Date.now() - new Date(t.deadline).getTime()) / 3600000);
      allNotifications.push({
        id: `task-${t.id}`,
        type: "overdue_task",
        title: "Tarefa Atrasada",
        description: `${t.title} — ${hours}h atrasada`,
        link: "/tarefas",
        timestamp: t.deadline,
        read: false,
      });
    });

    (overduePayments as Payment[] | null)?.forEach((p) => {
      allNotifications.push({
        id: `payment-${p.id}`,
        type: "overdue_payment",
        title: "Pagamento Vencido",
        description: `${p.title} — R$ ${Number(p.amount).toLocaleString("pt-BR")}`,
        link: "/pagamentos",
        timestamp: p.due_date,
        read: false,
      });
    });

    setNotifications(allNotifications.slice(0, 20));
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-40 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                Notificações
              </h3>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {notifications.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500">Nenhuma pendência 🎉</p>
              </div>
            )}
            {notifications.map((n) => (
              <a
                key={n.id}
                href={n.link}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-start gap-3 p-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  n.type === "overdue_task" && "bg-yellow-600/20",
                  n.type === "overdue_payment" && "bg-red-600/20",
                )}>
                  {n.type === "overdue_task" ? (
                    <CheckSquare className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.description}</p>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
