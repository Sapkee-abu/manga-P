import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { coverSrc } from '../lib/api';

/** รูปปกที่โหลดแบบ lazy มี placeholder ระหว่างโหลด และ fallback เมื่อรูปเสีย */
export default function Cover({ src, alt, eager = false, className = '' }) {
  const url = coverSrc(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {!loaded && !failed && url && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      {(!url || failed) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted" aria-hidden="true">
          <BookOpen size={28} />
          <span className="text-xs">ไม่มีรูปปก</span>
        </div>
      )}
      {url && !failed && (
        <img
          src={url}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          width="480"
          height="640"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
