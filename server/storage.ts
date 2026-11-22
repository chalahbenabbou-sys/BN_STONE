import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_SEED_PRODUCTS,
  DEFAULT_WHATSAPP_PHONE,
  type Product,
  type ProductInput,
  type StoreSettings,
} from '../src/types.ts';
import type { ValidatedImageUpload } from './authUtils.ts';

interface LocalDatabaseSchema {
  products: Product[];
  settings: StoreSettings;
  adminPasscodeHash: string | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'bn_stone_db.json');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function createInitialLocalState(): LocalDatabaseSchema {
  const now = new Date().toISOString();
  return {
    products: DEFAULT_SEED_PRODUCTS.map((item) => ({
      ...item,
      createdAt: now,
      updatedAt: now,
      source: 'server',
    })),
    settings: {
      whatsappPhone: DEFAULT_WHATSAPP_PHONE,
      currency: 'ر.س',
      storeName: 'BN_STONE',
      updatedAt: now,
    },
    adminPasscodeHash: null,
  };
}

function readLocalDb(): LocalDatabaseSchema {
  ensureDirectories();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialLocalState();
    writeLocalDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDatabaseSchema>;
    const fallback = createInitialLocalState();
    return {
      products: Array.isArray(parsed.products) ? parsed.products : fallback.products,
      settings: parsed.settings
        ? {
            whatsappPhone: parsed.settings.whatsappPhone ?? '',
            currency: parsed.settings.currency || 'ر.س',
            storeName: parsed.settings.storeName || 'BN_STONE',
            updatedAt: parsed.settings.updatedAt,
          }
        : fallback.settings,
      adminPasscodeHash: typeof parsed.adminPasscodeHash === 'string' ? parsed.adminPasscodeHash : null,
    };
  } catch (err) {
    console.error('Failed to read local store file, reinitializing:', err);
    const initial = createInitialLocalState();
    writeLocalDb(initial);
    return initial;
  }
}

function writeLocalDb(state: LocalDatabaseSchema) {
  ensureDirectories();
  const tmpFile = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

let cachedSupabase: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
  if (cachedSupabase !== undefined) {
    return cachedSupabase;
  }
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && serviceKey) {
    cachedSupabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    cachedSupabase = null;
  }
  return cachedSupabase;
}

function mapSupabaseProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    price: Number(row.price),
    description: String(row.description),
    category: row.category as Product['category'],
    imageUrl: String(row.image_url),
    published: Boolean(row.published),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    source: 'server',
  };
}

export async function listProducts(includeHidden: boolean): Promise<Product[]> {
  const supabase = getSupabase();
  if (supabase) {
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!includeHidden) {
      query = query.eq('published', true);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Supabase listProducts error: ${error.message}`);
    }
    return (data ?? []).map((row) => mapSupabaseProduct(row as Record<string, unknown>));
  }

  const db = readLocalDb();
  const items = includeHidden ? db.products : db.products.filter((p) => p.published);
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProductById(id: string, includeHidden: boolean): Promise<Product | null> {
  const supabase = getSupabase();
  if (supabase) {
    let query = supabase.from('products').select('*').eq('id', id);
    if (!includeHidden) {
      query = query.eq('published', true);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Supabase getProductById error: ${error.message}`);
    }
    return data ? mapSupabaseProduct(data as Record<string, unknown>) : null;
  }

  const db = readLocalDb();
  const found = db.products.find((p) => p.id === id);
  if (!found || (!includeHidden && !found.published)) {
    return null;
  }
  return found;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const now = new Date().toISOString();
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: input.name.trim(),
        price: Number(input.price),
        description: input.description.trim(),
        category: input.category,
        image_url: input.imageUrl.trim(),
        published: Boolean(input.published),
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(`Supabase createProduct error: ${error?.message || 'unknown'}`);
    }
    return mapSupabaseProduct(data as Record<string, unknown>);
  }

  const db = readLocalDb();
  const product: Product = {
    id: `bn-${crypto.randomUUID().slice(0, 12)}`,
    name: input.name.trim(),
    price: Number(input.price),
    description: input.description.trim(),
    category: input.category,
    imageUrl: input.imageUrl.trim(),
    published: Boolean(input.published),
    createdAt: now,
    updatedAt: now,
    source: 'server',
  };
  db.products.unshift(product);
  writeLocalDb(db);
  return product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product | null> {
  const now = new Date().toISOString();
  const supabase = getSupabase();
  if (supabase) {
    const patch: Record<string, unknown> = { updated_at: now };
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.price !== undefined) patch.price = Number(input.price);
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.category !== undefined) patch.category = input.category;
    if (input.imageUrl !== undefined) patch.image_url = input.imageUrl.trim();
    if (input.published !== undefined) patch.published = Boolean(input.published);

    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) {
      throw new Error(`Supabase updateProduct error: ${error.message}`);
    }
    return data ? mapSupabaseProduct(data as Record<string, unknown>) : null;
  }

  const db = readLocalDb();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) {
    return null;
  }
  const existing = db.products[index];
  const updated: Product = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    price: input.price !== undefined ? Number(input.price) : existing.price,
    description: input.description !== undefined ? input.description.trim() : existing.description,
    category: input.category !== undefined ? input.category : existing.category,
    imageUrl: input.imageUrl !== undefined ? input.imageUrl.trim() : existing.imageUrl,
    published: input.published !== undefined ? Boolean(input.published) : existing.published,
    updatedAt: now,
  };
  db.products[index] = updated;
  writeLocalDb(db);
  return updated;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    const { error, count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) {
      throw new Error(`Supabase deleteProduct error: ${error.message}`);
    }
    return (count ?? 0) > 0;
  }

  const db = readLocalDb();
  const initialLen = db.products.length;
  db.products = db.products.filter((p) => p.id !== id);
  if (db.products.length === initialLen) {
    return false;
  }
  writeLocalDb(db);
  return true;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (error) {
      throw new Error(`Supabase getStoreSettings error: ${error.message}`);
    }
    if (data) {
      return {
        whatsappPhone: String(data.whatsapp_phone ?? ''),
        currency: String(data.currency || 'ر.س'),
        storeName: 'BN_STONE',
        updatedAt: String(data.updated_at || new Date().toISOString()),
      };
    }
  }

  const db = readLocalDb();
  return db.settings;
}

export async function saveStoreSettings(input: Partial<StoreSettings>): Promise<StoreSettings> {
  const now = new Date().toISOString();
  const current = await getStoreSettings();
  const next: StoreSettings = {
    whatsappPhone:
      input.whatsappPhone !== undefined ? input.whatsappPhone.trim() : current.whatsappPhone,
    currency: input.currency !== undefined && input.currency.trim() ? input.currency.trim() : current.currency,
    storeName: 'BN_STONE',
    updatedAt: now,
  };

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('store_settings').upsert({
      id: 'default',
      whatsapp_phone: next.whatsappPhone,
      currency: next.currency,
      updated_at: now,
    });
    if (error) {
      throw new Error(`Supabase saveStoreSettings error: ${error.message}`);
    }
    return next;
  }

  const db = readLocalDb();
  db.settings = next;
  writeLocalDb(db);
  return next;
}

export async function getAdminPasscodeHash(): Promise<string | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('admin_credentials')
      .select('passcode_hash')
      .eq('id', 'owner')
      .maybeSingle();
    if (error) {
      throw new Error(`Supabase getAdminPasscodeHash error: ${error.message}`);
    }
    return data?.passcode_hash ? String(data.passcode_hash) : null;
  }
  return readLocalDb().adminPasscodeHash;
}

export async function setAdminPasscodeHash(hash: string): Promise<void> {
  const now = new Date().toISOString();
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('admin_credentials').upsert({
      id: 'owner',
      passcode_hash: hash,
      updated_at: now,
    });
    if (error) {
      throw new Error(`Supabase setAdminPasscodeHash error: ${error.message}`);
    }
    return;
  }

  const db = readLocalDb();
  db.adminPasscodeHash = hash;
  writeLocalDb(db);
}

export async function saveUploadedImage(image: ValidatedImageUpload): Promise<string> {
  const filename = `${crypto.randomUUID()}.${image.ext}`;
  const supabase = getSupabase();
  if (supabase) {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'product-images';
    const { error } = await supabase.storage.from(bucket).upload(filename, image.buffer, {
      contentType: image.mimeType,
      upsert: false,
    });
    if (error) {
      throw new Error(`Supabase image upload failed: ${error.message}`);
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl;
  }

  ensureDirectories();
  const destination = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(destination, image.buffer);
  return `/uploads/${filename}`;
}

export async function seedDefaultProducts(): Promise<Product[]> {
  const existing = await listProducts(true);
  if (existing.length > 0) {
    return existing;
  }
  const created: Product[] = [];
  for (const item of DEFAULT_SEED_PRODUCTS) {
    const product = await createProduct({
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl,
      published: true,
    });
    created.push(product);
  }
  return created;
}

