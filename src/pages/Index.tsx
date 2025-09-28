import { Film, Headphones, Subtitles, Image } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BudgetTypeCard } from "@/components/home/BudgetTypeCard";
import { QuickActions } from "@/components/home/QuickActions";
import { GlobalSearch } from "@/components/home/GlobalSearch";
import { RecentBudgets } from "@/components/home/RecentBudgets";

const Index = () => {
  const budgetTypes = [
    {
      icon: Film,
      title: "Produção de filme",
      description: "Criar orçamento de FILME com cotações e comparador.",
      onStart: () => console.log("Starting film production budget"),
    },
    {
      icon: Headphones,
      title: "Produção de áudio",
      description: "Criar orçamento de ÁUDIO com opções da produtora.",
      onStart: () => console.log("Starting audio production budget"),
    },
    {
      icon: Image,
      title: "Compra de imagem",
      description: "Cadastrar imagens (Getty/Shutterstock/Personalizado).",
      onStart: () => console.log("Starting image purchase budget"),
    },
    {
      icon: Subtitles,
      title: "Closed Caption",
      description: "Calcular versões de CC (R$ 900/versão).",
      onStart: () => console.log("Starting closed caption budget"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-6 py-8 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-8 max-w-5xl mx-auto">
          <div className="space-y-6 animate-fade-up">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight text-gradient bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Sistema de Orçamentos WE
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto text-balance">
                Crie, compare e exporte orçamentos de produção audiovisual com agilidade e precisão profissional
              </p>
            </div>
            
            {/* Global Search */}
            <div className="pt-4">
              <GlobalSearch />
            </div>
          </div>
        </div>

        {/* Budget Type Cards */}
        <section className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-foreground">Escolha o tipo de orçamento</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Selecione o tipo de produção para criar um orçamento detalhado e profissional
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 animate-fade-up">
            {budgetTypes.map((type, index) => (
              <div key={index} className="animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
                <BudgetTypeCard
                  icon={type.icon}
                  title={type.title}
                  description={type.description}
                  onStart={type.onStart}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-center text-muted-foreground">
            Ações rápidas
          </h3>
          <QuickActions />
        </section>

        {/* Recent Budgets */}
        <section>
          <RecentBudgets />
        </section>
      </main>
    </div>
  );
};

export default Index;