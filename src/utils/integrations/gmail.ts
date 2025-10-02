/**
 * Integração com Gmail Tracker
 * 
 * Objetivo: Rastrear conversas de e-mail por orçamento usando alias especial
 * e tags no assunto.
 * 
 * Status: Stub - Implementação futura
 */

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  snippet: string;
  date: string;
  headers: Record<string, string>;
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
  }[];
  rawId: string;
}

export interface EmailThread {
  budgetId: string;
  displayId: string;
  messages: GmailMessage[];
  lastUpdate: string;
}

/**
 * Gera alias de rastreamento para um orçamento
 */
export function generateTrackingAlias(budgetId: string): string {
  return `orcamento+${budgetId}@sistwe.com.br`;
}

/**
 * Gera tag de assunto para rastreamento
 */
export function generateSubjectTag(displayId: string): string {
  return `[WE-BUD ${displayId}]`;
}

/**
 * Extrai budget ID de um email
 */
export function extractBudgetId(email: {
  subject: string;
  headers: Record<string, string>;
  to: string[];
  cc?: string[];
}): string | null {
  // Tentar extrair do cabeçalho X-WE-Budget-ID
  const budgetIdHeader = email.headers["X-WE-Budget-ID"];
  if (budgetIdHeader) return budgetIdHeader;

  // Tentar extrair da tag no assunto
  const match = email.subject.match(/\[WE-BUD ([^\]]+)\]/);
  if (match) return match[1];

  // Tentar extrair do alias no destinatário
  const allRecipients = [...email.to, ...(email.cc || [])];
  for (const recipient of allRecipients) {
    const aliasMatch = recipient.match(/orcamento\+([^@]+)@sistwe\.com\.br/);
    if (aliasMatch) return aliasMatch[1];
  }

  return null;
}

/**
 * Busca mensagens relacionadas a um orçamento
 */
export async function fetchBudgetEmails(budgetId: string): Promise<GmailMessage[]> {
  // TODO: Implementar integração real com Gmail API
  console.log("Fetching emails for budget:", budgetId);
  return [];
}

/**
 * Sincroniza novos emails do Gmail
 */
export async function syncGmailMessages(): Promise<{
  messagesImported: number;
  threadsUpdated: number;
  errors: string[];
}> {
  // TODO: Implementar sincronização usando Gmail API watch/poll
  console.log("Syncing Gmail messages...");
  return {
    messagesImported: 0,
    threadsUpdated: 0,
    errors: [],
  };
}

/**
 * Cria um email template com rastreamento
 */
export function createTrackedEmailTemplate(params: {
  budgetId: string;
  displayId: string;
  to: string[];
  subject: string;
  body: string;
}): {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  headers: Record<string, string>;
} {
  return {
    to: params.to,
    cc: [generateTrackingAlias(params.budgetId)],
    subject: `${generateSubjectTag(params.displayId)} ${params.subject}`,
    body: params.body,
    headers: {
      "X-WE-Budget-ID": params.budgetId,
    },
  };
}
