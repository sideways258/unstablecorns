// Thin client for the admin-panel API (server/admin.js). The token is kept in
// localStorage and sent as a Bearer header.

const TOKEN_KEY = 'uu-admin-token';

export type StoredCard = {
  id: string;
  title: string;
  type: string;
  count: number;
  description: string;
  effectKey: string;
  image: string;
};

export type StoredPack = {
  id: string;
  name: string;
  blurb: string;
  cards: StoredCard[];
};

export type EffectOption = { key: string; label: string; types: string[] };

export const getToken = (): string => {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

export const setToken = (t: string) => {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

// es5 target: subclassing Error breaks instanceof, so tag a plain Error instead.
type ApiError = Error & { status: number };

const makeApiError = (message: string, status: number): ApiError => {
  const e = new Error(message) as ApiError;
  e.status = status;
  return e;
};

async function req<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      Authorization: `Bearer ${getToken()}`,
    },
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    throw makeApiError(data.error || res.statusText || 'Request failed', res.status);
  }
  return data as T;
}

export const adminApi = {
  login: (username: string, password: string) =>
    req<{ token: string; username: string; mustChangePassword: boolean }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ ok: boolean; token: string; mustChangePassword: boolean }>('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  state: () => req<{ mustChangePassword: boolean; packs: StoredPack[] }>('/api/admin/state'),

  effects: () => req<{ effects: EffectOption[]; cardTypes: string[] }>('/api/admin/effects'),

  createPack: (name: string, blurb: string) =>
    req<{ pack: StoredPack }>('/api/admin/packs', {
      method: 'POST',
      body: JSON.stringify({ name, blurb }),
    }),

  deletePack: (id: string) => req<{ ok: boolean }>(`/api/admin/packs/${id}`, { method: 'DELETE' }),

  addCard: (
    packId: string,
    card: {
      title: string;
      type: string;
      count: number;
      description: string;
      effectKey: string;
      image: string;
    }
  ) =>
    req<{ card: StoredCard }>(`/api/admin/packs/${packId}/cards`, {
      method: 'POST',
      body: JSON.stringify(card),
    }),

  deleteCard: (packId: string, cardId: string) =>
    req<{ ok: boolean }>(`/api/admin/packs/${packId}/cards/${cardId}`, { method: 'DELETE' }),
};

export const isAuthError = (e: unknown): boolean =>
  !!e && typeof (e as any).status === 'number' && (e as any).status === 401;

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

export const CARD_TYPE_LABELS: Record<string, string> = {
  baby: 'Baby Unicorn',
  basic: 'Basic Unicorn',
  unicorn: 'Magical Unicorn',
  narwhal: 'Narwhal',
  magic: 'Magic',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  neigh: 'Neigh',
  super_neigh: 'Super Neigh',
};
