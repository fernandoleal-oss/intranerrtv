"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
}

export function NavBar({ items }: NavBarProps) {
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex items-center gap-1 rounded-full border border-border/40 bg-background/95 backdrop-blur-md px-3 py-2 shadow-lg">
        {/* Animated background indicator */}
        {hoveredIndex !== null && (
          <div
            className="absolute inset-y-2 rounded-full bg-accent/50 transition-all duration-300 ease-out"
            style={{
              left: `${hoveredIndex * (100 / items.length)}%`,
              width: `${100 / items.length}%`,
            }}
          />
        )}

        {/* Nav items */}
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.url;

          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
