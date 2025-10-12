import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Link as LinkIcon,
  Trash2,
  Copy,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
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

type UploadItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "pending" | "uploading" | "done" | "error";
  progress: number; // visual
  path?: string;
  url?: string;
  error?: string;
};

type TransferRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  files: { name: string; size: number; path?: string; url?: string }[];
  link: string | null;
  note: string | null;
};

const SUPABASE_BUCKET = "transfers"; // crie este bucket no Supabase (privado)

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [clubeNews, setClubeNews] = useState<Array<{ title: string; url: string }>>([]);
  const [selectedNews, setSelectedNews] = useState<{ title: string; url: string } | null>(null);

  // ====== Transfer (Supabase Storage) ======
  const [transferOpen, setTransferOpen] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<TransferRow[]>([]);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const userId = (profile as any)?.id || (profile as any)?.user_id || null;
  const folder = useMemo(() => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${userId || "anon"}/${stamp}`;
  }, [userId, transferOpen]); // novo folder a cada abertura

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
    if (!userId) return;
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);
    if (!error) setRecent((data as TransferRow[]) || []);
  };

  useEffect(() => {
    if (transferOpen) {
      setItems([]);
      loadRecent();
    }
  }, [transferOpen]);

  // Drag & drop handlers
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const files = Array.from(e.dataTransfer?.files || []);
      addFiles(files);
    };
    ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => el.addEventListener(evt, prevent));
    el.addEventListener("drop", onDrop);
    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => el.removeEventListener(evt, prevent));
      el.removeEventListener("drop", onDrop);
    };
  }, [dropRef.current]);

  const addFiles = (files: File[]) => {
    const next = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      name: f.name,
      size: f.size,
      status: "pending" as const,
      progress: 0,
    }));
    setItems((prev) => [...prev, ...next]);
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    addFiles(list);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const copyAllLinks = async () => {
    const links = items
      .filter((i) => i.url)
      .map((i) => i.url)
      .join("\n");
    if (!links) return;
    await navigator.clipboard.writeText(links);
  };

  const uploadOne = async (item: UploadItem): Promise<UploadItem> => {
    let updated = { ...item, status: "uploading" as const, progress: 15 };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    try {
      const safeName = `${Date.now()}-${slugify(item.name)}`;
      const path = `${folder}/${safeName}`;

      // Upload (sem progresso nativo; usamos marcos visuais)
      const { error: upErr } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, item.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: item.file.type || "application/octet-stream",
      });
      if (upErr) throw upErr;
      updated.progress = 70;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...updated } : i)));

      // Tenta signed URL (7 dias). Se falhar, tenta publicUrl.
      let url: string | undefined;
      const signed = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!signed.error && signed.data?.signedUrl) {
        url = signed.data.signedUrl;
      } else {
        const pub = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
        url = pub.data.publicUrl;
      }

      updated = { ...updated, status: "done", progress: 100, path, url };
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      return updated;
    } catch (e: any) {
      updated = { ...updated, status: "error", progress: 100, error: e?.message || "Falha no upload" };
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      return updated;
    }
  };

  const uploadAll = async () => {
    // Sobe sequencialmente para não estourar rede/navegador
    for (const it of items.filter((i) => i.status === "pending")) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(it);
    }
  };

  const saveRegister = async () => {
    try {
      setSaving(true);
      const payload = {
        user_id: userId,
        files: items.map((i) => ({ name: i.name, size: i.size, path: i.path, url: i.url })),
        link: null,
        note: "supabase-storage",
      };
      const { error } = await supabase.from("transfers").insert(payload as any);
      if (error) throw error;
      await loadRecent();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ====== Seções do dashboard ======
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
    // Novo: Transfer (Supabase)
    {
      title: "Transfer",
      description: "Enviar arquivos (Supabase Storage)",
      icon: Upload,
      gradient: "gradient-pink",
      onClick: () => setTransferOpen(true),
    },
  ];

  const handleCardClick = (s: Section) => {
    if (s.disabled) return;
    if (s.onClick) return s.onClick();
    if (s.path) return navigate(s.path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <NavBarDemo />

      {/* Header */}
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

      {/* Main */}
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

        {/* Modal Transfer (Supabase Storage) */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent className="max-w-4xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>Transfer — enviar arquivos (Supabase Storage)</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Área de drop/seleção */}
              <div
                ref={dropRef}
                className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-colors"
              >
                <p className="text-sm text-muted-foreground mb-3">
                  Arraste e solte os arquivos aqui ou selecione abaixo
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Input type="file" multiple onChange={onPickFiles} />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Pasta do envio: <code className="bg-muted px-1 py-0.5 rounded">{folder}</code>
                </div>
              </div>

              {/* Lista de arquivos */}
              {items.length > 0 && (
                <div className="rounded-lg border divide-y">
                  {items.map((it) => (
                    <div key={it.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate">
                            <div className="font-medium truncate">{it.name}</div>
                            <div className="text-xs text-muted-foreground">{(it.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {it.url && (
                              <Button size="sm" variant="outline" onClick={() => window.open(it.url!, "_blank")}>
                                <LinkIcon className="w-4 h-4 mr-1" /> Abrir
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => removeItem(it.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {/* Barra de progresso simples */}
                        <div className="h-2 w-full bg-muted rounded mt-2 overflow-hidden">
                          <div
                            className={`h-full ${it.status === "error" ? "bg-destructive" : it.status === "done" ? "bg-green-500" : "bg-primary"} transition-all`}
                            style={{ width: `${it.progress}%` }}
                          />
                        </div>
                        <div className="text-[11px] mt-1 text-muted-foreground">
                          {it.status === "pending" && "Aguardando"}
                          {it.status === "uploading" && "Enviando..."}
                          {it.status === "done" && "Concluído"}
                          {it.status === "error" && (it.error || "Erro no upload")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={uploadAll}
                    disabled={items.length === 0 || items.every((i) => i.status !== "pending")}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Enviar arquivos
                  </Button>
                  <Button variant="outline" onClick={copyAllLinks} disabled={!items.some((i) => i.url)}>
                    <Copy className="w-4 h-4 mr-2" /> Copiar links
                  </Button>
                </div>
                <Button
                  onClick={saveRegister}
                  variant="secondary"
                  disabled={
                    !items.length || items.some((i) => i.status === "pending" || i.status === "uploading") || saving
                  }
                >
                  {saving ? "Salvando..." : "Salvar registro"}
                </Button>
              </div>

              {/* Últimos envios */}
              {recent.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium">Últimos envios</div>
                  <div className="rounded-md border">
                    <div className="max-h-60 overflow-auto divide-y">
                      {recent.map((r) => (
                        <div key={r.id} className="p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{new Date(r.created_at).toLocaleString()}</div>
                            {r.files?.some((f) => f.url) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const urls = r.files
                                    ?.map((f) => f.url)
                                    .filter(Boolean)
                                    .join("\n");
                                  if (urls) navigator.clipboard.writeText(urls);
                                }}
                              >
                                <Copy className="w-4 h-4 mr-1" /> Copiar links
                              </Button>
                            )}
                          </div>
                          <ul className="mt-1 text-muted-foreground list-disc pl-5 space-y-0.5">
                            {r.files?.map((f, idx) => (
                              <li key={idx} className="truncate">
                                {f.name}{" "}
                                {f.url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 ml-2"
                                    onClick={() => window.open(f.url as string, "_blank")}
                                  >
                                    Abrir
                                  </Button>
                                )}
                              </li>
                            ))}
                          </ul>
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
