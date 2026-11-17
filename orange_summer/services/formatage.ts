import { Coords } from '@/data/types';

/** « 29 octobre 2026 à 14:32 » à partir d'une date ISO / RFC 822 ; undefined si la date est absente ou illisible. */
export function dateHeure(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const jour = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const heure = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${jour} à ${heure}`;
}

/** « 09:42 » à partir d'une date ISO ; undefined si absente ou illisible. */
export function heureDe(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** « 2 h 10 » : durée entre deux dates ISO ; undefined si impossible ou négative. */
export function dureeEntre(debut?: string | null, fin?: string | null): string | undefined {
  if (!debut || !fin) return undefined;
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  const minutes = Math.round(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

/** Distance à vol d'oiseau entre deux points, en kilomètres (formule de haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function libelleDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** « à l'instant », « il y a 3 min »… pour un âge exprimé en secondes. */
export function libelleAgeSecondes(s: number): string {
  if (s < 60) return "à l'instant";
  const min = Math.round(s / 60);
  return `il y a ${min} min`;
}

/** « jeudi 3 septembre 2026 » à partir de AAAA-MM-JJ. */
export function jourLong(aaaammjj?: string | null): string | undefined {
  if (!aaaammjj || !/^\d{4}-\d{2}-\d{2}$/.test(aaaammjj)) return undefined;
  const [a, m, j] = aaaammjj.split('-').map(Number);
  return new Date(a, m - 1, j).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** 150 -> « 2 h 30 », 45 -> « 45 min ». */
export function dureeMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
