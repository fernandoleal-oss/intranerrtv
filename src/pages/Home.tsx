import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, DollarSign, Eye, LogOut, Settings, Car, Clapperboard, Newspaper } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function Home() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [clubeNews, setClubeNews] = useState<Array<{ title: string; url: string }>>([]);

  useEffect(() => {
    const fetchClubeNews = async () => {
      try {
        const { data } = await supabase.functions.invoke("clube_news");
        if (data?.items) setClubeNews(data.items);
      } catch (e) {
        console.error("Erro ao carregar notícias do Clube:", e);
      }
    };
    fetchClubeNews();
  }, []);

  const sections = [
    {
      title: "Orçamentos",
      description: "Criar e gerenciar orçamentos de produção",
      icon: FileText,
      color: "from-blue-500 to-indigo-600",
      path: "/orcamentos",
    },
    {
      title: "Direitos",
      description: "Gestão de direitos autorais e renovações",
      icon: Eye,
      color: "from-purple-500 to-pink-600",
      path: "/direitos",
    },
    {
      title: "Financeiro",
      description: "Controle financeiro e relatórios",
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
      path: "/financeiro",
    },
    {
      title: "Consulta ANCINE",
      description: "Claquetes & registros oficiais",
      icon: Clapperboard,
      color: "from-yellow-500 to-amber-600",
      path: "/ancine",
    },
    {
      title: "Comparador BYD",
      description: "Compare modelos de carros elétricos",
      icon: Car,
      color: "from-orange-500 to-red-600",
      path: "/comparador-byd",
    },
    {
      title: "Gerador de Claquete",
      description: "Crie claquetes profissionais para filmagem",
      icon: Clapperboard,
      color: "from-cyan-500 to-teal-600",
      path: "/claquete",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="container-page">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">WE</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold">Sistema de Orçamentos</h1>
                <p className="text-sm text-muted-foreground">RTV WE</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {profile?.role === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              )}

              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || profile?.email}`}
                />
                <AvatarFallback>{profile?.name?.[0] || profile?.email?.[0] || "U"}</AvatarFallback>
              </Avatar>

              <div className="hidden md:block text-right">
                <p className="text-sm font-medium">{profile?.name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container-page py-12">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mb-2"
          >
            Bem-vindo, {profile?.name || "Usuário"}
          </motion.h2>
          <p className="text-muted-foreground text-lg">
            Escolha uma área para começar
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {sections.map((section, index) => (
            <motion.div
              key={section.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-all group"
                onClick={() => navigate(section.path)}
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${section.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <section.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                  <Button variant="outline" className="w-full">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Clube de Criação */}
        {clubeNews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 max-w-6xl mx-auto"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-primary" />
                  <CardTitle>Clube de Criação — Últimas Notícias</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {clubeNews.map((news, idx) => (
                    <li key={idx}>
                      <a
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:text-primary transition-colors flex items-center gap-2 group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform" />
                        {news.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
