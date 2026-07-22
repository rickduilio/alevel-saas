"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomForm } from "@/types/database";
import { CheckCircle, Loader2 } from "lucide-react";

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();

  const [form, setForm] = useState<CustomForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data } = await supabase
        .from("custom_forms")
        .select("*")
        .eq("slug", slug)
        .single();

      const formData = data as CustomForm | null;
      if (!formData) {
        setNotFound(true);
      } else if (formData.status !== "published") {
        setNotFound(true);
      } else {
        setForm(formData);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    // Insert submission
    const { error: submitError } = await supabase.from("form_submissions").insert({
      form_id: form?.id,
      data,
      ip_address: "collected",
      status: "processed",
    } as never);

    if (submitError) {
      setError("Erro ao enviar. Tente novamente.");
      setSubmitting(false);
      return;
    }

    // If it's a payment form, create a basic payment
    if (form?.target_entity === "payment" && data.email) {
      await supabase.from("payments").insert({
        title: data.nome_pagamento || `Solicitação - ${data.nome || "Sem nome"}`,
        amount: parseFloat(data.valor_total as string) || 0,
        due_date: data.data_vencimento as string || new Date().toISOString().split("T")[0],
        favored_name: data.nome_completo_favorecido as string || data.nome as string || "Pendente",
        filial: "rio",
        stage: "received",
        description: `Enviado via formulário: ${form?.name}`,
        notification_emails: [data.email as string],
      } as never);
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-white text-lg">Formulário não encontrado</p>
            <p className="text-slate-400 text-sm mt-2">
              Este formulário pode estar desativado ou o link está incorreto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <p className="text-white text-xl font-medium">Recebemos sua solicitação! ✅</p>
            <p className="text-slate-400 text-sm mt-2">
              Sua solicitação foi enviada com sucesso. Em breve entraremos em contato.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fields: Array<{ label: string; type: string; required: boolean; key: string }> =
    (form?.fields as any)?.fields || [];

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <Card className="max-w-2xl mx-auto bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">{form?.name}</CardTitle>
          {form?.description && (
            <p className="text-slate-400 text-sm">{form.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="text-sm text-slate-300 block mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.key}
                    required={field.required}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                    rows={3}
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    name={field.key}
                    required={field.required}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                  />
                )}
              </div>
            ))}

            {/* Payment-specific fields */}
            {form?.target_entity === "payment" && (
              <>
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-cyan-400 mb-3">Dados do Pagamento</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300">Nome do Pagamento</label>
                    <input name="nome_pagamento" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300">Valor Total (R$)</label>
                    <input name="valor_total" type="number" step="0.01" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300">Data de Vencimento</label>
                    <input name="data_vencimento" type="date" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300">Tipo</label>
                    <select name="tipo_pagamento" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm">
                      <option value="">Selecione</option>
                      <option value="pix">PIX / Transferência</option>
                      <option value="boleto">Boleto</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300">Nome Completo do Favorecido</label>
                  <input name="nome_completo_favorecido" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700 mt-6"
              disabled={submitting}
            >
              {submitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
