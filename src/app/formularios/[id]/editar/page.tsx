"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Save, ArrowLeft } from "lucide-react";
import type { CustomForm } from "@/types/database";
import { cn } from "@/lib/utils";

interface FormField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Telefone" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "textarea", label: "Texto Longo" },
  { value: "select", label: "Seleção" },
  { value: "file", label: "Arquivo" },
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
];

export default function EditarFormularioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();

  const [form, setForm] = useState<CustomForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("custom_forms").select("*").eq("id", id).single();
      if (data) {
        const formData = data as CustomForm;
        setForm(formData);
        setFields((formData.fields as any)?.fields || []);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const addField = () => {
    const newField: FormField = {
      key: `campo_${fields.length + 1}`,
      label: `Campo ${fields.length + 1}`,
      type: "text",
      required: false,
    };
    setFields([...fields, newField]);
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  };

  const moveField = (from: number, to: number) => {
    const newFields = [...fields];
    const [moved] = newFields.splice(from, 1);
    newFields.splice(to, 0, moved);
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);

    await supabase
      .from("custom_forms")
      .update({
        fields: { fields },
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", form.id);

    setSaving(false);
    router.push("/formularios");
  };

  if (loading) return <div className="p-6 text-slate-400">Carregando...</div>;
  if (!form) return <div className="p-6 text-red-400">Formulário não encontrado</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/formularios")} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Editor: {form.name}</h1>
          <p className="text-sm text-slate-400">/{form.slug} · {fields.length} campos</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700" disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Field list */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-slate-300">Campos do Formulário</h2>
            <Button size="sm" onClick={addField} className="bg-cyan-600 hover:bg-cyan-700 h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Campo
            </Button>
          </div>

          {fields.length === 0 && (
            <div className="text-center py-12 bg-slate-900 border border-dashed border-slate-700 rounded-lg">
              <p className="text-slate-500">Nenhum campo ainda. Clique em "Adicionar Campo" para começar.</p>
            </div>
          )}

          {fields.map((field, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <button className="cursor-grab text-slate-600 hover:text-slate-400" title="Arrastar">
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Label</label>
                    <input
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Tipo</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(idx, { type: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Chave (key)</label>
                    <input
                      value={field.key}
                      onChange={(e) => updateField(idx, { key: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-5">
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                      />
                      Obrigatório
                    </label>
                  </div>
                </div>
                <button onClick={() => removeField(idx)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Preview */}
        <div>
          <Card className="bg-slate-900 border-slate-800 sticky top-4">
            <CardHeader>
              <CardTitle className="text-white text-sm">Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-6">Adicione campos para ver o preview</p>
              )}
              {fields.map((field, idx) => (
                <div key={idx}>
                  <label className="text-xs text-slate-400 block mb-1">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs" rows={2} disabled />
                  ) : field.type === "select" ? (
                    <select className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs" disabled>
                      <option>Selecione...</option>
                    </select>
                  ) : (
                    <input
                      type={field.type === "cpf" || field.type === "cnpj" ? "text" : field.type}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                      disabled
                      placeholder={field.label}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
