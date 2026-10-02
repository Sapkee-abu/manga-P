import { useMemo, useDeferredValue } from 'react';
import { Search, X, RefreshCw } from 'lucide-react';
import MangaCard, { CardSkeleton } from './MangaCard';
import { CATEGORIES } from '../lib/format';

const SORTS = {
  updated: { label: 'อัปเดตล่าสุด', fn: (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0) },
  title: { label: 'ชื่อเรื่อง ก–ฮ / A–Z', fn: (a, b) => (a.title || '').localeCompare(b.title || '', 'th') },
  episodes: { label: 'ตอนมากที่สุด', fn: (a, b) => (b.episodes || 0) - (a.episodes || 0) },
};

export default function UserPage({ mangas, status, onRetry, onOpen, filters, setFilters }) {
  const { tab, category, search, sort } = filters;
  const set = (patch) => setFilters({ ...filters, ...patch });
  const deferredSearch = useDeferredValue(search);

  const stats = useMemo(() => {
    const read = mangas.filter((m) => (m.status || 'read') === 'read');
    return {
      read: read.length,
      unread: mangas.length - read.length,
      episodes: read.reduce((s, m) => s + (Number(m.episodes) || 0), 0),
    };
  }, [mangas]);

  const visible = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return mangas
      .filter((m) => (m.status || 'read') === tab)
      .filter((m) => category === 'All' || m.category === category)
      .filter((m) => !q || (m.title || '').toLowerCase().includes(q))
      .sort(SORTS[sort].fn);
  }, [mangas, tab, category, deferredSearch, sort]);

  const showSkeleton = status.loading && mangas.length === 0;

  return (
    <div className="space-y-6">
      {/* สรุปตัวเลข */}
      <section aria-label="สรุป" className="grid grid-cols-3 gap-3">
        <Stat label="อ่านแล้ว" value={stats.read} unit="เรื่อง" />
        <Stat label="รออ่าน" value={stats.unread} unit="เรื่อง" />
        <Stat label="อ่านไปแล้ว" value={stats.episodes.toLocaleString('th-TH')} unit="ตอน" />
      </section>

      {/* แท็บสถานะ */}
      <div role="tablist" aria-label="สถานะการอ่าน" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1 sm:inline-grid sm:w-auto">
        {[
          ['read', 'อ่านแล้ว', stats.read],
          ['unread', 'รออ่าน', stats.unread],
        ].map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => set({ tab: key })}
            className={`rounded-xl px-6 py-2.5 text-base font-semibold transition ${
              tab === key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {label} <span className="ml-1 text-sm font-normal text-muted">({count})</span>
          </button>
        ))}
      </div>

      {/* ค้นหา + เรียง */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">ค้นหาชื่อเรื่อง</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="ค้นหาชื่อเรื่อง…"
            className="h-12 w-full rounded-xl border border-line bg-surface pl-12 pr-11 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => set({ search: '' })}
              aria-label="ล้างคำค้นหา"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted hover:text-ink"
            >
              <X size={18} />
            </button>
          )}
        </label>
        <label className="flex items-center gap-2 sm:w-64">
          <span className="shrink-0 text-sm text-muted">เรียงตาม</span>
          <select
            value={sort}
            onChange={(e) => set({ sort: e.target.value })}
            className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink focus:border-accent focus:outline-none"
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* หมวดหมู่ */}
      <div role="group" aria-label="หมวดหมู่" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {['All', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            aria-pressed={category === cat}
            onClick={() => set({ category: cat })}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              category === cat
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-surface text-ink hover:border-accent'
            }`}
          >
            {cat === 'All' ? 'ทั้งหมด' : cat}
          </button>
        ))}
      </div>

      {/* สถานะเชื่อมต่อ */}
      {status.slow && status.loading && (
        <p role="status" className="rounded-xl bg-wait-soft px-4 py-3 text-sm text-wait">
          กำลังปลุกเซิร์ฟเวอร์… ถ้าไม่ได้เปิดมานาน Hugging Face Space อาจใช้เวลาตื่น 30–60 วินาที
          {mangas.length > 0 && ' (ระหว่างนี้แสดงข้อมูลล่าสุดที่บันทึกไว้)'}
        </p>
      )}
      {status.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <span>
            โหลดข้อมูลไม่สำเร็จ ({status.error})
            {mangas.length > 0 && ' — กำลังแสดงข้อมูลล่าสุดที่บันทึกไว้'}
          </span>
          <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 font-semibold text-ink">
            <RefreshCw size={16} /> ลองใหม่
          </button>
        </div>
      )}

      {/* รายการ */}
      {showSkeleton ? (
        <Grid>{Array.from({ length: 10 }, (_, i) => <CardSkeleton key={i} />)}</Grid>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line px-6 py-16 text-center">
          <p className="text-lg font-semibold">
            {search || category !== 'All'
              ? 'ไม่พบเรื่องที่ตรงกับตัวกรอง'
              : tab === 'read'
                ? 'ยังไม่มีเรื่องที่อ่านแล้ว'
                : 'ยังไม่มีเรื่องในลิสต์รออ่าน'}
          </p>
          {(search || category !== 'All') && (
            <button
              onClick={() => set({ search: '', category: 'All' })}
              className="mt-3 rounded-lg px-3 py-1.5 font-semibold text-accent underline underline-offset-4"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">พบ {visible.length} เรื่อง</p>
          <Grid>
            {visible.map((m) => (
              <MangaCard key={m.id || m._id} manga={m} onOpen={onOpen} />
            ))}
          </Grid>
        </>
      )}
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{children}</div>;
}

function Stat({ label, value, unit }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3 sm:px-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-xl font-bold leading-tight text-ink sm:text-3xl">
        {value}<span className="ml-1 text-xs font-normal text-muted sm:text-sm">{unit}</span>
      </p>
    </div>
  );
}
