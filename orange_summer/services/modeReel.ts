// Mode « réel » de l'application : le client est connecté au backend (code de box + téléphone).
//
// Le store de démonstration (useAppStore) reste inchangé : en mode réel, ses actions sont
// REMPLACÉES par des versions qui parlent au backend, et ses données sont chargées depuis
// l'API. À la déconnexion, les actions et données de démonstration sont restaurées.
// Ainsi les écrans existants fonctionnent dans les deux modes sans être réécrits.

import { Adresse, Dossier, NumeroClient, LiveboxInfo, OptionsEligibilite, Message, NotificationItem, Reclamation, ResultatEligibilite, WifiInfo } from '@/data/types';
import { ApiError } from '@/services/apiClient';
import { erreurAjoutNumero, normaliserNumero } from '@/services/numeros';
import {
  appareilsApi,
  assistantApi,
  authApi,
  clientApi,
  demandesApi,
  demenagementApi,
  dossiersApi,
  eligibiliteApi,
  lignesApi,
  LigneResume,
  mapClient,
  mapDossier,
  mapLigne,
  mapMessage,
  mapNotification,
  mapNumeros,
  numerosApi,
  mapOffre,
  mapReclamation,
  mapWifi,
  mesuresApi,
  messagesApi,
  notificationsApi,
  offresApi,
  reclamationsApi,
  wifiApi,
} from '@/services/backendService';
import { useAppStore } from '@/store/useAppStore';
import { AnomalieBox, MesureBox, useEspaceReelStore } from '@/store/useEspaceReelStore';
import { useSessionStore } from '@/store/useSessionStore';

type AppState = ReturnType<typeof useAppStore.getState>;

let instantaneDemo: AppState | null = null;

const wifiVide: WifiInfo = { actif: false, nomReseau: '', motDePasse: '', appareilsConnectes: [] };

function heureActuelle(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function messageAccueil(prenom: string): Message {
  return {
    id: 'cortex-0',
    auteur: 'cortex',
    texte: `Bonjour ${prenom} 👋 Je suis Cortex, votre assistant Orange. Je peux vous renseigner sur l'état de votre Fiberbox, les incidents dans votre quartier et l'avancement des interventions.`,
    heure: heureActuelle(),
  };
}

/** Vrai si l'utilisateur a déjà échangé avec l'assistant en mode réel (messages `c-...`). */
function conversationEnCours(): boolean {
  return useAppStore.getState().messagesCortex.some((m) => m.id.startsWith('c-'));
}

function idClient(): number {
  const id = useSessionStore.getState().idClient;
  if (!id) throw new Error('Aucun client connecté.');
  return id;
}

function adresseEnTexte(a: { numero?: string; rue?: string; ville?: string }): string {
  return [a.numero, a.rue].filter(Boolean).join(' ') || a.rue || a.ville || '';
}

/** Les créneaux de l'application utilisent « Demain » / « Après-demain » : le backend attend une date ISO. */
function dateIso(libelle: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(libelle)) return libelle;
  const decalage: Record<string, number> = { "aujourd'hui": 0, demain: 1, 'après-demain': 2, 'apres-demain': 2 };
  const jours = decalage[libelle.trim().toLowerCase()];
  if (jours === undefined) throw new Error(`Date de rendez-vous non reconnue : « ${libelle} ».`);
  const d = new Date();
  d.setDate(d.getDate() + jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function notifier(titre: string, description: string, categorie: 'info' | 'action_requise' = 'info') {
  const n: NotificationItem = { id: `n-${Date.now()}`, titre, description, heure: "À l'instant", categorie, lue: false };
  useAppStore.setState((s) => ({ notifications: [n, ...s.notifications] }));
}

/** Remplace le message « … » par la réponse ; s'il a disparu entre-temps, ajoute simplement la réponse. */
function remplacerAttente(idAttente: string, reponse: Message) {
  useAppStore.setState((s) =>
    s.messagesCortex.some((m) => m.id === idAttente)
      ? { messagesCortex: s.messagesCortex.map((m) => (m.id === idAttente ? reponse : m)) }
      : { messagesCortex: [...s.messagesCortex, reponse] }
  );
}

function remplacerDossier(dossiers: Dossier[], maj: Dossier): Dossier[] {
  return dossiers.map((d) => (d.id === maj.id ? maj : d));
}

// --- chargement -------------------------------------------------------------

function mapMesure(m: any): MesureBox {
  const n = (v: any) => (v === null || v === undefined ? null : Number(v));
  return {
    mesureLe: m.mesure_le,
    etatWan: m.etat_wan,
    signalDbm: n(m.signal_dbm),
    debitDescendantMbps: n(m.debit_descendant_mbps),
    debitMontantMbps: n(m.debit_montant_mbps),
    nbMicroCoupures24h: n(m.nb_micro_coupures_24h),
  };
}

function mapAnomalie(a: any): AnomalieBox {
  return {
    id: a.id_anomalie,
    titre: a.titre,
    description: a.description ?? '',
    gravite: a.gravite,
    statut: a.statut,
    detecteeLe: a.detectee_le,
    referenceReclamation: a.reference_reclamation ?? null,
  };
}

/** Âge d'une mesure en minutes (le backend renvoie une date GMT ; la Côte d'Ivoire est en UTC+0). */
export function ageMesureMinutes(mesure: MesureBox | null): number | null {
  if (!mesure) return null;
  const t = new Date(mesure.mesureLe).getTime();
  return Number.isNaN(t) ? null : (Date.now() - t) / 60000;
}

/** Au-delà, la dernière mesure de la box n'est plus présentée comme « actuelle ». */
export const MESURE_FRAICHE_MIN = 30;

/** « il y a 12 minutes », « il y a 44 jours »... */
export function libelleAge(minutes: number | null): string {
  if (minutes === null) return 'date inconnue';
  if (minutes < 2) return 'il y a moins de 2 minutes';
  if (minutes < 90) return `il y a ${Math.round(minutes)} minutes`;
  if (minutes < 48 * 60) return `il y a ${Math.round(minutes / 60)} heures`;
  return `il y a ${Math.round(minutes / 1440)} jours`;
}

/** Livebox affichée par l'accueil et l'écran Livebox : uniquement ce que la Fiberbox a réellement mesuré. */
function liveboxReelle(ligne: LigneResume | null, mesure: MesureBox | null): LiveboxInfo {
  const age = ageMesureMinutes(mesure);
  const fraiche = age !== null && age <= MESURE_FRAICHE_MIN;
  return {
    modele: 'Fiberbox',
    numeroSerie: ligne?.numeroBox ?? '—',
    enLigne: !!mesure && fraiche && mesure.etatWan === 'ACTIF',
    etats: [],
    debit: {
      descendant: mesure?.debitDescendantMbps ?? 0,
      envoi: mesure?.debitMontantMbps ?? 0,
      latenceMs: 0,
    },
  };
}

/** Charge toutes les données du client connecté depuis le backend. */
export async function chargerEspaceReel(): Promise<void> {
  const espace = useEspaceReelStore.getState();
  const id = useSessionStore.getState().idClient;
  if (!id) return;
  espace.maj({ chargement: true, erreur: null });
  try {
    const [clientRes, dossiersRes, lignesRes, notifsRes, reclamsRes, offresRes, numerosRes] = await Promise.all([
      clientApi.obtenir(id),
      dossiersApi.listerPourClient(id),
      lignesApi.listerPourClient(id),
      notificationsApi.listerPourClient(id),
      reclamationsApi.listerPourClient(id),
      offresApi.lister(),
      numerosApi.lister(id).catch(() => ({ numeros: [] as any[] })),
    ]);

    const dossiers = dossiersRes.dossiers.map(mapDossier);
    const avecChecklist = dossiers.filter((d) => d.etapes.length > 0 && !d.annule);
    const courant =
      avecChecklist.find((d) => d.statutGlobal !== 'termine') ??
      avecChecklist[0] ??
      dossiers.find((d) => d.statutGlobal !== 'termine' && !d.annule) ??
      dossiers.find((d) => !d.annule) ??
      null;

    const lignes = lignesRes.lignes.map(mapLigne);
    const idLigneSession = useSessionStore.getState().idLigne;
    const ligneActive =
      lignes.find((l) => l.idLigne === idLigneSession) ?? lignes.find((l) => l.statut === 'ACTIVE') ?? lignes[0] ?? null;
    useSessionStore.getState().definirLigne(ligneActive ? ligneActive.idLigne : null);

    let wifi: WifiInfo = wifiVide;
    let mesure: MesureBox | null = null;
    let anomalies: AnomalieBox[] = [];
    if (ligneActive) {
      const [wifiRes, mesuresRes, anomaliesRes] = await Promise.all([
        Promise.all([wifiApi.obtenir(ligneActive.idLigne), appareilsApi.lister(ligneActive.idLigne)]).catch(() => null),
        mesuresApi.lister(ligneActive.idLigne).catch(() => ({ mesures: [] as any[] })),
        mesuresApi.anomalies(ligneActive.idLigne, 'DETECTEE,SURVEILLANCE').catch(() => ({ anomalies: [] as any[] })),
      ]);
      if (wifiRes) wifi = mapWifi(wifiRes[0].wifi, wifiRes[1].appareils);
      mesure = mesuresRes.mesures[0] ? mapMesure(mesuresRes.mesures[0]) : null;
      anomalies = anomaliesRes.anomalies.map(mapAnomalie);
    }

    let dossierDetaille = courant;
    if (courant) {
      try {
        dossierDetaille = mapDossier((await dossiersApi.obtenir(Number(courant.id))).dossier);
      } catch {
        // détail indisponible : on garde la version de liste
      }
    }

    const client = mapClient(clientRes.client);
    useAppStore.setState({
      client,
      codeBox: useSessionStore.getState().numeroBox ?? '',
      dossiers: dossierDetaille ? remplacerDossier(dossiers, dossierDetaille) : dossiers,
      dossier: dossierDetaille,
      notifications: notifsRes.notifications.map(mapNotification),
      reclamations: reclamsRes.reclamations.map(mapReclamation),
      wifi,
      livebox: liveboxReelle(ligneActive, mesure),
      demenagements: [],
      numeros: mapNumeros(numerosRes.numeros),
      numeroAfficheId: null,
      messagesTechnicien: [],
      // On ne remplace pas une conversation déjà commencée (le chargement peut finir après un premier message).
      messagesCortex: conversationEnCours() ? useAppStore.getState().messagesCortex : [messageAccueil(client.prenom)],
      technicienAbsentSignale: false,
      technicienArriveNotifie: false,
    });

    espace.maj({
      lignes,
      ligneActive,
      mesure,
      anomalies,
      offres: offresRes.offres.map(mapOffre),
      charge: true,
      chargement: false,
      erreur: null,
    });

    if (dossierDetaille) {
      messagesApi
        .listerDossier(Number(dossierDetaille.id))
        .then(({ messages }) => useAppStore.setState({ messagesTechnicien: messages.map(mapMessage) }))
        .catch(() => {});
    }
  } catch (e) {
    espace.maj({ chargement: false, erreur: e instanceof ApiError ? e.message : 'Impossible de charger vos données.' });
  }
}

/** Relit le dossier courant (statut terrain, position du technicien). Silencieux en cas d'échec réseau. */
export async function rafraichirDossierReel(): Promise<void> {
  if (useSessionStore.getState().mode !== 'reel') return;
  const { dossier } = useAppStore.getState();
  if (!dossier || !/^\d+$/.test(dossier.id)) return;
  try {
    const nouveau = mapDossier((await dossiersApi.obtenir(Number(dossier.id))).dossier);
    useAppStore.setState((s) => ({
      dossiers: remplacerDossier(s.dossiers, nouveau),
      dossier: s.dossier?.id === nouveau.id ? nouveau : s.dossier,
    }));
  } catch {
    // on garde la dernière version connue
  }
}

/**
 * Test d'éligibilité auprès du serveur (route publique : fonctionne aussi pour un visiteur sans compte).
 * Le serveur enregistre le numéro ; si la zone n'est pas couverte et que le client le souhaite, il
 * pourra être recontacté quand elle le sera. Lève une erreur si le serveur est injoignable : on ne
 * prétend jamais avoir enregistré un numéro qui ne l'est pas.
 */
export async function verifierEligibiliteServeur(adresse: Adresse, options?: OptionsEligibilite): Promise<ResultatEligibilite> {
  const { client } = useAppStore.getState();
  const telephone = (options?.telephone ?? client.telephone ?? '').trim();
  const recontact = options?.recontact ?? true;
  useAppStore.setState({ eligibiliteLoading: true, eligibiliteResult: null });
  try {
    const reponse = await eligibiliteApi.tester({
      mode_test: adresse.coords ? 'POSITION_GPS' : 'ADRESSE',
      telephone_saisi: telephone,
      id_client: useSessionStore.getState().idClient ?? undefined,
      adresse_saisie: adresseEnTexte(adresse),
      ville: adresse.ville,
      commune: adresse.ville,
      latitude: adresse.coords?.latitude,
      longitude: adresse.coords?.longitude,
      souhaite_notification: recontact,
    });
    const statut =
      reponse.resultat_global === 'ELIGIBLE' ? 'eligible' : reponse.resultat_global === 'NON_ELIGIBLE' ? 'non_eligible' : 'zone_a_etudier';
    const resultat: ResultatEligibilite = {
      statut,
      adresse,
      idTest: reponse.id_test,
      debitEstime: statut === 'eligible' ? "Jusqu'à 1 Gb/s" : undefined,
      dateDisponibilitePrevue: statut === 'zone_a_etudier' ? reponse.explication : undefined,
      recontactTelephone: recontact && statut !== 'eligible' ? telephone : undefined,
    };
    useAppStore.setState({ eligibiliteResult: resultat, eligibiliteLoading: false });
    return resultat;
  } catch (e) {
    useAppStore.setState({ eligibiliteLoading: false });
    throw e;
  }
}

// --- actions « backend » ---------------------------------------------------------------

function actionsReelles(): Partial<AppState> {
  return {
    verifierEligibilite: (adresse, options) => verifierEligibiliteServeur(adresse, options),

    creerDemandeInstallation: async ({ adresse, offre }) => {
      useAppStore.setState({ demandeEnCours: true });
      try {
        const { client, eligibiliteResult } = useAppStore.getState();
        if (!eligibiliteResult?.idTest) {
          throw new Error("Test d'éligibilité manquant : recommencez depuis « Tester mon éligibilité ».");
        }
        const { dossier } = await demandesApi.creer({
          id_client: idClient(),
          id_offre: Number(offre.id),
          id_test_eligibilite: eligibiliteResult.idTest,
          adresse_installation: adresseEnTexte(adresse),
          telephone_contact: client.telephone,
          nom_contact: `${client.prenom} ${client.nom}`.trim(),
        });
        const nouveau = mapDossier((await dossiersApi.obtenir(dossier.id_dossier)).dossier);
        useAppStore.setState((s) => ({ dossier: nouveau, dossiers: [nouveau, ...s.dossiers], demandeEnCours: false }));
        return nouveau;
      } catch (e) {
        useAppStore.setState({ demandeEnCours: false });
        throw e;
      }
    },

    envoyerMessageTechnicien: (texte) => {
      const { dossier } = useAppStore.getState();
      if (!dossier) return;
      const optimiste: Message = { id: `tmp-${Date.now()}`, auteur: 'client', texte, heure: heureActuelle() };
      useAppStore.setState((s) => ({ messagesTechnicien: [...s.messagesTechnicien, optimiste] }));
      messagesApi
        .envoyerDossier(Number(dossier.id), idClient(), texte)
        .then(() => messagesApi.listerDossier(Number(dossier.id)))
        .then(({ messages }) => useAppStore.setState({ messagesTechnicien: messages.map(mapMessage) }))
        .catch(() => {
          useAppStore.setState((s) => ({ messagesTechnicien: s.messagesTechnicien.filter((m) => m.id !== optimiste.id) }));
          notifier('Message non envoyé', "Votre message au technicien n'a pas pu être envoyé. Réessayez.");
        });
    },

    signalerTechnicienAbsent: () => {
      const { dossier } = useAppStore.getState();
      if (!dossier) return;
      dossiersApi
        .signalerAbsence(Number(dossier.id))
        .then(() => useAppStore.setState({ technicienAbsentSignale: true }))
        .catch(() => notifier('Signalement non envoyé', "Le signalement d'absence n'a pas pu être envoyé. Réessayez."));
    },

    confirmerFinIntervention: () => {
      const { dossier } = useAppStore.getState();
      if (!dossier) return;
      dossiersApi
        .confirmerIntervention(Number(dossier.id))
        .then(({ dossier: maj }) => {
          const nouveau = mapDossier(maj);
          useAppStore.setState((s) => ({ dossier: nouveau, dossiers: remplacerDossier(s.dossiers, nouveau) }));
        })
        .catch((e) => notifier('Confirmation impossible', e instanceof ApiError ? e.message : 'Réessayez dans un instant.'));
    },

    creerReclamation: (categorie, description) => {
      const { dossier, client } = useAppStore.getState();
      // Entrée provisoire affichée tout de suite ; remplacée par la réclamation enregistrée (même id d'écran).
      const provisoire: Reclamation = {
        id: `rec-${Date.now()}`,
        numero: 'Enregistrement…',
        categorie,
        description,
        date: "Aujourd'hui",
        statut: 'ouverte',
        etapes: [],
      };
      useAppStore.setState((s) => ({ reclamations: [provisoire, ...s.reclamations] }));
      reclamationsApi
        .creer({
          id_client: idClient(),
          id_dossier: dossier ? Number(dossier.id) : undefined,
          type_reclamation: categorie.toUpperCase(),
          description,
          contact_nom: `${client.prenom} ${client.nom}`.trim(),
          contact_telephone: client.telephone,
        })
        .then(({ reclamation }) => {
          const reelle = { ...mapReclamation(reclamation), id: provisoire.id };
          useAppStore.setState((s) => ({ reclamations: s.reclamations.map((r) => (r.id === provisoire.id ? reelle : r)) }));
        })
        .catch(() => {
          useAppStore.setState((s) => ({ reclamations: s.reclamations.filter((r) => r.id !== provisoire.id) }));
          notifier('Signalement non enregistré', "Votre signalement n'a pas pu être enregistré. Réessayez.", 'action_requise');
        });
      return provisoire;
    },

    ajouterNumero: async (valeur) => {
      const { client, numeros } = useAppStore.getState();
      const erreur = erreurAjoutNumero(valeur, client.telephone, numeros);
      if (erreur) return erreur;
      try {
        const { numeros: liste } = await numerosApi.ajouter(idClient(), normaliserNumero(valeur)!);
        useAppStore.setState({ numeros: mapNumeros(liste) });
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : "Ajout impossible pour le moment. Réessayez.";
      }
    },

    supprimerNumero: async (id) => {
      if (!/^\d+$/.test(id)) return 'Numéro introuvable.';
      try {
        const { numeros: liste } = await numerosApi.supprimer(idClient(), Number(id));
        useAppStore.setState((s) => ({
          numeros: mapNumeros(liste),
          numeroAfficheId: s.numeroAfficheId === id ? null : s.numeroAfficheId,
        }));
        return null;
      } catch (e) {
        return e instanceof ApiError ? e.message : 'Suppression impossible pour le moment. Réessayez.';
      }
    },

    creerDemenagement: (nouvelleAdresse) => {
      const { client } = useAppStore.getState();
      const { ligneActive } = useEspaceReelStore.getState();
      if (!ligneActive) {
        notifier('Déménagement impossible', "Aucune ligne Fibre n'est associée à votre compte.", 'action_requise');
        return;
      }
      demenagementApi
        .creer({
          id_client: idClient(),
          id_ligne: ligneActive.idLigne,
          ancienne_adresse: adresseEnTexte(client.adresse) || 'Adresse actuelle',
          nouvelle_adresse: nouvelleAdresse.trim(),
          nouvelle_ville: client.adresse.ville || 'Abidjan',
        })
        .then(() => {
          useAppStore.setState((s) => ({
            demenagements: [
              { id: `dem-${Date.now()}`, nouvelleAdresse: nouvelleAdresse.trim(), date: "Aujourd'hui", statut: 'en_cours' },
              ...s.demenagements,
            ],
          }));
          return chargerEspaceReel();
        })
        .catch(() => notifier('Demande non enregistrée', "Votre demande de déménagement n'a pas pu être enregistrée.", 'action_requise'));
    },

    envoyerDemande: (type) => {
      if (type === 'depannage') {
        useAppStore.getState().creerReclamation('connexion_ne_fonctionne_pas', "Demande de dépannage depuis l'application.");
        notifier('Demande de dépannage', 'Votre demande a été enregistrée comme signalement.');
        return;
      }
      // Aucune route backend pour ces demandes : on ne prétend pas les avoir transmises.
      notifier('Demande non disponible', "Cette demande n'est pas encore disponible dans l'application. Contactez le service client Orange (3900).");
    },

    // La progression du dossier vient des techniciens et du backend : aucune simulation en mode réel.
    avancerEtapeSuivante: () => {},

    // Le jour et l'heure sont planifiés par Orange (table PlanificationIntervention) : le client ne choisit rien.
    planifierRendezVous: () => {},

    toggleAppareilWifi: (id) => {
      const basculer = () =>
        useAppStore.setState((s) => ({
          wifi: { ...s.wifi, appareilsConnectes: s.wifi.appareilsConnectes.map((a) => (a.id === id ? { ...a, actif: !a.actif } : a)) },
        }));
      basculer();
      appareilsApi.toggle(Number(id)).catch(basculer); // le serveur refuse : retour à l'état réel
    },

    marquerNotificationLue: (id) => {
      useAppStore.setState((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, lue: true } : n)) }));
      if (/^\d+$/.test(id)) notificationsApi.marquerLue(Number(id)).catch(() => {});
    },

    envoyerMessageCortex: (texte) => {
      const client: Message = { id: `c-${Date.now()}`, auteur: 'client', texte, heure: heureActuelle() };
      const attente: Message = { id: `c-attente-${Date.now()}`, auteur: 'cortex', texte: '…', heure: heureActuelle() };
      useAppStore.setState((s) => ({ messagesCortex: [...s.messagesCortex, client, attente] }));
      const { ligneActive } = useEspaceReelStore.getState();
      assistantApi
        .discuter(texte, ligneActive?.idLigne)
        .then((r) => {
          const reponse: Message = { id: `c-${Date.now() + 1}`, auteur: 'cortex', texte: r.reponse, heure: heureActuelle() };
          remplacerAttente(attente.id, reponse);
        })
        .catch((e) => {
          const message =
            e instanceof ApiError && e.status === 401
              ? 'Votre session a expiré, reconnectez-vous pour continuer.'
              : e instanceof ApiError && e.status === 429
              ? 'Trop de messages en peu de temps, patientez un instant.'
              : "Je n'arrive pas à joindre l'assistant pour le moment. Réessayez dans quelques instants.";
          remplacerAttente(attente.id, { ...attente, texte: message });
        });
    },
  };
}

// --- activation / désactivation ------------------------------------------------------------

export function installerActionsReelles() {
  if (!instantaneDemo) instantaneDemo = useAppStore.getState();
  useAppStore.setState(actionsReelles() as Partial<AppState>);
}

/** Restaure les actions ET les données de démonstration (aucune donnée réelle ne reste en mémoire). */
export function restaurerEtatDemo() {
  if (instantaneDemo) useAppStore.setState(instantaneDemo as Partial<AppState>);
  useEspaceReelStore.getState().reinitialiser();
}

export interface ResultatConnexionReelle {
  succes: boolean;
  message?: string;
  /** BOX_INCONNUE | TELEPHONE_INCORRECT | VERIFICATION_REQUISE | COMPTE_BLOQUE */
  code?: string;
  idCompte?: number;
  telephoneMasque?: string;
  /** Renvoyé par le serveur seulement quand aucune passerelle SMS n'est branchée (SMS_MODE=dev). */
  codeTest?: string;
}

async function demarrerSessionReelle(token: string, client: any, idCompte: number | null, numeroBox: string) {
  useSessionStore.getState().ouvrirSessionReelle({ token, idClient: client.id_client, idCompte, numeroBox });
  installerActionsReelles();
  await chargerEspaceReel();
}

export async function connecterReel(numeroBox: string, telephone: string): Promise<ResultatConnexionReelle> {
  try {
    const { id_compte, client, token } = await authApi.connexion(numeroBox, telephone);
    await demarrerSessionReelle(token, client, id_compte, numeroBox);
    return { succes: true, idCompte: id_compte };
  } catch (e) {
    if (e instanceof ApiError) {
      const p = (e.payload ?? {}) as any;
      return { succes: false, message: e.message, code: p.code, idCompte: p.id_compte, telephoneMasque: p.telephone_masque, codeTest: p.code_test };
    }
    return { succes: false, message: 'Connexion impossible. Vérifiez votre connexion réseau.' };
  }
}

export async function verifierCodeReel(idCompte: number, code: string, numeroBox: string): Promise<void> {
  const { client, token } = await authApi.verifierCode(idCompte, code);
  await demarrerSessionReelle(token, client, idCompte, numeroBox);
}

export async function renvoyerCodeReel(idCompte: number) {
  const r = await authApi.renvoyerCode(idCompte);
  return { telephoneMasque: r.telephone_masque, codeTest: r.code_test };
}

export function deconnecterReel() {
  useSessionStore.getState().fermerSession();
  restaurerEtatDemo();
}

/** Au démarrage : si un jeton est conservé, reprend la session réelle. */
export async function reprendreSessionReelle() {
  await useSessionStore.getState().hydrate();
  if (useSessionStore.getState().mode === 'reel') {
    installerActionsReelles();
    await chargerEspaceReel();
  }
}

export type { LigneResume };
