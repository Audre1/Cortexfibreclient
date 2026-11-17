// Client HTTP bas niveau vers l'API Flask (backend/). Toute la donnée de
// l'app transite par ce client (voir services/backendService.ts).

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 5000;

/**
 * Adresse du backend, détectée automatiquement pour que l'app fonctionne
 * aussi bien dans le navigateur de l'ordinateur que sur un téléphone
 * (Expo Go) sur le même Wi-Fi :
 *  1. EXPO_PUBLIC_API_URL (ex. dans cortex-client/.env) : prioritaire si défini ;
 *  2. web : le même hôte que celui qui sert la page (localhost, ou l'IP du PC
 *     si la page est ouverte via l'IP) ;
 *  3. téléphone / simulateur : l'IP du PC déjà utilisée par Metro pour envoyer
 *     l'app à l'appareil (Constants.expoConfig.hostUri, ex. "192.168.1.5:8081").
 */
function resolveApiBaseUrl(): string {
  const forcee = process.env.EXPO_PUBLIC_API_URL;
  if (forcee) return forcee.replace(/\/$/, '');

  if (Platform.OS === 'web') {
    const hote = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : '127.0.0.1';
    // Site publié (nom de domaine, ex. CloudFront) : l'API est servie par la même adresse, sous /api.
    const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hote) || hote.endsWith('.local');
    if (!local && typeof window !== 'undefined' && /[a-z]/i.test(hote)) return window.location.origin;
    return `http://${hote}:${API_PORT}`;
  }

  const sources = [
    Constants.expoConfig?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost,
    (Constants as any).linkingUri,
  ];
  for (const source of sources) {
    if (typeof source !== 'string') continue;
    const hote = source.replace(/^[a-z+]+:\/\//i, '').split(/[:/]/)[0];
    if (hote) return `http://${hote}:${API_PORT}`;
  }
  return `http://127.0.0.1:${API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const DELAI_MAX_MS = 15000;
// Les réponses de l'assistant IA (modèle local sur le serveur) peuvent prendre plus de temps.
const DELAI_ASSISTANT_MS = 150000;

// Jeton d'authentification du client connecté (voir store/useSessionStore.ts).
let jetonAuth: string | null = null;
let surSessionExpiree: (() => void) | null = null;

export function definirJeton(jeton: string | null) {
  jetonAuth = jeton;
}

/** Appelé quand le serveur répond « session expirée / jeton invalide » (401). */
export function surSessionInvalide(rappel: (() => void) | null) {
  surSessionExpiree = rappel;
}

async function request<T>(path: string, options: RequestInit = {}, delaiMs: number = DELAI_MAX_MS): Promise<T> {
  const controller = new AbortController();
  const minuteur = setTimeout(() => controller.abort(), delaiMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(jetonAuth ? { Authorization: `Bearer ${jetonAuth}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      `Serveur injoignable (${API_BASE_URL}). Vérifiez que le backend est lancé et que l'appareil est sur le même réseau Wi-Fi que l'ordinateur.`,
      0,
      null
    );
  } finally {
    clearTimeout(minuteur);
  }

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // reponse vide (ex. certaines erreurs 500 sans corps JSON)
  }

  if (response.status === 401 && jetonAuth && surSessionExpiree) surSessionExpiree();

  if (!response.ok || (body && body.success === false)) {
    const message = body?.message || body?.error || `Erreur ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export const api = {
  /** POST avec un délai plus long (assistant IA). */
  postLong: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }, DELAI_ASSISTANT_MS),
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
