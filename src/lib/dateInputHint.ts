export const EMPTY_DATE_HINT = 'dd/mm/yyyy';

export function formatDateInputDisplay(isoDate: string): string {
  if (isoDate === '') return EMPTY_DATE_HINT;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
