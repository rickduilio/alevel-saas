-- 🔥 SEED DATA — ALevel SaaS
-- Executar após criar as tabelas com supabase-schema.sql

-- 1. Criar usuários no auth.users (via API é melhor, mas aqui via SQL direto)
-- NOTA: Senhas serão redefinidas via "Forgot password" no login

-- Inserir profiles manualmente (os usuários auth.users precisam ser criados primeiro)
-- Vamos criar via função

-- Função para criar usuário + profile
CREATE OR REPLACE FUNCTION create_user_with_profile(
  p_email TEXT, p_password TEXT, p_name TEXT, p_role TEXT, p_filial TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Inserir em auth.users
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('name', p_name)
  )
  RETURNING id INTO v_user_id;

  -- Inserir em profiles
  INSERT INTO profiles (id, email, name, role, filial)
  VALUES (v_user_id, p_email, p_name, p_role, p_filial);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar usuários
SELECT create_user_with_profile('rick@grupoonda.art.br', 'admin123', 'Rick Piragibe', 'admin', 'rio');
SELECT create_user_with_profile('jaison@grupoonda.art.br', 'admin123', 'Jaison Vieira', 'admin', 'nacional');
SELECT create_user_with_profile('diogo@grupoonda.art.br', 'gerente123', 'Diogo Piragibe', 'gerente', 'rio');
SELECT create_user_with_profile('maria@grupoonda.art.br', 'colab123', 'Maria Souza', 'colaborador', 'rio');
SELECT create_user_with_profile('carlos@grupoonda.art.br', 'colab123', 'Carlos Silva', 'colaborador', 'ba');

-- Obter IDs para referência
DO $$
DECLARE
  v_rick UUID; v_jaison UUID; v_diogo UUID; v_maria UUID; v_carlos UUID;
  v_evento_rio UUID; v_evento_sp UUID; v_evento_salvador UUID;
  v_contato1 UUID; v_contato2 UUID; v_empresa1 UUID;
BEGIN
  SELECT id INTO v_rick FROM profiles WHERE email = 'rick@grupoonda.art.br';
  SELECT id INTO v_jaison FROM profiles WHERE email = 'jaison@grupoonda.art.br';
  SELECT id INTO v_diogo FROM profiles WHERE email = 'diogo@grupoonda.art.br';
  SELECT id INTO v_maria FROM profiles WHERE email = 'maria@grupoonda.art.br';
  SELECT id INTO v_carlos FROM profiles WHERE email = 'carlos@grupoonda.art.br';

  -- Companies
  INSERT INTO companies (legal_name, trading_name, document, phone) VALUES
    ('Produções Musicais Ltda', 'ProdMusic', '12.345.678/0001-90', '(21) 99999-0001'),
    ('Eventos Brasil S.A.', 'EventosBR', '98.765.432/0001-10', '(11) 98888-0002'),
    ('Iluminação Show Service', 'ISS Iluminação', '11.222.333/0001-44', '(71) 97777-0003'),
    ('Transportes Artísticos Ltda', 'TransArt', '55.666.777/0001-88', '(21) 96666-0004'),
    ('Buffet & Catering Eventos', 'Buffet Premium', '99.888.777/0001-55', '(11) 95555-0005')
  RETURNING id INTO v_empresa1;

  -- Contacts
  INSERT INTO contacts (type, name, email, phone, document, company_id) VALUES
    ('pf', 'João Silva', 'joao@prodmusic.com.br', '(21) 99999-0011', '123.456.789-00', (SELECT id FROM companies WHERE legal_name = 'Produções Musicais Ltda')),
    ('pf', 'Ana Oliveira', 'ana@eventosbr.com.br', '(11) 98888-0022', '987.654.321-00', (SELECT id FROM companies WHERE legal_name = 'Eventos Brasil S.A.')),
    ('pj', 'Som & Luz Tec', 'contato@somluztec.com.br', '(71) 97777-0033', '44.555.666/0001-77', NULL),
    ('pf', 'Pedro Santos', 'pedro@transart.com.br', '(21) 96666-0044', '111.222.333-44', (SELECT id FROM companies WHERE legal_name = 'Transportes Artísticos Ltda')),
    ('pf', 'Carla Mendes', 'carla@buffetpremium.com.br', '(11) 95555-0055', '555.666.777-88', (SELECT id FROM companies WHERE legal_name = 'Buffet & Catering Eventos'))
  RETURNING id INTO v_contato1;

  -- Events
  INSERT INTO events (name, city, state, event_date, end_date, venue, filial, status) VALUES
    ('Festival Verão Rio 2026', 'Rio de Janeiro', 'RJ', '2026-08-15', '2026-08-17', 'Marina da Glória', 'rio', 'confirmed'),
    ('Show Anitta São Paulo', 'São Paulo', 'SP', '2026-09-20', '2026-09-20', 'Allianz Parque', 'sp', 'confirmed'),
    ('Carnarildy 2026', 'Salvador', 'BA', '2027-02-13', '2027-02-16', 'Circuito Barra-Ondina', 'ba', 'planned')
  RETURNING id INTO v_evento_rio;
  SELECT id INTO v_evento_sp FROM events WHERE name = 'Show Anitta São Paulo';
  SELECT id INTO v_evento_salvador FROM events WHERE name = 'Carnarildy 2026';

  -- Payments (Pagamentos)
  INSERT INTO payments (title, amount, due_date, stage, favored_name, favored_document, favored_bank, filial, responsible_id, creator_id, event_id, payment_type, department) VALUES
    ('Cachê Artista Principal', 150000.00, '2026-08-01', 'analysis', 'João Silva', '123.456.789-00', 'Banco do Brasil', 'rio', v_diogo, v_rick, v_evento_rio, 'pix', 'Evento'),
    ('Aluguel Sonorização', 45000.00, '2026-07-28', 'authorized', 'Som & Luz Tec', '44.555.666/0001-77', 'Itaú', 'rio', v_diogo, v_maria, v_evento_rio, 'transfer', 'Evento'),
    ('Transporte Equipe', 12000.00, '2026-08-10', 'received', 'Transportes Artísticos Ltda', '55.666.777/0001-88', 'Bradesco', 'rio', v_maria, v_maria, v_evento_rio, 'boleto', 'Evento'),
    ('Buffet Camarim', 8500.00, '2026-08-05', 'today', 'Buffet Premium', '99.888.777/0001-55', 'Santander', 'rio', v_maria, v_maria, v_evento_rio, 'pix', 'Evento'),
    ('Seguro do Evento', 3200.00, '2026-07-15', 'overdue', 'Seguros ABC', '77.888.999/0001-11', 'Caixa', 'rio', v_diogo, v_diogo, v_evento_rio, 'boleto', 'Interno'),
    ('Cachê Artista SP', 200000.00, '2026-09-10', 'analysis', 'Ana Oliveira', '987.654.321-00', 'Itaú', 'sp', v_diogo, v_rick, v_evento_sp, 'pix', 'Evento'),
    ('Aluguel Allianz Parque', 80000.00, '2026-09-05', 'received', 'Allianz Parque Adm', '11.222.333/0001-44', 'Santander', 'sp', v_jaison, v_rick, v_evento_sp, 'transfer', 'Evento'),
    ('Material Gráfico SP', 15000.00, '2026-09-01', '2_7_days', 'Gráfica Rápida', '33.444.555/0001-66', 'Banco do Brasil', 'sp', v_jaison, v_maria, v_evento_sp, 'boleto', 'Evento'),
    ('Segurança SP', 22000.00, '2026-08-25', '31_60_days', 'Segurança Total Ltda', '66.777.888/0001-99', 'Bradesco', 'sp', v_jaison, v_diogo, v_evento_sp, 'transfer', 'Evento'),
    ('Estrutura Carnarildy', 350000.00, '2027-01-15', '61_plus', 'Estruturas BA Ltda', '11.333.555/0001-77', 'Banco do Brasil', 'ba', v_carlos, v_rick, v_evento_salvador, 'transfer', 'Evento'),
    ('Divulgação Carnarildy', 45000.00, '2026-12-20', '61_plus', 'Mídia Bahia', '88.999.000/0001-11', 'Caixa', 'ba', v_carlos, v_carlos, v_evento_salvador, 'boleto', 'Evento'),
    ('Reembolso Material', 2800.00, '2026-07-20', 'paid', 'Maria Souza', '222.333.444-55', 'Banco do Brasil', 'rio', v_maria, v_maria, v_evento_rio, 'pix', 'Interno'),
    ('Hotel Equipe Rio', 18000.00, '2026-08-02', 'scheduled', 'Hotel Glória', '12.345.678/0001-90', 'Itaú', 'rio', v_diogo, v_maria, v_evento_rio, 'boleto', 'Evento'),
    ('Taxas INPI', 1500.00, '2026-07-10', 'completed', 'INPI', '00.000.000/0001-91', 'Banco do Brasil', 'nacional', v_rick, v_diogo, NULL, 'boleto', 'Label'),
    ('Manutenção Site', 3500.00, '2026-07-25', 'cancelled', 'WebDev Ltda', '44.333.222/0001-11', 'Nubank', 'nacional', v_rick, v_rick, NULL, 'pix', 'Interno');

  -- Tasks
  INSERT INTO tasks (title, priority, sla_hours, status, deadline, filial, responsible_id, creator_id) VALUES
    ('Aprovar cachê artista Rio', 'P0', 3, 'todo', now() + interval '2 hours', 'rio', v_rick, v_diogo),
    ('Contratar sonorização', 'P1', 6, 'in_progress', now() + interval '5 hours', 'rio', v_diogo, v_rick),
    ('Fechar buffet camarim', 'P2', 12, 'todo', now() + interval '10 hours', 'rio', v_maria, v_diogo),
    ('Enviar contrato SP', 'P0', 3, 'in_progress', now() + interval '1 hour', 'sp', v_jaison, v_rick),
    ('Confirmar data Allianz', 'P1', 6, 'todo', now() + interval '4 hours', 'sp', v_jaison, v_diogo),
    ('Orçar material gráfico', 'P2', 12, 'todo', now() + interval '8 hours', 'sp', v_maria, v_jaison),
    ('Iniciar divulgação Carnarildy', 'P2', 12, 'todo', now() + interval '11 hours', 'ba', v_carlos, v_rick),
    ('Cronograma Carnarildy', 'P1', 6, 'todo', now() + interval '5 hours', 'ba', v_carlos, v_rick),
    ('Revisar orçamento geral', 'P1', 6, 'todo', now() + interval '4 hours', 'rio', v_diogo, v_rick),
    ('Comprar passagens equipe', 'P2', 12, 'in_progress', now() + interval '9 hours', 'rio', v_maria, v_diogo),
    ('Vistoria técnica Marina', 'P3', 24, 'todo', now() + interval '20 hours', 'rio', v_diogo, v_rick),
    ('Relatório financeiro julho', 'P2', 12, 'in_progress', now() + interval '7 hours', 'rio', v_maria, v_diogo),
    ('Reunião produtores SP', 'P1', 6, 'done', now() - interval '2 hours', 'sp', v_jaison, v_rick),
    ('Orçar segurança SP', 'P3', 24, 'done', now() - interval '1 hour', 'sp', v_jaison, v_diogo),
    ('Contatar fornecedores BA', 'P3', 24, 'todo', now() + interval '22 hours', 'ba', v_carlos, v_rick),
    ('Aprovar material gráfico', 'P0', 3, 'todo', now() + interval '3 hours', 'sp', v_rick, v_jaison),
    ('Verificar alvarás', 'P1', 6, 'todo', now() + interval '6 hours', 'rio', v_diogo, v_maria),
    ('Renovar licenças', 'P3', 24, 'in_progress', now() + interval '18 hours', 'nacional', v_rick, v_rick),
    ('Atualizar planilha financeira', 'P2', 12, 'todo', now() + interval '12 hours', 'rio', v_maria, v_diogo),
    ('Validar contratos', 'P1', 6, 'todo', now() + interval '5 hours', 'nacional', v_rick, v_jaison);
END $$;

DROP FUNCTION create_user_with_profile;
