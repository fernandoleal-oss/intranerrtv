import { useState } from "react";
import { Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Busque por ID, cliente, produto ou produtora..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-20 h-12 text-base border-border/50 focus:border-primary/50 bg-card"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium opacity-100 sm:flex">
            <Command className="h-3 w-3" />
            K
          </kbd>
        </div>
      </div>
      
      {/* Search results would appear here */}
      {searchQuery && (
        <div className="absolute top-full mt-2 w-full rounded-lg border bg-card p-4 shadow-lg">
          <p className="text-sm text-muted-foreground">
            Buscar por "{searchQuery}"...
          </p>
        </div>
      )}
    </div>
  );
};