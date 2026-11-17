// Données propres au mode réel qui n'ont pas d'équivalent dans le store de démonstration
// (useAppStore) : lignes Fibre du client, dernière mesure de la Fiberbox, anomalies, catalogue d'offres.
// Alimenté par services/modeReel.ts ; vidé à la déconnexion.

import { create } from 'zustand';

import { Offre } from '@/data/types';
import { LigneResume } from '@/services/backendService';

export interface MesureBox {
  mesureLe: string;
  etatWan: string;
  signalDbm: number | null;
  debitDescendantMbps: number | null;
  debitMontantMbps: number | null;
  nbMicroCoupures24h: number | null;
}

export interface AnomalieBox {
  id: number;
  titre: string;
  description: string;
  gravite: string;
  statut: string;
  detecteeLe: string;
  referenceReclamation: string | null;
}

interface DonneesEspaceReel {
  lignes: LigneResume[];
  ligneActive: LigneResume | null;
  mesure: MesureBox | null;
  anomalies: AnomalieBox[];
  offres: Offre[];
  chargement: boolean;
  /** Message d'erreur du dernier chargement (réseau, session...), null si tout va bien. */
  erreur: string | null;
  charge: boolean;
}

interface EspaceReelState extends DonneesEspaceReel {
  maj: (partiel: Partial<DonneesEspaceReel>) => void;
  reinitialiser: () => void;
}

const vide: DonneesEspaceReel = {
  lignes: [],
  ligneActive: null,
  mesure: null,
  anomalies: [],
  offres: [],
  chargement: false,
  erreur: null,
  charge: false,
};

export const useEspaceReelStore = create<EspaceReelState>((set) => ({
  ...vide,
  maj: (partiel) => set(partiel),
  reinitialiser: () => set({ ...vide }),
}));
