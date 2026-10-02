const MAX_W = 480;
const MAX_H = 640;

/**
 * ย่อรูปในเครื่องก่อนส่งขึ้นเซิร์ฟเวอร์ (ไม่เกิน 480x640, WebP)
 * ปกติได้ไฟล์ราว 20–60KB แทนที่จะเป็นหลาย MB
 */
export function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/heic' || /\.heic$/i.test(file.name)) {
      reject(new Error('HEIC'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      let dataUrl = canvas.toDataURL('image/webp', 0.8);
      // Safari รุ่นเก่าไม่รองรับ WebP จะได้ PNG กลับมา → ใช้ JPEG แทน
      if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('DECODE'));
    };
    img.src = url;
  });
}
