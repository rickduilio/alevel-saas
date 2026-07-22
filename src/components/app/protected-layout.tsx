"use client";

import AppLayout from "@/components/app/app-layout";
import QuickCreate from "@/components/app/quick-create";
import CommandPalette from "@/components/app/command-palette";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppLayout>{children}</AppLayout>
      <QuickCreate />
      <CommandPalette />
    </>
  );
}
