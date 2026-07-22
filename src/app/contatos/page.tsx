"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Building2, User, Phone, Mail } from "lucide-react";
import type { Contact, Company } from "@/types/database";
import { cn } from "@/lib/utils";

export default function ContatosPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<"contacts" | "companies">("contacts");

  const load = async () => {
    const { data: c } = await supabase.from("contacts").select("*").order("name");
    if (c) setContacts(c as Contact[]);
    const { data: comps } = await supabase.from("companies").select("*").order("legal_name");
    if (comps) setCompanies(comps as Company[]);
  };

  useEffect(() => { load(); }, []);

  const filteredContacts = contacts.filter((c) => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.document?.includes(s);
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Contatos</h1>
        <Button onClick={() => setNewContactOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" /> Novo Contato
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex bg-slate-800 rounded-lg p-0.5">
          <button onClick={() => setSelectedView("contacts")} className={cn("px-4 py-1.5 rounded text-sm", selectedView === "contacts" ? "bg-slate-700 text-white" : "text-slate-400")}>
            <User className="h-3.5 w-3.5 inline mr-1" /> Contatos
          </button>
          <button onClick={() => setSelectedView("companies")} className={cn("px-4 py-1.5 rounded text-sm", selectedView === "companies" ? "bg-slate-700 text-white" : "text-slate-400")}>
            <Building2 className="h-3.5 w-3.5 inline mr-1" /> Empresas
          </button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou CPF/CNPJ..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm"
          />
        </div>
        {selectedView === "contacts" && (
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm">
            <option value="all">Todos</option>
            <option value="pf">Pessoa Física</option>
            <option value="pj">Pessoa Jurídica</option>
          </select>
        )}
      </div>

      {selectedView === "contacts" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredContacts.map((c) => (
            <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", c.type === "pf" ? "bg-cyan-600/20 text-cyan-400" : "bg-purple-600/20 text-purple-400")}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                  {c.email && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</p>}
                  {c.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</p>}
                  {c.document && <p className="text-xs text-slate-500 mt-1">{c.document}</p>}
                </div>
              </div>
            </div>
          ))}
          {filteredContacts.length === 0 && <p className="col-span-full text-center py-12 text-slate-500">Nenhum contato encontrado</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {companies.map((comp) => (
            <div key={comp.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{comp.legal_name}</p>
                  {comp.trading_name && <p className="text-xs text-slate-500">{comp.trading_name}</p>}
                  {comp.document && <p className="text-xs text-slate-400 mt-1">{comp.document}</p>}
                  {comp.phone && <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {comp.phone}</p>}
                </div>
              </div>
            </div>
          ))}
          {companies.length === 0 && <p className="col-span-full text-center py-12 text-slate-500">Nenhuma empresa cadastrada</p>}
        </div>
      )}

      <NewContactDialog open={newContactOpen} onOpenChange={setNewContactOpen} onCreated={load} />
    </div>
  );
}

function NewContactDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("contacts").insert({
      type: form.get("type") as string,
      name: form.get("name") as string,
      email: form.get("email") as string || null,
      phone: form.get("phone") as string || null,
      document: form.get("document") as string || null,
    } as never);
    setLoading(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Tipo</label>
            <select name="type" className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm">
              <option value="pf">Pessoa Física</option>
              <option value="pj">Pessoa Jurídica</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-300">Nome *</label>
            <input name="name" required className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">Email</label>
              <input name="email" type="email" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-300">Telefone</label>
              <input name="phone" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-300">CPF/CNPJ</label>
            <input name="document" className="w-full mt-1 px-3 py-2 bg-slate-800 border rounded text-white text-sm" />
          </div>
          <Button type="submit" className="w-full bg-cyan-600" disabled={loading}>{loading ? "Criando..." : "Criar Contato"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
