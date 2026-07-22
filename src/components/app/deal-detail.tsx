"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Info,
  MessageSquare,
  Paperclip,
  History,
  Send,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  DollarSign,
  Banknote,
  Building2,
  Tag,
} from "lucide-react";
import type { Payment, TimelineEntry, Attachment, Profile, PaymentStage } from "@/types/database";
import { PAYMENT_STAGES, PAYMENT_TYPES, ACCOUNT_TYPES, FILIAIS } from "@/lib/constants";
import { calculateAutoStage } from "@/lib/auto-stage";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

export function DealDetailDialog({
  dealId,
  open,
  onOpenChange,
  onUpdated,
}: {
  dealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [deal, setDeal] = useState<Payment | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Load data
  useEffect(() => {
    if (!dealId || !open) return;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (prof) setProfile(prof as Profile);
      }

      const { data: d } = await supabase
        .from("payments")
        .select("*")
        .eq("id", dealId)
        .single();
      if (d) setDeal(d as Payment);

      const { data: tl } = await supabase
        .from("timeline_entries")
        .select("*")
        .eq("entity_type", "payment")
        .eq("entity_id", dealId)
        .order("created_at", { ascending: false });
      if (tl) setTimeline(tl as TimelineEntry[]);

      const { data: att } = await supabase
        .from("attachments")
        .select("*")
        .eq("entity_type", "payment")
        .eq("entity_id", dealId)
        .order("created_at", { ascending: false });
      if (att) setAttachments(att as Attachment[]);
    };
    load();
  }, [dealId, open]);

  if (!deal) return null;

  // Handle approval
  const handleApproval = async (approve: boolean) => {
    await supabase
      .from("payments")
      .update({
        approved: approve,
        approved_at: new Date().toISOString(),
        stage: approve ? "authorized" : "received",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", deal.id);

    await supabase.from("timeline_entries").insert({
      entity_type: "payment",
      entity_id: deal.id,
      type: "status_change",
      content: approve
        ? `Pagamento aprovado por ${profile?.name}`
        : `Aprovação recusada por ${profile?.name}`,
      author_id: profile?.id,
    } as never);

    onUpdated();
    setDeal((prev) =>
      prev
        ? { ...prev, approved: approve, stage: approve ? "authorized" : "received" }
        : prev
    );
  };

  // Handle comment
  const handleComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);

    await supabase.from("timeline_entries").insert({
      entity_type: "payment",
      entity_id: deal.id,
      type: "comment",
      content: comment,
      author_id: profile?.id,
    } as never);

    setComment("");
    setSendingComment(false);

    // Reload timeline
    const { data: tl } = await supabase
      .from("timeline_entries")
      .select("*")
      .eq("entity_type", "payment")
      .eq("entity_id", deal.id)
      .order("created_at", { ascending: false });
    if (tl) setTimeline(tl as TimelineEntry[]);
  };

  const InfoField = ({
    label,
    value,
    icon,
    highlight,
  }: {
    label: string;
    value: string | null | undefined;
    icon?: React.ReactNode;
    highlight?: boolean;
  }) => (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={cn("text-sm", highlight ? "text-cyan-400 font-bold" : "text-slate-200")}>
        {value || "—"}
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl text-white">
                {deal.title}
              </DialogTitle>
              <p className="text-sm text-slate-400 mt-1">
                {PAYMENT_STAGES[deal.stage]?.label} · {deal.favored_name}
                {(() => {
                  const autoStage = calculateAutoStage(deal.due_date);
                  if (autoStage !== deal.stage && !['paid','completed','cancelled','authorized','scheduled'].includes(deal.stage)) {
                    return (
                      <span className="text-xs text-yellow-400 ml-2">
                        (calculado: {PAYMENT_STAGES[autoStage]?.label})
                      </span>
                    );
                  }
                  return null;
                })()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {deal.approved ? (
                <Badge className="bg-green-600">Aprovado</Badge>
              ) : deal.stage !== "completed" && deal.stage !== "cancelled" ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 h-8"
                    onClick={() => handleApproval(true)}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8"
                    onClick={() => handleApproval(false)}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Recusar
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="info" className="data-[state=active]:bg-slate-700">
              <Info className="h-4 w-4 mr-1" /> Informações
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-slate-700">
              <MessageSquare className="h-4 w-4 mr-1" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="attachments" className="data-[state=active]:bg-slate-700">
              <Paperclip className="h-4 w-4 mr-1" /> Anexos
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
              <History className="h-4 w-4 mr-1" /> Histórico
            </TabsTrigger>
          </TabsList>

          {/* ─── INFO TAB ─── */}
          <TabsContent value="info" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <InfoField
                label="Valor"
                value={formatCurrency(Number(deal.amount))}
                icon={<DollarSign className="h-3 w-3 text-green-400" />}
                highlight
              />
              <InfoField
                label="Data de Vencimento"
                value={formatDate(deal.due_date)}
                icon={<Calendar className="h-3 w-3 text-cyan-400" />}
              />
              <InfoField
                label="Tipo de Pagamento"
                value={PAYMENT_TYPES.find((t) => t.value === deal.payment_type)?.label || "—"}
                icon={<Banknote className="h-3 w-3 text-yellow-400" />}
              />
              <InfoField
                label="Departamento"
                value={deal.department}
                icon={<Tag className="h-3 w-3 text-purple-400" />}
              />
              <InfoField
                label="Centro de Custo"
                value={deal.cost_center}
                icon={<Building2 className="h-3 w-3 text-indigo-400" />}
              />
              <InfoField
                label="Filial"
                value={FILIAIS.find((f) => f.value === deal.filial)?.label || "—"}
                icon={<Building2 className="h-3 w-3 text-blue-400" />}
              />
              <InfoField
                label="Nota Fiscal"
                value={deal.invoice}
              />
              <InfoField
                label="Reembolso"
                value={deal.is_reimbursement ? "Sim" : "Não"}
              />
              <InfoField
                label="Data de Pagamento"
                value={deal.payment_date ? formatDate(deal.payment_date) : "—"}
              />
            </div>

            {deal.description && (
              <div>
                <h4 className="text-sm text-slate-400 mb-2">Descrição / Detalhe</h4>
                <p className="text-sm text-slate-200 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  {deal.description}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-3">Dados do Favorecido</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <InfoField label="Nome Completo" value={deal.favored_name} icon={<User className="h-3 w-3" />} />
                <InfoField label="CPF/CNPJ" value={deal.favored_document} />
                <InfoField label="Banco" value={deal.favored_bank} />
                <InfoField label="Agência" value={deal.favored_agency} />
                <InfoField label="Conta" value={deal.favored_account} />
                <InfoField
                  label="Tipo de Conta"
                  value={ACCOUNT_TYPES.find((t) => t.value === deal.favored_account_type)?.label || "—"}
                />
                <InfoField label="Chave PIX" value={deal.pix_key} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-3">Controle</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <InfoField
                  label="Aprovação"
                  value={deal.approved ? "Aprovado" : "Pendente"}
                  icon={deal.approved ? <CheckCircle className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-yellow-400" />}
                />
                {deal.approved_at && (
                  <InfoField label="Aprovado em" value={formatDateTime(deal.approved_at)} />
                )}
                <InfoField
                  label="Emails de Acompanhamento"
                  value={deal.notification_emails?.join(", ") || "—"}
                />
              </div>
            </div>
          </TabsContent>

          {/* ─── TIMELINE TAB ─── */}
          <TabsContent value="timeline" className="mt-4">
            <div className="flex gap-3 mb-4">
              <Textarea
                placeholder="Escreva um comentário... (use @ para mencionar)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white flex-1 min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
              />
              <Button
                size="icon"
                className="bg-cyan-600 hover:bg-cyan-700 self-end"
                onClick={handleComment}
                disabled={sendingComment || !comment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {timeline.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">
                  Nenhuma atividade registrada
                </p>
              )}
              {timeline.map((entry) => (
                <div
                  key={entry.id}
                  className="flex gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-800"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {entry.type === "comment" ? (
                      <MessageSquare className="h-4 w-4 text-cyan-400" />
                    ) : entry.type === "status_change" ? (
                      <History className="h-4 w-4 text-yellow-400" />
                    ) : entry.type === "attachment" ? (
                      <Paperclip className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Info className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{entry.content}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ─── ATTACHMENTS TAB ─── */}
          <TabsContent value="attachments" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {attachments.length === 0 && (
                <p className="text-sm text-slate-500 col-span-full text-center py-8">
                  Nenhum anexo
                </p>
              )}
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <p className="text-sm text-slate-200 truncate">{att.filename}</p>
                  <p className="text-xs text-slate-500 mt-1">{att.type}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ─── HISTORY TAB ─── */}
          <TabsContent value="history" className="mt-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {timeline
                .filter((e) => e.type !== "comment")
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-2 text-sm text-slate-400"
                  >
                    <span className="text-xs text-slate-600 flex-shrink-0">
                      {formatDateTime(entry.created_at)}
                    </span>
                    <span>{entry.content}</span>
                  </div>
                ))}
              {timeline.filter((e) => e.type !== "comment").length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">
                  Nenhuma alteração registrada
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
