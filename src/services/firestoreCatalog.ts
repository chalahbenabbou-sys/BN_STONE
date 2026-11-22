import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, handleFirestoreError, OperationType, storage } from '../firebase';
import {
  DEFAULT_SEED_PRODUCTS,
  type Product,
  type ProductInput,
  type StoreSettings,
} from '../types';

export const BOOTSTRAP_ADMIN_EMAIL = 'tawamant23@gmail.com';

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

function mapDocToProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    name: String(data.name ?? ''),
    price: Number(data.price ?? 0),
    description: String(data.description ?? ''),
    category: (data.category as Product['category']) ?? 'accessories',
    imageUrl: String(data.imageUrl ?? ''),
    published: Boolean(data.published),
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    source: 'firestore',
  };
}

/**
 * Checks whether the currently signed-in Firebase user is an authorized admin.
 */
export async function checkFirebaseAdminStatus(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return false;
  }
  if (user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminSnap.exists() && adminSnap.data()?.role === 'admin';
  } catch (err) {
    console.error('Admin verification check failed:', err);
    return false;
  }
}

/**
 * Real-time public subscription to published products only (no login required).
 */
export function subscribePublishedProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'products';
  const q = query(collection(db, path), where('published', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapDocToProduct(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

/**
 * Real-time admin subscription to ALL products (published + hidden).
 * Must ONLY be attached after verifying admin authentication.
 */
export function subscribeAdminProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'products';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapDocToProduct(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

/**
 * Real-time public subscription to storefront settings (/settings/store).
 */
export function subscribeStoreSettings(
  onData: (settings: StoreSettings | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'settings/store';
  return onSnapshot(
    doc(db, 'settings', 'store'),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        whatsappPhone: typeof data.whatsappPhone === 'string' ? data.whatsappPhone : '',
        currency: typeof data.currency === 'string' && data.currency ? data.currency : 'ر.س',
        storeName: typeof data.storeName === 'string' && data.storeName ? data.storeName : 'BN_STONE',
        updatedAt: timestampToIso(data.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

function generateFirestoreSafeId(prefix = 'bn'): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}

export async function createFirestoreProduct(input: ProductInput): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('يجب تسجيل الدخول كمالك لإضافة منتج.');
  }
  const id = generateFirestoreSafeId('prod');
  const path = `products/${id}`;
  try {
    await setDoc(doc(db, 'products', id), {
      name: input.name.trim().slice(0, 140),
      price: Number(input.price),
      description: input.description.trim().slice(0, 2500),
      category: input.category,
      imageUrl: input.imageUrl.trim().slice(0, 2048),
      published: Boolean(input.published),
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFirestoreProduct(id: string, input: ProductInput): Promise<void> {
  const path = `products/${id}`;
  try {
    await updateDoc(doc(db, 'products', id), {
      name: input.name.trim().slice(0, 140),
      price: Number(input.price),
      description: input.description.trim().slice(0, 2500),
      category: input.category,
      imageUrl: input.imageUrl.trim().slice(0, 2048),
      published: Boolean(input.published),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleFirestoreProductVisibility(
  id: string,
  published: boolean
): Promise<void> {
  const path = `products/${id}`;
  try {
    await updateDoc(doc(db, 'products', id), {
      published: Boolean(published),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreProduct(id: string): Promise<void> {
  const path = `products/${id}`;
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveFirestoreStoreSettings(settings: {
  whatsappPhone: string;
  currency: string;
}): Promise<void> {
  const path = 'settings/store';
  try {
    await setDoc(doc(db, 'settings', 'store'), {
      whatsappPhone: settings.whatsappPhone.trim().slice(0, 24),
      currency: (settings.currency.trim() || 'ر.س').slice(0, 16),
      storeName: 'BN_STONE',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedDefaultProductsToFirestore(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return;
  }
  for (const item of DEFAULT_SEED_PRODUCTS) {
    const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      await setDoc(doc(db, 'products', safeId), {
        name: item.name,
        price: item.price,
        description: item.description,
        category: item.category,
        imageUrl: item.imageUrl,
        published: true,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${safeId}`);
    }
  }
}

/**
 * Uploads a product image file to Firebase Storage under /products/<uuid>.<ext>.
 */
export async function uploadImageToFirebaseStorage(file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileId = generateFirestoreSafeId('img');
  const storageRef = ref(storage, `products/${fileId}.${ext}`);
  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
    cacheControl: 'public, max-age=31536000',
  });
  return getDownloadURL(storageRef);
}
