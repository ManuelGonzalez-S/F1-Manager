export function RatingBadge({ value }: { value: number }) {
  const cls = value >= 75 ? 'hi' : value >= 55 ? 'mid' : 'lo'
  return <span className={`rating ${cls}`}>{value}</span>
}
