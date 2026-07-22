export type Role = "admin" | "gerente" | "colaborador" | "visualizador";
export type Filial = "rio" | "ba" | "sp" | "sul" | "nacional";
export type PaymentStage =
  | "received"
  | "analysis"
  | "authorized"
  | "overdue"
  | "today"
  | "tomorrow"
  | "2_7_days"
  | "8_30_days"
  | "31_60_days"
  | "61_plus"
  | "scheduled"
  | "paid"
  | "completed"
  | "cancelled";
export type TaskPriority = "P0" | "P1" | "P2" | "P3";
export type TaskStatus = "todo" | "in_progress" | "done";
export type EventStatus =
  | "planned"
  | "confirmed"
  | "in_progress"
  | "done"
  | "cancelled";

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  role: Role;
  filial: Filial | null;
  access_code: string | null;
  allowed_cost_centers: string[] | null;
  allowed_events: string[] | null;
  is_vip: boolean;
  approval_limit: number;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  legal_name: string;
  trading_name: string | null;
  document: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  type: "pf" | "pj";
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  company_id: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  event_date: string;
  end_date: string | null;
  venue: string | null;
  filial: Filial;
  status: EventStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  installment_number: number;
  installment_amount: number | null;
  due_date: string;
  payment_date: string | null;
  payment_type: "pix" | "boleto" | "card" | "transfer" | null;
  invoice: string | null;
  cost_center: string | null;
  department: string | null;
  is_reimbursement: boolean;
  pix_key: string | null;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  favored_name: string;
  favored_document: string | null;
  favored_bank: string | null;
  favored_agency: string | null;
  favored_account: string | null;
  favored_account_type: "checking" | "savings" | "salary" | null;
  event_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  responsible_id: string | null;
  creator_id: string | null;
  filial: Filial;
  notification_emails: string[] | null;
  stage: PaymentStage;
  closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  title: string;
  total_amount: number;
  received_amount: number;
  balance: number;
  due_date: string;
  received_date: string | null;
  payment_type: "pix" | "boleto" | "card" | "cash" | "transfer" | null;
  event_id: string | null;
  payer_contact_id: string | null;
  payer_company_id: string | null;
  responsible_id: string | null;
  stage: "pending" | "partial" | "received" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  receivable_id: string;
  amount: number;
  due_date: string;
  received_amount: number;
  received_date: string | null;
  status: "pending" | "partial" | "paid" | "cancelled";
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  sla_hours: number;
  status: TaskStatus;
  deadline: string;
  filial: Filial | null;
  responsible_id: string | null;
  creator_id: string | null;
  deal_id: string | null;
  deal_type: "payment" | "receivable" | "event" | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  id: string;
  entity_type: "payment" | "receivable" | "event" | "task";
  entity_id: string;
  type: "comment" | "status_change" | "attachment" | "field_change" | "system";
  content: string | null;
  metadata: Record<string, unknown> | null;
  author_id: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  entity_type: "payment" | "receivable" | "task";
  entity_id: string;
  type: "comprovante" | "reembolso" | "orcamento" | "boleto" | "outros";
  filename: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  content: string;
  author_id: string | null;
  created_at: string;
}

export interface CustomForm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  target_entity: "payment" | "receivable";
  webhook_url: string | null;
  status: "draft" | "published" | "disabled";
  require_auth: boolean;
  fields: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string | null;
  data: Record<string, unknown>;
  submitted_by: string | null;
  ip_address: string | null;
  status: "processed" | "failed" | "duplicate";
  entity_type: string | null;
  entity_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile };
      companies: { Row: Company };
      contacts: { Row: Contact };
      events: { Row: Event };
      payments: { Row: Payment };
      receivables: { Row: Receivable };
      installments: { Row: Installment };
      tasks: { Row: Task };
      timeline_entries: { Row: TimelineEntry };
      attachments: { Row: Attachment };
      task_comments: { Row: TaskComment };
      custom_forms: { Row: CustomForm };
      form_submissions: { Row: FormSubmission };
    };
  };
}
