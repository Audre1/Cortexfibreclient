// Types métier de l'application CLIENT — CORTEX FIBER.
// Cette couche de types est volontairement découplée des services mockés
// pour permettre à l'équipe backend de brancher une vraie API plus tard
// sans toucher aux écrans (voir dossier `services/`).

export type EligibiliteStatut = 'eligible' | 'non_eligible' | 'zone_a_etudier';

export interface ZoneCouverture {
  id: string;
  nom: string;
  statut: EligibiliteStatut;
  /** Contour de la zone (polygone). */
  contour: Coords[];
}

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface Adresse {
  numero: string;
  rue: string;
  codePostal: string;
  ville: string;
  complement?: string;
  coords?: Coords;
}

export interface Client {
  id: string;
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  adresse: Adresse;
}

export type DossierEtapeId =
  | 'adresse_verifiee'
  | 'demande_recue'
  | 'demande_validee'
  | 'rdv_a_planifier'
  | 'technicien_assigne'
  | 'installation'
  | 'confirmation_client'
  | 'fibre_active';

export type EtapeStatut = 'fait' | 'en_cours' | 'a_venir';

export interface DossierEtape {
  id: DossierEtapeId;
  titre: string;
  description: string;
  date?: string;
  statut: EtapeStatut;
}

export type DossierStatutGlobal = 'en_cours' | 'termine' | 'bloque';

export type DossierType = 'installation_fibre' | 'depannage_box' | 'demenagement' | 'changement_offre';

/** Numéro que le client a ajouté lui-même (en plus de son numéro principal). */
export interface NumeroClient {
  id: string;
  numero: string;
}

export interface Technicien {
  id: string;
  prenom: string;
  nom: string;
  note: number;
  telephone: string;
  vehicule: string;
  immatriculation: string;
  initiales: string;
  heureArriveeEstimee: string;
  /** Point de départ du technicien quand il est « en route ». */
  positionDepart?: Coords;
  /** Itinéraire (points d'ancrage) entre le départ et l'adresse du client. */
  itineraire?: Coords[];
}

export type DemandeServiceType = 'raccordement' | 'rendez_vous' | 'depannage';

export interface Planification {
  /** Jour de l'intervention, AAAA-MM-JJ. */
  date: string;
  /** Heure d'arrivée prévue, HH:MM. */
  heureArrivee: string;
  /** Durée estimée par Orange, en minutes. */
  dureeMinutes: number;
  /** Description des travaux saisie par Orange ; absente = description standard du type de demande. */
  travaux?: string;
  /** Message libre d'Orange au client. */
  instructions?: string;
  /** Vrai en mode démo : planification d'exemple, pas une donnée réelle. */
  demo?: boolean;
}

export interface RendezVous {
  date: string;
  creneau: string;
  /** Heure réelle de départ du technicien (ISO), mode réel. */
  partiLe?: string;
  /** Heure réelle d'arrivée du technicien (ISO), mode réel. */
  arriveLe?: string;
}

export interface Offre {
  id: string;
  nom: string;
  debit: string;
  prixFCFA: number;
  avantages: string[];
  icone: string;
}

export interface Dossier {
  id: string;
  numero: string;
  type: DossierType;
  statutGlobal: DossierStatutGlobal;
  etapes: DossierEtape[];
  technicien?: Technicien;
  rdv?: RendezVous;
  adresse: Adresse;
  interventionAConfirmer: boolean;
  offre?: Offre;
  dateActivation?: string;
  /** Date de dépôt de la demande (renseignée par le backend). */
  dateCreation?: string;
  /** Libellé de la prochaine action (renseigné par le backend). */
  prochaineAction?: string;
  /** Date et heure de dépôt de la demande (ISO), pour afficher « déposée le … à … ». */
  creeLe?: string;
  /** Dernière modification du dossier (ISO) : pour un dossier terminé, c'est la date de résolution. */
  modifieLe?: string;
  /** Demande annulée par le client : conservée dans l'historique, retirée des demandes actives. */
  annule?: boolean;
  /** Planification faite par Orange (le client ne choisit rien) : jour, heure d'arrivée, durée, travaux. */
  planification?: Planification;
  /** Début et fin réels de l'intervention (ISO), mode réel. */
  demarreLe?: string;
  termineLe?: string;
  /** Statut terrain du technicien (« En route », « Arrivé », « En cours »…), mode réel uniquement. */
  statutTerrain?: string;
  /** Type d'intervention prévu (mode réel). */
  typeIntervention?: string;
  /** Dernière position GPS du technicien, fournie seulement pendant son trajet. */
  positionTechnicien?: Coords & { ageSecondes: number };
}

export type Auteur = 'client' | 'technicien' | 'cortex';

export interface Message {
  id: string;
  auteur: Auteur;
  texte: string;
  heure: string;
}

export type ReclamationCategorie =
  | 'connexion_ne_fonctionne_pas'
  | 'connexion_lente'
  | 'installation_non_realisee'
  | 'installation_incomplete'
  | 'probleme_facture'
  | 'autre';

export type ReclamationStatut = 'ouverte' | 'en_traitement' | 'resolue';

export interface EtapeReclamation {
  id: string;
  titre: string;
  date?: string;
  statut: EtapeStatut;
}

export interface Reclamation {
  id: string;
  numero: string;
  categorie: ReclamationCategorie;
  description: string;
  date: string;
  statut: ReclamationStatut;
  etapes: EtapeReclamation[];
  /** Informations complémentaires ajoutées par le client après l'envoi. */
  complements?: { texte: string; date: string }[];
  /** Date et heure de dépôt (ISO). */
  creeLe?: string;
  /** Date et heure de résolution (ISO), si le signalement est résolu. */
  resolueLe?: string;
}

/** Un profil de la simulation de démonstration (4 utilisateurs type). */
export type ProfilDemoId = 'panne' | 'installation' | 'demenagement' | 'cortex';

export interface ProfilDemo {
  id: ProfilDemoId;
  /** Code de box que l'utilisateur saisit à la connexion pour incarner ce profil. */
  code: string;
  titre: string;
  sousTitre: string;
  /** Nom d'icône Ionicons (typé en `string` comme Offre.icone). */
  icone: string;
  /** Écran d'arrivée après connexion avec ce code. */
  route: string;
  client: Client;
}

export interface DemandeDemenagement {
  id: string;
  nouvelleAdresse: string;
  date: string;
  statut: 'en_cours' | 'termine';
}

export interface ResultatEligibilite {
  statut: EligibiliteStatut;
  adresse: Adresse;
  debitEstime?: string;
  dateDisponibilitePrevue?: string;
  /** id_test renvoyé par l'API, nécessaire pour créer la demande d'installation ensuite. */
  idTest?: number;
  /** Numéro enregistré par le serveur pour recontacter le client quand sa zone sera couverte. */
  recontactTelephone?: string;
}

/** Options du test d'éligibilité : numéro à enregistrer et souhait d'être recontacté. */
export interface OptionsEligibilite {
  telephone?: string;
  recontact?: boolean;
}

export interface AppareilConnecte {
  id: string;
  nom: string;
  actif: boolean;
}

export interface WifiInfo {
  actif: boolean;
  nomReseau: string;
  motDePasse: string;
  appareilsConnectes: AppareilConnecte[];
}

/** Un voyant d'état de la box (alimentation, fibre, Wi-Fi, internet). */
export interface EtatLivebox {
  id: string;
  libelle: string;
  ok: boolean;
}

/** Résultat d'un test de débit fibre (valeurs en Mb/s, latence en ms). */
export interface MesureDebit {
  descendant: number;
  envoi: number;
  latenceMs: number;
}

export interface LiveboxInfo {
  modele: string;
  numeroSerie: string;
  enLigne: boolean;
  etats: EtatLivebox[];
  /** Dernier débit mesuré, affiché par défaut avant un nouveau test. */
  debit: MesureDebit;
}

export type NotificationCategorie = 'action_requise' | 'rendez_vous' | 'info';

export interface NotificationItem {
  id: string;
  titre: string;
  description: string;
  heure: string;
  categorie: NotificationCategorie;
  lue: boolean;
}
