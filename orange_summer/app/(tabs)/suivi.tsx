import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailsIntervention } from '@/components/DetailsIntervention';
import { NotificationBell } from '@/components/NotificationBell';
import { StepperHorizontal } from '@/components/StepperHorizontal';
import { SuiviTechnicienMap } from '@/components/SuiviTechnicienMap';
import { TechnicienTrackingCard } from '@/components/TechnicienTrackingCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { useAppelerTechnicien } from '@/hooks/useAppelerTechnicien';
import { useTrajetTechnicien } from '@/hooks/useTrajetTechnicien';
import { LIBELLE_STATUT_TERRAIN } from '@/services/demandes';
import { distanceKm, libelleAgeSecondes, libelleDistance } from '@/services/formatage';
import { rafraichirDossierReel } from '@/services/modeReel';
import { useAppStore } from '@/store/useAppStore';
import { useColors } from '@/store/useSettingsStore';
import { useSessionStore } from '@/store/useSessionStore';

// En mode réel, on relit le dossier à cette cadence pour suivre le technicien (statut + position).
const RAFRAICHISSEMENT_REEL_MS = 15_000;

export default function SuiviScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const dossier = useAppStore((s) => s.dossier);
  const notifierArriveeTechnicien = useAppStore((s) => s.notifierArriveeTechnicien);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const arriveNotifieRef = useRef(false);
  const { height: screenH } = useWindowDimensions();
  const mapH = Math.round(screenH * 0.4);

  const etapeEnCours = dossier?.etapes.find((e) => e.statut === 'en_cours');
  const technicienAssigneOuPlus =
    dossier?.etapes.find((e) => e.id === 'technicien_assigne')?.statut === 'fait';
  const estFibreActive = dossier?.statutGlobal === 'termine';
  const reel = useSessionStore((s) => s.mode === 'reel');
  const appeler = useAppelerTechnicien();
  // Démo : le trajet est simulé le long d'un itinéraire. Réel : aucun trajet simulé, on n'utilise que la
  // position GPS envoyée par l'application du technicien (voir `carteReelle` plus bas).
  const technicienEnRoute = !reel && etapeEnCours?.id === 'installation';
  const enAttenteAction =
    etapeEnCours?.id === 'rdv_a_planifier' || etapeEnCours?.id === 'confirmation_client';

  const trajet = useTrajetTechnicien(dossier?.technicien?.itineraire, {
    actif: technicienEnRoute,
  });
  const clientCoords = dossier?.adresse.coords;
  const statutTerrain = dossier?.statutTerrain;
  const positionReelle = dossier?.positionTechnicien;
  const carteReelle =
    reel &&
    (statutTerrain === 'En route' || statutTerrain === 'Arrivé') &&
    !!clientCoords &&
    !!positionReelle &&
    !!dossier?.technicien;
  const arriveReel = reel && statutTerrain === 'Arrivé';

  // Mode réel : suivi en direct tant que la demande est active.
  useEffect(() => {
    if (!reel || !dossier || dossier.statutGlobal === 'termine' || dossier.annule) return;
    rafraichirDossierReel();
    const minuteur = setInterval(rafraichirDossierReel, RAFRAICHISSEMENT_REEL_MS);
    return () => clearInterval(minuteur);
  }, [reel, dossier?.id, dossier?.statutGlobal, dossier?.annule]);

  // Mode réel : prévient le client quand le technicien se déclare arrivé (une seule fois).
  useEffect(() => {
    if (arriveReel && !arriveNotifieRef.current) {
      arriveNotifieRef.current = true;
      notifierArriveeTechnicien();
      Alert.alert('Technicien arrivé', "Votre technicien s'est déclaré arrivé à votre adresse.");
    }
  }, [arriveReel, notifierArriveeTechnicien]);

  const distanceReelle = carteReelle && clientCoords && positionReelle ? distanceKm(positionReelle, clientCoords) : null;
  const titreTechnicien = (() => {
    if (!reel) return undefined;
    if (carteReelle) {
      if (arriveReel) return 'Technicien arrivé';
      return distanceReelle !== null ? `À ${libelleDistance(distanceReelle)} de chez vous` : 'Technicien en route';
    }
    if (statutTerrain === 'En route') return 'Technicien en route';
    return (statutTerrain && LIBELLE_STATUT_TERRAIN[statutTerrain]) || 'Technicien affecté';
  })();
  const sousTitreTechnicien = (() => {
    if (!reel || !dossier) return undefined;
    if (carteReelle && positionReelle) return `Position mise à jour ${libelleAgeSecondes(positionReelle.ageSecondes)}`;
    if (statutTerrain === 'En route') return "Sa position n'est pas disponible pour le moment.";
    return dossier.planification ? `Intervention prévue à ${dossier.planification.heureArrivee}` : undefined;
  })();

  // Notifie le client dès que le technicien atteint son adresse (façon Yango).
  useEffect(() => {
    if (technicienEnRoute && trajet.arrive && !arriveNotifieRef.current) {
      arriveNotifieRef.current = true;
      notifierArriveeTechnicien();
      Alert.alert('Technicien arrivé', 'Votre technicien vient d\'arriver à votre adresse.');
    }
    if (!trajet.arrive) arriveNotifieRef.current = false;
  }, [trajet.arrive, technicienEnRoute, notifierArriveeTechnicien]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h1 as any, { color: c.ink }]}>Suivi</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.demandesBtn}
            onPress={() => router.push('/mes-demandes')}
            accessibilityLabel="Mes demandes"
          >
            <Ionicons name="list" size={18} color={c.primary} />
            <Text style={styles.demandesBtnTexte}>Mes demandes</Text>
          </Pressable>
          <NotificationBell />
        </View>
      </View>

      {!dossier ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={48} color={c.muted} />
          <Text style={[typography.h3 as any, { marginTop: spacing.md, textAlign: 'center', color: c.ink }]}>
            Aucun dossier pour le moment
          </Text>
          <Text style={[typography.caption as any, { textAlign: 'center', marginTop: spacing.xs, color: c.muted }]}>
            Vérifiez votre éligibilité pour démarrer une demande d'installation.
          </Text>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button label="Vérifier mon éligibilité" icon="wifi" onPress={() => router.push('/eligibilite')} />
            <View style={{ marginTop: spacing.sm }}>
              <Button label="Mes demandes" variant="ghost" icon="list" onPress={() => router.push('/mes-demandes')} />
            </View>
          </View>
        </View>
      ) : estFibreActive ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.successWrap}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={34} color={c.white} />
            </View>
            <Text style={[typography.h2 as any, styles.successTitle]}>Votre fibre est active</Text>
            <Text style={[typography.body as any, styles.successSubtitle]}>
              Merci, votre confirmation a bien été enregistrée. Vous pouvez désormais profiter pleinement de vos
              services.
            </Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.statutHeaderRow}>
              <View>
                <Text style={styles.labelSmall}>STATUT DU DOSSIER {dossier.numero}</Text>
                <Text style={[typography.h3 as any, { color: c.ink }]}>Fibre active</Text>
              </View>
              <Badge label="actif" tone="info" />
            </View>
            {dossier.dateActivation && (
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={15} color={c.muted} />
                <Text style={styles.metaText}>Date d'activation : {dossier.dateActivation}</Text>
              </View>
            )}
          </Card>

          <Pressable onPress={() => setHistoriqueOuvert((v) => !v)}>
            <View style={styles.historiqueLink}>
              <Text style={styles.historiqueLinkText}>Historique d'installation</Text>
              <Ionicons name={historiqueOuvert ? 'chevron-up' : 'chevron-down'} size={16} color={c.primaryDark} />
            </View>
          </Pressable>
          {historiqueOuvert && (
            <Card style={{ marginTop: spacing.sm }}>
              <StepperHorizontal etapes={dossier.etapes} />
            </Card>
          )}

          <View style={{ marginTop: spacing.xl }}>
            <Button
              label="Voir reçu"
              icon="receipt-outline"
              onPress={() => Alert.alert('Reçu', 'Votre reçu vous a été envoyé par SMS et email.')}
            />
            <View style={{ marginTop: spacing.sm }}>
              <Button label="Espace fibre" variant="ghost" onPress={() => router.push('/(tabs)')} />
            </View>
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      ) : (carteReelle || (technicienEnRoute && clientCoords && dossier.technicien?.itineraire)) && clientCoords && dossier.technicien ? (
        <View style={styles.trackingScreen}>
          {/* La carte est le haut de la zone qui défile : elle monte et disparaît quand on descend vers les détails,
              et revient quand on remonte. */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <SuiviTechnicienMap
              clientPosition={clientCoords}
              technicienPosition={carteReelle ? positionReelle ?? null : trajet.position}
              chemin={carteReelle ? [] : trajet.chemin}
              progression={carteReelle ? 0 : trajet.progression}
              height={mapH}
              interactive
              zoomMolette={false}
            />

            <View style={styles.trackSheet}>
              <View style={styles.trackGrip} />
              <View style={styles.sheetContent}>
                <TechnicienTrackingCard
                  technicien={dossier.technicien}
                  etaMinutes={trajet.etaMinutes}
                  arrive={carteReelle ? arriveReel : trajet.arrive}
                  titre={titreTechnicien}
                  sousTitre={sousTitreTechnicien}
                  onAppeler={() => appeler(dossier.technicien)}
                  onDiscussion={() => router.push(`/chat/${dossier.technicien!.id}`)}
                  onDetails={() => router.push(`/technicien/${dossier.technicien!.id}`)}
                />

                <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Suivi de l'installation</Text>
                <Card>
                  <StepperHorizontal etapes={dossier.etapes} />
                </Card>

                <DetailsIntervention dossier={dossier} />

                <View style={{ marginTop: spacing.lg }}>
                  <Button
                    label="Signaler un problème"
                    variant="ghost"
                    icon="alert-circle-outline"
                    onPress={() => router.push('/reclamation')}
                  />
                </View>

                <View style={{ height: spacing.xxl }} />
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {dossier.rdv && !dossier.interventionAConfirmer && (
            <View style={styles.rdvBanner}>
              <Text style={styles.rdvBannerText}>RDV prévu le {dossier.rdv.date}</Text>
            </View>
          )}

          {dossier.technicien && (
            <Card style={styles.card}>
              <TechnicienTrackingCard
                technicien={dossier.technicien}
                etaMinutes={0}
                arrive={false}
                titre={titreTechnicien ?? 'Technicien affecté'}
                sousTitre={
                  sousTitreTechnicien ??
                  (dossier.planification ? `Intervention prévue à ${dossier.planification.heureArrivee}` : undefined)
                }
                onAppeler={() => appeler(dossier.technicien)}
                onDiscussion={() => router.push(`/chat/${dossier.technicien!.id}`)}
                onDetails={() => router.push(`/technicien/${dossier.technicien!.id}`)}
              />
            </Card>
          )}

          {dossier.interventionAConfirmer ? (
            <View style={{ marginBottom: spacing.lg }}>
              <Button
                label="Confirmer la fin de l'intervention"
                icon="checkmark-circle"
                onPress={() => router.push('/intervention-confirmation')}
              />
            </View>
          ) : (
            <Card style={styles.card}>
              <View style={styles.prochaineActionHeader}>
                <Ionicons name="calendar" size={16} color={c.primaryDark} />
                <Text style={styles.prochaineActionLabel}>PROCHAINE ACTION</Text>
              </View>
              <Text style={[typography.body as any, { marginBottom: spacing.md, color: c.ink }]}>
                {etapeEnCours?.description ??
                  (technicienAssigneOuPlus
                    ? 'Votre technicien va bientôt se mettre en route.'
                    : 'Orange va vous assigner un technicien très prochainement.')}
              </Text>
              <Button
                label="Contactez le technicien"
                icon={technicienAssigneOuPlus ? 'chatbubble-ellipses' : 'lock-closed'}
                iconPosition="right"
                disabled={!technicienAssigneOuPlus}
                onPress={() => dossier.technicien && router.push(`/chat/${dossier.technicien.id}`)}
              />
            </Card>
          )}

          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Suivi de l'installation</Text>
          <Card>
            <StepperHorizontal etapes={dossier.etapes} />
          </Card>

          <DetailsIntervention dossier={dossier} />

          {enAttenteAction && (
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={
                  etapeEnCours?.id === 'rdv_a_planifier'
                    ? "Orange planifie votre intervention : vous serez prévenu"
                    : 'En attente de votre confirmation'
                }
                icon="calendar"
                variant="ghost"
                disabled
                onPress={() => {}}
              />
            </View>
          )}

          <View style={{ marginTop: spacing.xl }}>
            <Button
              label="Signaler un problème"
              variant="ghost"
              icon="alert-circle-outline"
              onPress={() => router.push('/reclamation')}
            />
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    demandesBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    demandesBtnTexte: { fontSize: 12.5, fontWeight: '700', color: c.ink },
    scroll: { paddingHorizontal: spacing.lg },
    trackingScreen: { flex: 1, backgroundColor: c.infoSoft },
    trackSheet: {
      flexGrow: 1,
      marginTop: -18,
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
    },
    trackGrip: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginTop: spacing.sm,
    },
    sheetContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    card: { marginBottom: spacing.lg },
    labelSmall: { fontSize: 11, fontWeight: '700', color: c.muted, letterSpacing: 0.5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
    metaText: { marginLeft: spacing.xs, fontSize: 13, color: c.slate },
    rdvBanner: {
      backgroundColor: c.primary,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    rdvBannerText: { color: c.white, fontWeight: '700', fontSize: 14 },
    prochaineActionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
    prochaineActionLabel: { fontSize: 11, fontWeight: '700', color: c.primaryDark, marginLeft: spacing.xs, letterSpacing: 0.5 },
    sectionTitle: { ...(typography.h3 as any), color: c.ink, marginBottom: spacing.md },
    successWrap: { alignItems: 'center', paddingVertical: spacing.xl },
    successIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    successTitle: { textAlign: 'center', color: c.ink },
    successSubtitle: { textAlign: 'center', color: c.slate, marginTop: spacing.sm },
    statutHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    historiqueLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
    historiqueLinkText: { fontWeight: '700', color: c.ink, fontSize: 15 },
  });
}
