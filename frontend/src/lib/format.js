export const CATEGORIES = ['Fantasy', 'Murim', 'Comedy', 'Action', 'Action-Assassin'];

export function formatDate(timestamp) {
  if (!timestamp) return 'ไม่มีข้อมูล';
  return (
    new Date(timestamp).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.'
  );
}

const rtf = new Intl.RelativeTimeFormat('th', { numeric: 'auto' });

/** "เมื่อวาน", "3 วันที่แล้ว" ฯลฯ */
export function timeAgo(timestamp) {
  if (!timestamp) return 'ไม่มีข้อมูล';
  const diff = (timestamp - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'เมื่อสักครู่';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
}

/** เวลาปัจจุบัน (แยกเป็นฟังก์ชันเพื่อใช้ใน event handler) */
export const nowTs = () => Date.now();
