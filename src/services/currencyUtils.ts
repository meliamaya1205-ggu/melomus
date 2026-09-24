export function formatCurrency(amount: number): string {
  // Format as friendly integer with thousands separator (e.g. $400.000 or $400,000)
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted;
}
