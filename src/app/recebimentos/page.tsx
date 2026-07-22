"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowDownLeft, Calendar, DollarSign } from "lucide-react";
import type { Receivable, Profile } from "@/types/database";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

const STAGE_LABELS: Record<string, string> = {
  pending: "A Receber",
  partial: "Parcialmente Recebido",
  received: "Recebido",
  cancelled: "Cancelado",
};

const STAGE_COLORS: Record<string, string> = {
  pending: "bg-yellow-600",
  partial: "bg-blue-600",
  received: "bg-green-600",
  cancelled: "bg-red-600",
};

export default function RecebimentosPage() {
  const supabase = createClient();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [newOpen, setNewOpen] = useState(false);

  const load = async () => {
    const query = supabase.from("receivables").select("*").order("due_date", { ascending: true });
    const { data } = await query;
    if (data) setReceivables(data as Receivable[]);
  };

  useEffect(() => { load(); }, []);

  const totalToReceive = receivables.filter(r => r.stage !== "received" && r.stage !== "cancelled")
    .reduce((s, r) => s + Number(r.balance), 0);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Recebimentos</h1>
          <p className="text-sm text-slate-400 mt-1">
            {receivables.length} registros ·{" "}
            <span className="text-green-400">{formatCurrency(totalToReceive)} a receber</span>
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" /> Novo Recebimento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {receivables.map((r) => (
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <p className="text-white font-medium">{r.title}</p>
              <Badge className={STAGE_COLORS[r.stage]}>{STAGE_LABELS[r.stage]}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total</span>
                <span className="text-white font-medium">{formatCurrency(Number(r.total_amount))}</span>
              </div>
              {r.stage !== "received" && r.stage !== "cancelled" && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Saldo</span>
                  <span className="text-yellow-400 font-medium">{formatCurrency(Number(r.balance))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Vencimento</span>
                <span className="text-slate-300">{formatDate(r.due_date)}</span>
              </div>
              {r.payment_type && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma</span>
                  <span className="text-slate-300 capitalize">{r.payment_type}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {receivables.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500">Nenhum recebimento cadastrado</p>
          </div>
        )}
      </div>

      <NewReceivableDialog open={newOpen} onOpenChange={setNewOpen} onCreated={load} />
    </div>
  );
}

function NewReceivableDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const total = parseFloat(form.get("total_amount") as string) || 0;

    await supabase.from("receivables").insert({
      title: form.get("title") as string,
      total_amount: total,
      due_date: form.get("due_date") as string,
      payment_type: form.get("payment_type") as string || null,
    } as never);

    setLoading(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader><DialogTitle>Novo Recebimento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Título *</label>
            <input name="title" required className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">Valor Total (R$) *</label>
              <input name="total_amount" type="number" step="0.01" required className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-300">Vencimento *</label>
              <input name="due_date" type="date" required className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-300">Forma</label>
              <select name="payment_type" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm">
                <option value="">Selecione</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="card">Cartão</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full bg-cyan-600" disabled={loading}>
            {loading ? "Criando..." : "Criar Recebimento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
