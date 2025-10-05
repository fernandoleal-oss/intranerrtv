import { NavLink, useLocation } from "react-router-dom";
import { Home, FileText, DollarSign, Eye, Clapperboard, Car, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navigation = [
  { name: "Início", path: "/", icon: Home },
  { name: "Orçamentos", path: "/orcamentos", icon: FileText },
  { name: "Financeiro", path: "/financeiro", icon: DollarSign },
  { name: "Direitos", path: "/direitos", icon: Eye },
  { name: "ANCINE", path: "/ancine", icon: Clapperboard },
  { name: "Comparador BYD", path: "/comparador-byd", icon: Car, disabled: true },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">WE</span>
          </div>
          <div>
            <h1 className="font-semibold text-base">Sistema RTV</h1>
            <p className="text-xs text-muted-foreground">Orçamentos & Financeiro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <TooltipProvider>
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComponent = item.icon;
            
            if (item.disabled) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
                      <IconComponent className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Em configuração</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <IconComponent className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Footer - Logout */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </aside>
  );
}
