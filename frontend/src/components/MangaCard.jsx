import Cover from './Cover';
import { timeAgo, formatDate } from '../lib/format';

export default function MangaCard({ manga, onOpen }) {
  const unread = manga.status === 'unread';

  return (
    <button
      type="button"
      onClick={() => onOpen(manga)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
    >
      <Cover src={manga.cover} alt="" className="aspect-[3/4] w-full" />

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">{manga.category}</p>
        <h3 className="mb-3 mt-1 line-clamp-2 text-base font-semibold leading-snug text-ink">{manga.title}</h3>

        {/* ตอน และวันเวลา แยกคนละบรรทัด */}
        <div className="mt-auto flex flex-col items-start gap-1 border-t border-line pt-3">
          {unread ? (
            <span className="rounded-full bg-wait-soft px-2.5 py-0.5 text-sm font-semibold text-wait">รออ่าน</span>
          ) : (
            <span className="text-sm text-muted">
              ตอนที่ <strong className="text-base font-bold text-accent">{manga.episodes ?? 0}</strong>
            </span>
          )}
          <time
            dateTime={manga.updatedAt ? new Date(manga.updatedAt).toISOString() : undefined}
            title={formatDate(manga.updatedAt || manga.createdAt)}
            className="text-xs text-muted"
          >
            {timeAgo(manga.updatedAt || manga.createdAt)}
          </time>
        </div>
      </div>
    </button>
  );
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
      <div className="skeleton aspect-[3/4]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-5 w-1/3 rounded" />
      </div>
    </div>
  );
}
