import { useState, useEffect } from "react";
import { Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Mock search results for demonstration
  const mockResults = [
    { id: "ORC-SBT-KV30-20240928-01", type: "Orçamento", client: "SBT", product: "KV30" },
    { id: "SBT", type: "Cliente", description: "Sistema Brasileiro de Televisão" },
    { id: "IBJR", type: "Cliente", description: "Instituto Brasileiro de Jornalismo Responsável" },
  ];

  const getFilteredResults = () => {
    if (!searchQuery.trim()) return [];
    return mockResults.filter(result => 
      result.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleResultClick = (result: any) => {
    alert(`🔍 Abrindo: ${result.id}\n\nTipo: ${result.type}\n${result.client ? `Cliente: ${result.client}` : ''}${result.product ? `\nProduto: ${result.product}` : ''}${result.description ? `\nDescrição: ${result.description}` : ''}`);
    setSearchQuery("");
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Busque por"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
        <Search className={`absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors duration-300 ${isFocused ? 'text-primary' : 'text-muted-foreground'}`} />
        <Input
          placeholder="Busque por ID, cliente, produto ou produtora..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            // Delay blur to allow clicking on results
            setTimeout(() => setIsFocused(false), 200);
          }}
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
      {searchQuery && (isFocused || searchQuery.length > 0) && (
        <div className="absolute top-full mt-3 w-full rounded-2xl border bg-card/95 backdrop-blur-lg shadow-xl animate-fade-up z-50">
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Buscando por "<span className="font-medium text-foreground">{searchQuery}</span>"...
            </p>
            <div className="space-y-2">
              {getFilteredResults().length > 0 ? (
                getFilteredResults().map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="h-2 w-2 bg-primary rounded-full group-hover:bg-primary/70"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{result.id}</span>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{result.type}</span>
                      </div>
                      {result.client && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.client} {result.product && `• ${result.product}`}
                        </p>
                      )}
                      {result.description && (
                        <p className="text-xs text-muted-foreground mt-1">{result.description}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Nenhum resultado encontrado</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                💡 Dica: Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> para abrir a busca rapidamente
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};