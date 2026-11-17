import { Ionicons } from '@expo/vector-icons';

import { libellesCategorieReclamation } from '@/data/mockData';
import { Dossier, Reclamation } from '@/data/types';
import { dossierModifiable, LIBELLE_TYPE_DOSSIER, reclamationModifiable } from '@/services/demandes';

type Icone = React.ComponentProps<typeof Ionicons>['name'];
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Une demande du client (installation, dépannage… ou signalement) sous une forme commune. */
export interface Demande {
  cle: string;
  genre: 'dossier' | 'reclamation';
  id: string;
  titre: string;
  icone: Icone;
  reference: string;
  /** Date et heure de dépôt (null si le dossier ne la fournit pas). */
  creeLe: Date | null;
  /** Date et heure de résolution (null tant que la demande n'est pas résolue, ou si elle n'est pas fournie). */
  resolueLe: Date | null;
  resume?: string;
  /** en_cours = non résolue ; resolue = résolue / terminée ; annulee = annulée par le client. */
  etat: 'en_cours' | 'resolue' | 'annulee';
  /** Demande prise en compte par Orange (technicien affecté, diagnostic validé, signalement pris en charge). */
  acceptee: boolean;
  badge: { label: string; tone: Tone };
  modifiable: boolean;
  raisonVerrou?: string;
}

function dateOuNull(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function depuisDossier(d: Dossier): Demande {
  const m = dossierModifiable(d);
  const resolue = d.statutGlobal === 'termine' && !d.annule;
  const acceptee =
    !!d.technicien || d.etapes.some((e) => e.id === 'demande_validee' && e.statut === 'fait');
  const etat: Demande['etat'] = d.annule ? 'annulee' : resolue ? 'resolue' : 'en_cours';
  return {
    cle: `d-${d.id}`,
    genre: 'dossier',
    id: d.id,
    titre: LIBELLE_TYPE_DOSSIER[d.type],
    icone: 'construct-outline',
    reference: d.numero,
    creeLe: dateOuNull(d.creeLe),
    resolueLe: resolue ? dateOuNull(d.modifieLe) : null,
    resume: d.prochaineAction && d.prochaineAction !== 'Aucune' ? d.prochaineAction : d.adresse.rue || undefined,
    etat,
    acceptee,
    badge: d.annule
      ? { label: 'Annulée', tone: 'neutral' }
      : resolue
        ? { label: 'Résolue', tone: 'success' }
        : d.statutGlobal === 'bloque'
          ? { label: 'Bloquée', tone: 'danger' }
          : acceptee
            ? { label: 'Acceptée · en traitement', tone: 'warning' }
            : { label: 'Reçue', tone: 'info' },
    modifiable: m.ok,
    raisonVerrou: m.raison,
  };
}

function depuisReclamation(r: Reclamation): Demande {
  const m = reclamationModifiable(r);
  const resolue = r.statut === 'resolue';
  const acceptee = r.statut !== 'ouverte';
  return {
    cle: `r-${r.id}`,
    genre: 'reclamation',
    id: r.id,
    titre: `Signalement · ${libellesCategorieReclamation[r.categorie]}`,
    icone: 'alert-circle-outline',
    reference: r.numero,
    creeLe: dateOuNull(r.creeLe),
    resolueLe: resolue ? dateOuNull(r.resolueLe) : null,
    resume: r.description,
    etat: resolue ? 'resolue' : 'en_cours',
    acceptee,
    badge: resolue
      ? { label: 'Résolu', tone: 'success' }
      : acceptee
        ? { label: 'Accepté · en traitement', tone: 'warning' }
        : { label: 'Reçu', tone: 'info' },
    modifiable: m.ok,
    raisonVerrou: m.raison,
  };
}

/** Toutes les demandes du client, de la plus récente à la plus ancienne (sans date : à la fin). */
export function construireDemandes(dossiers: Dossier[], reclamations: Reclamation[]): Demande[] {
  const liste = [...dossiers.map(depuisDossier), ...reclamations.map(depuisReclamation)];
  return liste.sort((a, b) => (b.creeLe?.getTime() ?? -Infinity) - (a.creeLe?.getTime() ?? -Infinity));
}

// ---------------------------------------------------------------------------------------------
// Dates : clés de regroupement et libellés (heure locale du téléphone)
// ---------------------------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function cleJour(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function cleMois(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** « Aujourd'hui », « Hier » ou « Lundi 3 novembre 2026 ». */
export function libelleJour(d: Date, maintenant = new Date()): string {
  const hier = new Date(maintenant);
  hier.setDate(hier.getDate() - 1);
  if (cleJour(d) === cleJour(maintenant)) return "Aujourd'hui";
  if (cleJour(d) === cleJour(hier)) return 'Hier';
  return majuscule(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}

/** « Novembre 2026 ». */
export function libelleMois(d: Date): string {
  return majuscule(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
}

/** « 14:32 ». */
export function heureCourte(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** « 3 nov. 2026 à 14:32 ». */
export function dateHeureCourte(d: Date): string {
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} à ${heureCourte(d)}`;
}

export interface Groupe<T> {
  cle: string;
  libelle: string;
  elements: T[];
}

/** Regroupe en conservant l'ordre : `cle` donne la clé et le libellé du groupe ; les éléments sans date vont dans un dernier groupe. */
export function grouper<T>(
  elements: T[],
  date: (e: T) => Date | null,
  cle: (d: Date) => string,
  libelle: (d: Date) => string,
): Groupe<T>[] {
  const groupes: Groupe<T>[] = [];
  const index = new Map<string, Groupe<T>>();
  const sansDate: T[] = [];
  for (const e of elements) {
    const d = date(e);
    if (!d) {
      sansDate.push(e);
      continue;
    }
    const k = cle(d);
    let g = index.get(k);
    if (!g) {
      g = { cle: k, libelle: libelle(d), elements: [] };
      index.set(k, g);
      groupes.push(g);
    }
    g.elements.push(e);
  }
  if (sansDate.length) groupes.push({ cle: 'sans-date', libelle: 'Date non renseignée', elements: sansDate });
  return groupes;
}
