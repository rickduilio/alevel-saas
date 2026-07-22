"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowUpRight, CheckSquare, Calendar, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  { href: "/pagamentos", label: "Novo Pagamento", icon: ArrowUpRight, color: "bg-cyan-600 hover:bg-cyan-700" },
  { href: "/tarefas", label: "Nova Tarefa", icon: CheckSquare, color: "bg-yellow-600 hover:bg-yellow-700" },
  { href: "/eventos", label: "Novo Evento", icon: Calendar, color: "bg-purple-600 hover:bg-purple-700" },
  { href: "/formulario/lote", label: "Lote de Pagamentos", icon: FileText, color: "bg-indigo-600 hover:bg-indigo-700" },
];

export default function QuickCreate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-16 right-0 space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.href}
                onClick={() => {
                  setOpen(false);
                  router.push(action.href);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-white text-sm shadow-lg transition-all hover:scale-105 w-56",
                  action.color
                )}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110",
          open ? "bg-red-600 rotate-45" : "bg-cyan-600"
        )}
        title="Criar novo"
      >
        {open ? <X className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
      </button>
    </div>
  );
}
