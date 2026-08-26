import { useProductStats } from '../hooks';

export function StatsCards() {
  const stats = useProductStats();

  const cards = [
    { label: 'Toplam Ürün', value: stats.data?.total },
    { label: 'Stoğu Tükenen', value: stats.data?.outOfStock },
    { label: 'Kritik Stokta', value: stats.data?.lowStock },
  ];

  return (
    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl bg-surface p-4 shadow-sm">
          <p className="text-sm text-zinc-500">{card.label}</p>
          {stats.isError ? (
            <p className="mt-1 text-2xl font-semibold">—</p>
          ) : card.value === undefined ? (
            <div className="mt-2 h-8 w-14 animate-pulse rounded-md bg-zinc-200/70" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}
