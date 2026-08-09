export function Money({ v }: { v: number }) {
  const formatted = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
  return <>{formatted}</>
}
