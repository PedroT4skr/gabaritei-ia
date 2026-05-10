// ===== Placeholder — utils/helpers.ts =====

/**
 * Gera array de letras de A até a letra especificada
 */
export function generateAlternatives(count: number, startChar: string = 'A'): string[] {
  const start = startChar.charCodeAt(0);
  return Array.from({ length: count }, (_, i) => String.fromCharCode(start + i));
}

/**
 * Formata número com padding de zeros
 */
export function padNumber(num: number, length: number = 2): string {
  return String(num).padStart(length, '0');
}

/**
 * Formata data em formato brasileiro
 */
export function formatDateBR(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata data e hora em formato brasileiro
 */
export function formatDateTimeBR(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
