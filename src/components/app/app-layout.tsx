"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckSquare,
  Users,
  FileText,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, FILIAIS } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pagamentos", label: "Pagamentos", icon: ArrowUpRight },
  { href: "/recebimentos", label: "Recebimentos", icon: ArrowDownLeft },
  { href: "/eventos", label: "Eventos", icon: Calendar },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/contatos", label: "Contatos", icon: Users },
  { href: "/formularios", label: "Formulários", icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const filialLabel = profile?.filial
    ? FILIAIS.find((f) => f.value === profile.filial)?.label
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 p-4 border-b border-slate-800">
          <div className="text-xl font-bold text-cyan-400 flex-shrink-0">
            {collapsed ? "A" : "ALevel"}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden lg:block text-slate-400 hover:text-white"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-cyan-600/20 text-cyan-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
                title={item.label}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User area */}
        {profile && (
          <div className={cn("p-3 border-t border-slate-800", collapsed && "text-center")}>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-800 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-cyan-600 text-xs">
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile.name}</p>
                      <p className="text-xs text-slate-500">
                        {ROLE_LABELS[profile.role]}{filialLabel ? ` · ${filialLabel}` : ""}
                      </p>
                    </div>
                  )}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-900 border-slate-700 text-slate-200 w-56">
                <DropdownMenuLabel>{profile.name}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-400 focus:bg-red-900/20"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2 p-3 border-b border-slate-800 bg-slate-900">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-cyan-400">ALevel</span>
        </div>

        {children}
      </main>
    </div>
  );
}
