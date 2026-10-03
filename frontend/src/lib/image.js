const MAX_W = 480;
const MAX_H = 640;
const TIMEOUT_MS = 20000;

/**
 * ย่อรูปในเครื่องก่อนส่งขึ้นเซิร์ฟเวอร์ (ไม่เกิน 480x640, WebP)
 * ปกติได้ไฟล์ราว 20–60KB แทนที่จะเป็นหลาย MB
 */
export function resizeImageFile(file) {
  if (file.type === 'image/heic' || /\.heic$/i.test(file.name)) return Promise.reject(new Error('HEIC'));

  // กันค้าง: ถ้าย่อรูปไม่เสร็จใน 20 วินาที ให้ถือว่าล้มเหลว ปุ่มจะกลับมากดได้
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS); });
  return Promise.race([decodeAndResize(file), timeout]).finally(() => clearTimeout(timer));
}

async function decodeAndResize(file) {
  // createImageBitmap ถอดรหัสรูปนอก main thread และใช้หน่วยความจำน้อยกว่า <img>
  // สำคัญกับรูปกล้องมือถือขนาดใหญ่ ที่ทำให้ Chrome บน Android ปิดแท็บทิ้งระหว่างเลือกรูป
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const { w, h } = fit(bitmap.width, bitmap.height);
      const out = draw(bitmap, w, h);
      bitmap.close();
      return out;
    } catch {
      // บางเบราว์เซอร์ถอดรหัสบางไฟล์ไม่ได้ → ลองแบบ <img>
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { w, h } = fit(img.width, img.height);
      URL.revokeObjectURL(url);
      resolve(draw(img, w, h));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('DECODE'));
    };
    img.src = url;
  });
}

function fit(width, height) {
  const scale = Math.min(1, MAX_W / width, MAX_H / height);
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

function draw(source, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  let dataUrl = canvas.toDataURL('image/webp', 0.8);
  // Safari รุ่นเก่าไม่รองรับ WebP จะได้ PNG กลับมา → ใช้ JPEG แทน
  if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  // คืนหน่วยความจำของ canvas ทันที
  canvas.width = canvas.height = 0;
  return dataUrl;
}
