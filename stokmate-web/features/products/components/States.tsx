import { Button } from '@/components/ui';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tekrar dene
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  action,
  actionLabel,
}: {
  title: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-zinc-500">{title}</p>
      {action && actionLabel && (
        <Button variant="secondary" onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** Full-page skeleton for the initial list load. */
export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2 pt-2" data-testid="list-skeleton">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-zinc-200/70" />
      ))}
    </div>
  );
}
