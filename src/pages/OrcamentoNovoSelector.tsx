import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Film, Music, Image, Building2, FileText } from "lucide-react";

export default function OrcamentoNovoSelector() {
  const navigate = useNavigate();

  const budgetTypes = [
    {
      type: "filme",
      title: "Orçamento de Filme",
      description: "Criar orçamento completo para produção de filme/vídeo",
      icon: Film,
      path: "/orcamentos/novo/filme",
      color: "from-blue-500 to-blue-600",
    },
    {
      type: "audio",
      title: "Orçamento de Áudio",
      description: "Criar orçamento para produção de áudio",
      icon: Music,
      path: "/new/audio",
      color: "from-purple-500 to-purple-600",
    },
    {
      type: "imagem",
      title: "Orçamento de Imagem",
      description: "Criar orçamento para produção de imagens/fotografia",
      icon: Image,
      path: "/new/imagem",
      color: "from-green-500 to-green-600",
    },
    {
      type: "cc",
      title: "Orçamento CC",
      description: "Criar orçamento de centro de custo",
      icon: Building2,
      path: "/new/cc",
      color: "from-orange-500 to-orange-600",
    },
    {
      type: "livre",
      title: "Orçamento Livre",
      description: "Criar orçamento customizado para qualquer serviço (tradução, consultoria, etc.)",
      icon: FileText,
      path: "/new/livre",
      color: "from-teal-500 to-teal-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/orcamentos")} variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Novo Orçamento</h1>
              <p className="text-gray-600 text-sm">Selecione o tipo de orçamento que deseja criar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {budgetTypes.map((budget, index) => (
            <motion.div
              key={budget.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary"
                onClick={() => navigate(budget.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${budget.color} flex items-center justify-center mb-3`}>
                    <budget.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{budget.title}</CardTitle>
                  <CardDescription className="text-sm">{budget.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Criar Orçamento
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
