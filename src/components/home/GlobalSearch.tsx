import { useState } from "react";
import { Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
        <Search className={`absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors duration-300 ${isFocused ? 'text-primary' : 'text-muted-foreground'}`} />
        <Input
          placeholder="Busque por ID, cliente, produto ou produtora..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="pl-14 pr-24 h-14 text-base border-2 border-border/50 focus:border-primary/70 bg-card/50 backdrop-blur-sm hover:bg-card/80 focus:bg-card shadow-md hover:shadow-lg focus:shadow-xl transition-all duration-300 rounded-2xl"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <kbd className="pointer-events-none hidden h-7 select-none items-center gap-1 rounded-lg border bg-muted/80 px-3 font-mono text-xs font-medium opacity-100 sm:flex backdrop-blur-sm">
            <Command className="h-3 w-3" />
            <span>K</span>
          </kbd>
        </div>
      </div>
      
      {/* Search results */}
      {searchQuery && (
        <div className="absolute top-full mt-3 w-full rounded-2xl border bg-card/95 backdrop-blur-lg shadow-xl animate-fade-up">
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-3">
              Buscando por "<span className="font-medium text-foreground">{searchQuery}</span>"...
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="h-2 w-2 bg-primary rounded-full"></div>
                <span className="text-sm">Nenhum resultado encontrado</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};