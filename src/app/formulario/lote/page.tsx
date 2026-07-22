"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Copy, Send, CheckCircle, Loader2, X } from "lucide-react";
import type { Profile, Event } from "@/types/database";
import { FILIAIS, BANCOS_BRASIL, ACCOUNT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LinhaPagamento {
  id: string;
  nome_pagamento: string;
  valor: string;
  data_vencimento: string;
  tipo_pagamento: string;
  nome_favorecido: string;
  cpf_cnpj: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: string;
  pix: string;
  evento_id: string;
  centro_custo: string;
  errors: Record<string, string>;
}

function novaLinha(): LinhaPagamento {
  return {
    id: crypto.randomUUID(),
    nome_pagamento: "",
    valor: "",
    data_vencimento: "",
    tipo_pagamento: "pix",
    nome_favorecido: "",
    cpf_cnpj: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "checking",
    pix: "",
    evento_id: "",
    centro_custo: "",
    errors: {},
  };
}

export default function LotePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [linhas, setLinhas] = useState<LinhaPagamento[]>([novaLinha()]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [totalSuccess, setTotalSuccess] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const profileData = profRaw as Profile | null;
      if (profileData) setProfile(profileData);

      let query = supabase.from("events").select("*").order("event_date", { ascending: false });
      if (profileData?.role === "gerente" && profileData.filial) {
        query = query.eq("filial", profileData.filial);
      }
      const { data: evts } = await query;
      if (evts) setEvents(evts as Event[]);
    };
    load();
  }, []);

  const addLinha = () => setLinhas([...linhas, novaLinha()]);
  const removeLinha = (id: string) => {
    if (linhas.length <= 1) return;
    setLinhas(linhas.filter((l) => l.id !== id));
  };
  const duplicateLinha = (index: number) => {
    const nova = { ...linhas[index], id: crypto.randomUUID(), errors: {} };
    setLinhas([...linhas.slice(0, index + 1), nova, ...linhas.slice(index + 1)]);
  };
  const updateLinha = (id: string, field: string, value: string) => {
    setLinhas(linhas.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const validate = (linha: LinhaPagamento): boolean => {
    const errors: Record<string, string> = {};
    if (!linha.nome_pagamento) errors.nome_pagamento = "Obrigatório";
    if (!linha.valor || parseFloat(linha.valor) <= 0) errors.valor = "Inválido";
    if (!linha.data_vencimento) errors.data_vencimento = "Obrigatório";
    if (!linha.nome_favorecido) errors.nome_favorecido = "Obrigatório";
    if (!linha.banco) errors.banco = "Obrigatório";
    linha.errors = errors;
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const linha of linhas) {
      if (!validate(linha)) {
        errorCount++;
        continue;
      }

      const { error } = await supabase.from("payments").insert({
        title: linha.nome_pagamento,
        amount: parseFloat(linha.valor) || 0,
        due_date: linha.data_vencimento,
        payment_type: linha.tipo_pagamento,
        favored_name: linha.nome_favorecido,
        favored_document: linha.cpf_cnpj || null,
        favored_bank: linha.banco,
        favored_agency: linha.agencia || null,
        favored_account: linha.conta || null,
        favored_account_type: linha.tipo_conta || "checking",
        pix_key: linha.pix || null,
        event_id: linha.evento_id || null,
        cost_center: linha.centro_custo || null,
        filial: profile?.filial || "rio",
        stage: "received",
      } as never);

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setTotalSuccess(successCount);
    setTotalErrors(errorCount);
    setSuccess(Date.now());
    if (errorCount === 0) {
      setLinhas([novaLinha()]);
    }
    setSubmitting(false);
  };

  const isSubmitting = submitting || success !== null;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Formulário em Lote</h1>
        <p className="text-sm text-slate-400 mt-1">
          Envie múltiplos pagamentos de uma vez
          {profile?.name && ` · ${profile.name}`}
        </p>
      </div>

      {success ? (
        <Card className="bg-slate-900 border-slate-800 max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <p className="text-white text-xl font-medium">Lote enviado! 🎉</p>
            <p className="text-slate-400 mt-2">
              {totalSuccess} pagamento(s) criado(s) com sucesso
              {totalErrors > 0 && ` · ${totalErrors} erro(s)`}
            </p>
            <Button
              onClick={() => { setSuccess(null); setTotalSuccess(0); setTotalErrors(0); }}
              className="mt-6 bg-cyan-600 hover:bg-cyan-700"
            >
              Novo Lote
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-800">
                  <th className="p-2 text-left w-10">#</th>
                  <th className="p-2 text-left">Pagamento *</th>
                  <th className="p-2 text-left w-28">Valor *</th>
                  <th className="p-2 text-left w-28">Vencimento *</th>
                  <th className="p-2 text-left w-24">Tipo</th>
                  <th className="p-2 text-left min-w-[180px]">Favorecido *</th>
                  <th className="p-2 text-left w-28">CPF/CNPJ</th>
                  <th className="p-2 text-left w-36">Banco *</th>
                  <th className="p-2 text-left w-20">Ag.</th>
                  <th className="p-2 text-left w-28">Conta</th>
                  <th className="p-2 text-left w-20">Tp</th>
                  <th className="p-2 text-left w-32">PIX</th>
                  <th className="p-2 text-left w-28">Evento</th>
                  <th className="p-2 text-left w-24">CCusto</th>
                  <th className="p-2 text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, idx) => (
                  <tr key={linha.id} className={cn(
                    "border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors",
                    Object.keys(linha.errors).length > 0 && "bg-red-900/10"
                  )}>
                    <td className="p-1.5 text-xs text-slate-500">{idx + 1}</td>
                    <td className="p-1.5">
                      <input value={linha.nome_pagamento} onChange={(e) => updateLinha(linha.id, "nome_pagamento", e.target.value)}
                        className={cn("w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs", linha.errors.nome_pagamento && "border-red-500")} />
                    </td>
                    <td className="p-1.5">
                      <input value={linha.valor} onChange={(e) => updateLinha(linha.id, "valor", e.target.value)} type="number" step="0.01"
                        className={cn("w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs", linha.errors.valor && "border-red-500")} />
                    </td>
                    <td className="p-1.5">
                      <input value={linha.data_vencimento} onChange={(e) => updateLinha(linha.id, "data_vencimento", e.target.value)} type="date"
                        className={cn("w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs", linha.errors.data_vencimento && "border-red-500")} />
                    </td>
                    <td className="p-1.5">
                      <select value={linha.tipo_pagamento} onChange={(e) => updateLinha(linha.id, "tipo_pagamento", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs">
                        <option value="pix">PIX</option>
                        <option value="boleto">Boleto</option>
                        <option value="transfer">TED</option>
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input value={linha.nome_favorecido} onChange={(e) => updateLinha(linha.id, "nome_favorecido", e.target.value)}
                        className={cn("w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs", linha.errors.nome_favorecido && "border-red-500")} />
                    </td>
                    <td className="p-1.5">
                      <input value={linha.cpf_cnpj} onChange={(e) => updateLinha(linha.id, "cpf_cnpj", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs" />
                    </td>
                    <td className="p-1.5">
                      <select value={linha.banco} onChange={(e) => updateLinha(linha.id, "banco", e.target.value)}
                        className={cn("w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs", linha.errors.banco && "border-red-500")}>
                        <option value="">Selecione</option>
                        {BANCOS_BRASIL.map((b) => (<option key={b} value={b}>{b}</option>))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input value={linha.agencia} onChange={(e) => updateLinha(linha.id, "agencia", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs" />
                    </td>
                    <td className="p-1.5">
                      <input value={linha.conta} onChange={(e) => updateLinha(linha.id, "conta", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs" />
                    </td>
                    <td className="p-1.5">
                      <select value={linha.tipo_conta} onChange={(e) => updateLinha(linha.id, "tipo_conta", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs">
                        {ACCOUNT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input value={linha.pix} onChange={(e) => updateLinha(linha.id, "pix", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs" />
                    </td>
                    <td className="p-1.5">
                      <select value={linha.evento_id} onChange={(e) => updateLinha(linha.id, "evento_id", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs">
                        <option value="">Nenhum</option>
                        {events.map((ev) => (<option key={ev.id} value={ev.id}>{ev.name}</option>))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <select value={linha.centro_custo} onChange={(e) => updateLinha(linha.id, "centro_custo", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-800 border rounded text-white text-xs">
                        <option value="">Selecione</option>
                        {FILIAIS.map((f) => (<option key={f.value} value={f.label}>{f.label}</option>))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => duplicateLinha(idx)} className="p-1 text-slate-500 hover:text-cyan-400" title="Duplicar">
                          <Copy className="h-3 w-3" />
                        </button>
                        <button onClick={() => removeLinha(linha.id)} className="p-1 text-slate-500 hover:text-red-400" title="Remover">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={addLinha} variant="outline" className="border-slate-700 text-slate-300">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Linha
            </Button>
            <Button
              onClick={handleSubmitAll}
              className="bg-cyan-600 hover:bg-cyan-700 ml-auto"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Enviar Lote ({linhas.length})</>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
