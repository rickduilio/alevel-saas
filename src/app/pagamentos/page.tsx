"use client";

import ProtectedLayout from "@/components/app/protected-layout";

export default function PagamentosPage() {
  return (
    <ProtectedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white">Pagamentos</h1>
        <p className="text-slate-400 mt-2">Pipeline de pagamentos — em construção</p>
      </div>
    </ProtectedLayout>
  );
}
