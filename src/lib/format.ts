export function formatMoney(n: number | null | undefined): string {
  const value = Number(n ?? 0);
  return `₱${value.toFixed(2)}`;
}

export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function saleTypeLabel(type: string): string {
  switch (type) {
    case 'utang-paid':
      return 'Utang Paid';
    case 'utang':
      return 'Utang';
    default:
      return 'Sale';
  }
}