import { useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { canEditFinance } from "@/utils/permissions";

export default function Finance() {
  const { user } = useAuth();
  const canEdit = canEditFinance(user?.email);

  return (
    <div className="min-h-screen bg-background">
      <HeaderBar
        title="Financeiro"
        subtitle="Visão geral e análise financeira"
        backTo="/"
        actions={
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        }
      />

      <div className="container-page">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas do Mês
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1 text-green-600" />
                +0% vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas do Mês
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground mt-1">
                vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resultado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground mt-1">
                Receitas - Despesas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Margem
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground mt-1">
                % de lucro
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Aviso de permissão */}
        {!canEdit && (
          <Card className="mb-6 border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800">
                <strong>Visualização apenas.</strong> Apenas fernando.leal@we.com.br pode editar dados financeiros.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Conteúdo principal */}
        <Card>
          <CardHeader>
            <CardTitle>Lançamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum lançamento encontrado</p>
              <p className="text-sm mt-2">
                A funcionalidade completa será implementada em breve
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
