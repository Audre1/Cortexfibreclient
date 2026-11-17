import { Dossier, DossierType, Reclamation } from '@/data/types';
import { useSessionStore } from '@/store/useSessionStore';

// Même règle que le backend (routes/dossiers.py) : une fois le technicien parti, plus de modification.
const STATUTS_TERRAIN_VERROUILLES = ['En route', 'Arrivé', 'En cours', 'Terminé', 'Intervention partielle'];

export const LIBELLE_TYPE_DOSSIER: Record<DossierType, string> = {
  installation_fibre: 'Installation fibre',
  depannage_box: 'Dépannage',
  demenagement: 'Déménagement',
  changement_offre: "Changement d'offre",
};

// Ce que le technicien vient faire selon le type de demande, et la durée habituelle de ce travail.
// La durée est une estimation INDICATIVE (aucune durée n'est enregistrée avant l'intervention) :
// l'écran l'indique, et affiche la durée réelle une fois l'intervention terminée.
export const TRAVAUX_PAR_TYPE: Record<DossierType, { travaux: string; dureeEstimee: string }> = {
  installation_fibre: {
    travaux:
      "Installer et raccorder votre fibre : passage du câble jusqu'à votre logement, pose de la prise optique, branchement et configuration de la box, puis test de la connexion.",
    dureeEstimee: '2 à 3 heures',
  },
  depannage_box: {
    travaux:
      "Rechercher l'origine du problème et le réparer : contrôle de la ligne, de la prise optique et de la box, puis test de la connexion.",
    dureeEstimee: '1 à 2 heures',
  },
  demenagement: {
    travaux: 'Raccorder votre ligne fibre à votre nouvelle adresse et la remettre en service.',
    dureeEstimee: '2 à 3 heures',
  },
  changement_offre: {
    travaux: 'Adapter votre installation à votre nouvelle offre : contrôle et configuration de la box.',
    dureeEstimee: '1 heure',
  },
};

export const LIBELLE_STATUT_TERRAIN: Record<string, string> = {
  'En route': 'Technicien en route',
  Arrivé: 'Technicien sur place',
  'En cours': 'Intervention en cours',
  Terminé: 'Intervention terminée',
  Bloqué: 'Intervention bloquée',
  'Intervention partielle': 'Intervention partielle',
};

export interface Modifiable {
  ok: boolean;
  raison?: string;
}

/** Une demande peut être modifiée ou supprimée tant qu'elle est en cours et que le technicien n'est pas parti. */
export function dossierModifiable(d: Dossier): Modifiable {
  if (d.annule) return { ok: false, raison: 'Cette demande a été annulée.' };
  if (d.statutGlobal !== 'en_cours') return { ok: false, raison: "Cette demande n'est plus en cours." };
  if (d.statutTerrain && STATUTS_TERRAIN_VERROUILLES.includes(d.statutTerrain)) {
    return { ok: false, raison: 'Le technicien est déjà en intervention. Appelez le 3900 pour toute modification.' };
  }
  // Démo : pas de statut terrain, on se fie à l'étape « Installation » en cours.
  if (useSessionStore.getState().mode !== 'reel' && d.etapes.some((e) => e.id === 'installation' && e.statut === 'en_cours')) {
    return { ok: false, raison: 'Le technicien est déjà en route. Appelez le 3900 pour toute modification.' };
  }
  return { ok: true };
}

/** Un signalement n'est modifiable / supprimable que tant que personne ne l'a pris en charge. */
export function reclamationModifiable(r: Reclamation): Modifiable {
  if (r.statut !== 'ouverte' || r.numero === 'Enregistrement…') {
    return { ok: false, raison: 'Ce signalement est déjà pris en charge. Contactez le 3900.' };
  }
  return { ok: true };
}

