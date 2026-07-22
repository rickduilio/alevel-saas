"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, CheckSquare, Calendar, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Payment, Task, Event, Contact } from "@/types/database";

interface SearchResult {
  id: string;
  type: "payment" | "task" | "event" | "contact";
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}

const ICONS = {
  payment: <ArrowUpRight className="h-4 w-4 text-cyan-400" />,
  task: <CheckSquare className="h-4 w-4 text-yellow-400" />,
  event: <Calendar className="h-4 w-4 text-purple-400" />,
  contact: <Users className="h-4 w-4 text-green-400" />,
};

export default function CommandPalette() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Toggle with Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);

    const term = `%${q}%`;

    const [payments, tasks, events, contacts] = await Promise.all([
      supabase.from("payments").select("id, title, favored_name").ilike("title", term).limit(5),
      supabase.from("tasks").select("id, title, priority").ilike("title", term).limit(5),
      supabase.from("events").select("id, name, city").ilike("name", term).limit(5),
      supabase.from("contacts").select("id, name, email").ilike("name", term).limit(5),
    ]);

    const allResults: SearchResult[] = [];

    (payments.data as { id: string; title: string; favored_name: string }[] | null)?.forEach((p) => {
      allResults.push({
        id: p.id, type: "payment", title: p.title,
        subtitle: p.favored_name || "", href: "/pagamentos",
        icon: ICONS.payment,
      });
    });

    (tasks.data as { id: string; title: string; priority: string }[] | null)?.forEach((t) => {
      allResults.push({
        id: t.id, type: "task", title: t.title,
        subtitle: t.priority, href: "/tarefas",
        icon: ICONS.task,
      });
    });

    (events.data as { id: string; name: string; city: string }[] | null)?.forEach((e) => {
      allResults.push({
        id: e.id, type: "event", title: e.name,
        subtitle: e.city || "", href: "/eventos",
        icon: ICONS.event,
      });
    });

    (contacts.data as { id: string; name: string; email: string }[] | null)?.forEach((c) => {
      allResults.push({
        id: c.id, type: "contact", title: c.name,
        subtitle: c.email || "", href: "/contatos",
        icon: ICONS.contact,
      });
    });

    setResults(allResults);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setOpen(false)} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-800">
            <Search className="h-5 w-5 text-slate-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pagamentos, tarefas, eventos, contatos..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((prev) => Math.max(prev - 1, 0));
                }
                if (e.key === "Enter" && results[selectedIndex]) {
                  handleSelect(results[selectedIndex]);
                }
              }}
            />
            <kbd className="hidden sm:inline-flex text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <div className="p-4 text-center text-sm text-slate-500">Buscando...</div>
            )}
            {!loading && query && results.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">
                Nenhum resultado para &ldquo;{query}&rdquo;
              </div>
            )}
            {!loading && !query && (
              <div className="p-4 text-center text-sm text-slate-500">
                Digite para buscar em todos os módulos
              </div>
            )}
            {results.map((result, idx) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors",
                  idx === selectedIndex ? "bg-cyan-600/20 text-cyan-300" : "text-slate-300 hover:bg-slate-800"
                )}
              >
                {result.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.title}</p>
                  <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                </div>
                <span className="text-xs text-slate-600 capitalize">{result.type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
