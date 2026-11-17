// Store applicatif (zustand) — état central de l'app CLIENT.
// Toutes les actions qui "parlent au backend" sont regroupées ici et
// simulées avec des données mock. C'est le point d'intégration unique
// à modifier quand l'équipe backend expose ses vraies routes.

import { create } from 'zustand';

import {
  client as clientMock,
  codeBox as codeBoxDefaut,
  creerDossierInstallationDemo,
  creerDossierPanne,
  creerEtapesFraiches,
  dossierDepannage,
  dossiers as dossiersMock,
  genererNumeroDossier,
  genererNumeroReclamation,
  libellesCategorieReclamation,
  liveboxInfo as liveboxMock,
  messagesInitiaux,
  notifications as notificationsMock,
  nouvellesEtapesReclamation,
  reponseCortex,
  technicien as technicienMock,
  wifiInfo as wifiInfoMock,
} from '@/data/mockData';
import {
  Adresse,
  AppareilConnecte,
  Client,
  DemandeDemenagement,
  DemandeServiceType,
  Dossier,
  LiveboxInfo,
  Message,
  NotificationItem,
  NumeroClient,
  Offre,
  ProfilDemo,
  Reclamation,
  ReclamationCategorie,
  OptionsEligibilite,
  RendezVous,
  ResultatEligibilite,
  WifiInfo,
} from '@/data/types';
import { dossierModifiable, reclamationModifiable } from '@/services/demandes';
import { erreurAjoutNumero, normaliserNumero } from '@/services/numeros';
import { verifierEligibilite as verifierEligibiliteService } from '@/services/eligibiliteService';

function heureActuelle(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dateActivationActuelle(): string {
  const maintenant = new Date();
  return (
    maintenant.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ` à ${heureActuelle().replace(':', 'h')}`
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DemandeInstallationParams {
  adresse: Adresse;
  offre: Offre;
  telephone: string;
  email: string;
}

interface AppState {
  client: Client;
  /** Code de la box saisi à la connexion (affiché dans le profil). */
  codeBox: string;
  dossiers: Dossier[];
  dossier: Dossier | null;
  messagesTechnicien: Message[];
  messagesCortex: Message[];
  reclamations: Reclamation[];
  demenagements: DemandeDemenagement[];
  /** Numéros ajoutés par le client (2 au maximum) et numéro affiché sur l'accueil (null = le numéro principal). */
  numeros: NumeroClient[];
  numeroAfficheId: string | null;
  wifi: WifiInfo;
  livebox: LiveboxInfo;
  notifications: NotificationItem[];

  eligibiliteResult: ResultatEligibilite | null;
  eligibiliteLoading: boolean;
  demandeEnCours: boolean;

  technicienAbsentSignale: boolean;
  technicienArriveNotifie: boolean;

  verifierEligibilite: (adresse: Adresse, options?: OptionsEligibilite) => Promise<ResultatEligibilite>;
  reinitialiserEligibilite: () => void;

  /** Charge l'état correspondant à un profil de la simulation de démo. */
  chargerProfilDemo: (profil: ProfilDemo) => void;

  /** Mémorise le code de box utilisé à la connexion. */
  definirCodeBox: (code: string) => void;

  creerDemandeInstallation: (params: DemandeInstallationParams) => Promise<Dossier>;
  dossierParId: (id: string) => Dossier | undefined;

  /** Met à jour l'identité du client (ex: coordonnées saisies lors d'une commande). */
  mettreAJourClient: (updates: Partial<Client>) => void;

  envoyerMessageTechnicien: (texte: string) => void;
  signalerTechnicienAbsent: () => void;
  confirmerFinIntervention: () => void;

  /** Notifie le client que le technicien est arrivé (une seule fois). */
  notifierArriveeTechnicien: () => void;

  creerReclamation: (categorie: ReclamationCategorie, description: string) => Reclamation;

  /** Ajoute une information complémentaire à un signalement existant. */
  ajouterInfoReclamation: (id: string, texte: string) => void;

  /** Enregistre une demande de déménagement (transfert de ligne). */
  creerDemenagement: (nouvelleAdresse: string) => void;

  /** Ajoute un numéro (2 au maximum). Renvoie un message d'erreur, ou null si c'est enregistré. */
  ajouterNumero: (numero: string) => Promise<string | null>;
  supprimerNumero: (id: string) => Promise<string | null>;
  /** Choisit le numéro affiché sur l'accueil ; null = le numéro principal. */
  choisirNumeroAffiche: (id: string | null) => void;

  /** Envoie une demande au service Orange (raccordement, RDV, dépannage). */
  envoyerDemande: (type: DemandeServiceType) => void;

  /** Fait avancer le dossier courant à l'étape suivante (utilisé par la simulation de suivi). */
  avancerEtapeSuivante: () => void;

  /** Le client choisit son créneau de rendez-vous, ce qui valide cette étape et passe à la suivante. */
  planifierRendezVous: (rdv: RendezVous) => void;

  /** Modifie une demande encore en cours. Renvoie un message d'erreur, ou null si c'est enregistré. */
  modifierDossier: (id: string, modif: { adresse?: string }) => Promise<string | null>;
  /** Supprime (annule) une demande encore en cours. Renvoie un message d'erreur, ou null. */
  annulerDossier: (id: string) => Promise<string | null>;
  /** Corrige un signalement non encore pris en charge. Renvoie un message d'erreur, ou null. */
  modifierReclamation: (id: string, modif: { description?: string; categorie?: ReclamationCategorie }) => Promise<string | null>;
  /** Supprime un signalement non encore pris en charge. Renvoie un message d'erreur, ou null. */
  supprimerReclamation: (id: string) => Promise<string | null>;

  toggleAppareilWifi: (id: string) => void;
  marquerNotificationLue: (id: string) => void;

  envoyerMessageCortex: (texte: string) => void;
}

function aujourdhuiPlus(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function remplacerDossier(dossiers: Dossier[], maj: Dossier): Dossier[] {
  return dossiers.map((d) => (d.id === maj.id ? maj : d));
}

export const useAppStore = create<AppState>((set, get) => ({
  client: clientMock,
  codeBox: codeBoxDefaut,
  dossiers: dossiersMock,
  dossier: dossiersMock[0] ?? null,
  messagesTechnicien: messagesInitiaux,
  messagesCortex: [
    {
      id: 'cortex-0',
      auteur: 'cortex',
      texte: `Bonjour ${clientMock.prenom} 👋 Je suis Cortex, votre assistant Orange. Comment puis-je vous aider aujourd'hui ?`,
      heure: heureActuelle(),
    },
  ],
  reclamations: [],
  demenagements: [],
  numeros: [],
  numeroAfficheId: null,
  wifi: wifiInfoMock,
  livebox: liveboxMock,
  notifications: notificationsMock,

  eligibiliteResult: null,
  eligibiliteLoading: false,
  demandeEnCours: false,

  technicienAbsentSignale: false,
  technicienArriveNotifie: false,

  verifierEligibilite: async (adresse) => {
    set({ eligibiliteLoading: true, eligibiliteResult: null });
    const resultat = await verifierEligibiliteService(adresse);
    set({ eligibiliteResult: resultat, eligibiliteLoading: false });
    return resultat;
  },

  reinitialiserEligibilite: () => set({ eligibiliteResult: null }),

  definirCodeBox: (code) => set({ codeBox: code.trim().toUpperCase() }),

  chargerProfilDemo: (profil) => {
    const base = {
      client: profil.client,
      codeBox: profil.code,
      reclamations: [] as Reclamation[],
      numeros: [] as NumeroClient[],
      numeroAfficheId: null,
      messagesTechnicien: messagesInitiaux,
      messagesCortex: [
        {
          id: 'cortex-0',
          auteur: 'cortex' as const,
          texte: `Bonjour ${profil.client.prenom} 👋 Je suis Cortex, votre assistant Orange. Comment puis-je vous aider aujourd'hui ?`,
          heure: heureActuelle(),
        },
      ],
      technicienAbsentSignale: false,
      technicienArriveNotifie: false,
      eligibiliteResult: null,
    };

    if (profil.id === 'panne') {
      const dossierPanne = creerDossierPanne(profil.client);
      set({ ...base, dossier: dossierPanne, dossiers: [dossierPanne] });
    } else if (profil.id === 'installation') {
      const dossierInstall = creerDossierInstallationDemo(profil.client);
      set({ ...base, dossier: dossierInstall, dossiers: [dossierInstall] });
    } else {
      // Déménagement & Cortex : clients existants avec une fibre déjà active.
      set({ ...base, dossier: dossierDepannage, dossiers: [dossierDepannage] });
    }
  },

  dossierParId: (id) => get().dossiers.find((d) => d.id === id),

  mettreAJourClient: (updates) => {
    set((state) => ({ client: { ...state.client, ...updates } }));
  },

  creerDemandeInstallation: async ({ adresse, offre }) => {
    set({ demandeEnCours: true });
    await delay(1100);

    const etapes = creerEtapesFraiches();

    const nouveauDossier: Dossier = {
      id: `dos-${Date.now()}`,
      numero: genererNumeroDossier(),
      type: 'installation_fibre',
      statutGlobal: 'en_cours',
      etapes,
      adresse,
      interventionAConfirmer: false,
      offre,
      creeLe: new Date().toISOString(),
    };

    set((state) => ({
      dossier: nouveauDossier,
      dossiers: [nouveauDossier, ...state.dossiers],
      demandeEnCours: false,
    }));
    return nouveauDossier;
  },

  envoyerMessageTechnicien: (texte) => {
    const nouveauMessage: Message = {
      id: `m-${Date.now()}`,
      auteur: 'client',
      texte,
      heure: heureActuelle(),
    };
    set((state) => ({ messagesTechnicien: [...state.messagesTechnicien, nouveauMessage] }));

    // Réponse simulée du technicien pour une démo vivante.
    setTimeout(() => {
      const reponse: Message = {
        id: `m-${Date.now() + 1}`,
        auteur: 'technicien',
        texte: 'Bien reçu, merci pour votre message !',
        heure: heureActuelle(),
      };
      set((state) => ({ messagesTechnicien: [...state.messagesTechnicien, reponse] }));
    }, 1400);
  },

  signalerTechnicienAbsent: () => {
    set({ technicienAbsentSignale: true });
    const dossier = get().dossier;
    if (dossier) {
      const maj: Dossier = {
        ...dossier,
        etapes: dossier.etapes.map((e) =>
          e.id === 'installation'
            ? { ...e, description: 'Signalement d\'absence transmis, un conseiller revient vers vous.' }
            : e
        ),
      };
      set((state) => ({ dossier: maj, dossiers: remplacerDossier(state.dossiers, maj) }));
    }
  },

  notifierArriveeTechnicien: () => {
    if (get().technicienArriveNotifie) return;
    const notif: NotificationItem = {
      id: `n-${Date.now()}`,
      titre: 'Votre technicien est arrivé',
      description: "Le technicien Orange vient d'arriver à votre adresse pour l'intervention.",
      heure: "À l'instant",
      categorie: 'rendez_vous',
      lue: false,
    };
    set((state) => ({ notifications: [notif, ...state.notifications], technicienArriveNotifie: true }));
  },

  confirmerFinIntervention: () => {
    const dossier = get().dossier;
    if (!dossier) return;
    const dateActivation = dateActivationActuelle();

    const maj: Dossier = {
      ...dossier,
      statutGlobal: 'termine',
      interventionAConfirmer: false,
      dateActivation,
      etapes: dossier.etapes.map((e) => {
        if (e.id === 'installation') return { ...e, statut: 'fait', date: 'Aujourd\'hui' };
        if (e.id === 'confirmation_client') return { ...e, statut: 'fait', date: 'Aujourd\'hui' };
        if (e.id === 'fibre_active') return { ...e, statut: 'fait', date: 'Aujourd\'hui' };
        return e;
      }),
    };
    set((state) => ({ dossier: maj, dossiers: remplacerDossier(state.dossiers, maj) }));
  },

  creerReclamation: (categorie, description) => {
    const reclamation: Reclamation = {
      id: `rec-${Date.now()}`,
      numero: genererNumeroReclamation(),
      categorie,
      description,
      date: 'Aujourd\'hui',
      creeLe: new Date().toISOString(),
      statut: 'ouverte',
      etapes: nouvellesEtapesReclamation(),
    };
    set((state) => ({ reclamations: [reclamation, ...state.reclamations] }));
    return reclamation;
  },

  ajouterInfoReclamation: (id, texte) => {
    const info = { texte: texte.trim(), date: "Aujourd'hui" };
    set((state) => ({
      reclamations: state.reclamations.map((r) =>
        r.id === id ? { ...r, complements: [...(r.complements ?? []), info] } : r
      ),
    }));
  },

  ajouterNumero: async (valeur) => {
    const { client, numeros } = get();
    const erreur = erreurAjoutNumero(valeur, client.telephone, numeros);
    if (erreur) return erreur;
    const numero = normaliserNumero(valeur)!;
    set((state) => ({ numeros: [...state.numeros, { id: `num-${Date.now()}`, numero }] }));
    return null;
  },

  supprimerNumero: async (id) => {
    set((state) => ({
      numeros: state.numeros.filter((n) => n.id !== id),
      numeroAfficheId: state.numeroAfficheId === id ? null : state.numeroAfficheId,
    }));
    return null;
  },

  choisirNumeroAffiche: (id) => set({ numeroAfficheId: id }),

  creerDemenagement: (nouvelleAdresse) => {
    const demande: DemandeDemenagement = {
      id: `dem-${Date.now()}`,
      nouvelleAdresse: nouvelleAdresse.trim(),
      date: "Aujourd'hui",
      statut: 'en_cours',
    };
    set((state) => ({ demenagements: [demande, ...state.demenagements] }));
  },

  envoyerDemande: (type) => {
    const libelles: Record<DemandeServiceType, string> = {
      raccordement: 'Demande de raccordement',
      rendez_vous: 'Demande de rendez-vous',
      depannage: 'Demande de dépannage',
    };
    const notif: NotificationItem = {
      id: `n-${Date.now()}`,
      titre: `${libelles[type]} transmise`,
      description: 'Votre demande a été transmise au service Orange. Un conseiller la traite et revient vers vous.',
      heure: "À l'instant",
      categorie: 'info',
      lue: false,
    };
    set((state) => ({ notifications: [notif, ...state.notifications] }));
  },

  avancerEtapeSuivante: () => {
    const dossier = get().dossier;
    if (!dossier) return;
    const index = dossier.etapes.findIndex((e) => e.statut === 'en_cours');
    if (index === -1) return;
    // Le rendez-vous est choisi par le client lui-même (voir planifierRendezVous),
    // et la confirmation finale nécessite son geste explicite (voir
    // confirmerFinIntervention, déclenché depuis /intervention-confirmation) :
    // la simulation automatique ne doit pas franchir ces étapes à sa place.
    if (dossier.etapes[index].id === 'confirmation_client') return;
    const suivante = dossier.etapes[index + 1];

    const maj: Dossier = {
      ...dossier,
      etapes: dossier.etapes.map((e, i) => {
        if (i === index) return { ...e, statut: 'fait', date: "Aujourd'hui" };
        if (suivante && i === index + 1) return { ...e, statut: 'en_cours' };
        return e;
      }),
      // Démo : Orange « planifie » l'intervention (le client ne choisit rien). Planification d'exemple, marquée demo.
      ...(dossier.etapes[index].id === 'rdv_a_planifier'
        ? {
            rdv: { date: 'Demain', creneau: '08 h 00 – 10 h 30' },
            planification: { date: aujourdhuiPlus(1), heureArrivee: '08:00', dureeMinutes: 150, demo: true },
          }
        : null),
      // Le technicien est affecté dès que cette étape est validée, pour qu'il
      // soit disponible (itinéraire, etc.) au moment de l'étape "Installation".
      ...(dossier.etapes[index].id === 'technicien_assigne' ? { technicien: technicienMock } : null),
      // L'intervention est terminée côté technicien : on demande au client de confirmer.
      ...(dossier.etapes[index].id === 'installation' ? { interventionAConfirmer: true } : null),
      // Dernière étape franchie : le dossier est complet, la fibre est active.
      ...(suivante
        ? null
        : { statutGlobal: 'termine' as const, interventionAConfirmer: false, dateActivation: dateActivationActuelle() }),
    };
    set((state) => ({ dossier: maj, dossiers: remplacerDossier(state.dossiers, maj) }));
  },

  planifierRendezVous: (rdv) => {
    const dossier = get().dossier;
    if (!dossier) return;
    const index = dossier.etapes.findIndex((e) => e.statut === 'en_cours');
    if (index === -1 || dossier.etapes[index].id !== 'rdv_a_planifier') return;
    const suivante = dossier.etapes[index + 1];

    const maj: Dossier = {
      ...dossier,
      rdv,
      etapes: dossier.etapes.map((e, i) => {
        if (i === index) return { ...e, statut: 'fait', date: "Aujourd'hui" };
        if (suivante && i === index + 1) return { ...e, statut: 'en_cours' };
        return e;
      }),
    };
    set((state) => ({ dossier: maj, dossiers: remplacerDossier(state.dossiers, maj) }));
  },

  modifierDossier: async (id, modif) => {
    const dossier = get().dossiers.find((d) => d.id === id);
    if (!dossier) return 'Demande introuvable.';
    const { ok, raison } = dossierModifiable(dossier);
    if (!ok) return raison ?? 'Cette demande ne peut plus être modifiée.';
    const maj: Dossier = {
      ...dossier,
      adresse: modif.adresse ? { ...dossier.adresse, rue: modif.adresse } : dossier.adresse,
    };
    set((state) => ({
      dossiers: remplacerDossier(state.dossiers, maj),
      dossier: state.dossier?.id === id ? maj : state.dossier,
    }));
    return null;
  },

  annulerDossier: async (id) => {
    const dossier = get().dossiers.find((d) => d.id === id);
    if (!dossier) return 'Demande introuvable.';
    const { ok, raison } = dossierModifiable(dossier);
    if (!ok) return raison ?? 'Cette demande ne peut plus être annulée.';
    const maj: Dossier = { ...dossier, annule: true };
    set((state) => {
      const dossiers = remplacerDossier(state.dossiers, maj);
      return {
        dossiers,
        dossier: state.dossier?.id === id ? (dossiers.find((d) => !d.annule) ?? null) : state.dossier,
      };
    });
    return null;
  },

  modifierReclamation: async (id, modif) => {
    const rec = get().reclamations.find((r) => r.id === id);
    if (!rec) return 'Signalement introuvable.';
    const { ok, raison } = reclamationModifiable(rec);
    if (!ok) return raison ?? 'Ce signalement ne peut plus être modifié.';
    set((state) => ({
      reclamations: state.reclamations.map((r) =>
        r.id === id ? { ...r, description: modif.description ?? r.description, categorie: modif.categorie ?? r.categorie } : r
      ),
    }));
    return null;
  },

  supprimerReclamation: async (id) => {
    const rec = get().reclamations.find((r) => r.id === id);
    if (!rec) return 'Signalement introuvable.';
    const { ok, raison } = reclamationModifiable(rec);
    if (!ok) return raison ?? 'Ce signalement ne peut plus être supprimé.';
    set((state) => ({ reclamations: state.reclamations.filter((r) => r.id !== id) }));
    return null;
  },

  toggleAppareilWifi: (id) => {
    set((state) => ({
      wifi: {
        ...state.wifi,
        appareilsConnectes: state.wifi.appareilsConnectes.map((a: AppareilConnecte) =>
          a.id === id ? { ...a, actif: !a.actif } : a
        ),
      },
    }));
  },

  marquerNotificationLue: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, lue: true } : n)),
    }));
  },

  envoyerMessageCortex: (texte) => {
    const messageClient: Message = {
      id: `c-${Date.now()}`,
      auteur: 'client',
      texte,
      heure: heureActuelle(),
    };
    set((state) => ({ messagesCortex: [...state.messagesCortex, messageClient] }));

    setTimeout(() => {
      const reponse: Message = {
        id: `c-${Date.now() + 1}`,
        auteur: 'cortex',
        texte: reponseCortex(texte, get().dossier),
        heure: heureActuelle(),
      };
      set((state) => ({ messagesCortex: [...state.messagesCortex, reponse] }));
    }, 900);
  },
}));

// Ré-export pratique pour les écrans qui n'ont besoin que du technicien mock
// avant qu'un vrai dossier ne soit créé (ex: écran technicien en accès direct).
export { technicienMock, libellesCategorieReclamation };
