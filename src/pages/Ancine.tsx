import { useState, useEffect } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Search, ExternalLink, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AncineItem {
  titulo: string;
  url?: string;
  numero?: string;
  status?: string;
}

export default function Ancine() {
  const { toast } = useToast();
  const [crt, setCrt] = useState("");
  const [captchaText, setCaptchaText] = useState("");
  const [captchaImg, setCaptchaImg] = useState("");
  const [cookie, setCookie] = useState("");
  const [viewState, setViewState] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AncineItem[]>([]);

  // Carregar CRT do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ancine_crt_v1");
    if (saved) setCrt(saved);
    loadCaptcha();
  }, []);

  // Salvar CRT no localStorage
  useEffect(() => {
    if (crt) localStorage.setItem("ancine_crt_v1", crt);
  }, [crt]);

  const loadCaptcha = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ancine_proxy/captcha", {
        method: "GET"
      });

      if (error) throw error;

      setCookie(data.cookie || "");
      setViewState(data.viewState || "");
      setCaptchaImg(data.captchaBase64 || "");
      setCaptchaText("");
    } catch (e) {
      toast({
        title: "Erro ao carregar captcha",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConsultar = async () => {
    if (!crt.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o número CRT",
        variant: "destructive",
      });
      return;
    }

    if (!captchaText.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o texto do captcha",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setItems([]);

      const { data, error } = await supabase.functions.invoke("ancine_proxy/search", {
        body: {
          cookie,
          viewState,
          crt: crt.trim(),
          captcha: captchaText.trim(),
        },
      });

      if (error) throw error;

      if (data.items && data.items.length > 0) {
        setItems(data.items);
        toast({
          title: "Consulta realizada",
          description: `${data.items.length} resultado(s) encontrado(s)`,
        });
      } else {
        toast({
          title: "Nenhum resultado",
          description: "Não foram encontrados registros para o CRT informado",
        });
        await loadCaptcha();
      }
    } catch (e) {
      toast({
        title: "Erro na consulta",
        description: String(e?.message || e),
        variant: "destructive",
      });
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = () => {
    setCrt("");
    setCaptchaText("");
    setItems([]);
    loadCaptcha();
  };

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar title="Consulta ANCINE" subtitle="Obras Publicitárias — Claquetes & Registros" />

      <main className="container-page py-8">
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Consulta oficial via portal da ANCINE. Nenhuma credencial é armazenada. A sessão expira automaticamente.
            Evite automatizar consultas em volume.
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle>Formulário de Consulta</CardTitle>
              <CardDescription>
                Informe o número CRT e resolva o captcha para consultar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="crt">Número CRT</Label>
                <Input
                  id="crt"
                  value={crt}
                  onChange={(e) => setCrt(e.target.value)}
                  placeholder="Ex: BR001234567890"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Captcha</Label>
                {captchaImg ? (
                  <div className="flex flex-col gap-2">
                    <img
                      src={captchaImg}
                      alt="Captcha ANCINE"
                      className="border rounded-lg max-w-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadCaptcha}
                      disabled={loading}
                      className="gap-2 w-fit"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                      Atualizar captcha
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Carregando captcha...</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="captcha-text">Texto do Captcha</Label>
                <Input
                  id="captcha-text"
                  value={captchaText}
                  onChange={(e) => setCaptchaText(e.target.value)}
                  placeholder="Digite o código da imagem"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) handleConsultar();
                  }}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleConsultar}
                  disabled={loading}
                  className="gap-2 flex-1"
                >
                  <Search className="w-4 h-4" />
                  Consultar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLimpar}
                  disabled={loading}
                >
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultados */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>
                {items.length > 0
                  ? `${items.length} registro(s) encontrado(s)`
                  : "Nenhuma consulta realizada"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="mb-4">Preencha o formulário e clique em Consultar</p>
                  <Button
                    variant="outline"
                    onClick={() => window.open("https://sad2.ancine.gov.br/obraspublicitarias/consultaGeralViaPortal/consultaGeralViaPortal.seam", "_blank")}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir portal da ANCINE
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {items.map((item, idx) => (
                    <Card key={idx} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4 space-y-2">
                        <p className="font-medium">{item.titulo}</p>
                        {item.numero && (
                          <p className="text-sm text-muted-foreground">CRT: {item.numero}</p>
                        )}
                        {item.status && (
                          <span className="inline-block text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                            {item.status}
                          </span>
                        )}
                        {item.url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="gap-2 p-0 h-auto"
                            onClick={() => window.open(item.url, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Abrir no site
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
