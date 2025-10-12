import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText,
  DollarSign,
  Eye,
  LogOut,
  Settings,
  Clapperboard,
  Newspaper,
  ExternalLink,
  Upload,
  Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/AuthProvider";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { CalendarBlock } from "@/components/CalendarBlock";
import { NavBarDemo } from "@/components/NavBarDemo";

type Section = {
  title: string;
  description: string;
  icon: any;
  gradient: string;
  path?: string;
  disabled?: boolean;
  onClick?: () => void;
};

type TransferRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  files: { name: string; size: number }[];
  link: string | null;
  note: string | null;
};

const TRANSFER_URL = "https://transfer.it/start";

export default function Home() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [clubeNews, setClubeNews] = useState<Array<{ title: string; url: string }>>([]);
  const [selectedNews, setSelectedNews] = useState<{ title: string; url: string } | null>(null);

  // Transfer launcher state (sem iframe)
  const [transferOpen, setTransferOpen] = useState(false);
  const [pickedFiles, setPickedFiles] = useState<{ name: string; size: number }[]>([]);
  const [transferLink, setTransferLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState<TransferRow[]>([]);

  useEffect(() => {
    const fetchClubeNews = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("clube_news");
        if (error) throw error;
        if (data?.items) setClubeNews(data.items);
      } catch {
        console.log("Clube news not available");
      }
    };
    fetchClubeNews();
  }, []);

  const loadRecent = async () => {
    const userId = (profile as any)?.id || (profile as any)?.user_id || null;
    const { data } = await supabase
      .from("transfers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setRecent((data as TransferRow[]) || []);
  };

  useEffect(() => {
    if (transferOpen) loadRecent();
  }, [transferOpen]);

  const sections: Section[] = [
    {
      title: "Orçamentos",
      description: "Criar e gerenciar orçamentos de produção",
      icon: FileText,
      gradient: "gradient-orange",
      path: "/orcamentos",
    },
    {
      title: "Direitos",
      description: "Gestão de direitos autorais e renovações",
      icon: Eye,
      gradient: "gradient-purple",
      path: "/direitos",
    },
    {
      title: "Financeiro",
      description: "Controle financeiro e relatórios",
      icon: DollarSign,
      gradient: "gradient-green",
      path: "/financeiro",
    },
    {
      title: "Consulta ANCINE",
      description: "Claquetes & registros oficiais",
      icon: Clapperboard,
      gradient: "gradient-yellow",
      path: "/ancine",
    },
    {
      title: "Gerador de Claquete",
      description: "Crie claquetes profissionais para filmagem",
      icon: Clapperboard,
      gradient: "gradient-cyan",
      path: "/claquete",
    },
    {
      title: "BYD Pronta Entrega",
      description: "Orçamento para atendimento",
      icon: FileText,
      gradient: "gradient-indigo",
      path: "/byd-pronta-entrega",
    },
    // Novo: Transfer launcher (sem iframe)
    {
      title: "Transfer",
      description: "Abrir Transfer.it e registrar envio",
      icon: Upload,
      gradient: "gradient-pink",
      onClick: () => setTransferOpen(true),
    },
  ];

  const handleCardClick = (section: Section) => {
    if (section.disabled) return;
    if (section.onClick) return section.onClick();
    if (section.path) return navigate(section.path);
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).map((f) => ({ name: f.name, size: f.size }));
    setPickedFiles(list);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(TRANSFER_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const saveTransfer = async () => {
    if (!pickedFiles.length) return;
    try {
      setSaving(true);
      const userId = (profile as any)?.id || (profile as any)?.user_id || null;
      const payload = {
        user_id: userId,
        files: pickedFiles,
        link: transferLink || null,
        note: null,
      };
      const { error } = await supabase.from("transfers").insert(payload as any);
      if (error) throw error;
      setPickedFiles([]);
      setTransferLink("");
      await loadRecent();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <NavBarDemo />

      <header className="border-b sticky top-0 z-10 glass-effect mt-20 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50">
        <div className="container-page">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">WE</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold">Sistema de Orçamentos</h1>
                <p className="text-sm text-muted-foreground">RTV WE</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {profile?.role === "admin" && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-2">
                  <Settings className="w-4 h-4" /> Admin
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

      <main className="container-page py-12">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            Bem-vindo, {profile?.name || "Usuário"}
          </motion.h2>
          <p className="text-muted-foreground text-lg">Escolha uma área para começar</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`${section.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-2xl hover:scale-[1.05]"} transition-all duration-300 group border-2 rounded-2xl`}
                onClick={() => handleCardClick(section)}
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 mx-auto rounded-2xl ${section.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl`}
                  >
                    <section.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors font-bold">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{section.description}</p>
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:text-white transition-all"
                    disabled={section.disabled}
                  >
                    {section.disabled ? "Em breve" : "Acessar"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Calendário */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 max-w-6xl mx-auto"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Calendário</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <CalendarBlock />
            </CardContent>
          </Card>
        </motion.div>

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
                <ul className="space-y-3">
                  {clubeNews.map((news, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => setSelectedNews(news)}
                        className="text-sm hover:text-primary transition-colors flex items-center gap-2 group w-full text-left"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform flex-shrink-0" />
                        <span className="flex-1">{news.title}</span>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Modal de Notícia */}
        <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="pr-8">{selectedNews?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {selectedNews && (
                <iframe
                  src={selectedNews.url}
                  className="w-full h-full min-h-[600px] border-0"
                  title={selectedNews.title}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => selectedNews && window.open(selectedNews.url, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir no site
              </Button>
              <Button onClick={() => setSelectedNews(null)}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Transfer launcher (sem iframe) */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent className="max-w-3xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>Transfer — enviar arquivos</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Ações principais */}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="default" onClick={() => window.open(TRANSFER_URL, "_blank")}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Abrir Transfer.it
                </Button>
                <Button variant="outline" onClick={copyLink}>
                  <Copy className="w-4 h-4 mr-2" /> {copied ? "Link copiado!" : "Copiar link"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  O Transfer.it bloqueia incorporação — use a nova aba para enviar os arquivos.
                </span>
              </div>

              {/* Captura dos nomes (apenas registro interno) */}
              <div className="space-y-2">
                <Label>Arquivos (apenas para registrar nomes)</Label>
                <Input type="file" multiple onChange={onPickFiles} />
                {pickedFiles.length > 0 && (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium mb-2">Selecionados ({pickedFiles.length}):</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {pickedFiles.map((f, i) => (
                        <li key={`${f.name}-${i}`}>
                          {f.name}{" "}
                          <span className="text-muted-foreground">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Link final do envio */}
              <div className="space-y-2">
                <Label>Link do envio (cole aqui depois de gerar no Transfer.it)</Label>
                <Input
                  placeholder="https://transfer.it/..."
                  value={transferLink}
                  onChange={(e) => setTransferLink(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveTransfer} disabled={!pickedFiles.length || saving}>
                  {saving ? "Salvando..." : "Salvar registro"}
                </Button>
              </div>

              {/* Últimos registros */}
              {recent.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium">Últimos envios</div>
                  <div className="rounded-md border">
                    <div className="max-h-56 overflow-auto divide-y">
                      {recent.map((r) => (
                        <div key={r.id} className="p-3 text-sm flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium">{new Date(r.created_at).toLocaleString()}</div>
                            <div className="text-muted-foreground truncate">
                              {r.files?.map((f) => f.name).join(", ")}
                            </div>
                          </div>
                          {r.link && (
                            <Button size="sm" variant="outline" onClick={() => window.open(r.link as string, "_blank")}>
                              Abrir
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
