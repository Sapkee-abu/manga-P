import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Lock, LogOut, Library, CheckCircle2, AlertCircle } from 'lucide-react';
import UserPage from './components/UserPage';
import AdminPage from './components/AdminPage';
import MangaDetail from './components/MangaDetail';
import { api, mangaId, readCache, writeCache } from './lib/api';
import { Alert as Swal } from './lib/alert';

const SESSION_MS = 10 * 60 * 1000;
const headerBtn = 'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:border-accent sm:px-4';

export default function App() {
  const [view, setView] = useState('user'); // user | detail | admin
  const [mangas, setMangas] = useState(() => readCache() || []);
  const [status, setStatus] = useState({ loading: true, slow: false, error: null });
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ tab: 'read', category: 'All', search: '', sort: 'updated' });
  const [showTop, setShowTop] = useState(false);
  const [toast, setToast] = useState(null);
  const listScroll = useRef(0);

  /* ── โหลดข้อมูล: แสดง cache ทันที แล้วดึงของใหม่มาแทน ── */
  const load = useCallback(async () => {
    const ctrl = new AbortController();
    setStatus({ loading: true, slow: false, error: null });
    const slowTimer = setTimeout(() => setStatus((s) => ({ ...s, slow: true })), 3500);
    try {
      const data = await api.list(ctrl.signal);
      setMangas(data);
      setStatus({ loading: false, slow: false, error: null });
    } catch (err) {
      if (err.name !== 'AbortError') setStatus({ loading: false, slow: false, error: err.message || 'เชื่อมต่อไม่ได้' });
    } finally {
      clearTimeout(slowTimer);
    }
    return () => ctrl.abort();
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!status.loading && !status.error) writeCache(mangas); }, [mangas, status]);

  /* ── toast ── */
  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── ปุ่มกลับขึ้นบน ── */
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── หมดเวลาโหมดผู้ดูแลเมื่อไม่ได้ใช้งาน 10 นาที ── */
  useEffect(() => {
    if (view !== 'admin') return;
    const reset = () => localStorage.setItem('adminTimeout', Date.now() + SESSION_MS);
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    const interval = setInterval(() => {
      const exp = Number(localStorage.getItem('adminTimeout'));
      if (!exp || Date.now() > exp) {
        localStorage.removeItem('adminTimeout');
        setView('user');
        Swal.fire({ title: 'หมดเวลาเซสชัน', text: 'ไม่ได้ใช้งานโหมดผู้ดูแลเกิน 10 นาที กรุณาเข้าสู่ระบบใหม่', icon: 'info' });
      }
    }, 5000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearInterval(interval);
    };
  }, [view]);

  /* ── CRUD ── */
  const addManga = async (data) => {
    try {
      const created = await api.create(data);
      setMangas((list) => [created, ...list]);
      notify(`เพิ่ม “${created.title}” แล้ว`);
      return true;
    } catch (err) {
      Swal.fire('บันทึกไม่สำเร็จ', err.message, 'error');
      return false;
    }
  };

  const updateManga = async (id, data, { quiet = false } = {}) => {
    try {
      const updated = await api.update(id, data);
      setMangas((list) => list.map((m) => (mangaId(m) === id ? updated : m)));
      notify(quiet ? `“${updated.title}” → ตอนที่ ${updated.episodes}` : 'บันทึกการแก้ไขแล้ว');
      return true;
    } catch (err) {
      Swal.fire('อัปเดตไม่สำเร็จ', err.message, 'error');
      return false;
    }
  };

  const deleteManga = async (id, title) => {
    try {
      await api.remove(id);
      setMangas((list) => list.filter((m) => mangaId(m) !== id));
      notify(`ลบ “${title}” แล้ว`);
    } catch (err) {
      Swal.fire('ลบไม่สำเร็จ', err.message, 'error');
    }
  };

  /* ── นำทาง ── */
  const openDetail = (m) => {
    listScroll.current = window.scrollY;
    setSelected(m);
    setView('detail');
  };
  const backToList = useCallback(() => {
    setView('user');
    requestAnimationFrame(() => window.scrollTo({ top: listScroll.current }));
  }, []);

  const enterAdmin = async () => {
    const exp = Number(localStorage.getItem('adminTimeout'));
    if (exp && Date.now() < exp) return setView('admin');

    const { value: password } = await Swal.fire({
      title: 'เข้าสู่โหมดผู้ดูแล',
      input: 'password',
      inputLabel: 'รหัสผ่าน',
      inputPlaceholder: 'ใส่รหัสผ่าน',
      inputAttributes: { autocomplete: 'current-password' },
      showCancelButton: true,
      confirmButtonText: 'เข้าสู่ระบบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });

    if (password === '064679as') {
      localStorage.setItem('adminTimeout', Date.now() + SESSION_MS);
      setView('admin');
      notify('ยินดีต้อนรับ Kee1!');
    } else if (password) {
      Swal.fire('รหัสผ่านไม่ถูกต้อง', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'error');
    }
  };

  const exitAdmin = () => {
    localStorage.removeItem('adminTimeout');
    setView('user');
  };

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink">
        ข้ามไปเนื้อหา
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <button onClick={() => (view === 'admin' ? null : backToList())} className="flex min-w-0 items-center gap-2.5 rounded-lg text-left" aria-label="Manhwa Secret หน้าแรก">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
              <Library size={20} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-base font-bold sm:text-lg">Manhwa Secret</span>
              <span className="block truncate text-xs text-muted">{view === 'admin' ? 'โหมดผู้ดูแล' : 'บันทึกการอ่านของฉัน'}</span>
            </span>
          </button>

          {view === 'admin' ? (
            <button onClick={exitAdmin} aria-label="ออกจากโหมดผู้ดูแล" className={headerBtn}>
              <LogOut size={18} /> <span className="hidden sm:inline">ออกจากผู้ดูแล</span><span className="sm:hidden">ออก</span>
            </button>
          ) : (
            <button onClick={enterAdmin} className={headerBtn}>
              <Lock size={18} /> <span>ผู้ดูแล</span>
            </button>
          )}
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {view === 'user' && (
          <UserPage mangas={mangas} status={status} onRetry={load} onOpen={openDetail} filters={filters} setFilters={setFilters} />
        )}
        {view === 'detail' && <MangaDetail manga={selected} onBack={backToList} />}
        {view === 'admin' && <AdminPage mangas={mangas} onAdd={addManga} onUpdate={updateManga} onDelete={deleteManga} />}
      </main>

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="กลับขึ้นด้านบน"
          className="fixed bottom-6 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-ink shadow-lg hover:bg-accent-hover sm:right-8"
        >
          <ArrowUp size={22} />
        </button>
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <div key={toast.key} className="rise pointer-events-auto flex items-center gap-2 rounded-xl bg-ink px-4 py-3 font-medium text-bg shadow-xl">
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
