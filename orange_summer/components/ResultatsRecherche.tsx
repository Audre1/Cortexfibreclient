import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { libellesCategorieReclamation, offres as offresDemo, suggestionsCortex, zonesCouverture } from '@/data/mockData';
import { LIBELLE_TYPE_DOSSIER } from '@/services/demandes';
import { formaterNumero } from '@/services/numeros';
import { useAppStore } from '@/store/useAppStore';
import { useEspaceReelStore } from '@/store/useEspaceReelStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors } from '@/store/useSettingsStore';

type Icone = React.ComponentProps<typeof Ionicons>['name'];

type Rubrique =
  | 'Écrans et actions'
  | 'Mes demandes et signalements'
  | 'Suivi du technicien'
  | 'Notifications'
  | 'Wi-Fi et appareils'
  | 'Ma Livebox'
  | 'Offres'
  | 'Mon compte et mes numéros'
  | 'Réglages'
  | 'Éligibilité'
  | 'Cortex, mon assistant';

const ORDRE: Rubrique[] = [
  'Écrans et actions',
  'Mes demandes et signalements',
  'Suivi du technicien',
  'Notifications',
  'Wi-Fi et appareils',
  'Ma Livebox',
  'Offres',
  'Mon compte et mes numéros',
  'Réglages',
  'Éligibilité',
  'Cortex, mon assistant',
];

interface Resultat {
  cle: string;
  rubrique: Rubrique;
  icone: Icone;
  titre: string;
  detail?: string;
  /** Mots supplémentaires qui retrouvent ce résultat (sans accents, en minuscules). */
  motsCles?: string;
  agir: () => void;
}

function normaliser(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const MAX_PAR_RUBRIQUE = 6;
const COMMUNES = ['Cocody', 'Le Plateau', 'Marcory', 'Treichville', 'Yopougon', 'Abobo', 'Port-Bouët', 'Adjamé', 'Koumassi', 'Attécoubé'];
const LANGUES = ['Français', 'English', 'Español', 'Deutsch', 'Português', 'العربية'];
const SUGGESTIONS_VIDE = ['wifi', 'ecrans', 'technicien', 'livebox', 'mes demandes', 'signaler', 'parametres', 'cortex'];

interface Props {
  requete: string;
  /** Appelé quand on choisit un résultat (pour refermer la barre de recherche). */
  onChoisi: () => void;
  /** Ouvre la fenêtre « Mes numéros » de l'accueil. */
  onOuvrirNumeros: () => void;
  /** Remplit la barre de recherche avec une suggestion. */
  onSuggestion: (texte: string) => void;
}

// Recherche sur toute l'interface, affichée sur la page d'accueil : écrans et actions, demandes, signalements,
// notifications, Wi-Fi et appareils, Livebox, offres, technicien, compte, numéros, réglages, éligibilité et Cortex.
export function ResultatsRecherche({ requete, onChoisi, onOuvrirNumeros, onSuggestion }: Props) {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const client = useAppStore((s) => s.client);
  const dossiers = useAppStore((s) => s.dossiers);
  const dossier = useAppStore((s) => s.dossier);
  const reclamations = useAppStore((s) => s.reclamations);
  const notifications = useAppStore((s) => s.notifications);
  const wifi = useAppStore((s) => s.wifi);
  const livebox = useAppStore((s) => s.livebox);
  const numeros = useAppStore((s) => s.numeros);
  const modeReel = useSessionStore((s) => s.mode === 'reel');
  const offresReelles = useEspaceReelStore((s) => s.offres);

  const tous: Resultat[] = useMemo(() => {
    const aller = (route: string) => () => {
      onChoisi();
      router.push(route as never);
    };
    const R: Resultat[] = [];
    const ajouter = (r: Resultat) => R.push(r);

    // ---- Écrans et actions (tout ce qui s'ouvre dans l'application) ----
    const ecrans: [string, Icone, string, string | undefined, string, string][] = [
      ['wifi', 'wifi', 'Gérer mon Wi-Fi', 'Nom du réseau, mot de passe, appareils', 'wifi wi-fi reseau mot de passe appareils connectes qr code', '/gerer-wifi'],
      ['demandes', 'document-text', 'Mes demandes', 'Installation, dépannage, déménagement', 'demandes installation depannage demenagement modifier supprimer annuler', '/mes-demandes'],
      ['signaler', 'alert-circle', 'Signaler un problème', 'Panne, lenteur, installation incomplète', 'signaler probleme panne lenteur incident reclamation plainte facture facturation paiement montant erreur', '/reclamation'],
      ['signalement-probleme', 'warning', 'Décrire un problème de connexion', undefined, 'probleme connexion internet coupure', '/signalement-probleme'],
      ['historique', 'time', 'Historique de mes demandes', 'Classé par mois : résolues et non résolues', 'historique mois demandes resolues non resolues effectuees', '/historique'],
      ['reclamations', 'flag', 'Mes réclamations', 'Signalements et leur avancement', 'reclamations signalements suivi avancement', '/reclamations'],
      ['livebox', 'hardware-chip', 'Ma Livebox', 'État, débit, voyants, test de vitesse', 'livebox box fiberbox etat debit voyants vitesse speedtest', '/livebox'],
      ['diagnostic', 'pulse', 'Diagnostic de ma ligne', 'Vérifier ma connexion à distance', 'diagnostic verifier ligne test panne', '/diagnostic'],
      ['suivi', 'sync', 'Suivi de mon installation', "Carte, étapes, détails de l'intervention", 'suivi installation intervention carte etapes avancement', '/(tabs)/suivi'],
      ['signaler-onglet', 'alert', 'Onglet Signaler', undefined, 'signaler onglet', '/(tabs)/signaler'],
      ['eligibilite', 'location', 'Vérifier mon éligibilité', 'Tester la fibre à mon adresse', 'eligibilite fibre adresse zone couverture geolocaliser', '/eligibilite'],
      ['offre-choix', 'pricetags', 'Choisir mon offre', 'Fibre UP Starter, Essentiel, Plus, Premium, Max', 'choisir offre forfait abonnement prix', '/choix-offre'],
      ['demande-install', 'construct', "Demander une installation", undefined, 'demande installation nouvel abonnement commande nouvelle fibre', '/demande-installation'],
      ['demenagement', 'home', 'Déménager', 'Transférer ma ligne à une nouvelle adresse', 'demenager demenagement transferer ligne nouvelle adresse', '/demenagement'],
      ['cortex', 'chatbubbles', 'Discuter avec Cortex', 'Assistant intelligent', 'cortex assistant aide question chat ia robot', '/cortex'],
      ['notifications', 'notifications', 'Notifications', 'Alertes, rendez-vous, actions requises', 'notifications alertes messages cloche', '/notifications'],
      ['parametres', 'settings', 'Paramètres', 'Thème clair ou sombre, langue', 'parametres reglages theme langue apparence', '/parametres'],
      ['profil', 'person', 'Mon profil', 'Informations personnelles, déconnexion', 'profil compte informations personnelles', '/(tabs)/profil'],
      ['accueil', 'grid', 'Accueil', undefined, 'accueil page principale', '/(tabs)/accueil'],
      ['absence', 'person-remove', 'Signaler une absence du technicien', undefined, 'absence technicien pas venu retard absent', '/signalement-absence'],
    ];
    for (const [cle, icone, titre, detail, motsCles, route] of ecrans) {
      ajouter({ cle, rubrique: 'Écrans et actions', icone, titre, detail, motsCles, agir: aller(route) });
    }
    ajouter({
      cle: '3900', rubrique: 'Écrans et actions', icone: 'call', titre: 'Appeler le 3900', detail: 'Service client Orange',
      motsCles: 'appeler 3900 service client telephone contact sav assistance',
      agir: () => {
        onChoisi();
        Linking.openURL('tel:3900').catch(() => {});
      },
    });
    ajouter({
      cle: 'sav', rubrique: 'Écrans et actions', icone: 'headset', titre: 'Contacter le service client', detail: 'Mon profil › Assistance',
      motsCles: 'service client sav assistance aide contact', agir: aller('/(tabs)/profil'),
    });
    if (dossier?.interventionAConfirmer) {
      ajouter({ cle: 'fin-intervention', rubrique: 'Écrans et actions', icone: 'checkmark-circle', titre: "Confirmer la fin de l'intervention", motsCles: 'confirmer fin intervention terminee valider', agir: aller('/intervention-confirmation') });
    }
    if (modeReel) {
      ajouter({ cle: 'constat', rubrique: 'Écrans et actions', icone: 'analytics', titre: 'Constat de ma box', detail: 'Mesures et anomalies', motsCles: 'constat box mesures anomalies', agir: aller('/constat') });
      ajouter({ cle: 'recharge', rubrique: 'Écrans et actions', icone: 'card', titre: 'Me recharger', motsCles: 'recharge recharger payer paiement paiements mensualite facture abonnement', agir: aller('/recharge') });
      ajouter({ cle: 'changer-offre', rubrique: 'Écrans et actions', icone: 'swap-horizontal', titre: "Changer d'offre", motsCles: 'changer offre abonnement forfait', agir: aller('/changement-offre') });
    }
    ajouter({ cle: 'mes-numeros', rubrique: 'Mon compte et mes numéros', icone: 'call-outline', titre: 'Mes numéros', detail: 'Ajouter ou supprimer un numéro (2 au maximum)', motsCles: 'numeros numero ajouter telephone', agir: () => { onChoisi(); onOuvrirNumeros(); } });

    // ---- Mes demandes et signalements ----
    for (const d of dossiers.filter((x) => !x.annule)) {
      ajouter({
        cle: `d-${d.id}`, rubrique: 'Mes demandes et signalements', icone: 'folder-open', titre: `Demande ${d.numero}`,
        detail: LIBELLE_TYPE_DOSSIER[d.type], motsCles: `dossier demande ${LIBELLE_TYPE_DOSSIER[d.type]} ${d.adresse.rue ?? ''} ${d.offre?.nom ?? ''}`,
        agir: aller(`/dossier/${d.id}`),
      });
    }
    for (const r of reclamations) {
      ajouter({
        cle: `r-${r.id}`, rubrique: 'Mes demandes et signalements', icone: 'flag', titre: `Signalement ${r.numero}`,
        detail: libellesCategorieReclamation[r.categorie], motsCles: `signalement reclamation ${libellesCategorieReclamation[r.categorie]} ${r.description}`,
        agir: aller(`/reclamation/${r.id}`),
      });
    }

    // ---- Suivi du technicien ----
    if (dossier) {
      for (const e of dossier.etapes) {
        ajouter({ cle: `e-${e.id}`, rubrique: 'Suivi du technicien', icone: 'git-commit', titre: e.titre, detail: "Étape du suivi de l'installation", motsCles: `etape suivi ${e.description}`, agir: aller('/(tabs)/suivi') });
      }
      const tech = dossier.technicien;
      if (tech) {
        ajouter({ cle: 'tech', rubrique: 'Suivi du technicien', icone: 'person-circle', titre: `Mon technicien : ${tech.prenom} ${tech.nom}`, detail: `${tech.vehicule} ${tech.immatriculation}`.trim(), motsCles: 'technicien appeler details vehicule immatriculation', agir: aller(`/technicien/${tech.id}`) });
        ajouter({ cle: 'tech-msg', rubrique: 'Suivi du technicien', icone: 'chatbubble-ellipses', titre: 'Écrire au technicien', motsCles: 'message ecrire technicien discuter chat', agir: aller(`/chat/${tech.id}`) });
      }
    }

    // ---- Notifications ----
    for (const n of notifications) {
      ajouter({ cle: `n-${n.id}`, rubrique: 'Notifications', icone: 'notifications-circle', titre: n.titre, detail: n.description, motsCles: 'notification', agir: aller('/notifications') });
    }

    // ---- Wi-Fi et appareils (le mot de passe n'est volontairement pas indexé) ----
    if (wifi.nomReseau) {
      ajouter({ cle: 'wifi-nom', rubrique: 'Wi-Fi et appareils', icone: 'wifi', titre: `Réseau Wi-Fi « ${wifi.nomReseau} »`, detail: wifi.actif ? 'Actif' : 'Inactif', motsCles: 'reseau wifi ssid nom', agir: aller('/gerer-wifi') });
    }
    for (const a of wifi.appareilsConnectes) {
      ajouter({ cle: `a-${a.id}`, rubrique: 'Wi-Fi et appareils', icone: 'phone-portrait', titre: a.nom, detail: a.actif ? 'Appareil connecté' : 'Appareil bloqué', motsCles: 'appareil connecte wifi', agir: aller('/gerer-wifi') });
    }

    // ---- Ma Livebox ----
    ajouter({ cle: 'box-modele', rubrique: 'Ma Livebox', icone: 'hardware-chip', titre: livebox.modele || 'Ma Livebox', detail: livebox.numeroSerie ? `N° de série ${livebox.numeroSerie}` : undefined, motsCles: 'livebox box modele serie numero', agir: aller('/livebox') });
    for (const e of livebox.etats) {
      ajouter({ cle: `box-${e.id}`, rubrique: 'Ma Livebox', icone: 'radio-button-on', titre: `Voyant : ${e.libelle}`, detail: e.ok ? 'Fonctionne' : 'À vérifier', motsCles: 'voyant etat box', agir: aller('/livebox') });
    }
    ajouter({ cle: 'box-debit', rubrique: 'Ma Livebox', icone: 'speedometer', titre: 'Test de débit', detail: 'Mesurer la vitesse de ma fibre', motsCles: 'debit vitesse test mbps latence speedtest', agir: aller('/livebox') });

    // ---- Offres ----
    const offres = modeReel && offresReelles.length > 0 ? offresReelles : offresDemo;
    for (const o of offres) {
      ajouter({
        cle: `o-${o.id}`, rubrique: 'Offres', icone: 'pricetag', titre: o.nom,
        detail: `${o.debit} · ${o.prixFCFA.toLocaleString('fr-FR')} FCFA/mois`, motsCles: `offre forfait abonnement prix ${o.avantages.join(' ')}`,
        agir: aller(modeReel ? '/changement-offre' : '/choix-offre'),
      });
    }

    // ---- Mon compte et mes numéros ----
    const nomComplet = `${client.prenom} ${client.nom}`.trim();
    ajouter({ cle: 'compte-infos', rubrique: 'Mon compte et mes numéros', icone: 'id-card', titre: nomComplet || 'Mes informations', detail: 'Informations personnelles', motsCles: `profil compte nom prenom ${client.email} ${client.adresse.rue ?? ''} ${client.adresse.ville ?? ''} adresse email`, agir: aller('/(tabs)/profil') });
    ajouter({ cle: 'compte-principal', rubrique: 'Mon compte et mes numéros', icone: 'call', titre: `Numéro principal ${formaterNumero(client.telephone)}`, detail: 'Numéro du compte', motsCles: 'numero telephone principal', agir: () => { onChoisi(); onOuvrirNumeros(); } });
    for (const n of numeros) {
      ajouter({ cle: `num-${n.id}`, rubrique: 'Mon compte et mes numéros', icone: 'call-outline', titre: `Numéro ajouté ${formaterNumero(n.numero)}`, motsCles: 'numero telephone ajoute', agir: () => { onChoisi(); onOuvrirNumeros(); } });
    }
    ajouter({ cle: 'deconnexion', rubrique: 'Mon compte et mes numéros', icone: 'log-out', titre: 'Déconnexion', motsCles: 'deconnexion deconnecter quitter sortir', agir: aller('/(tabs)/profil') });
    ajouter({ cle: 'supprimer-compte', rubrique: 'Mon compte et mes numéros', icone: 'trash', titre: 'Supprimer mon compte', motsCles: 'supprimer compte effacer', agir: aller('/(tabs)/profil') });

    // ---- Réglages ----
    for (const [t, d] of [['Thème clair', 'Fond clair en permanence'], ['Thème sombre', 'Fond sombre en permanence'], ['Thème système', 'Suit le réglage de votre téléphone']]) {
      ajouter({ cle: `theme-${t}`, rubrique: 'Réglages', icone: 'color-palette', titre: t, detail: d, motsCles: 'theme apparence mode nuit jour clair sombre systeme', agir: aller('/parametres') });
    }
    for (const l of LANGUES) {
      ajouter({ cle: `langue-${l}`, rubrique: 'Réglages', icone: 'language', titre: `Langue : ${l}`, motsCles: 'langue langage traduction', agir: aller('/parametres') });
    }

    // ---- Éligibilité (communes et zones) ----
    for (const commune of COMMUNES) {
      ajouter({ cle: `com-${commune}`, rubrique: 'Éligibilité', icone: 'map', titre: commune, detail: 'Vérifier la fibre dans cette commune', motsCles: 'commune zone ville quartier eligibilite fibre abidjan', agir: aller('/eligibilite') });
    }
    for (const z of zonesCouverture) {
      ajouter({ cle: `zone-${z.id}`, rubrique: 'Éligibilité', icone: 'map-outline', titre: `Zone ${z.nom}`, detail: z.statut === 'eligible' ? 'Fibre disponible' : z.statut === 'zone_a_etudier' ? 'Déploiement en cours' : 'Pas encore couverte', motsCles: 'zone couverture carte eligibilite', agir: aller('/eligibilite') });
    }

    // ---- Cortex ----
    for (const q of [...suggestionsCortex, "Comment redémarrer ma Fiberbox ?", "Quel est l'état de ma Fiberbox ?", 'Y a-t-il une panne dans mon quartier ?', 'Un technicien a-t-il été envoyé ?']) {
      ajouter({ cle: `q-${q}`, rubrique: 'Cortex, mon assistant', icone: 'sparkles', titre: q, detail: 'Poser cette question à Cortex', motsCles: 'cortex question assistant', agir: aller('/cortex') });
    }
    return R;
  }, [client, dossiers, dossier, reclamations, notifications, wifi, livebox, numeros, modeReel, offresReelles, router, onChoisi, onOuvrirNumeros]);

  const mots = normaliser(requete).split(/\s+/).filter(Boolean);

  // Résultats : chaque mot de la recherche doit se retrouver ; ceux qui le contiennent dans le titre passent en premier.
  const correspondances = mots.length === 0 ? [] : tous
    .map((r) => {
      const titre = normaliser(r.titre);
      const cible = normaliser(`${r.titre} ${r.detail ?? ''} ${r.motsCles ?? ''} ${r.rubrique}`);
      if (!mots.every((m) => cible.includes(m))) return null;
      return { r, score: mots.every((m) => titre.includes(m)) ? 2 : 1 };
    })
    .filter((x): x is { r: Resultat; score: number } => x !== null);

  const groupes = ORDRE.map((rubrique) => ({
    rubrique,
    items: correspondances.filter((x) => x.r.rubrique === rubrique).sort((a, b) => b.score - a.score).map((x) => x.r),
  })).filter((g) => g.items.length > 0);

  const total = correspondances.length;

  function ligne(r: Resultat) {
    return (
      <Pressable key={r.cle} style={styles.ligne} onPress={r.agir} accessibilityRole="button" accessibilityLabel={`Résultat : ${r.titre}`}>
        <View style={styles.pastille}>
          <Ionicons name={r.icone} size={20} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyBold as any, { color: c.ink }]} numberOfLines={2}>{r.titre}</Text>
          {r.detail ? <Text style={styles.detail} numberOfLines={2}>{r.detail}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Pressable>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.liste} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {mots.length === 0 ? (
        <>
          <Text style={styles.indice}>Cherchez dans toute l'application : écrans, demandes, notifications, Wi-Fi, offres, réglages…</Text>
          <Text style={styles.rubrique}>Essayez</Text>
          <View style={styles.puces}>
            {SUGGESTIONS_VIDE.map((s) => (
              <Pressable key={s} style={styles.puce} onPress={() => onSuggestion(s)} accessibilityRole="button" accessibilityLabel={`Rechercher ${s}`}>
                <Text style={styles.puceTexte}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : total === 0 ? (
        <Text style={styles.indice}>Aucun résultat pour « {requete.trim()} ». Essayez un autre mot.</Text>
      ) : (
        <>
          <Text style={styles.compte}>{total} résultat{total > 1 ? 's' : ''}</Text>
          {groupes.map((g) => (
            <View key={g.rubrique}>
              <Text style={styles.rubrique}>{g.rubrique}</Text>
              {g.items.slice(0, MAX_PAR_RUBRIQUE).map(ligne)}
              {g.items.length > MAX_PAR_RUBRIQUE && (
                <Text style={styles.autres}>+ {g.items.length - MAX_PAR_RUBRIQUE} autres : précisez votre recherche</Text>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    liste: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.sm },
    indice: { color: c.muted, fontSize: 14, marginTop: spacing.md, textAlign: 'center' },
    compte: { color: c.muted, fontSize: 12.5, marginBottom: spacing.xs },
    rubrique: { fontSize: 12, fontWeight: '800', color: c.slate, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
    autres: { fontSize: 12.5, color: c.muted, marginBottom: spacing.sm },
    puces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    puce: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
    puceTexte: { fontSize: 13, color: c.primaryDark, fontWeight: '600' },
    ligne: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    pastille: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    detail: { fontSize: 12.5, color: c.muted, marginTop: 2 },
  });
}
