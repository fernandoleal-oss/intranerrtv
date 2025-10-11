"use client";

import { Home, FileText, DollarSign, BarChart3 } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

export function NavBarDemo() {
  const navItems = [
    { name: "Home", url: "/", icon: Home },
    { name: "Orçamentos", url: "/orcamentos", icon: FileText },
    { name: "Financeiro", url: "/financeiro", icon: DollarSign },
    { name: "Direitos", url: "/direitos", icon: BarChart3 },
  ];
  return <NavBar items={navItems} />;
}
