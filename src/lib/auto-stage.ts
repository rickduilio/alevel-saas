import type { PaymentStage } from "@/types/database";

/**
 * Calcula o estágio automático de um pagamento baseado na data de vencimento.
 * Regras:
 * - Venceu hoje → overdue
 * - Vence hoje → today
 * - Vence amanhã → tomorrow
 * - Vence em 2-7 dias → 2_7_days
 * - Vence em 8-30 dias → 8_30_days
 * - Vence em 31-60 dias → 31_60_days
 * - Vence em 61+ dias → 61_plus
 */
export function calculateAutoStage(dueDate: string): PaymentStage {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 7) return "2_7_days";
  if (diffDays <= 30) return "8_30_days";
  if (diffDays <= 60) return "31_60_days";
  return "61_plus";
}

/**
 * Função SQL para criar um trigger que atualiza o estágio automaticamente.
 * Pode ser executada no Supabase.
 */
export const AUTO_STAGE_TRIGGER_SQL = `
CREATE OR REPLACE FUNCTION auto_calculate_payment_stage()
RETURNS TRIGGER AS $$
DECLARE
  diff_days INT;
BEGIN
  diff_days := (NEW.due_date - CURRENT_DATE);
  
  -- Só recalcula se o pagamento não estiver em estágio final
  IF NEW.stage IN ('paid', 'completed', 'cancelled', 'authorized', 'scheduled') THEN
    RETURN NEW;
  END IF;

  IF diff_days < 0 THEN
    NEW.stage := 'overdue';
  ELSIF diff_days = 0 THEN
    NEW.stage := 'today';
  ELSIF diff_days = 1 THEN
    NEW.stage := 'tomorrow';
  ELSIF diff_days <= 7 THEN
    NEW.stage := '2_7_days';
  ELSIF diff_days <= 30 THEN
    NEW.stage := '8_30_days';
  ELSIF diff_days <= 60 THEN
    NEW.stage := '31_60_days';
  ELSE
    NEW.stage := '61_plus';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_stage ON payments;
CREATE TRIGGER trg_auto_stage
  BEFORE INSERT OR UPDATE OF due_date ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_payment_stage();
`;
