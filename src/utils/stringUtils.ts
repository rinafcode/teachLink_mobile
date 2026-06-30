/**
 * Normalizes text by converting it to Unicode NFD form and removing diacritic marks.
 * E.g., 'Café' -> 'Cafe', 'Résumé' -> 'Resume', 'München' -> 'Munchen', 'Ñoño' -> 'Nono'
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
