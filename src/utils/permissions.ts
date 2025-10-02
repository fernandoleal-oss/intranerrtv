/**
 * Verifica se o email do usuário tem permissão para editar dados financeiros
 */
export function canEditFinance(userEmail?: string | null): boolean {
  return userEmail === "fernando.leal@we.com.br";
}
