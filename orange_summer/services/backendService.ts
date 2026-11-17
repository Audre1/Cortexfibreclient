// Couche d'intégration avec l'API Flask réelle : un appel par endpoint,
// plus les fonctions de conversion (mapXxx) entre le format renvoyé par le
// backend (colonnes SQL en snake_case majuscule) et les types déjà utilisés
// par tous les écrans (data/types.ts), pour ne pas avoir à réécrire les
// écrans qui consomment ces types.

import { api } from './apiClient';
import {
  Adresse,
  Auteur,
  Client,
  Dossier,
  DossierEtapeId,
  DossierType,
  EtapeStatut,
  Message,
  NotificationCategorie,
  NotificationItem,
  Offre,
  ReclamationCategorie,
  ReclamationStatut,
  Technicien,
  NumeroClient,
} from '@/data/types';

// ---------------------------------------------------------------------------
// Helpers de formatage / conversion
// ---------------------------------------------------------------------------

function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatHeure(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDebit(debitMbps: number): string {
  return debitMbps >= 1000 ? `${debitMbps / 1000} Gb/s` : `${debitMbps} Mb/s`;
}

const STATUT_ETAPE: Record<string, EtapeStatut> = { FAIT: 'fait', EN_COURS: 'en_cours', A_VENIR: 'a_venir' };
const TYPE_DOSSIER: Record<string, DossierType> = {
  INSTALLATION: 'installation_fibre',
  DEPANNAGE: 'depannage_box',
  DEMENAGEMENT: 'demenagement',
  CHANGEMENT_OFFRE: 'changement_offre',
};

// ---------------------------------------------------------------------------
// Mappers backend -> types front
// ---------------------------------------------------------------------------

export function mapClient(c: any): Client {
  return {
    id: String(c.id_client),
    prenom: c.prenom,
    nom: c.nom,
    telephone: c.telephone,
    email: c.email ?? '',
    adresse: {
      numero: '',
      rue: c.adresse_complete ?? '',
      codePostal: '',
      ville: c.ville ?? '',
    },
  };
}

export function mapOffre(o: any): Offre {
  const avantages: string[] = [];
  if (o.connexion_illimitee) avantages.push('Connexion illimitée');
  if (o.inclut_ligne_fixe) avantages.push('Ligne téléphonique');
  if (o.minutes_incluses_oci > 0) avantages.push(`${o.minutes_incluses_oci} min vers OCI`);
  if (o.inclut_antivirus) avantages.push('Antivirus inclus');
  return {
    id: String(o.id_offre),
    nom: o.nom,
    debit: formatDebit(o.debit_mbps),
    prixFCFA: o.prix_mensuel_fcfa,
    avantages,
    icone: o.icone ?? 'flash',
  };
}

function mapEtape(e: any) {
  return {
    id: (e.code_etape as string).toLowerCase() as DossierEtapeId,
    titre: e.titre,
    description: e.description ?? '',
    date: formatDate(e.date_franchissement),
    statut: STATUT_ETAPE[e.statut] ?? 'a_venir',
  };
}

function mapTechnicien(t: any, itineraire?: { latitude: number; longitude: number }[], creneau?: string): Technicien {
  return {
    id: String(t.id_technicien),
    prenom: t.prenom,
    nom: t.nom,
    note: Number(t.note_moyenne),
    telephone: t.telephone,
    vehicule: t.vehicule ?? '',
    immatriculation: t.immatriculation ?? '',
    initiales: t.initiales,
    heureArriveeEstimee: creneau ?? '—',
    positionDepart: itineraire?.[0],
    itineraire,
  };
}

export function mapDossier(d: any): Dossier {
  const rdv = d.rendez_vous;
  const adresse: Adresse = {
    numero: '',
    rue: d.adresse ?? '',
    codePostal: '',
    ville: '',
    coords: d.latitude && d.longitude ? { latitude: Number(d.latitude), longitude: Number(d.longitude) } : undefined,
  };

  return {
    id: String(d.id_dossier),
    numero: d.numero_dossier,
    type: TYPE_DOSSIER[d.type_dossier] ?? 'installation_fibre',
    statutGlobal: d.statut === 'TERMINE' ? 'termine' : d.statut === 'BLOQUE' || d.statut === 'ANNULE' ? 'bloque' : 'en_cours',
    etapes: (d.etapes ?? []).map(mapEtape),
    technicien: d.technicien ? mapTechnicien(d.technicien, rdv?.itineraire, rdv?.creneau) : undefined,
    rdv: rdv
      ? { date: formatDate(rdv.date_rdv) ?? rdv.date_rdv, creneau: rdv.creneau, partiLe: rdv.parti_le ?? undefined, arriveLe: rdv.arrive_le ?? undefined }
      : undefined,
    adresse,
    interventionAConfirmer: (d.etapes ?? []).some((e: any) => e.code_etape === 'CONFIRMATION_CLIENT' && e.statut === 'EN_COURS'),
    offre: d.offre_nom
      ? { id: String(d.id_offre), nom: d.offre_nom, debit: formatDebit(d.debit_mbps), prixFCFA: d.prix_mensuel_fcfa, avantages: [], icone: 'flash' }
      : undefined,
    dateActivation: d.statut === 'TERMINE' ? formatDate(d.modifie_le) : undefined,
    dateCreation: formatDate(d.cree_le),
    prochaineAction: d.prochaine_action_libelle ?? undefined,
    creeLe: d.cree_le ?? undefined,
    modifieLe: d.modifie_le ?? undefined,
    annule: d.statut === 'ANNULE',
    planification: d.planification
      ? {
          date: d.planification.date_intervention,
          heureArrivee: d.planification.heure_arrivee,
          dureeMinutes: Number(d.planification.duree_estimee_min),
          travaux: d.planification.travaux ?? undefined,
          instructions: d.planification.instructions ?? undefined,
        }
      : undefined,
    demarreLe: d.mission?.demarre_le ?? undefined,
    termineLe: d.mission?.termine_le ?? undefined,
    statutTerrain: d.mission?.statut_terrain ?? undefined,
    typeIntervention: d.mission?.type_intervention ?? undefined,
    positionTechnicien: d.position_technicien
      ? {
          latitude: Number(d.position_technicien.latitude),
          longitude: Number(d.position_technicien.longitude),
          ageSecondes: Number(d.position_technicien.age_s) || 0,
        }
      : undefined,
  };
}

export function mapReclamation(r: any) {
  const analyseStatut: EtapeStatut = r.date_prise_en_charge ? 'fait' : 'en_cours';
  const infoStatut: EtapeStatut = r.date_resolution ? 'fait' : r.date_prise_en_charge ? 'en_cours' : 'a_venir';

  return {
    id: r.reference,
    numero: r.reference,
    categorie: (r.type_reclamation as string).toLowerCase() as ReclamationCategorie,
    description: r.description,
    date: formatDate(r.date_creation) ?? '',
    creeLe: r.date_creation ?? undefined,
    resolueLe: r.date_resolution ?? undefined,
    statut: (r.statut === 'RESOLUE' || r.statut === 'FERMEE' ? 'resolue' : r.statut === 'ENVOYEE' ? 'ouverte' : 'en_traitement') as ReclamationStatut,
    etapes: [
      { id: 'envoyee', titre: 'Enregistré', date: formatDate(r.date_creation), statut: 'fait' as EtapeStatut },
      { id: 'analyse', titre: 'Analyse en cours', date: formatDate(r.date_prise_en_charge), statut: analyseStatut },
      { id: 'info', titre: 'Information de la suite', date: formatDate(r.date_resolution), statut: infoStatut },
    ],
  };
}

export function mapNotification(n: any): NotificationItem {
  return {
    id: String(n.id_notification),
    titre: n.titre,
    description: n.contenu,
    heure: formatDate(n.envoyee_le) ?? '',
    categorie: (n.categorie_affichage as string).toLowerCase() as NotificationCategorie,
    lue: !!n.lue,
  };
}

export function mapMessage(m: any): Message {
  return {
    id: String(m.id_message),
    auteur: (m.auteur as string).toLowerCase() as Auteur,
    texte: m.texte,
    heure: formatHeure(m.envoye_le),
  };
}

export interface LigneResume {
  idLigne: number;
  idOffre: number | null;
  numeroLigne: string;
  numeroBox: string;
  statut: string;
  offre?: Offre;
}

export function mapLigne(l: any): LigneResume {
  return {
    idLigne: l.id_ligne,
    idOffre: l.id_offre ?? null,
    numeroLigne: l.numero_ligne,
    numeroBox: l.numero_box,
    statut: l.statut,
    offre: l.offre_nom
      ? { id: String(l.id_offre), nom: l.offre_nom, debit: formatDebit(l.debit_mbps), prixFCFA: l.prix_mensuel_fcfa, avantages: [], icone: 'flash' }
      : undefined,
  };
}

export function mapWifi(w: any, appareils: any[]) {
  return {
    actif: w.etat === 'ACTIF',
    nomReseau: w.nom_reseau,
    // Le mot de passe est haché en base (non réversible) : jamais renvoyé
    // par l'API. On affiche un texte neutre plutôt qu'un vrai secret.
    motDePasse: 'Non disponible',
    appareilsConnectes: appareils.map((a) => ({ id: String(a.id_appareil), nom: a.nom_appareil, actif: a.statut === 'CONNECTE' })),
  };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const authApi = {
  inscription: (data: { nom: string; prenom: string; telephone: string; ville: string; commune?: string; quartier?: string; adresse_complete?: string }) =>
    api.post<{ success: boolean; client: any; token?: string; id_client?: number; message?: string }>('/api/auth/inscription', data),
  activerCompte: (idClient: number, numeroBox: string) =>
    api.post<{ success: boolean; id_compte: number; code_test: string }>('/api/auth/activer-compte', { id_client: idClient, numero_box: numeroBox }),
  verifierCode: (idCompte: number, code: string) =>
    api.post<{ success: boolean; id_compte: number; token: string; client: any }>('/api/auth/verifier-code', { id_compte: idCompte, code }),
  renvoyerCode: (idCompte: number) =>
    api.post<{ success: boolean; telephone_masque?: string; code_test?: string }>('/api/auth/renvoyer-code', { id_compte: idCompte }),
  connexion: (numeroBox: string, telephone: string) =>
    api.post<{ success: boolean; id_compte: number; token: string; client: any }>('/api/auth/connexion', { numero_box: numeroBox, telephone }),
};

export const offresApi = {
  lister: () => api.get<{ offres: any[] }>('/api/offres'),
};

export const eligibiliteApi = {
  tester: (payload: Record<string, unknown>) =>
    api.post<{ resultat_global: string; explication: string; id_test: number; zone: any }>('/api/eligibilite/test', payload),
};

export const clientApi = {
  obtenir: (idClient: number) => api.get<{ client: any }>(`/api/client/${idClient}`),
  modifier: (idClient: number, data: Record<string, unknown>) => api.put<{ client: any }>(`/api/client/${idClient}`, data),
};

export const demandesApi = {
  creer: (payload: Record<string, unknown>) => api.post<{ demande: any; dossier: any }>('/api/demandes', payload),
};

export const numerosApi = {
  lister: (idClient: number) => api.get<{ numeros: any[] }>(`/api/client/${idClient}/numeros`),
  ajouter: (idClient: number, numero: string) => api.post<{ numeros: any[] }>(`/api/client/${idClient}/numeros`, { numero }),
  supprimer: (idClient: number, idNumero: number) => api.delete<{ numeros: any[] }>(`/api/client/${idClient}/numeros/${idNumero}`),
};

export function mapNumeros(liste: any[]): NumeroClient[] {
  return liste.map((n) => ({ id: String(n.id_numero), numero: n.numero }));
}

export const dossiersApi = {
  listerPourClient: (idClient: number) => api.get<{ dossiers: any[] }>(`/api/client/${idClient}/dossiers`),
  obtenir: (idDossier: number) => api.get<{ dossier: any }>(`/api/dossiers/${idDossier}`),
  avancer: (idDossier: number, idTechnicien?: number) =>
    api.post<{ dossier: any }>(`/api/dossiers/${idDossier}/avancer`, idTechnicien ? { id_technicien: idTechnicien } : undefined),
  planifierRdv: (idDossier: number, dateRdv: string, creneau: string) =>
    api.post<{ dossier: any }>(`/api/dossiers/${idDossier}/planifier-rdv`, { date_rdv: dateRdv, creneau }),
  confirmerIntervention: (idDossier: number) => api.post<{ dossier: any }>(`/api/dossiers/${idDossier}/confirmer-intervention`),
  signalerAbsence: (idDossier: number) => api.post(`/api/dossiers/${idDossier}/signaler-absence`),
  modifier: (idDossier: number, data: { adresse?: string; date_rdv?: string; creneau?: string }) =>
    api.patch<{ dossier: any }>(`/api/dossiers/${idDossier}`, data),
  annuler: (idDossier: number) => api.delete<{ message: string }>(`/api/dossiers/${idDossier}`),
};

export const lignesApi = {
  listerPourClient: (idClient: number) => api.get<{ lignes: any[] }>(`/api/client/${idClient}/lignes`),
};

export const wifiApi = {
  obtenir: (idLigne: number) => api.get<{ wifi: any }>(`/api/lignes/${idLigne}/wifi`),
  modifier: (idLigne: number, data: { nom_reseau?: string; mot_de_passe?: string }) => api.put<{ wifi: any }>(`/api/lignes/${idLigne}/wifi`, data),
};

export const appareilsApi = {
  lister: (idLigne: number) => api.get<{ appareils: any[] }>(`/api/lignes/${idLigne}/appareils`),
  toggle: (idAppareil: number) => api.patch<{ appareil: any }>(`/api/appareils/${idAppareil}`),
};

export const diagnosticApi = {
  creer: (payload: Record<string, unknown>) => api.post<{ diagnostic: any }>('/api/diagnostics', payload),
};

export const reclamationsApi = {
  creer: (payload: Record<string, unknown>) => api.post<{ reclamation: any }>('/api/reclamations', payload),
  listerPourClient: (idClient: number) => api.get<{ reclamations: any[] }>(`/api/client/${idClient}/reclamations`),
  modifier: (reference: string, data: { description?: string; type_reclamation?: string }) =>
    api.patch<{ reclamation: any }>(`/api/reclamations/${encodeURIComponent(reference)}`, data),
  supprimer: (reference: string) => api.delete<{ message: string }>(`/api/reclamations/${encodeURIComponent(reference)}`),
};

export const rechargeApi = {
  creer: (payload: Record<string, unknown>) => api.post<{ recharge: any }>('/api/recharges', payload),
};

export const changementOffreApi = {
  creer: (payload: Record<string, unknown>) => api.post<{ changement: any }>('/api/changements-offre', payload),
};

export const demenagementApi = {
  creer: (payload: Record<string, unknown>) => api.post<{ demenagement: any }>('/api/demenagements', payload),
};

export const techniciensApi = {
  lister: () => api.get<{ techniciens: any[] }>('/api/techniciens'),
};

export const notificationsApi = {
  listerPourClient: (idClient: number) => api.get<{ notifications: any[] }>(`/api/client/${idClient}/notifications`),
  marquerLue: (idNotification: number) => api.patch(`/api/notifications/${idNotification}/lue`),
};

export const messagesApi = {
  listerDossier: (idDossier: number) => api.get<{ messages: any[] }>(`/api/dossiers/${idDossier}/messages`),
  envoyerDossier: (idDossier: number, idClient: number, texte: string) =>
    api.post(`/api/dossiers/${idDossier}/messages`, { id_client: idClient, texte }),
  listerCortex: (idClient: number) => api.get<{ messages: any[] }>(`/api/client/${idClient}/messages-cortex`),
  envoyerCortex: (idClient: number, texte: string, idDossier?: number) =>
    api.post<{ message_client: any; reponse_cortex: any }>(`/api/client/${idClient}/messages-cortex`, { texte, id_dossier: idDossier }),
};

export const mesuresApi = {
  lister: (idLigne: number) => api.get<{ mesures: any[] }>(`/api/lignes/${idLigne}/mesures`),
  anomalies: (idLigne: number, statuts?: string) =>
    api.get<{ anomalies: any[] }>(`/api/lignes/${idLigne}/anomalies${statuts ? `?statut=${statuts}` : ''}`),
  signalerAnomalie: (idAnomalie: number, idClient: number) =>
    api.post<{ reclamation: any }>(`/api/anomalies/${idAnomalie}/signaler`, { id_client: idClient }),
};

/** Réponse de l'assistant IA (POST /api/assistant/chat). */
export interface ReponseAssistant {
  success: boolean;
  reponse: string;
  /** donnees = réponse construite à partir des données réelles ; documentation = modèle RAG ; mixte ; erreur */
  mode: 'donnees' | 'documentation' | 'mixte' | 'erreur';
  intentions: string[];
  sources: { document: string; page: number; score: number }[];
  donnees: string[];
}

export const assistantApi = {
  discuter: (message: string, idLigne?: number) =>
    api.postLong<ReponseAssistant>('/api/assistant/chat', { message, id_ligne: idLigne }),
};

/** Faits vérifiés du client connecté (GET /api/assistant/situation), les mêmes que ceux utilisés par l'assistant. */
export interface SituationReelle {
  success: boolean;
  ligne: { id_ligne: number; numero_box: string; statut: string } | null;
  box: {
    mesure_le: string;
    etat_wan: string;
    signal_dbm: string | number | null;
    debit_descendant_mbps: string | number | null;
    debit_montant_mbps: string | number | null;
    nb_micro_coupures_24h: number | null;
    age_min: number;
    fraiche: boolean;
  } | null;
  anomalies: { id_anomalie: number; type_anomalie: string; titre: string; description: string | null; gravite: string; statut: string; reference_reclamation: string | null }[];
  incidents: {
    reference: string;
    titre: string;
    statut: string;
    message: string;
    technicien_prenom: string | null;
    retablissement_estime: string | null;
    detecte_le: string;
  }[];
  interventions: {
    numero_dossier: string;
    type_dossier: string;
    statut: string;
    technicien_prenom: string | null;
    statut_terrain: string | null;
    message: string | null;
    rdv: { date_rdv: string; creneau: string; statut: string } | null;
  }[];
}

export const situationApi = {
  obtenir: (idLigne?: number) =>
    api.get<SituationReelle>(`/api/assistant/situation${idLigne ? `?id_ligne=${idLigne}` : ''}`),
};
