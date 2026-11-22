import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  hashPasscode,
  parseAndValidateImageDataUrl,
  resolveSafeUploadPath,
  signSessionToken,
  verifyEnvPasscode,
  verifyPasscode,
  verifySessionToken,
} from './server/authUtils.ts';
import {
  createProduct,
  deleteProduct,
  getAdminPasscodeHash,
  getProductById,
  getStoreSettings,
  listProducts,
  saveStoreSettings,
  saveUploadedImage,
  seedDefaultProducts,
  setAdminPasscodeHash,
  UPLOADS_DIR,
  updateProduct,
} from './server/storage.ts';
import { validateProductInput } from './src/utils/catalog.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

// Simple in-memory rate limiter for admin auth endpoints
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 12;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count += 1;
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'غير مصرح لك بالوصول. يرجى تسجيل الدخول كمالك للمتجر.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const session = verifySessionToken(token, SESSION_SECRET);
  if (!session) {
    res.status(401).json({ error: 'انتهت صلاحية الجلسة أو الرمز غير صالح. يرجى إعادة تسجيل الدخول.' });
    return;
  }
  next();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Strict JSON body limits: larger strictly for authenticated image uploads
  app.use('/api/admin/upload', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '256kb' }));

  // --- SEO: Dynamic robots.txt and sitemap.xml ---
  app.get('/robots.txt', (req, res) => {
    const baseUrl =
      process.env.APP_URL?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain; charset=utf-8').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/admin/',
        '',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl =
        process.env.APP_URL?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
      const products = await listProducts(false);
      const urls = [
        `  <url>\n    <loc>${escapeXml(baseUrl)}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
        ...products.map(
          (p) =>
            `  <url>\n    <loc>${escapeXml(`${baseUrl}/?product=${encodeURIComponent(p.id)}`)}</loc>\n    <lastmod>${escapeXml(p.updatedAt.slice(0, 10))}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
        ),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
      res.type('application/xml; charset=utf-8').send(xml);
    } catch (err) {
      console.error('Sitemap generation failed:', err);
      res.status(500).type('text/plain').send('Failed to generate sitemap');
    }
  });

  // --- Uploaded Product Images (Strict path confinement) ---
  app.get('/uploads/:filename', (req, res) => {
    const filename = String(req.params.filename || '');
    const safePath = resolveSafeUploadPath(UPLOADS_DIR, filename);
    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ error: 'الصورة غير موجودة.' });
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(safePath);
  });

  // --- Public Storefront API (No login required) ---
  app.get('/api/products', async (_req, res) => {
    try {
      const products = await listProducts(false);
      res.json({ products });
    } catch (err) {
      console.error('Public list products failed:', err);
      res.status(500).json({ error: 'تعذر تحميل المنتجات حالياً. يرجى المحاولة لاحقاً.' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await getProductById(String(req.params.id), false);
      if (!product) {
        res.status(404).json({ error: 'المنتج غير موجود.' });
        return;
      }
      res.json({ product });
    } catch (err) {
      console.error('Public get product failed:', err);
      res.status(500).json({ error: 'تعذر تحميل تفاصيل المنتج.' });
    }
  });

  app.get('/api/settings', async (_req, res) => {
    try {
      const settings = await getStoreSettings();
      res.json({ settings });
    } catch (err) {
      console.error('Public get settings failed:', err);
      res.status(500).json({ error: 'تعذر تحميل إعدادات المتجر.' });
    }
  });

  // --- Private Admin Auth API ---
  app.get('/api/admin/auth-status', async (_req, res) => {
    try {
      const envCode = process.env.ADMIN_ACCESS_CODE?.trim() || '';
      const storedHash = await getAdminPasscodeHash();
      res.json({
        envManaged: envCode.length > 0,
        needsSetup: envCode.length === 0 && !storedHash,
      });
    } catch (err) {
      console.error('Auth status check failed:', err);
      res.status(500).json({ error: 'تعذر التحقق من حالة الأمان.' });
    }
  });

  // One-time atomic first-run bootstrap when ADMIN_ACCESS_CODE is unset and no hash saved yet
  app.post('/api/admin/bootstrap', async (req, res) => {
    try {
      if (!checkRateLimit(getClientIp(req))) {
        res.status(429).json({ error: 'محاولات كثيرة جداً. يرجى الانتظار قليلاً.' });
        return;
      }
      const envCode = process.env.ADMIN_ACCESS_CODE?.trim() || '';
      const existingHash = await getAdminPasscodeHash();
      if (envCode.length > 0 || existingHash) {
        res.status(403).json({ error: 'تم إعداد رمز الدخول مسبقاً. يرجى تسجيل الدخول.' });
        return;
      }

      const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
      if (code.length < 6 || code.length > 128) {
        res.status(400).json({ error: 'يجب أن يتكون رمز الدخول من 6 أحرف على الأقل.' });
        return;
      }

      const hashed = hashPasscode(code);
      await setAdminPasscodeHash(hashed);
      const token = signSessionToken(SESSION_SECRET);
      res.status(201).json({ token });
    } catch (err) {
      console.error('Admin bootstrap failed:', err);
      res.status(500).json({ error: 'تعذر حفظ رمز الدخول. يرجى المحاولة مرة أخرى.' });
    }
  });

  app.post('/api/admin/login', async (req, res) => {
    try {
      if (!checkRateLimit(getClientIp(req))) {
        res.status(429).json({ error: 'محاولات دخول متكررة. يرجى الانتظار 15 دقيقة.' });
        return;
      }

      const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
      if (!code) {
        res.status(400).json({ error: 'يرجى إدخال رمز الدخول السري.' });
        return;
      }

      const envCode = process.env.ADMIN_ACCESS_CODE?.trim() || '';
      let isValid = false;

      if (envCode.length > 0) {
        isValid = verifyEnvPasscode(code, envCode);
      } else {
        const storedHash = await getAdminPasscodeHash();
        if (!storedHash) {
          res.status(409).json({ error: 'يرجى إتمام إعداد رمز الدخول الأولي أولاً.' });
          return;
        }
        isValid = verifyPasscode(code, storedHash);
      }

      if (!isValid) {
        res.status(401).json({ error: 'رمز الدخول غير صحيح.' });
        return;
      }

      const token = signSessionToken(SESSION_SECRET);
      res.json({ token });
    } catch (err) {
      console.error('Admin login failed:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول.' });
    }
  });

  app.get('/api/admin/me', requireAdmin, (_req, res) => {
    res.json({ authenticated: true, role: 'owner' });
  });

  app.post('/api/admin/change-passcode', requireAdmin, async (req, res) => {
    try {
      const envCode = process.env.ADMIN_ACCESS_CODE?.trim() || '';
      if (envCode.length > 0) {
        res.status(400).json({
          error: 'رمز الدخول مُدار عبر متغيرات البيئة (ADMIN_ACCESS_CODE) على الخادم.',
        });
        return;
      }

      const currentCode = typeof req.body?.currentCode === 'string' ? req.body.currentCode.trim() : '';
      const newCode = typeof req.body?.newCode === 'string' ? req.body.newCode.trim() : '';

      if (newCode.length < 6 || newCode.length > 128) {
        res.status(400).json({ error: 'يجب أن يتكون الرمز الجديد من 6 أحرف على الأقل.' });
        return;
      }

      const storedHash = await getAdminPasscodeHash();
      if (!storedHash || !verifyPasscode(currentCode, storedHash)) {
        res.status(401).json({ error: 'رمز الدخول الحالي غير صحيح.' });
        return;
      }

      await setAdminPasscodeHash(hashPasscode(newCode));
      res.json({ success: true });
    } catch (err) {
      console.error('Change passcode failed:', err);
      res.status(500).json({ error: 'تعذر تحديث رمز الدخول.' });
    }
  });

  // --- Protected Admin Product & Settings Routes ---
  app.get('/api/admin/products', requireAdmin, async (_req, res) => {
    try {
      const products = await listProducts(true);
      res.json({ products });
    } catch (err) {
      console.error('Admin list products failed:', err);
      res.status(500).json({ error: 'تعذر تحميل قائمة المنتجات.' });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const validation = validateProductInput(req.body ?? {});
      if (!validation.valid) {
        res.status(400).json({
          error: Object.values(validation.errors)[0] || 'بيانات المنتج غير مكتملة.',
          errors: validation.errors,
        });
        return;
      }
      const product = await createProduct({
        name: req.body.name,
        price: Number(req.body.price),
        description: req.body.description,
        category: req.body.category,
        imageUrl: req.body.imageUrl,
        published: req.body.published !== false,
      });
      res.status(201).json({ product });
    } catch (err) {
      console.error('Admin create product failed:', err);
      res.status(500).json({ error: 'تعذر إضافة المنتج.' });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const validation = validateProductInput(req.body ?? {});
      if (!validation.valid) {
        res.status(400).json({
          error: Object.values(validation.errors)[0] || 'بيانات المنتج غير صالحة.',
          errors: validation.errors,
        });
        return;
      }
      const updated = await updateProduct(String(req.params.id), {
        name: req.body.name,
        price: Number(req.body.price),
        description: req.body.description,
        category: req.body.category,
        imageUrl: req.body.imageUrl,
        published: Boolean(req.body.published),
      });
      if (!updated) {
        res.status(404).json({ error: 'المنتج غير موجود.' });
        return;
      }
      res.json({ product: updated });
    } catch (err) {
      console.error('Admin update product failed:', err);
      res.status(500).json({ error: 'تعذر تحديث بيانات المنتج.' });
    }
  });

  app.patch('/api/admin/products/:id/visibility', requireAdmin, async (req, res) => {
    try {
      if (typeof req.body?.published !== 'boolean') {
        res.status(400).json({ error: 'قيمة حالة النشر غير صالحة.' });
        return;
      }
      const updated = await updateProduct(String(req.params.id), {
        published: req.body.published,
      });
      if (!updated) {
        res.status(404).json({ error: 'المنتج غير موجود.' });
        return;
      }
      res.json({ product: updated });
    } catch (err) {
      console.error('Admin toggle visibility failed:', err);
      res.status(500).json({ error: 'تعذر تغيير حالة نشر المنتج.' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await deleteProduct(String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'المنتج غير موجود.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      console.error('Admin delete product failed:', err);
      res.status(500).json({ error: 'تعذر حذف المنتج.' });
    }
  });

  app.post('/api/admin/upload', requireAdmin, async (req, res) => {
    try {
      const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
      const validated = parseAndValidateImageDataUrl(dataUrl);
      if (!validated) {
        res.status(400).json({
          error: 'يرجى رفع صورة صالحة بصيغة JPG أو PNG أو WEBP بحجم لا يتجاوز 5 ميجابايت.',
        });
        return;
      }
      const url = await saveUploadedImage(validated);
      res.status(201).json({ url });
    } catch (err) {
      console.error('Admin image upload failed:', err);
      res.status(500).json({ error: 'تعذر رفع الصورة حالياً.' });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const whatsappPhone =
        typeof req.body?.whatsappPhone === 'string' ? req.body.whatsappPhone.trim() : '';
      const currency =
        typeof req.body?.currency === 'string' ? req.body.currency.trim() : 'ر.س';

      if (whatsappPhone.length > 24 || !/^[0-9+\-\s]*$/.test(whatsappPhone)) {
        res.status(400).json({ error: 'صيغة رقم الواتساب غير صحيحة. استخدم الأرقام فقط مع رمز الدولة.' });
        return;
      }
      if (!currency || currency.length > 16) {
        res.status(400).json({ error: 'يرجى إدخال رمز عملة صحيح.' });
        return;
      }

      const settings = await saveStoreSettings({ whatsappPhone, currency });
      res.json({ settings });
    } catch (err) {
      console.error('Admin save settings failed:', err);
      res.status(500).json({ error: 'تعذر حفظ إعدادات المتجر.' });
    }
  });

  app.post('/api/admin/seed', requireAdmin, async (_req, res) => {
    try {
      const products = await seedDefaultProducts();
      res.json({ products });
    } catch (err) {
      console.error('Admin seed default products failed:', err);
      res.status(500).json({ error: 'تعذر استيراد المنتجات الافتراضية.' });
    }
  });

  // --- Vite dev middleware or production static assets ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BN_STONE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
