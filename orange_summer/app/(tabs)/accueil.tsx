import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CortexFab } from '@/components/CortexFab';
import { NotificationBell } from '@/components/NotificationBell';
import { NumerosModal } from '@/components/NumerosModal';
import { PromoBanner, PromoSlide } from '@/components/PromoBanner';
import { ResultatsRecherche } from '@/components/ResultatsRecherche';
import { ServiceTile } from '@/components/ServiceTile';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { ageMesureMinutes, libelleAge, MESURE_FRAICHE_MIN } from '@/services/modeReel';
import { formaterNumero } from '@/services/numeros';
import { useAppStore } from '@/store/useAppStore';
import { useEspaceReelStore } from '@/store/useEspaceReelStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors, useT } from '@/store/useSettingsStore';

type Icone = React.ComponentProps<typeof Ionicons>['name'];
interface Entree {
  icon: Icone;
  label: string;
  onPress: () => void;
}

const PAR_RANGEE = 4;

/** Rangée de 4 tuiles de même largeur (les cases vides sont complétées pour garder l'alignement). */
function Rangee({ entrees, variante, style }: { entrees: Entree[]; variante: 'carte' | 'icone'; style?: object }) {
  const lignes: Entree[][] = [];
  for (let i = 0; i < entrees.length; i += PAR_RANGEE) lignes.push(entrees.slice(i, i + PAR_RANGEE));
  return (
    <View style={style}>
      {lignes.map((ligne, k) => (
        <View key={k} style={[stylesStatiques.rangee, k > 0 && { marginTop: spacing.md }]}>
          {ligne.map((e) => (
            <ServiceTile key={e.label} icon={e.icon} label={e.label} variante={variante} onPress={e.onPress} />
          ))}
          {Array.from({ length: PAR_RANGEE - ligne.length }).map((_, i) => (
            <View key={`vide-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function AccueilScreen() {
  const router = useRouter();
  const c = useColors();
  const t = useT();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const client = useAppStore((s) => s.client);
  const wifi = useAppStore((s) => s.wifi);
  const livebox = useAppStore((s) => s.livebox);
  const modeReel = useSessionStore((s) => s.mode === 'reel');
  const mesure = useEspaceReelStore((s) => s.mesure);
  const ageMin = ageMesureMinutes(mesure);
  const mesureFraiche = ageMin !== null && ageMin <= MESURE_FRAICHE_MIN;
  const [etendu, setEtendu] = useState(false);
  const [numerosOuvert, setNumerosOuvert] = useState(false);
  // Recherche : la barre s'ouvre dans l'en-tête et les résultats s'affichent sur la page d'accueil elle-même.
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [requete, setRequete] = useState('');
  const [basEntete, setBasEntete] = useState(0);
  const fermerRecherche = React.useCallback(() => {
    setRechercheOuverte(false);
    setRequete('');
  }, []);
  const numeros = useAppStore((s) => s.numeros);
  const numeroAfficheId = useAppStore((s) => s.numeroAfficheId);
  // Numéro montré sur la carte : le principal, ou l'un de ceux ajoutés par le client.
  const numeroAjoute = numeros.find((n) => n.id === numeroAfficheId);
  const numeroAffiche = numeroAjoute ? numeroAjoute.numero : client.telephone;
  const initiales = `${client.prenom?.[0] ?? ''}${client.nom?.[0] ?? ''}`.toUpperCase() || 'C';

  // En mode réel, une mesure ancienne n'est jamais présentée comme l'état actuel de la box.
  const boxInconnue = modeReel && !mesureFraiche;
  const etatBox = boxInconnue ? t('accueil.etatInconnu') : livebox.enLigne ? t('accueil.actif') : t('accueil.inactif');
  // Mode démo : l'état vient du Wi-Fi comme avant. Mode réel : de la dernière mesure de la box, jamais d'une mesure ancienne.
  const boxActive = modeReel ? !boxInconnue && livebox.enLigne : wifi.actif;

  const aller = (route: string) => () => router.push(route as never);

  const services: Entree[] = [
    { icon: 'wifi', label: t('accueil.gererWifi'), onPress: aller('/gerer-wifi') },
    { icon: 'document-text', label: t('accueil.mesDemandes'), onPress: aller('/mes-demandes') },
    { icon: 'alert-circle', label: t('accueil.signalerProbleme'), onPress: aller('/reclamation') },
    { icon: 'time', label: t('accueil.historique'), onPress: aller('/historique') },
  ];
  const servicesSupplementaires: Entree[] = [
    { icon: 'pulse', label: t('accueil.diagnostic'), onPress: aller('/diagnostic') },
    ...(modeReel
      ? [
          { icon: 'analytics' as Icone, label: t('accueil.constat'), onPress: aller('/constat') },
          { icon: 'card' as Icone, label: t('accueil.recharger'), onPress: aller('/recharge') },
          { icon: 'swap-horizontal' as Icone, label: t('accueil.changerOffre'), onPress: aller('/changement-offre') },
        ]
      : []),
  ];
  const maBox: Entree[] = [
    { icon: 'hardware-chip', label: t('accueil.maLivebox'), onPress: aller('/livebox') },
    { icon: 'location', label: t('accueil.eligibilite'), onPress: aller('/eligibilite') },
    { icon: 'home', label: t('accueil.demenagement'), onPress: aller('/demenagement') },
    { icon: 'sync', label: t('accueil.monSuivi'), onPress: aller('/(tabs)/suivi') },
  ];
  const aide: Entree[] = [
    { icon: 'chatbubbles', label: t('accueil.discuterCortex'), onPress: aller('/cortex') },
    { icon: 'flag', label: t('accueil.reclamations'), onPress: aller('/reclamations') },
  ];

  const slides: PromoSlide[] = useMemo(() => {
    const orange = '#FF7900';
    return [
      {
        id: 'eligibilite', titre: `${t('accueil.promo1')} `, accent: t('accueil.promo1Accent'), sous: t('accueil.promo1Sous'), cta: t('accueil.promo1Cta'),
        fond: '#000000', texte: '#FFFFFF', couleurAccent: orange, onPress: () => router.push('/eligibilite' as never),
      },
      {
        id: 'demenagement', titre: `${t('accueil.promo2')} `, accent: t('accueil.promo2Accent'), sous: t('accueil.promo2Sous'), cta: t('accueil.promo2Cta'),
        fond: c.surface, texte: c.ink, couleurAccent: orange, onPress: () => router.push('/demenagement' as never),
      },
      {
        id: 'diagnostic', titre: `${t('accueil.promo3')} `, accent: t('accueil.promo3Accent'), sous: t('accueil.promo3Sous'), cta: t('accueil.promo3Cta'),
        fond: orange, texte: '#FFFFFF', couleurAccent: '#000000', onPress: () => router.push('/diagnostic' as never),
      },
    ];
  }, [t, c.surface, c.ink, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* En-tête fixe : il reste en haut de l'écran quand on descend dans la page */}
      <View style={styles.topBar} onLayout={(e) => setBasEntete(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        {rechercheOuverte ? (
          <>
            <View style={styles.champRecherche}>
              <Ionicons name="search" size={18} color={c.muted} />
              <TextInput
                value={requete}
                onChangeText={setRequete}
                placeholder="Rechercher dans Cortex Fiber"
                placeholderTextColor={c.muted}
                style={styles.saisieRecherche}
                autoFocus
                returnKeyType="search"
                accessibilityLabel="Champ de recherche"
              />
              {requete.length > 0 && (
                <Pressable onPress={() => setRequete('')} hitSlop={10} accessibilityLabel="Effacer la recherche">
                  <Ionicons name="close-circle" size={18} color={c.muted} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={fermerRecherche} hitSlop={10} accessibilityLabel="Fermer la recherche">
              <Text style={styles.annulerRecherche}>Annuler</Text>
            </Pressable>
          </>
        ) : (
          <>
        <Text style={[typography.h2 as any, styles.salutation]} numberOfLines={1}>
          {t('accueil.bonjour')} {client.prenom}
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={() => setRechercheOuverte(true)} hitSlop={10} accessibilityLabel="Rechercher">
            <Ionicons name="search" size={25} color={c.ink} />
          </Pressable>
          <NotificationBell />
          <Pressable onPress={aller('/cortex')} hitSlop={10} accessibilityLabel={t('accueil.discuterCortex')}>
            <Ionicons name="help-circle-outline" size={27} color={c.ink} />
          </Pressable>
          <Pressable onPress={aller('/(tabs)/profil')} hitSlop={8} accessibilityLabel={t('tabs.profil')}>
            <Avatar initiales={initiales} size={36} background={c.border} color={c.ink} />
          </Pressable>
        </View>
          </>
        )}
      </View>

      {/* Résultats : recouvrent la page d'accueil sous l'en-tête, sans changer d'écran */}
      {rechercheOuverte && (
        <View style={[styles.resultatsRecherche, { top: basEntete }]}>
          <ResultatsRecherche
            requete={requete}
            onChoisi={fermerRecherche}
            onOuvrirNumeros={() => setNumerosOuvert(true)}
            onSuggestion={setRequete}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Carte noire d'origine : numéro, état de la box et diagnostic */}
        <Pressable onPress={aller('/livebox')}>
          <Card style={styles.boxCard}>
            <View style={styles.boxHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.numeroLabel}>{numeroAjoute ? 'Numéro ajouté' : t('accueil.numeroFixe')}</Text>
                {/* Un appui sur le numéro ouvre « Mes numéros » (jusqu'à 2 numéros ajoutés) */}
                <Pressable
                  onPress={() => setNumerosOuvert(true)}
                  hitSlop={8}
                  style={styles.numeroLigne}
                  accessibilityRole="button"
                  accessibilityLabel="Gérer mes numéros"
                >
                  <Text style={styles.numeroValue}>{formaterNumero(numeroAffiche)}</Text>
                  <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
                  {numeros.length > 0 && (
                    <View style={styles.numeroNombre}>
                      <Text style={styles.numeroNombreTexte}>+{numeros.length}</Text>
                    </View>
                  )}
                </Pressable>
                {modeReel && boxInconnue && (
                  <Text style={styles.mesure}>
                    {mesure ? `Dernière mesure ${libelleAge(ageMin)}` : 'Aucune mesure reçue de votre Fiberbox'}
                  </Text>
                )}
              </View>
              <Badge
                label={boxInconnue ? t('accueil.etatInconnu') : boxActive ? t('accueil.actif') : t('accueil.inactif')}
                tone={boxInconnue ? 'neutral' : boxActive ? 'success' : 'danger'}
              />
            </View>

            <View style={styles.connexionRow}>
              <View style={styles.connexionItem}>
                <View style={[styles.connexionIconWrap, boxActive && styles.connexionIconWrapActive]}>
                  <Ionicons name="globe-outline" size={16} color={boxActive ? c.primary : c.muted} />
                </View>
                <Text style={styles.connexionLabel}>{t('accueil.internet')}</Text>
              </View>
              <View style={styles.connexionLine} />
              <View style={styles.connexionItem}>
                <View style={[styles.connexionIconWrap, styles.connexionIconWrapMain]}>
                  <Ionicons name="wifi" size={18} color={c.white} />
                </View>
                <Text style={styles.connexionLabel}>{t('accueil.box')}</Text>
              </View>
              <View style={styles.connexionLine} />
              <View style={styles.connexionItem}>
                <View style={[styles.connexionIconWrap, boxActive && styles.connexionIconWrapActive]}>
                  <Ionicons name="call-outline" size={16} color={boxActive ? c.primary : c.muted} />
                </View>
                <Text style={styles.connexionLabel}>{t('accueil.ligneFixe')}</Text>
              </View>
            </View>

            {!boxActive && (
              <View style={{ marginTop: spacing.md }}>
                <InfoBanner
                  tone="warning"
                  icon="alert-circle"
                  text={
                    boxInconnue
                      ? "Nous ne pouvons pas confirmer l'état de votre box (aucune mesure récente). Lancez un diagnostic pour vérifier."
                      : t('accueil.boxIndispo')
                  }
                />
              </View>
            )}
          </Card>
        </Pressable>

        {/* Services */}
        <View style={styles.sectionTete}>
          <Text style={[typography.h2 as any, { color: c.ink }]}>{t('accueil.services')}</Text>
          <Pressable onPress={() => setEtendu((v) => !v)} hitSlop={10} style={styles.voirTout}>
            <Text style={styles.voirToutTexte}>{t('accueil.voirTout')}</Text>
            <Ionicons name={etendu ? 'chevron-up' : 'chevron-forward'} size={18} color={c.ink} />
          </Pressable>
        </View>
        <Rangee entrees={services} variante="carte" />
        {etendu && <Rangee entrees={servicesSupplementaires} variante="carte" style={{ marginTop: spacing.md }} />}

        {/* Bannière à défilement */}
        <View style={{ marginTop: spacing.xl }}>
          <PromoBanner slides={slides} />
        </View>

        {/* Ma box et mes démarches */}
        <Rangee entrees={maBox} variante="icone" style={{ marginTop: spacing.xl }} />

        {/* Besoin d'aide ? */}
        <Text style={[typography.h2 as any, styles.titreSection]}>{t('accueil.besoinAide')}</Text>
        <Rangee entrees={aide} variante="icone" />

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>

      <NumerosModal visible={numerosOuvert} onClose={() => setNumerosOuvert(false)} />

      <CortexFab bottomOffset={spacing.xs} />
    </SafeAreaView>
  );
}

const stylesStatiques = StyleSheet.create({
  rangee: { flexDirection: 'row', gap: spacing.md },
});

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: spacing.lg },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: c.background,
    },
    salutation: { flex: 1, color: c.ink },
    champRecherche: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
    },
    saisieRecherche: { flex: 1, paddingVertical: spacing.sm + 2, fontSize: 15, color: c.ink },
    annulerRecherche: { fontSize: 14, fontWeight: '700', color: c.primaryDark },
    resultatsRecherche: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.background, zIndex: 20 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    numeroLigne: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
    numeroNombre: { backgroundColor: c.primary, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 1, marginLeft: spacing.xs },
    numeroNombreTexte: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    boxCard: { backgroundColor: '#000000', borderColor: c.border, marginBottom: spacing.xl },
    boxHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
    numeroLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    numeroValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    mesure: { color: 'rgba(255,255,255,0.6)', fontSize: 11.5, marginTop: 4 },
    connexionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    connexionItem: { alignItems: 'center' },
    connexionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    connexionIconWrapActive: { backgroundColor: c.primarySoft },
    connexionIconWrapMain: { backgroundColor: c.primary, width: 44, height: 44, borderRadius: 22 },
    connexionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10.5, marginTop: 6, fontWeight: '600' },
    connexionLine: { width: 24, height: 1.5, backgroundColor: 'rgba(255,255,255,0.2)' },
    sectionTete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    voirTout: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    voirToutTexte: { fontSize: 14, fontWeight: '700', color: c.ink },
    titreSection: { color: c.ink, marginTop: spacing.xl, marginBottom: spacing.md },
  });
}
