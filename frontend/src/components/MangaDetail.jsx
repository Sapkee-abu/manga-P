import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Cover from './Cover';
import { formatDate, timeAgo } from '../lib/format';

export default function MangaDetail({ manga, onBack }) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const onKey = (e) => e.key === 'Escape' && onBack();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  if (!manga) return null;
  const unread = manga.status === 'unread';
  const updated = manga.updatedAt || manga.createdAt;

  return (
    <article className="rise mx-auto max-w-4xl">
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-muted hover:bg-surface-2 hover:text-ink"
      >
        <ArrowLeft size={20} /> กลับไปหน้าคลัง
      </button>

      <div className="grid gap-6 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-[minmax(0,260px)_1fr] sm:gap-8 sm:p-6">
        <Cover src={manga.cover} alt={`ปกเรื่อง ${manga.title}`} eager className="mx-auto aspect-[3/4] w-full max-w-[260px] rounded-2xl" />

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-1 text-sm font-medium text-accent">{manga.category}</p>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{manga.title}</h1>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-2 px-4 py-3">
              <dt className="text-sm text-muted">สถานะ</dt>
              <dd className={`text-lg font-semibold ${unread ? 'text-wait' : 'text-ink'}`}>{unread ? 'รออ่าน' : 'กำลังอ่าน / อ่านแล้ว'}</dd>
            </div>
            <div className="rounded-2xl bg-surface-2 px-4 py-3">
              <dt className="text-sm text-muted">อ่านถึงตอนที่</dt>
              <dd className="text-2xl font-bold text-accent">{unread ? '–' : manga.episodes ?? 0}</dd>
            </div>
            <div className="col-span-2 rounded-2xl bg-surface-2 px-4 py-3">
              <dt className="text-sm text-muted">อัปเดตล่าสุด</dt>
              <dd className="font-medium">
                {formatDate(updated)} <span className="text-muted">· {timeAgo(updated)}</span>
              </dd>
            </div>
          </dl>

          <section>
            <h2 className="mb-2 text-lg font-semibold">เรื่องย่อ</h2>
            {manga.description ? (
              <p className="whitespace-pre-line leading-relaxed">{manga.description}</p>
            ) : (
              <p className="text-muted">ไม่มีคำอธิบายสำหรับเรื่องนี้</p>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
