"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Calendar, MapPin, TrendingUp, TrendingDown, DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Event, Payment, Receivable } from "@/types/database";
import { EVENT_STATUS_LABELS, FILIAIS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function NewEventDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    await supabase.from("events").insert({
      name: form.get("name") as string,
      city: form.get("city") as string || null,
      state: form.get("state") as string || null,
      event_date: form.get("event_date") as string,
      end_date: form.get("end_date") as string || null,
      venue: form.get("venue") as string || null,
      filial: form.get("filial") as string,
      status: "planned",
    } as never);

    setLoading(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
        <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Nome do Evento *</label>
            <input name="name" required className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">Cidade</label>
              <input name="city" className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-300">Estado</label>
              <input name="state" className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-300">Data do Evento *</label>
              <input name="event_date" type="date" required className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-300">Data Final</label>
              <input name="end_date" type="date" className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-300">Local</label>
              <input name="venue" className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-300">Filial *</label>
              <select name="filial" className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm">
                {FILIAIS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
            {loading ? "Criando..." : "Criar Evento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailDialog({
  eventId, open, onOpenChange,
}: {
  eventId: string | null; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const supabase = createClient();
  const [event, setEvent] = useState<Event | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);

  useEffect(() => {
    if (!eventId || !open) return;
    const load = async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (ev) setEvent(ev as Event);

      const { data: p } = await supabase.from("payments").select("*").eq("event_id", eventId);
      if (p) setPayments(p as Payment[]);

      const { data: r } = await supabase.from("receivables").select("*").eq("event_id", eventId);
      if (r) setReceivables(r as Receivable[]);
    };
    load();
  }, [eventId, open]);

  if (!event) return null;

  const totalDespesas = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalReceitas = receivables.filter(r => r.stage !== "cancelled").reduce((s, r) => s + Number(r.total_amount), 0);
  const margem = totalReceitas - totalDespesas;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{event.name}</DialogTitle>
              <p className="text-sm text-slate-400 mt-1">
                {event.city && `${event.city}${event.state ? `, ${event.state}` : ""} · `}
                {formatDate(event.event_date)}
                {event.end_date && ` até ${formatDate(event.end_date)}`}
              </p>
            </div>
            <Badge>{EVENT_STATUS_LABELS[event.status]}</Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-green-400 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Receita
            </CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold text-green-400">{formatCurrency(totalReceitas)}</p></CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-red-400 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" /> Despesa
            </CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold text-red-400">{formatCurrency(totalDespesas)}</p></CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-cyan-400 flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Margem
            </CardTitle></CardHeader>
            <CardContent>
              <p className={cn("text-xl font-bold", margem >= 0 ? "text-green-400" : "text-red-400")}>
                {formatCurrency(margem)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="text-sm text-slate-400 mb-2">Pagamentos ({payments.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {payments.map((p) => (
                <div key={p.id} className="p-2 bg-slate-800/50 rounded text-sm flex justify-between">
                  <span className="text-slate-300 truncate mr-2">{p.title}</span>
                  <span className="text-slate-400 flex-shrink-0">{formatCurrency(Number(p.amount))}</span>
                </div>
              ))}
              {payments.length === 0 && <p className="text-xs text-slate-600">Nenhum pagamento vinculado</p>}
            </div>
          </div>
          <div>
            <h4 className="text-sm text-slate-400 mb-2">Recebimentos ({receivables.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {receivables.map((r) => (
                <div key={r.id} className="p-2 bg-slate-800/50 rounded text-sm flex justify-between">
                  <span className="text-slate-300 truncate mr-2">{r.title}</span>
                  <span className="text-slate-400 flex-shrink-0">{formatCurrency(Number(r.total_amount))}</span>
                </div>
              ))}
              {receivables.length === 0 && <p className="text-xs text-slate-600">Nenhum recebimento vinculado</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventosPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const loadEvents = async () => {
    const query = supabase.from("events").select("*").order("event_date", { ascending: true });
    const { data } = await query;
    if (data) setEvents(data as Event[]);
  };

  useEffect(() => { loadEvents(); }, []);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos</h1>
          <p className="text-sm text-slate-400 mt-1">{events.length} eventos cadastrados</p>
        </div>
        <Button onClick={() => setNewEventOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" /> Novo Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => setSelectedEvent(event.id)}
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 cursor-pointer hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-white font-medium">{event.name}</h3>
              <Badge className={cn(
                event.status === "planned" && "bg-slate-600",
                event.status === "confirmed" && "bg-cyan-600",
                event.status === "in_progress" && "bg-yellow-600",
                event.status === "done" && "bg-green-600",
                event.status === "cancelled" && "bg-red-600",
              )}>{EVENT_STATUS_LABELS[event.status]}</Badge>
            </div>
            <div className="space-y-1 text-sm text-slate-400">
              {(event.city || event.state) && (
                <p className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.city}{event.state ? `, ${event.state}` : ""}
                </p>
              )}
              <p className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(event.event_date)}{event.end_date ? ` — ${formatDate(event.end_date)}` : ""}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {FILIAIS.find((f) => f.value === event.filial)?.label}
                {event.venue ? ` · ${event.venue}` : ""}
              </p>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500">Nenhum evento cadastrado</p>
          </div>
        )}
      </div>

      <NewEventDialog open={newEventOpen} onOpenChange={setNewEventOpen} onCreated={loadEvents} />
      <EventDetailDialog eventId={selectedEvent} open={!!selectedEvent} onOpenChange={(o) => { if (!o) setSelectedEvent(null); }} />
    </div>
  );
}
