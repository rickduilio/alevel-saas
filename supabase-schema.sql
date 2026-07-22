-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'colaborador' CHECK (role IN ('admin', 'gerente', 'colaborador', 'visualizador')),
  filial TEXT CHECK (filial IN ('rio', 'ba', 'sp', 'sul', 'nacional')),
  access_code TEXT,
  allowed_cost_centers TEXT[],
  allowed_events UUID[],
  is_vip BOOLEAN DEFAULT false,
  approval_limit DECIMAL(12,2) DEFAULT 50000.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. COMPANIES
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  document TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CONTACTS
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('pf', 'pj')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  company_id UUID REFERENCES companies(id),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  venue TEXT,
  filial TEXT NOT NULL CHECK (filial IN ('rio', 'ba', 'sp', 'sul', 'nacional')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'in_progress', 'done', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PAYMENTS (Pagamentos)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  installment_number INT DEFAULT 1,
  installment_amount DECIMAL(12,2),
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_type TEXT CHECK (payment_type IN ('pix', 'boleto', 'card', 'transfer')),
  invoice TEXT,
  cost_center TEXT,
  department TEXT,
  is_reimbursement BOOLEAN DEFAULT false,
  pix_key TEXT,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  favored_name TEXT NOT NULL,
  favored_document TEXT,
  favored_bank TEXT,
  favored_agency TEXT,
  favored_account TEXT,
  favored_account_type TEXT CHECK (favored_account_type IN ('checking', 'savings', 'salary')),
  event_id UUID REFERENCES events(id),
  contact_id UUID REFERENCES contacts(id),
  company_id UUID REFERENCES companies(id),
  responsible_id UUID REFERENCES profiles(id),
  creator_id UUID REFERENCES profiles(id),
  filial TEXT NOT NULL CHECK (filial IN ('rio', 'ba', 'sp', 'sul', 'nacional')),
  notification_emails TEXT[],
  stage TEXT NOT NULL DEFAULT 'received' CHECK (stage IN (
    'received', 'analysis', 'authorized', 'overdue',
    'today', 'tomorrow', '2_7_days', '8_30_days',
    '31_60_days', '61_plus', 'scheduled',
    'paid', 'completed', 'cancelled'
  )),
  closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RECEIVABLES
CREATE TABLE receivables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  received_amount DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - received_amount) STORED,
  due_date DATE NOT NULL,
  received_date DATE,
  payment_type TEXT CHECK (payment_type IN ('pix', 'boleto', 'card', 'cash', 'transfer')),
  event_id UUID REFERENCES events(id),
  payer_contact_id UUID REFERENCES contacts(id),
  payer_company_id UUID REFERENCES companies(id),
  responsible_id UUID REFERENCES profiles(id),
  stage TEXT NOT NULL DEFAULT 'pending' CHECK (stage IN ('pending', 'partial', 'received', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. INSTALLMENTS
CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  received_amount DECIMAL(12,2) DEFAULT 0,
  received_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  sla_hours INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  deadline TIMESTAMPTZ NOT NULL,
  filial TEXT CHECK (filial IN ('rio', 'ba', 'sp', 'sul', 'nacional')),
  responsible_id UUID REFERENCES profiles(id),
  creator_id UUID REFERENCES profiles(id),
  deal_id UUID,
  deal_type TEXT CHECK (deal_type IN ('payment', 'receivable', 'event')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TIMELINE ENTRIES
CREATE TABLE timeline_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'status_change', 'attachment', 'field_change', 'system')),
  content TEXT,
  metadata JSONB,
  author_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. ATTACHMENTS
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comprovante', 'reembolso', 'orcamento', 'boleto', 'outros')),
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. TASK COMMENTS
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. CUSTOM FORMS
CREATE TABLE custom_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  target_entity TEXT NOT NULL CHECK (target_entity IN ('payment', 'receivable')),
  webhook_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'disabled')),
  require_auth BOOLEAN DEFAULT false,
  fields JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. FORM SUBMISSIONS
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES custom_forms(id),
  data JSONB NOT NULL,
  submitted_by UUID REFERENCES profiles(id),
  ip_address TEXT,
  status TEXT DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'duplicate')),
  entity_type TEXT,
  entity_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_payments_filial ON payments(filial);
CREATE INDEX idx_payments_stage ON payments(stage);
CREATE INDEX idx_payments_responsible ON payments(responsible_id);
CREATE INDEX idx_payments_creator ON payments(creator_id);
CREATE INDEX idx_receivables_stage ON receivables(stage);
CREATE INDEX idx_receivables_responsible ON receivables(responsible_id);
CREATE INDEX idx_tasks_responsible ON tasks(responsible_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_filial ON tasks(filial);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_events_filial ON events(filial);
CREATE INDEX idx_timeline_entity ON timeline_entries(entity_type, entity_id);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
-- Admin: tudo
CREATE POLICY admin_all ON profiles FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_companies ON companies FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_contacts ON contacts FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_events ON events FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_payments ON payments FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_receivables ON receivables FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_installments ON installments FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_tasks ON tasks FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_timeline ON timeline_entries FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY admin_all_attachments ON attachments FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- Gerente: vê da própria filial
CREATE POLICY gerente_payments ON payments FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'gerente' AND filial = payments.filial)
);

-- Colaborador: vê só o que é responsável ou criador
CREATE POLICY colaborador_payments ON payments FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'colaborador')
  AND (responsible_id = auth.uid() OR creator_id = auth.uid()
       OR auth.uid() = ANY(COALESCE(notification_emails, ARRAY[]::TEXT[])::uuid[]))
);

-- Visualizador: vê onde é acompanhante
CREATE POLICY visualizador_payments ON payments FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'visualizador')
  AND auth.uid() = ANY(COALESCE(notification_emails, ARRAY[]::TEXT[])::uuid[])
);

-- Profile: cada um vê o próprio
CREATE POLICY profile_self ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profile_insert ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profile_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
