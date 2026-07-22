"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import ProtectedLayout from "@/components/app/protected-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings, Users, LayoutList, CheckCircle, XCircle, Shield,
} from "lucide-react";
import type { Profile } from "@/types/database";
import { PAYMENT_STAGES, PAYMENT_STAGE_ORDER, ROLE_LABELS, FILIAIS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ConfigPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [tab, setTab] = useState<"stages" | "users">("stages");
  const [editingStages, setEditingStages] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (prof) setProfile(prof as Profile);
      }

      const { data: usersRaw } = await supabase.from("profiles").select("*").order("name");
      if (usersRaw) setUsers(usersRaw as Profile[]);
    };
    load();
  }, []);

  if (profile?.role !== "admin") {
    return (
      <ProtectedLayout>
        <div className="p-6 text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl text-white font-medium">Acesso Restrito</h1>
          <p className="text-slate-400 mt-2">Apenas administradores podem acessar as configurações.</p>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Configurações</h1>
            <p className="text-sm text-slate-400">Administração do sistema</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("stages")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
              tab === "stages" ? "bg-cyan-600/20 text-cyan-400" : "text-slate-400 hover:text-white bg-slate-800"
            )}
          >
            <LayoutList className="h-4 w-4" /> Estágios do Pipeline
          </button>
          <button
            onClick={() => setTab("users")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
              tab === "users" ? "bg-cyan-600/20 text-cyan-400" : "text-slate-400 hover:text-white bg-slate-800"
            )}
          >
            <Users className="h-4 w-4" /> Usuários
          </button>
        </div>

        {/* Stages Tab */}
        {tab === "stages" && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Pipeline de Pagamentos</CardTitle>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                14 estágios. A ordem pode ser ajustada editando o array PAYMENT_STAGE_ORDER no código.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PAYMENT_STAGE_ORDER.map((stage, idx) => {
                  const info = PAYMENT_STAGES[stage];
                  return (
                    <div key={stage} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <span className="text-xs text-slate-500 w-6">{idx + 1}.</span>
                      <div className={cn("w-3 h-3 rounded-full", info.color)} />
                      <span className="text-sm text-white flex-1">{info.label}</span>
                      <code className="text-xs text-slate-500">{stage}</code>
                      {stage === "received" && <Badge className="bg-cyan-600 text-[10px]">Padrão</Badge>}
                      {stage === "overdue" && <Badge className="bg-red-600 text-[10px]">Auto</Badge>}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-600 mt-4">
                💡 Os estágios "Atrasados", "Hoje", "Amanhã" e de prazos são calculados automaticamente
                pelo trigger SQL baseado na data de vencimento.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Usuários do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-600/20 flex items-center justify-center text-sm font-bold text-cyan-400">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        u.role === "admin" && "bg-cyan-600",
                        u.role === "gerente" && "bg-yellow-600",
                        u.role === "colaborador" && "bg-slate-600",
                        u.role === "visualizador" && "bg-gray-600",
                      )}>{ROLE_LABELS[u.role]}</Badge>
                      {u.filial && (
                        <span className="text-xs text-slate-500">
                          {FILIAIS.find((f) => f.value === u.filial)?.label}
                        </span>
                      )}
                      {u.approval_limit && u.approval_limit < 999999 && (
                        <span className="text-xs text-slate-500">
                          Limite: R$ {u.approval_limit.toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}
