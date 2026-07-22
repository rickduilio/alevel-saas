"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, GripVertical, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAYMENT_STAGES, PAYMENT_STAGE_ORDER } from "@/lib/constants";
import type { Payment, PaymentStage, Profile } from "@/types/database";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

// ─── Kanban Column ───
function KanbanColumn({
  stage,
  payments,
  onOpenDeal,
  isOverdue,
}: {
  stage: PaymentStage;
  payments: Payment[];
  onOpenDeal: (deal: Payment) => void;
  isOverdue: boolean;
}) {
  const stageInfo = PAYMENT_STAGES[stage];
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col bg-slate-900/50 rounded-lg border border-slate-800">
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full", stageInfo.color)} />
            <h3 className="text-sm font-medium text-white">{stageInfo.label}</h3>
          </div>
          <span className="text-xs text-slate-500">{payments.length}</span>
        </div>
        <p className="text-xs text-slate-400">
          {formatCurrency(total)}
        </p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext items={payments.map((p) => p.id)}>
          {payments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-slate-600">Nenhum pagamento</p>
            </div>
          )}
          {payments.map((payment) => (
            <DealCard
              key={payment.id}
              payment={payment}
              onClick={() => onOpenDeal(payment)}
              isOverdue={isOverdue}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// ─── Deal Card ───
function DealCard({
  payment,
  onClick,
  isOverdue,
}: {
  payment: Payment;
  onClick: () => void;
  isOverdue: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: payment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const daysUntilDue = Math.ceil(
    (new Date(payment.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-slate-800 rounded-lg p-3 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors",
        isDragging && "opacity-50",
        isOverdue && "border-red-700/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {payment.title}
          </p>
          <p className="text-xs text-slate-400 mt-1">{payment.favored_name}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm font-bold text-cyan-400">
              {formatCurrency(Number(payment.amount))}
            </p>
            <span
              className={cn(
                "text-xs",
                daysUntilDue <= 0 ? "text-red-400" : "text-slate-500"
              )}
            >
              {daysUntilDue <= 0
                ? `${Math.abs(daysUntilDue)}d atrasado`
                : `Vence ${formatDate(payment.due_date)}`}
            </span>
          </div>
          {payment.payment_type && (
            <span className="text-xs text-slate-600 mt-1 inline-block">
              {payment.payment_type === "pix"
                ? "PIX"
                : payment.payment_type === "boleto"
                ? "Boleto"
                : payment.payment_type === "card"
                ? "Cartão"
                : "Transferência"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Deal Dialog ───
function NewDealDialog({
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
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("events").select("id, name").then(({ data }) => {
      if (data) setEvents(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const payload = {
      title: form.get("title") as string,
      description: form.get("description") as string || null,
      amount: parseFloat(form.get("amount") as string) || 0,
      due_date: form.get("due_date") as string,
      payment_type: form.get("payment_type") as string || null,
      favored_name: form.get("favored_name") as string,
      favored_document: form.get("favored_document") as string || null,
      favored_bank: form.get("favored_bank") as string || null,
      favored_agency: form.get("favored_agency") as string || null,
      favored_account: form.get("favored_account") as string || null,
      favored_account_type: form.get("favored_account_type") as string || null,
      pix_key: form.get("pix_key") as string || null,
      cost_center: form.get("cost_center") as string || null,
      department: form.get("department") as string || null,
      is_reimbursement: form.get("is_reimbursement") === "on",
      event_id: form.get("event_id") as string || null,
      notification_emails: (form.get("notification_emails") as string || "")
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean),
      filial: "rio",
      stage: "received",
    };

    const { error } = await supabase.from("payments").insert(payload as never);
    setLoading(false);

    if (!error) {
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Novo Pagamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm text-slate-300">Nome do Pagamento *</label>
              <input
                name="title"
                required
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-300">Descrição / Detalhe</label>
              <textarea
                name="description"
                rows={2}
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Valor (R$) *</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Data de Vencimento *</label>
              <input
                name="due_date"
                type="date"
                required
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Tipo de Pagamento</label>
              <select
                name="payment_type"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Selecione</option>
                <option value="pix">PIX / Transferência</option>
                <option value="boleto">Boleto / Guia</option>
                <option value="card">Cartão</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-300">Departamento</label>
              <select
                name="department"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Selecione</option>
                <option value="Evento">Evento</option>
                <option value="Interno">Interno</option>
                <option value="Carreira">Carreira</option>
                <option value="Label">Label</option>
                <option value="Show">Show</option>
                <option value="Social">Social</option>
              </select>
            </div>
          </div>

          <h3 className="text-sm font-medium text-cyan-400 pt-2 border-t border-slate-700">
            Dados do Favorecido
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm text-slate-300">Nome Completo *</label>
              <input
                name="favored_name"
                required
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">CPF/CNPJ</label>
              <input
                name="favored_document"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">PIX</label>
              <input
                name="pix_key"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Banco</label>
              <input
                name="favored_bank"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Agência</label>
              <input
                name="favored_agency"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Conta</label>
              <input
                name="favored_account"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Tipo de Conta</label>
              <select
                name="favored_account_type"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Selecione</option>
                <option value="checking">Corrente</option>
                <option value="savings">Poupança</option>
                <option value="salary">Salário</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" name="is_reimbursement" id="reimbursement" />
              <label htmlFor="reimbursement" className="text-sm text-slate-300">
                Reembolso / NF
              </label>
            </div>
          </div>

          <h3 className="text-sm font-medium text-cyan-400 pt-2 border-t border-slate-700">
            Vinculação
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">Evento</label>
              <select
                name="event_id"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Nenhum</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-300">Centro de Custo</label>
              <select
                name="cost_center"
                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">Selecione</option>
                <option value="Nacional">Nacional</option>
                <option value="Bahia">Bahia</option>
                <option value="Rio">Rio</option>
                <option value="SP">SP</option>
                <option value="Sul">Sul</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300">
              Emails de Acompanhamento (um por linha)
            </label>
            <textarea
              name="notification_emails"
              rows={2}
              placeholder="email1@exemplo.com&#10;email2@exemplo.com"
              className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700"
            disabled={loading}
          >
            {loading ? "Criando..." : "Criar Pagamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Kanban Board ───
export default function PaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newDealOpen, setNewDealOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadPayments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profRaw } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    const profileData = profRaw as Profile | null;
    if (profileData) setProfile(profileData);

    let query = supabase
      .from("payments")
      .select("*")
      .order("due_date", { ascending: true });

    if (profileData?.role === "gerente" && profileData.filial) {
      query = query.eq("filial", profileData.filial);
    } else if (profileData?.role === "colaborador") {
      query = query.or(
        `responsible_id.eq.${user.id},creator_id.eq.${user.id}`
      );
    }

    const { data } = await query;
    if (data) setPayments(data as Payment[]);
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const getPaymentsByStage = (stage: PaymentStage) =>
    payments.filter((p) => p.stage === stage);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const paymentId = active.id as string;
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;

    // Determine new stage based on where it was dropped
    // The over.id is the stage key or another payment id
    let newStage = over.id as string;
    if (!PAYMENT_STAGES[newStage as PaymentStage]) {
      // Dropped on another payment - find its stage
      const overPayment = payments.find((p) => p.id === over.id);
      if (overPayment) newStage = overPayment.stage;
      else return;
    }

    if (newStage === payment.stage) return;

    // Optimistic update
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId ? { ...p, stage: newStage as PaymentStage } : p
      )
    );

    // Persist
    await supabase
      .from("payments")
      .update({ stage: newStage, updated_at: new Date().toISOString() } as never)
      .eq("id", paymentId);

    await supabase
      .from("timeline_entries")
      .insert({
        entity_type: "payment",
        entity_id: paymentId,
        type: "status_change",
        content: `Movido para "${PAYMENT_STAGES[newStage as PaymentStage]?.label}"`,
        author_id: profile?.id || null,
      } as never);
  };

  const isOverdue = (stage: PaymentStage) => stage === "overdue";

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Pagamentos</h1>
          <p className="text-sm text-slate-400 mt-1">
            {payments.length} pagamentos no total ·{" "}
            {formatCurrency(payments.reduce((s, p) => s + Number(p.amount), 0))}
          </p>
        </div>
        <Button
          onClick={() => setNewDealOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Pagamento
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PAYMENT_STAGE_ORDER.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              payments={getPaymentsByStage(stage)}
              onOpenDeal={(deal) => {}}
              isOverdue={isOverdue(stage)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-slate-800 rounded-lg p-3 border border-cyan-500 shadow-lg">
              <p className="text-sm text-white">
                {payments.find((p) => p.id === activeId)?.title}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <NewDealDialog
        open={newDealOpen}
        onOpenChange={setNewDealOpen}
        onCreated={loadPayments}
      />
    </div>
  );
}
