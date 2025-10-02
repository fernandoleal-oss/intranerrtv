/**
 * Integração com Taskrow (PULL Sync)
 * 
 * Objetivo: Puxar automaticamente lançamentos/projetos do Taskrow
 * e conciliar com orçamentos/financeiro no portal.
 * 
 * Status: Stub - Implementação futura
 */

export interface TaskrowProject {
  id: string;
  name: string;
  client: string;
  status: string;
  startDate: string;
  endDate?: string;
  value: number;
  notes?: string;
}

export interface TaskrowInvoice {
  id: string;
  projectId: string;
  invoiceNumber: string;
  poNumber?: string;
  total: number;
  issueDate: string;
  dueDate: string;
  status: string;
}

export interface TaskrowTask {
  id: string;
  projectId: string;
  title: string;
  status: string;
  assignee?: string;
  dueDate?: string;
  comments?: string[];
}

/**
 * Busca projetos do Taskrow em um período
 */
export async function fetchTaskrowProjects(params: {
  from: string;
  to: string;
}): Promise<TaskrowProject[]> {
  // TODO: Implementar integração real
  console.log("Fetching Taskrow projects:", params);
  return [];
}

/**
 * Busca invoices/faturamentos do Taskrow
 */
export async function fetchTaskrowInvoices(params: {
  from: string;
  to: string;
}): Promise<TaskrowInvoice[]> {
  // TODO: Implementar integração real
  console.log("Fetching Taskrow invoices:", params);
  return [];
}

/**
 * Busca tarefas do Taskrow
 */
export async function fetchTaskrowTasks(params: {
  status?: string;
}): Promise<TaskrowTask[]> {
  // TODO: Implementar integração real
  console.log("Fetching Taskrow tasks:", params);
  return [];
}

/**
 * Sincroniza dados do Taskrow com o banco local
 */
export async function syncTaskrowData(): Promise<{
  projectsImported: number;
  invoicesImported: number;
  errors: string[];
}> {
  // TODO: Implementar sincronização completa
  console.log("Syncing Taskrow data...");
  return {
    projectsImported: 0,
    invoicesImported: 0,
    errors: [],
  };
}
