"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Globe, Lock, CheckCircle, XCircle, ExternalLink,
  Copy, Settings,
} from "lucide-react";
import type { CustomForm } from "@/types/database";
import { cn } from "@/lib/utils";

export default function FormulariosPage() {
  const supabase = createClient();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("custom_forms").select("*").order("created_at", { ascending: false });
    if (data) setForms(data as CustomForm[]);
  };

  useEffect(() => { load(); }, []);

  const getFormUrl = (slug: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/formulario/${slug}`;
  };

  const handleToggleStatus = async (form: CustomForm) => {
    const newStatus = form.status === "published" ? "disabled" : form.status === "disabled" ? "published" : "published";
    await supabase.from("custom_forms").update({ status: newStatus } as never).eq("id", form.id);
    load();
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Formulários</h1>
          <p className="text-sm text-slate-400 mt-1">
            {forms.length} formulários · {forms.filter((f) => f.status === "published").length} publicados
          </p>
        </div>
        <Button onClick={() => setNewFormOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" /> Novo Formulário
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map((form) => (
          <div key={form.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{form.name}</h3>
                  <Badge className={cn(
                    form.status === "published" && "bg-green-600",
                    form.status === "draft" && "bg-slate-600",
                    form.status === "disabled" && "bg-red-600"
                  )}>
                    {form.status === "published" ? "Publicado" : form.status === "draft" ? "Rascunho" : "Desativado"}
                  </Badge>
                </div>
                {form.description && (
                  <p className="text-xs text-slate-400 mt-1">{form.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 h-8"
                  onClick={() => {
                    navigator.clipboard.writeText(getFormUrl(form.slug));
                  }}
                  title="Copiar link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 h-8"
                  onClick={() => handleToggleStatus(form)}
                  title={form.status === "published" ? "Desativar" : "Publicar"}
                >
                  {form.status === "published" ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                {form.require_auth ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                <span>{form.require_auth ? "Requer autenticação" : "Público"}</span>
                <span className="text-slate-600">·</span>
                <span>Destino: {form.target_entity === "payment" ? "Pagamentos" : "Recebimentos"}</span>
              </div>
              {form.status === "published" && (
                <a
                  href={getFormUrl(form.slug)}
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {getFormUrl(form.slug)}
                </a>
              )}
              <div className="text-xs text-slate-500">
                {form.fields ? `${Object.keys(form.fields as object).length} campos customizados` : "Sem campos configurados"}
              </div>
            </div>
          </div>
        ))}
        {forms.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500">Nenhum formulário criado</p>
            <p className="text-xs text-slate-600 mt-1">Crie formulários para solicitação de pagamentos, recebimentos e mais.</p>
          </div>
        )}
      </div>

      <NewFormDialog open={newFormOpen} onOpenChange={setNewFormOpen} onCreated={load} />
    </div>
  );
}

function NewFormDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState("");

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;

    const defaultFields = [
      { label: "Nome Completo", type: "text", required: true, key: "nome" },
      { label: "Email", type: "email", required: true, key: "email" },
      { label: "Telefone", type: "text", required: false, key: "telefone" },
    ];

    await supabase.from("custom_forms").insert({
      name,
      slug: generateSlug(name),
      description: form.get("description") as string || null,
      target_entity: form.get("target_entity") as string,
      require_auth: form.get("require_auth") === "on",
      fields: { fields: defaultFields },
      status: "draft",
    } as never);

    setLoading(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
        <DialogHeader><DialogTitle>Novo Formulário</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Nome do Formulário *</label>
            <input
              name="name"
              required
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm"
            />
            {slug && <p className="text-xs text-slate-500 mt-1">URL: /formulario/{slug}</p>}
          </div>
          <div>
            <label className="text-sm text-slate-300">Descrição</label>
            <textarea name="description" rows={2} className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">Entidade de Destino *</label>
              <select name="target_entity" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm">
                <option value="payment">Pagamentos</option>
                <option value="receivable">Recebimentos</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" name="require_auth" id="require_auth" />
              <label htmlFor="require_auth" className="text-sm text-slate-300">Requer autenticação</label>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Após criar, você poderá configurar os campos do formulário editando as configurações.
          </p>
          <Button type="submit" className="w-full bg-cyan-600" disabled={loading}>
            {loading ? "Criando..." : "Criar Formulário"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
