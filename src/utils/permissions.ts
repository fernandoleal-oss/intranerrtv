/**
 * Verifica se o email do usuário tem permissão para editar dados financeiros
 * Apenas Fernando e Kelly podem editar
 */
export function canEditFinance(userEmail?: string | null): boolean {
  if (!userEmail) return false;
  const allowedEmails = [
    "fernando.leal@we.com.br",
    "kelly@we.com.br"
  ];
  return allowedEmails.includes(userEmail.toLowerCase());
}
