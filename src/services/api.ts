import { DEFAULT_WHATSAPP_PHONE, type Product, type ProductInput, type StoreSettings } from '../types';

export interface AuthStatusResponse {
  envManaged: boolean;
  needsSetup: boolean;
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof data.error === 'string' && data.error
        ? data.error
        : 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.';
    throw new Error(message);
  }
  return data as T;
}

export async function fetchPublicProducts(): Promise<Product[]> {
  const data = await requestJson<{ products: Product[] }>('/api/products');
  return data.products ?? [];
}

export async function fetchPublicSettings(): Promise<StoreSettings> {
  const data = await requestJson<{ settings: StoreSettings }>('/api/settings');
  return (
    data.settings ?? {
      whatsappPhone: DEFAULT_WHATSAPP_PHONE,
      currency: 'ر.س',
      storeName: 'BN_STONE',
    }
  );
}

export async function fetchAdminAuthStatus(): Promise<AuthStatusResponse> {
  return requestJson<AuthStatusResponse>('/api/admin/auth-status');
}

export async function bootstrapAdminPasscode(code: string): Promise<string> {
  const data = await requestJson<{ token: string }>('/api/admin/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return data.token;
}

export async function loginAdminPasscode(code: string): Promise<string> {
  const data = await requestJson<{ token: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return data.token;
}

export async function changeAdminPasscode(
  token: string,
  currentCode: string,
  newCode: string
): Promise<void> {
  await requestJson<{ success: boolean }>(
    '/api/admin/change-passcode',
    {
      method: 'POST',
      body: JSON.stringify({ currentCode, newCode }),
    },
    token
  );
}

export async function fetchAdminProducts(token: string): Promise<Product[]> {
  const data = await requestJson<{ products: Product[] }>('/api/admin/products', {}, token);
  return data.products ?? [];
}

export async function createServerProduct(token: string, input: ProductInput): Promise<Product> {
  const data = await requestJson<{ product: Product }>(
    '/api/admin/products',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );
  return data.product;
}

export async function updateServerProduct(
  token: string,
  id: string,
  input: ProductInput
): Promise<Product> {
  const data = await requestJson<{ product: Product }>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
    token
  );
  return data.product;
}

export async function toggleServerProductVisibility(
  token: string,
  id: string,
  published: boolean
): Promise<Product> {
  const data = await requestJson<{ product: Product }>(
    `/api/admin/products/${encodeURIComponent(id)}/visibility`,
    {
      method: 'PATCH',
      body: JSON.stringify({ published }),
    },
    token
  );
  return data.product;
}

export async function deleteServerProduct(token: string, id: string): Promise<void> {
  await requestJson<{ deleted: boolean }>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    token
  );
}

export async function uploadImageToServer(token: string, dataUrl: string): Promise<string> {
  const data = await requestJson<{ url: string }>(
    '/api/admin/upload',
    {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    },
    token
  );
  return data.url;
}

export async function saveServerSettings(
  token: string,
  settings: { whatsappPhone: string; currency: string }
): Promise<StoreSettings> {
  const data = await requestJson<{ settings: StoreSettings }>(
    '/api/admin/settings',
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    },
    token
  );
  return data.settings;
}

export async function seedServerDefaultProducts(token: string): Promise<Product[]> {
  const data = await requestJson<{ products: Product[] }>(
    '/api/admin/seed',
    { method: 'POST' },
    token
  );
  return data.products ?? [];
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('تعذر قراءة ملف الصورة.'));
      }
    };
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.readAsDataURL(file);
  });
}
