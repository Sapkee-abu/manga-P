import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Trash2, Pencil, ImagePlus, X, Search, Loader2, Clock } from 'lucide-react';
import { Alert as Swal } from '../lib/alert';
import Cover from './Cover';
import { coverSrc, mangaId } from '../lib/api';
import { CATEGORIES, timeAgo, nowTs } from '../lib/format';
import { resizeImageFile } from '../lib/image';

const EMPTY = { id: null, title: '', cover: '', description: '', episodes: '', category: 'Fantasy', status: 'read', createdAt: null };
const isUploaded = (c) => !!c && (c.startsWith('data:') || c.startsWith('/covers/') || c.includes('/covers/'));

export default function AdminPage({ mangas, onAdd, onUpdate, onDelete }) {
  const [mode, setMode] = useState('add'); // add | list | edit
  const [returnTo, setReturnTo] = useState('list');
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ q: '', status: 'All', category: 'All' });
  const [now, setNow] = useState(nowTs);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const recent = useMemo(
    () => mangas.filter((m) => m.createdAt && now - m.createdAt < 600000).sort((a, b) => b.createdAt - a.createdAt),
    [mangas, now]
  );

  const listed = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return mangas
      .filter((m) => filters.category === 'All' || m.category === filters.category)
      .filter((m) => filters.status === 'All' || (m.status || 'read') === filters.status)
      .filter((m) => !q || (m.title || '').toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  }, [mangas, filters]);

  const startEdit = (m, from) => {
    setForm({ ...EMPTY, ...m, id: mangaId(m), status: m.status || 'read', description: m.description || '', episodes: m.episodes ?? '' });
    setReturnTo(from);
    setMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setForm(EMPTY);
    setMode(returnTo);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return Swal.fire('ยังไม่ได้ใส่ชื่อเรื่อง', 'กรุณากรอกชื่อเรื่อง', 'warning');
    if (!form.cover) return Swal.fire('ยังไม่มีรูปปก', 'วาง URL รูป หรืออัปโหลดรูปจากเครื่อง', 'warning');
    if (form.status === 'read' && form.episodes === '') return Swal.fire('ยังไม่ได้ใส่ตอน', 'กรุณาระบุว่าอ่านถึงตอนที่เท่าไร', 'warning');

    const episodes = form.status === 'unread' ? 0 : Number(form.episodes);
    let updatedAt = Date.now();
    if (mode === 'edit') {
      const original = mangas.find((m) => mangaId(m) === form.id);
      // อัปเดตเวลาเฉพาะเมื่อตอนหรือสถานะเปลี่ยน
      if (original && Number(original.episodes || 0) === episodes && (original.status || 'read') === form.status) {
        updatedAt = original.updatedAt || original.createdAt || Date.now();
      }
    }

    const data = {
      title: form.title.trim(),
      cover: form.cover,
      description: form.description || '',
      episodes,
      category: form.category,
      status: form.status,
      createdAt: form.createdAt || Date.now(),
      updatedAt,
    };

    setSaving(true);
    const ok = mode === 'edit' ? await onUpdate(form.id, data) : await onAdd(data);
    setSaving(false);
    if (!ok) return;

    if (mode === 'edit') {
      const id = form.id;
      setMode(returnTo);
      setForm(EMPTY);
      setTimeout(() => {
        const el = document.getElementById(`manga-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-accent');
          setTimeout(() => el.classList.remove('ring-4', 'ring-accent'), 1800);
        }
      }, 250);
    } else {
      setForm(EMPTY);
    }
  };

  const bumpEpisode = (m) =>
    onUpdate(mangaId(m), { episodes: (Number(m.episodes) || 0) + 1, status: 'read', updatedAt: nowTs() }, { quiet: true });

  const confirmDelete = async (m) => {
    const r = await Swal.fire({
      title: `ลบ “${m.title}” ?`,
      text: 'ลบแล้วกู้คืนไม่ได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบเรื่องนี้',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#b42318',
      reverseButtons: true,
      focusCancel: true,
    });
    if (r.isConfirmed) onDelete(mangaId(m), m.title);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">จัดการคลังมังงะ</h1>
          <p className="mt-1 text-sm text-muted sm:text-base">เพิ่ม แก้ไข หรืออัปเดตตอนที่อ่านถึง</p>
        </div>
        {mode !== 'edit' && (
          <div role="tablist" className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1 sm:w-auto sm:max-w-md">
            {[
              ['add', 'เพิ่มเรื่องใหม่', null],
              ['list', 'รายการทั้งหมด', mangas.length],
            ].map(([k, label, count]) => (
              <button
                key={k}
                role="tab"
                aria-selected={mode === k}
                onClick={() => { setMode(k); setForm(EMPTY); }}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:text-base ${mode === k ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {label}
                {count !== null && <span className="ml-1 font-normal text-muted">({count})</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      {(mode === 'add' || mode === 'edit') && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
          <MangaForm form={form} setForm={setForm} editing={mode === 'edit'} saving={saving} onSubmit={handleSubmit} onCancel={cancelEdit} />

          {mode === 'add' && (
            <section aria-labelledby="recent-h" className="space-y-3">
              <div>
                <h2 id="recent-h" className="flex items-center gap-2 text-lg font-semibold">
                  <Clock size={18} className="text-accent" /> เพิ่งเพิ่มล่าสุด
                </h2>
                <p className="text-sm text-muted">ซ่อนอัตโนมัติหลัง 10 นาที</p>
              </div>
              {recent.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center text-muted">
                  เรื่องที่เพิ่งเพิ่มจะแสดงที่นี่
                </div>
              ) : (
                <ul className="space-y-2">
                  {recent.map((m) => (
                    <Row key={mangaId(m)} manga={m} onEdit={() => startEdit(m, 'add')} onDelete={() => confirmDelete(m)} onBump={() => bumpEpisode(m)} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {mode === 'list' && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <label className="relative">
              <span className="sr-only">ค้นหาชื่อเรื่อง</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} aria-hidden="true" />
              <input
                type="search"
                placeholder="ค้นหาชื่อเรื่อง…"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="h-12 w-full rounded-xl border border-line bg-surface pl-12 pr-4 text-ink focus:border-accent focus:outline-none"
              />
            </label>
            <Select label="สถานะ" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
              options={[['All', 'ทุกสถานะ'], ['read', 'อ่านแล้ว'], ['unread', 'รออ่าน']]} />
            <Select label="หมวดหมู่" value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })}
              options={[['All', 'ทุกหมวดหมู่'], ...CATEGORIES.map((c) => [c, c])]} />
          </div>

          <p className="text-sm text-muted">แสดง {listed.length} จาก {mangas.length} เรื่อง · กด “+1 ตอน” เพื่ออัปเดตตอนที่อ่านได้ทันที</p>

          {listed.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-line px-6 py-16 text-center text-lg font-semibold">ไม่พบข้อมูลที่ตรงกับตัวกรอง</div>
          ) : (
            <ul className="space-y-2">
              {listed.map((m) => (
                <Row key={mangaId(m)} manga={m} onEdit={() => startEdit(m, 'list')} onDelete={() => confirmDelete(m)} onBump={() => bumpEpisode(m)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── Form ───────────────────────── */

function MangaForm({ form, setForm, editing, saving, onSubmit, onCancel }) {
  const fileRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleFile = async (file) => {
    if (!file) return;
    setProcessing(true);
    try {
      set({ cover: await resizeImageFile(file) });
    } catch (err) {
      Swal.fire(
        err.message === 'HEIC' ? 'ไม่รองรับไฟล์ .HEIC' : 'อ่านไฟล์รูปไม่ได้',
        err.message === 'HEIC' ? 'แนะนำให้แคปหน้าจอรูปนั้น หรือใช้ไฟล์ .JPG / .PNG แทน' : 'กรุณาลองใช้รูปอื่น',
        'warning'
      );
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const ep = form.episodes === '' ? '' : Number(form.episodes);

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-line bg-surface p-5 sm:p-6" noValidate>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{editing ? 'แก้ไขข้อมูล' : 'เพิ่มเรื่องใหม่'}</h2>
        {editing && (
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink">
            <X size={16} /> ยกเลิก
          </button>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">สถานะ</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {[['read', 'อ่านแล้ว / กำลังอ่าน'], ['unread', 'รออ่าน']].map(([v, label]) => (
            <label key={v} className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-semibold transition sm:text-base has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${form.status === v ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
              <input type="radio" name="status" value={v} checked={form.status === v} className="sr-only"
                onChange={() => set(v === 'unread' ? { status: v, episodes: '' } : { status: v })} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="ชื่อเรื่อง" required>
        <input type="text" value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} autoComplete="off" />
      </Field>

      <div>
        <span className="mb-2 block text-sm font-semibold">รูปปก <span className="text-danger">*</span></span>
        <div className="flex gap-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            className={`relative w-28 shrink-0 overflow-hidden rounded-xl border-2 border-dashed sm:w-32 ${dragOver ? 'border-accent bg-accent-soft' : 'border-line'}`}
          >
            {form.cover ? (
              <img src={coverSrc(form.cover)} alt="ตัวอย่างรูปปก" className="aspect-[3/4] w-full object-cover" />
            ) : (
              <div className="flex aspect-[3/4] flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted">
                <ImagePlus size={24} /> ลากรูปมาวาง
              </div>
            )}
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/80"><Loader2 className="animate-spin" /></div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input ref={fileRef} id="cover-file" type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files[0])} />
            <label htmlFor="cover-file" className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-3 font-semibold hover:border-accent has-[:focus-visible]:outline-3">
              <ImagePlus size={18} /> เลือกรูปจากเครื่อง
            </label>
            <label className="text-sm text-muted" htmlFor="cover-url">หรือวางลิงก์รูป</label>
            <input
              id="cover-url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={isUploaded(form.cover) ? '' : form.cover}
              onChange={(e) => set({ cover: e.target.value })}
              className={inputCls}
            />
            {form.cover && (
              <button type="button" onClick={() => set({ cover: '' })} className="self-start text-sm font-semibold text-danger underline underline-offset-4">
                ลบรูป
              </button>
            )}
            <p className="text-xs text-muted">รูปจะถูกย่ออัตโนมัติก่อนบันทึก ไม่ทำให้ฐานข้อมูลอืด</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {form.status === 'read' ? (
          <Field label="อ่านถึงตอนที่" required>
            <div className="flex">
              <button type="button" aria-label="ลดตอน" onClick={() => set({ episodes: Math.max(0, (Number(ep) || 0) - 1) })}
                className="h-12 w-11 shrink-0 rounded-l-xl border border-r-0 border-line bg-surface-2 hover:text-accent"><Minus size={18} className="mx-auto" /></button>
              <input type="number" min="0" inputMode="numeric" value={form.episodes} onChange={(e) => set({ episodes: e.target.value })}
                className="h-12 w-full min-w-0 border border-line bg-bg px-2 text-center text-lg font-semibold text-ink focus:border-accent focus:outline-none" />
              <button type="button" aria-label="เพิ่มตอน" onClick={() => set({ episodes: (Number(ep) || 0) + 1 })}
                className="h-12 w-11 shrink-0 rounded-r-xl border border-l-0 border-line bg-surface-2 hover:text-accent"><Plus size={18} className="mx-auto" /></button>
            </div>
          </Field>
        ) : null}
        <Field label="หมวดหมู่" className={form.status === 'unread' ? 'col-span-2' : ''}>
          <select value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <Field label="เรื่องย่อ (ไม่บังคับ)">
        <textarea rows={4} value={form.description} onChange={(e) => set({ description: e.target.value })} className={`${inputCls} h-auto py-3`} />
      </Field>

      <button type="submit" disabled={saving || processing}
        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-base font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60">
        {saving && <Loader2 className="animate-spin" size={20} />}
        {saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มเข้าคลัง'}
      </button>
    </form>
  );
}

/* ───────────────────────── Bits ───────────────────────── */

const inputCls = 'h-12 w-full rounded-xl border border-line bg-bg px-4 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none';

function Field({ label, required, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink focus:border-accent focus:outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Row({ manga, onEdit, onDelete, onBump }) {
  const [busy, setBusy] = useState(false);
  const unread = manga.status === 'unread';
  const bump = async () => { setBusy(true); await onBump(); setBusy(false); };

  return (
    <li id={`manga-${mangaId(manga)}`} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface p-3 transition sm:grid-cols-[auto_1fr_auto] sm:gap-x-4">
      <Cover src={manga.cover} alt="" className="aspect-[3/4] w-14 shrink-0 rounded-lg sm:w-16" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">{manga.category}</p>
        <p className="truncate text-base font-semibold leading-snug">{manga.title}</p>
        {/* ตอน และวันเวลา แยกคนละบรรทัด */}
        <p className="mt-1 text-sm">
          {unread ? <span className="font-semibold text-wait">รออ่าน</span> : <span className="text-muted">ตอนที่ <strong className="text-accent">{manga.episodes ?? 0}</strong></span>}
        </p>
        <p className="text-xs text-muted">{timeAgo(manga.updatedAt || manga.createdAt)}</p>
      </div>
      <div className="col-span-2 flex items-center justify-end gap-1 border-t border-line pt-2 sm:col-span-1 sm:border-0 sm:pt-0 sm:gap-2">
        <button onClick={bump} disabled={busy} title="อ่านเพิ่ม 1 ตอน"
          className="inline-flex h-10 items-center gap-1 rounded-xl bg-accent-soft px-3 text-sm font-semibold text-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}<span>1 ตอน</span>
        </button>
        <button onClick={onEdit} aria-label={`แก้ไข ${manga.title}`} title="แก้ไข"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink">
          <Pencil size={18} />
        </button>
        <button onClick={onDelete} aria-label={`ลบ ${manga.title}`} title="ลบ"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger">
          <Trash2 size={18} />
        </button>
      </div>
    </li>
  );
}
