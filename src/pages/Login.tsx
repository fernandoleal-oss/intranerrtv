import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/AuthProvider";
import { Shield, Lock, User, Eye, EyeOff, Film, Mail, Key, UserPlus } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, signInWithEmail, signUpWithEmail } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/30 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">Carregando</p>
            <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const domain = formData.email.split("@")[1]?.toLowerCase();
    if (domain !== "we.com.br" && domain !== "grupowe.com.br") {
      alert("Acesso negado. Apenas e-mails @we.com.br e @grupowe.com.br são permitidos.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await signInWithEmail(formData.email, formData.password);

    if (!error) {
      navigate("/");
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }

    const domain = formData.email.split("@")[1]?.toLowerCase();
    if (domain !== "we.com.br" && domain !== "grupowe.com.br") {
      alert("Acesso negado. Apenas e-mails @we.com.br e @grupowe.com.br são permitidos.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUpWithEmail(formData.email, formData.password, formData.name);
    setIsSubmitting(false);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 px-6 py-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-black/30">
          <CardHeader className="text-center space-y-6 pb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25"
            >
              <Film className="w-10 h-10 text-white" />
            </motion.div>
            <div className="space-y-3">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Orçamento WE
              </CardTitle>
              <CardDescription className="text-base">
                <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent font-semibold">
                  Produção Audiovisual
                </span>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-800/50 rounded-lg border border-white/5">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-md"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-md"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-5 mt-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      E-mail corporativo
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@we.com.br"
                        value={formData.email}
                        onChange={(e) => updateFormData("email", e.target.value)}
                        required
                        className="focus-ring bg-slate-800/50 border-white/10 text-white placeholder:text-gray-400 h-12 pl-10 transition-all duration-200 focus:border-primary/50"
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => updateFormData("password", e.target.value)}
                        required
                        className="focus-ring bg-slate-800/50 border-white/10 text-white placeholder:text-gray-400 h-12 pl-10 pr-12 transition-all duration-200 focus:border-primary/50"
                      />
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all duration-200 border-0"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Entrando...
                        </div>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 mr-2" />
                          Acessar Sistema
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-5 mt-6">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nome completo
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={formData.name}
                        onChange={(e) => updateFormData("name", e.target.value)}
                        required
                        className="focus-ring bg-slate-800/50 border-white/10 text-white placeholder:text-gray-400 h-12 pl-10 transition-all duration-200 focus:border-primary/50"
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="register-email"
                      className="text-sm font-medium text-gray-300 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      E-mail corporativo
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="usuario@we.com.br"
                        value={formData.email}
                        onChange={(e) => updateFormData("email", e.target.value)}
                        required
                        className="focus-ring bg-slate-800/50 border-white/10 text-white placeholder:text-gray-400 h-12 pl-10 transition-all duration-200 focus:border-primary/50"
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="register-password"
                      className="text-sm font-medium text-gray-300 flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => updateFormData("password", e.target.value)}
                        required
                        minLength={6}
                        className="focus-ring bg-slate-800/50 border-white/10 text-white placeholder:text-gray-400 h-12 pl-10 pr-12 transition-all duration-200 focus:border-primary/50"
                      />
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">
                      Confirmar senha
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                      required
                      className="focus-ring bg-slate-800/50 border-white/10 text-white placeholder:text-gray-400 h-12 transition-all duration-200 focus:border-primary/50"
                    />
                    {formData.password &&
                      formData.confirmPassword &&
                      formData.password !== formData.confirmPassword && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-red-400 flex items-center gap-2 mt-2"
                        >
                          <Shield className="w-4 h-4" />
                          As senhas não coincidem
                        </motion.p>
                      )}
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all duration-200 border-0"
                      disabled={isSubmitting || formData.password !== formData.confirmPassword}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Criando conta...
                        </div>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5 mr-2" />
                          Criar Conta
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </TabsContent>
            </Tabs>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-r from-slate-800/50 to-purple-900/20 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">Acesso Corporativo</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Acesso restrito aos domínios <span className="font-semibold text-primary">@we.com.br</span> e{" "}
                      <span className="font-semibold text-purple-400">@grupowe.com.br</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 leading-relaxed">
                Sistema interno para criação e gerenciamento de orçamentos de produção audiovisual
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
