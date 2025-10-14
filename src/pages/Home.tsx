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
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
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
  progress: number;
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

const SUPABASE_BUCKET = "transfers";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

// Glass Card Component
const GlassCard = ({ children, className, hover = true, ...props }: any) => (
  <div
    className={`
      rounded-2xl border border-white/20 backdrop-blur-lg bg-white/8 shadow-xl shadow-black/10
      ${hover ? "hover:shadow-2xl hover:shadow-black/20 hover:border-white/40 transition-all duration-500" : ""}
      ${className}
    `}
    {...props}
  >
    {children}
  </div>
);

// Glass Input Component
const GlassInput = ({ className, ...props }: any) => (
  <Input
    className={`
      backdrop-blur-lg bg-white/5 border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/20
      transition-all duration-300 placeholder:text-white/60 text-white
      ${className}
    `}
    {...props}
  />
);

export default function Home() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [clubeNews, setClubeNews] = useState<Array<{ title: string; url: string }>>([]);
  const [selectedNews, setSelectedNews] = useState<{ title: string; url: string } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<TransferRow[]>([]);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const userId = (profile as any)?.id || (profile as any)?.user_id || null;
  const folder = useMemo(() => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${userId || "anon"}/${stamp}`;
  }, [userId, transferOpen]);

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

      const { error: upErr } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, item.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: item.file.type || "application/octet-stream",
      });
      if (upErr) throw upErr;
      updated.progress = 70;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...updated } : i)));

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
    for (const it of items.filter((i) => i.status === "pending")) {
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

  const sections: Section[] = [
    {
      title: "Orçamentos",
      description: "Criar e gerenciar orçamentos de produção",
      icon: FileText,
      gradient: "from-orange-500 to-red-500",
      path: "/orcamentos",
    },
    {
      title: "Direitos",
      description: "Gestão de direitos autorais e renovações",
      icon: Eye,
      gradient: "from-purple-500 to-pink-500",
      path: "/direitos",
    },
    {
      title: "Financeiro",
      description: "Controle financeiro e relatórios",
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-500",
      path: "/financeiro",
    },
    {
      title: "Consulta ANCINE",
      description: "Claquetes & registros oficiais",
      icon: Clapperboard,
      gradient: "from-yellow-500 to-amber-500",
      path: "/ancine",
    },
    {
      title: "Gerador de Claquete",
      description: "Crie claquetes profissionais para filmagem",
      icon: Clapperboard,
      gradient: "from-cyan-500 to-blue-500",
      path: "/claquete",
    },
    {
      title: "BYD Pronta Entrega",
      description: "Orçamento para atendimento",
      icon: FileText,
      gradient: "from-indigo-500 to-purple-500",
      path: "/byd-pronta-entrega",
    },
    {
      title: "Transfer",
      description: "Enviar arquivos (Supabase Storage)",
      icon: Upload,
      gradient: "from-pink-500 to-rose-500",
      onClick: () => setTransferOpen(true),
    },
  ];

  const handleCardClick = (s: Section) => {
    if (s.disabled) return;
    if (s.onClick) return s.onClick();
    if (s.path) return navigate(s.path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NavBarDemo />

      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-10 backdrop-blur-lg bg-slate-900/80 mt-20">
        <div className="container-page">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Sistema de Orçamentos
                </h1>
                <p className="text-sm text-white/60">RTV WE</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {profile?.role === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="gap-2 backdrop-blur-md bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <Settings className="w-4 h-4" /> Admin
                </Button>
              )}

              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || profile?.email}`}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                  {profile?.name?.[0] || profile?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-white">{profile?.name || "Usuário"}</p>
                <p className="text-xs text-white/60 capitalize">{profile?.role}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-white/60 hover:text-red-300 hover:bg-red-500/20 backdrop-blur-md"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container-page py-12">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent"
          >
            Bem-vindo, {profile?.name || "Usuário"}
          </motion.h2>
          <p className="text-white/60 text-xl">Escolha uma área para começar</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                className={`${section.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer group"} p-1`}
                onClick={() => handleCardClick(section)}
              >
                <div className="p-6 text-center">
                  <div
                    className={`w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br ${section.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl`}
                  >
                    <section.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-200 transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-white/70 mb-6 min-h-[60px] text-sm leading-relaxed">{section.description}</p>
                  <Button
                    className="w-full backdrop-blur-md bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300"
                    disabled={section.disabled}
                  >
                    {section.disabled ? "Em breve" : "Acessar"}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Calendário */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 max-w-6xl mx-auto"
        >
          <GlassCard className="p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-purple-300" />
                <h3 className="text-2xl font-bold text-white">Calendário</h3>
              </div>
            </div>
            <div className="flex justify-center">
              <CalendarBlock />
            </div>
          </GlassCard>
        </motion.div>

        {/* Clube de Criação */}
        {clubeNews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 max-w-6xl mx-auto"
          >
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Newspaper className="w-6 h-6 text-purple-300" />
                <h3 className="text-2xl font-bold text-white">Clube de Criação — Últimas Notícias</h3>
              </div>
              <div className="space-y-4">
                {clubeNews.map((news, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedNews(news)}
                    className="w-full text-left p-4 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 hover:border-purple-400/30 hover:bg-white/10 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400 group-hover:scale-150 transition-transform flex-shrink-0" />
                      <span className="text-white/80 group-hover:text-white flex-1">{news.title}</span>
                      <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-purple-300 transition-colors flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Modal de Notícia */}
        <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col backdrop-blur-lg bg-slate-800/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="pr-8 text-white">{selectedNews?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {selectedNews && (
                <iframe
                  src={selectedNews.url}
                  className="w-full h-full min-h-[600px] border-0 rounded-lg"
                  title={selectedNews.title}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/20">
              <Button
                variant="outline"
                onClick={() => selectedNews && window.open(selectedNews.url, "_blank")}
                className="backdrop-blur-md bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir no site
              </Button>
              <Button
                onClick={() => setSelectedNews(null)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Transfer (Supabase Storage) */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent className="max-w-4xl w-[95vw] backdrop-blur-lg bg-slate-800/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-300" />
                Transfer — Enviar Arquivos
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Área de drop/seleção */}
              <GlassCard
                ref={dropRef}
                className="p-8 text-center border-2 border-dashed border-white/30 hover:border-purple-400/50 transition-all duration-300"
                hover={false}
              >
                <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/80 mb-4 text-lg">Arraste e solte os arquivos aqui ou selecione abaixo</p>
                <div className="flex items-center justify-center">
                  <GlassInput type="file" multiple onChange={onPickFiles} className="max-w-md" />
                </div>
                <div className="text-sm text-white/60 mt-4">
                  Pasta do envio: <code className="bg-white/10 px-2 py-1 rounded text-purple-200">{folder}</code>
                </div>
              </GlassCard>

              {/* Lista de arquivos */}
              {items.length > 0 && (
                <GlassCard className="p-6">
                  <div className="space-y-3">
                    {items.map((it) => (
                      <div key={it.id} className="p-4 rounded-xl backdrop-blur-md bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white truncate">{it.name}</div>
                            <div className="text-sm text-white/60">{(it.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {it.url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(it.url!, "_blank")}
                                className="backdrop-blur-md bg-green-500/20 border-green-400/30 text-green-200 hover:bg-green-500/30"
                              >
                                <LinkIcon className="w-4 h-4 mr-1" /> Abrir
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem(it.id)}
                              className="text-red-300/80 hover:text-red-200 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Barra de progresso */}
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              it.status === "error"
                                ? "bg-red-500"
                                : it.status === "done"
                                  ? "bg-green-500"
                                  : "bg-gradient-to-r from-blue-500 to-purple-500"
                            }`}
                            style={{ width: `${it.progress}%` }}
                          />
                        </div>
                        <div className="text-xs mt-2 text-white/60">
                          {it.status === "pending" && "⏳ Aguardando"}
                          {it.status === "uploading" && "📤 Enviando..."}
                          {it.status === "done" && "✅ Concluído"}
                          {it.status === "error" && `❌ ${it.error || "Erro no upload"}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Ações */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={uploadAll}
                    disabled={items.length === 0 || items.every((i) => i.status !== "pending")}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Enviar arquivos
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyAllLinks}
                    disabled={!items.some((i) => i.url)}
                    className="backdrop-blur-md bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copiar links
                  </Button>
                </div>
                <Button
                  onClick={saveRegister}
                  variant="secondary"
                  disabled={
                    !items.length || items.some((i) => i.status === "pending" || i.status === "uploading") || saving
                  }
                  className="backdrop-blur-md bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {saving ? "💾 Salvando..." : "Salvar registro"}
                </Button>
              </div>

              {/* Últimos envios */}
              {recent.length > 0 && (
                <GlassCard className="p-6">
                  <h4 className="font-semibold text-white mb-4 text-lg">📁 Últimos Envios</h4>
                  <div className="max-h-60 overflow-auto space-y-3">
                    {recent.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl backdrop-blur-md bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-white">
                            {new Date(r.created_at).toLocaleString("pt-BR")}
                          </div>
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
                              className="backdrop-blur-md bg-white/5 border-white/20 text-white hover:bg-white/10"
                            >
                              <Copy className="w-4 h-4 mr-1" /> Copiar links
                            </Button>
                          )}
                        </div>
                        <ul className="space-y-1">
                          {r.files?.map((f, idx) => (
                            <li key={idx} className="flex items-center justify-between text-sm text-white/70">
                              <span className="truncate flex-1">{f.name}</span>
                              {f.url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 ml-2 text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
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
                </GlassCard>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
