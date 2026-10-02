const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

// sharp ใช้ย่อ/บีบอัดรูปฝั่งเซิร์ฟเวอร์ ถ้าติดตั้งไม่ได้ ระบบยังทำงานต่อได้ (เก็บรูปตามที่ส่งมา)
let sharp = null;
try {
  sharp = require('sharp');
} catch {
  console.warn('⚠️ sharp not available – covers will be stored as uploaded');
}

const app = express();
app.use(cors());
app.use(compression());
// รูปถูกย่อฝั่ง client แล้ว 10mb เหลือเฟือ (เดิม 50mb)
app.use(express.json({ limit: '10mb' }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    migrateInlineCovers().catch((err) => console.error('❌ Cover migration failed:', err));
  })
  .catch((err) => console.error('❌ Could not connect to MongoDB:', err));

/* ───────────────────────── Models ───────────────────────── */

const mangaSchema = new mongoose.Schema({
  id: { type: String, index: true },
  title: String,
  cover: String, // เก็บเฉพาะ URL ภายนอกเท่านั้น (รูปที่อัปโหลดย้ายไปอยู่ collection covers)
  coverVersion: Number, // เปลี่ยนทุกครั้งที่อัปโหลดรูปใหม่ ใช้ล้าง cache ของ browser
  description: String,
  episodes: Number,
  category: String,
  status: String,
  createdAt: Number,
  updatedAt: { type: Number, index: true },
});
const Manga = mongoose.model('Manga', mangaSchema);

// รูปปกแยกเก็บเป็น binary อีก collection เพื่อให้ list เบา
const coverSchema = new mongoose.Schema({
  mangaId: { type: String, unique: true }, // = Manga._id
  data: Buffer,
  contentType: String,
});
const Cover = mongoose.model('Cover', coverSchema);

/* ───────────────────────── Helpers ───────────────────────── */

const isDataUri = (s) => typeof s === 'string' && s.startsWith('data:');
const isOurCoverPath = (s) => typeof s === 'string' && s.includes('/covers/');

function parseDataUri(dataUri) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUri);
  if (!match) return null;
  const contentType = match[1] || 'application/octet-stream';
  const buffer = match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]));
  return { buffer, contentType };
}

// ย่อรูปให้ไม่เกิน 480x640 และแปลงเป็น WebP (ขนาดพอดีการ์ดและหน้า detail)
async function optimizeImage(buffer, contentType) {
  if (!sharp) return { buffer, contentType };
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize({ width: 480, height: 640, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return { buffer: out, contentType: 'image/webp' };
  } catch (err) {
    console.warn('⚠️ optimizeImage failed, storing original:', err.message);
    return { buffer, contentType };
  }
}

async function saveCover(mangaObjectId, dataUri) {
  const parsed = parseDataUri(dataUri);
  if (!parsed) throw new Error('Invalid image data');
  const { buffer, contentType } = await optimizeImage(parsed.buffer, parsed.contentType);
  await Cover.findOneAndUpdate(
    { mangaId: String(mangaObjectId) },
    { data: buffer, contentType },
    { upsert: true }
  );
}

// แปลงเอกสารเป็นรูปแบบที่ส่งให้หน้าเว็บ (cover เป็น URL เสมอ ไม่ใช่ base64)
function toClient(m) {
  const objectId = String(m._id);
  let cover = '';
  if (m.cover && m.cover !== '__inline__' && !isDataUri(m.cover)) {
    cover = m.cover;
  } else if (m.coverVersion || m.cover === '__inline__' || isDataUri(m.cover)) {
    cover = `/covers/${objectId}?v=${m.coverVersion || m.updatedAt || 0}`;
  }
  return {
    id: m.id || objectId,
    title: m.title,
    cover,
    description: m.description,
    episodes: m.episodes,
    category: m.category,
    status: m.status,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function idQuery(queryId) {
  return mongoose.Types.ObjectId.isValid(queryId)
    ? { $or: [{ _id: queryId }, { id: queryId }] }
    : { id: queryId };
}

// รับเฉพาะ field ที่อนุญาต
function pickFields(body) {
  const allowed = ['title', 'cover', 'description', 'episodes', 'category', 'status', 'createdAt', 'updatedAt'];
  const out = {};
  for (const key of allowed) if (body[key] !== undefined) out[key] = body[key];
  if (out.episodes !== undefined) out.episodes = Number(out.episodes) || 0;
  return out;
}

// ย้ายรูป base64 เดิมที่อยู่ในเอกสารมังงะออกไปไว้ใน collection covers (ทำครั้งเดียว ทำซ้ำได้ปลอดภัย)
async function migrateInlineCovers() {
  const cursor = Manga.find({ cover: /^data:/ }).cursor();
  let count = 0;
  for await (const m of cursor) {
    try {
      await saveCover(m._id, m.cover);
      await Manga.updateOne(
        { _id: m._id },
        { $set: { cover: '', coverVersion: m.updatedAt || Date.now() } }
      );
      count++;
    } catch (err) {
      console.error(`❌ migrate cover ${m._id}:`, err.message);
    }
  }
  if (count) console.log(`🖼️  Migrated ${count} inline cover(s) to covers collection`);
}

/* ───────────────────────── Routes ───────────────────────── */

app.get('/', (req, res) => res.json({ ok: true }));
app.get('/health', (req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1 })
);

app.get('/mangas', async (req, res) => {
  try {
    // ไม่ดึงข้อมูลรูป base64 ออกมาเลย
    // เอกสารปกติ (cover เป็น URL/ว่าง) ดึงครบ ส่วนเอกสารที่ยังมี base64 ค้าง (ยังไม่ถูกย้าย) ดึงโดยตัด cover ทิ้ง
    const [normal, inline] = await Promise.all([
      Manga.find({ cover: { $not: /^data:/ } }).lean(),
      Manga.find({ cover: /^data:/ }, { cover: 0 }).lean(),
    ]);
    inline.forEach((m) => (m.cover = '__inline__'));
    const mangas = [...normal, ...inline].sort(
      (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
    );
    res.set('Cache-Control', 'no-cache'); // ใช้ ETag ตรวจว่าเปลี่ยนไหม ถ้าไม่เปลี่ยนได้ 304
    res.json(mangas.map(toClient));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/covers/:id', async (req, res) => {
  try {
    const mangaId = req.params.id;
    let cover = await Cover.findOne({ mangaId }).lean();

    // ยังไม่ถูกย้าย → ดึงจากเอกสารเดิม
    if (!cover && mongoose.Types.ObjectId.isValid(mangaId)) {
      const m = await Manga.findById(mangaId, { cover: 1 }).lean();
      if (m && isDataUri(m.cover)) {
        const parsed = parseDataUri(m.cover);
        if (parsed) cover = { data: parsed.buffer, contentType: parsed.contentType };
      }
    }
    if (!cover) return res.status(404).end();

    res.set('Content-Type', cover.contentType || 'image/webp');
    // URL มี ?v= เปลี่ยนเมื่อรูปเปลี่ยน จึง cache ได้ยาว
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    const data = Buffer.isBuffer(cover.data) ? cover.data : Buffer.from(cover.data.buffer);
    res.send(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/mangas', async (req, res) => {
  try {
    const data = pickFields(req.body);
    const incomingCover = data.cover;
    if (isDataUri(incomingCover)) data.cover = '';

    const manga = new Manga(data);
    if (isDataUri(incomingCover)) {
      await saveCover(manga._id, incomingCover);
      manga.coverVersion = Date.now();
    }
    await manga.save();
    res.json(toClient(manga.toObject()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/mangas/:id', async (req, res) => {
  try {
    const existing = await Manga.findOne(idQuery(req.params.id), { _id: 1 }).lean();
    if (!existing) return res.status(404).json({ message: 'Manga not found' });

    const data = pickFields(req.body);
    const update = { $set: data, $unset: {} };

    if (isDataUri(data.cover)) {
      // อัปโหลดรูปใหม่
      await saveCover(existing._id, data.cover);
      data.cover = '';
      data.coverVersion = Date.now();
    } else if (data.cover === undefined || isOurCoverPath(data.cover)) {
      // รูปเดิม ไม่ต้องแตะ
      delete data.cover;
    } else {
      // เปลี่ยนเป็น URL ภายนอก → ลบรูปที่เคยอัปโหลด
      await Cover.deleteOne({ mangaId: String(existing._id) });
      update.$unset.coverVersion = 1;
    }
    if (!Object.keys(update.$unset).length) delete update.$unset;

    const updated = await Manga.findByIdAndUpdate(existing._id, update, { returnDocument: 'after' }).lean();
    res.json(toClient(updated));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/mangas/:id', async (req, res) => {
  try {
    const deleted = await Manga.findOneAndDelete(idQuery(req.params.id)).lean();
    if (deleted) await Cover.deleteOne({ mangaId: String(deleted._id) });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
  console.log(`🚀 Backend is running on http://localhost:${PORT}`);
});
