// Session du client connecté au backend (mode « réel »), distincte du mode démo.
//  - mode 'reel'  : connecté avec (code de box + téléphone) ; les données viennent du backend.
//  - mode 'demo'  : profil d'exemple de la simulation ; AUCUNE donnée réelle, l'assistant IA est désactivé.
//  - mode null    : pas encore connecté.
// Le jeton est conservé sur l'appareil pour rester connecté d'une session à l'autre.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { definirJeton } from '@/services/apiClient';

export type ModeSession = 'reel' | 'demo' | null;

const CLE_SESSION = 'cortex.session.v1';

interface SessionState {
  mode: ModeSession;
  token: string | null;
  idClient: number | null;
  idCompte: number | null;
  numeroBox: string | null;
  /** Ligne Fibre utilisée par défaut (wifi, recharge, assistant). */
  idLigne: number | null;
  hydrate: () => Promise<void>;
  ouvrirSessionReelle: (s: { token: string; idClient: number; idCompte: number | null; numeroBox: string }) => void;
  definirLigne: (idLigne: number | null) => void;
  ouvrirModeDemo: () => void;
  fermerSession: () => void;
}

function sauvegarder(etat: Pick<SessionState, 'mode' | 'token' | 'idClient' | 'idCompte' | 'numeroBox' | 'idLigne'>) {
  AsyncStorage.setItem(CLE_SESSION, JSON.stringify(etat)).catch(() => {});
}

export const useSessionStore = create<SessionState>((set, get) => ({
  mode: null,
  token: null,
  idClient: null,
  idCompte: null,
  numeroBox: null,
  idLigne: null,

  hydrate: async () => {
    try {
      const brut = await AsyncStorage.getItem(CLE_SESSION);
      if (!brut) return;
      const s = JSON.parse(brut);
      // Le mode démo n'est jamais restauré : il repart d'un état neutre à chaque lancement.
      if (s.mode === 'reel' && s.token) {
        definirJeton(s.token);
        set({ mode: 'reel', token: s.token, idClient: s.idClient, idCompte: s.idCompte, numeroBox: s.numeroBox, idLigne: s.idLigne ?? null });
      }
    } catch {
      // Stockage indisponible : on reste déconnecté.
    }
  },

  ouvrirSessionReelle: ({ token, idClient, idCompte, numeroBox }) => {
    definirJeton(token);
    const etat = { mode: 'reel' as const, token, idClient, idCompte, numeroBox, idLigne: null };
    set(etat);
    sauvegarder(etat);
  },

  definirLigne: (idLigne) => {
    set({ idLigne });
    const { mode, token, idClient, idCompte, numeroBox } = get();
    if (mode === 'reel') sauvegarder({ mode, token, idClient, idCompte, numeroBox, idLigne });
  },

  ouvrirModeDemo: () => {
    definirJeton(null);
    set({ mode: 'demo', token: null, idClient: null, idCompte: null, numeroBox: null, idLigne: null });
    AsyncStorage.removeItem(CLE_SESSION).catch(() => {});
  },

  fermerSession: () => {
    definirJeton(null);
    set({ mode: null, token: null, idClient: null, idCompte: null, numeroBox: null, idLigne: null });
    AsyncStorage.removeItem(CLE_SESSION).catch(() => {});
  },
}));
