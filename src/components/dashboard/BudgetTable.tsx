import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Edit, Copy, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Budget {
  id: string;
  type: "filme" | "audio" | "cc" | "imagem";
  client: string;
  product: string;
  version: string;
  status: "rascunho" | "enviado" | "aprovado";
  total: number;
  producer: string;
  updatedAt: string;
}

// Mock data
const mockBudgets: Budget[] = [
  {
    id: "ORC-SBT-KV30-20250928-01",
    type: "filme",
    client: "SBT",
    product: "KV30",
    version: "v3",
    status: "aprovado",
    total: 85000,
    producer: "João Silva",
    updatedAt: "2025-09-28T14:30:00Z",
  },
  {
    id: "ORC-IBJR-CAMPANHA-20250927-02",
    type: "audio",
    client: "IBJR",
    product: "Campanha Institucional",
    version: "v1",
    status: "enviado",
    total: 12000,
    producer: "Maria Santos",
    updatedAt: "2025-09-27T16:45:00Z",
  },
  {
    id: "ORC-SHOPEE-BLACK-20250926-01",
    type: "cc",
    client: "Shopee",
    product: "Black Friday",
    version: "v2",
    status: "rascunho",
    total: 2700,
    producer: "Carlos Lima",
    updatedAt: "2025-09-26T09:15:00Z",
  },
];

const typeLabels = {
  filme: "Produção de Filme",
  audio: "Produção de Áudio",
  cc: "Closed Caption",
  imagem: "Compra de Imagem",
};

const statusVariants = {
  rascunho: "status-draft",
  enviado: "status-sent", 
  aprovado: "status-approved",
};

const statusLabels = {
  rascunho: "Rascunho",
  enviado: "Enviado ao Atendimento",
  aprovado: "Aprovado",
};

export function BudgetTable() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID do Orçamento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Versão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Produtor</TableHead>
            <TableHead>Atualizado em</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockBudgets.map((budget) => (
            <TableRow key={budget.id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-primary">
                {budget.id}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {typeLabels[budget.type]}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{budget.client}</TableCell>
              <TableCell>{budget.product}</TableCell>
              <TableCell>
                <Badge variant="secondary">{budget.version}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={statusVariants[budget.status]}>
                  {statusLabels[budget.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(budget.total)}
              </TableCell>
              <TableCell>{budget.producer}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(budget.updatedAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}