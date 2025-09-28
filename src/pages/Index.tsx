import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { BudgetTable } from "@/components/dashboard/BudgetTable";

const Index = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie todos os orçamentos da agência em um só lugar
          </p>
        </div>

        <DashboardStats />
        
        <div className="space-y-6">
          <DashboardFilters />
          <BudgetTable />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
