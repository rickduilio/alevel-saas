import type { PaymentStage, TaskPriority, Filial, Role, EventStatus } from "@/types/database";

export const PAYMENT_STAGES: Record<PaymentStage, { label: string; color: string }> = {
  received: { label: "Solicitações Recebidas", color: "bg-blue-500" },
  analysis: { label: "Em Análise", color: "bg-yellow-500" },
  authorized: { label: "Autorizados", color: "bg-green-500" },
  overdue: { label: "Atrasados", color: "bg-red-500" },
  today: { label: "Pagamentos de Hoje", color: "bg-orange-500" },
  tomorrow: { label: "Pagamentos Amanhã", color: "bg-amber-500" },
  "2_7_days": { label: "Pagamentos de 2 a 7 dias", color: "bg-lime-500" },
  "8_30_days": { label: "Pagamentos de 8 a 30 dias", color: "bg-emerald-500" },
  "31_60_days": { label: "Pagamentos de 31 a 60 dias", color: "bg-teal-500" },
  "61_plus": { label: "Pagamentos 61 em diante", color: "bg-cyan-500" },
  scheduled: { label: "Agendado", color: "bg-indigo-500" },
  paid: { label: "Pagamento Realizado", color: "bg-green-700" },
  completed: { label: "Solicitações Concluídas", color: "bg-gray-500" },
  cancelled: { label: "Solicitações Canceladas", color: "bg-gray-700" },
};

export const PAYMENT_STAGE_ORDER: PaymentStage[] = [
  "received", "analysis", "authorized", "overdue",
  "today", "tomorrow", "2_7_days", "8_30_days",
  "31_60_days", "61_plus", "scheduled",
  "paid", "completed", "cancelled",
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  P0: "P0 - Urgente (3h)",
  P1: "P1 - Alta (6h)",
  P2: "P2 - Média (12h)",
  P3: "P3 - Baixa (24h)",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  P0: "bg-red-500",
  P1: "bg-orange-500",
  P2: "bg-yellow-500",
  P3: "bg-gray-400",
};

export const FILIAIS: { value: Filial; label: string }[] = [
  { value: "rio", label: "Rio" },
  { value: "ba", label: "Bahia" },
  { value: "sp", label: "São Paulo" },
  { value: "sul", label: "Sul" },
  { value: "nacional", label: "Nacional" },
];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  gerente: "Gerente",
  colaborador: "Colaborador",
  visualizador: "Visualizador",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  planned: "Planejado",
  confirmed: "Confirmado",
  in_progress: "Em Andamento",
  done: "Realizado",
  cancelled: "Cancelado",
};

export const PAYMENT_TYPES = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "card", label: "Cartão" },
  { value: "transfer", label: "Transferência" },
];

export const RECEIVABLE_TYPES = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "card", label: "Cartão" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
];

export const ACCOUNT_TYPES = [
  { value: "checking", label: "Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "salary", label: "Salário" },
];

export const BANCOS_BRASIL = [
  "Banco do Brasil", "Caixa Econômica Federal", "Itaú", "Bradesco",
  "Santander", "Safra", "BTG Pactual", "Inter", "Nubank", "C6 Bank",
  "Original", "Banrisul", "Banestes", "BRB", "Daycoval", "Mercantil",
  "Pine", "ABC Brasil", "Fibra", "Modal", "Neon", "PagBank",
  "Sicredi", "Sicoob", "Unicred", "Cresol",
];

export const NATUREZAS_CUSTO = [
  "Nacional", "Bahia", "Rio", "SP", "Sul",
];

export const FILIAL_MAP: Record<string, Filial> = {
  Nacional: "nacional",
  Bahia: "ba",
  Rio: "rio",
  SP: "sp",
  Sul: "sul",
};
