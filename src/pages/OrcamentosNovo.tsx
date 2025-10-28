import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/components/BudgetForm";
import { motion } from "framer-motion";

export default function OrcamentosNovo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate(-1)} 
              variant="ghost" 
              size="sm" 
              className="nav-button gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Novo Orçamento</h1>
              <p className="text-white/70 text-sm mt-1">
                Crie um novo orçamento usando categorias ou estrutura de fornecedores
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BudgetForm 
            onSaveSuccess={(budgetId) => {
              navigate(`/budget/${budgetId}/edit`);
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
