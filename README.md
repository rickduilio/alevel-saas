# 🚀 ALevel SaaS

**Gestão Financeira e Operacional para Eventos**

Sistema completo de CRM + Tasks + Formulários Externos, construído com Next.js, Supabase e shadcn/ui. Substitui o Bitrix24 (apenas módulos CRM + Tasks) + formulários n8n.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 + TypeScript + TailwindCSS |
| UI | shadcn/ui (Radix UI + Tailwind) |
| Estado | TanStack Query + Zustand |
| Banco | Supabase PostgreSQL |
| Auth | Supabase Auth (email/senha) |
| Storage | Supabase Storage (anexos) |
| Realtime | Supabase Realtime (timeline) |

## Módulos

### 1. Pagamentos (Saídas)
- Kanban com 14 estágios
- Drag & drop entre colunas
- Campos: favorecido, banco, agência, conta, PIX, tipo, departamento
- Aprovação inline (gerente até R$50k, admin acima)
- Timeline com comentários + @menção
- Anexos: comprovante, orçamento, boleto, reembolso
- Cálculo automático de estágio baseado no vencimento

### 2. Recebimentos (Entradas)
- Pipeline: A Receber → Parcial → Recebido → Cancelado
- Parcelamento com saldo devedor automático

### 3. Eventos
- Cadastro com data, local, filial, status
- Dashboard: receita vs despesa vs margem
- Pagamentos e recebimentos vinculados

### 4. Tarefas
- Kanban (admin/gerente) + Lista (todos)
- SLA automático: P0=3h, P1=6h, P2=12h, P3=24h
- Timer regressivo no card
- Filtros combinados (prioridade, status, filial)
- Comentários em thread

### 5. Formulários Externos
- **Individual público** — solicitação de pagamento sem login
- **Lote autenticado** — tabela Excel com múltiplas linhas, autocomplete bancos, validação inline
- **Builder visual** — editor de campos com preview ao vivo

### 6. Dashboard
- Cards financeiros (pipeline, atrasados, a receber, tarefas)
- Gráfico de pagamentos por estágio
- Minhas Tarefas (visão pessoal)
- Próximos Eventos

### 7. Sistema de Permissões (RBAC)
- **admin:** Acesso total, todas filiais
- **gerente:** Acesso por filial, aprova até R$50k
- **colaborador:** Só registros próprios
- **visualizador:** Só acompanhante

## Features Transversais

- 🔍 **Busca global** (Cmd+K / Ctrl+K)
- 🔔 **Notificações** in-app (tarefas atrasadas, pagamentos vencidos)
- 📎 **Upload de anexos** drag & drop (Supabase Storage)
- 📊 **Export CSV** de pagamentos
- ⚡ **Quick Create** — botão flutuante "+"
- 🌙 **Dark mode** nativo
- 📱 **PWA** — instalável no celular
- 🔒 **RLS** no Supabase (Row Level Security)

## Seed Data

| Tipo | Qtd |
|---|---|
| Usuários | 5 (2 admin, 1 gerente, 2 colaborador) |
| Empresas | 2 |
| Contatos | 3 |
| Eventos | 3 |
| Pagamentos | 8 |
| Tarefas | 10 |

### Acessos
| Email | Senha | Role | Filial |
|---|---|---|---|
| rick@grupoonda.art.br | admin123 | admin | Rio |
| jaison@grupoonda.art.br | admin123 | admin | Nacional |
| diogo@grupoonda.art.br | gerente123 | gerente | Rio |
| maria@grupoonda.art.br | colab123 | colaborador | Rio |
| carlos@grupoonda.art.br | colab123 | colaborador | BA |

## Deploy

```bash
npm install
npm run dev
# http://localhost:3000
```

Produção: https://alevel-saas.vercel.app

## Repositório

https://github.com/rickduilio/alevel-saas

---

🤖 **Jarvis · Grupo Onda**
