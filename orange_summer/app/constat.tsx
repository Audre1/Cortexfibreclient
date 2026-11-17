import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { ApiError } from '@/services/apiClient';
import { mesuresApi, SituationReelle, situationApi } from '@/services/backendService';
import { libelleAge } from '@/services/modeReel';
import { useAppStore } from '@/store/useAppStore';
import { useEspaceReelStore } from '@/store/useEspaceReelStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors } from '@/store/useSettingsStore';

const nombre = (v: string | number | null | undefined) => (v === null || v === undefined ? null : Number(v));

// Constat de la Fiberbox : uniquement des faits remontés par le système (boîtier IoT, incidents, interventions).
export default function ConstatScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const modeReel = useSessionStore((s) => s.mode === 'reel');
  const idClient = useSessionStore((s) => s.idClient);
  const ligneActive = useEspaceReelStore((s) => s.ligneActive);
  const envoyerMessageCortex = useAppStore((s) => s.envoyerMessageCortex);

  const [situation, setSituation] = useState<SituationReelle | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [signalement, setSignalement] = useState<string>('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      setSituation(await situationApi.obtenir(ligneActive?.idLigne));
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger le constat.');
    } finally {
      setChargement(false);
    }
  }, [ligneActive?.idLigne]);

  useEffect(() => {
    if (modeReel) charger();
  }, [modeReel, charger]);

  async function signaler(idAnomalie: number | undefined) {
    if (!idAnomalie || !idClient) return;
    try {
      const { reclamation } = await mesuresApi.signalerAnomalie(idAnomalie, idClient);
      setSignalement(`Anomalie signalée : référence ${reclamation.reference}.`);
      await charger();
    } catch (e) {
      setSignalement(e instanceof ApiError ? e.message : "Le signalement n'a pas pu être envoyé.");
    }
  }

  function discuter() {
    envoyerMessageCortex('Quel problème rencontre ma Fiberbox ?');
    router.push('/cortex');
  }

  if (!modeReel) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Constat de la box" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <InfoBanner
            tone="warning"
            icon="flask-outline"
            text="Le constat de la box utilise les mesures réelles de votre Fiberbox. Il n'est disponible qu'avec un compte connecté (code de box et téléphone), pas en mode démonstration."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const box = situation?.box ?? null;
  const anomalies = situation?.anomalies ?? [];
  const lignes: { label: string; valeur: string }[] = [];
  if (box) {
    lignes.push({ label: 'Connexion WAN', valeur: box.etat_wan === 'ACTIF' ? 'Active' : 'Inactive' });
    if (nombre(box.signal_dbm) !== null) lignes.push({ label: 'Signal fibre', valeur: `${nombre(box.signal_dbm)} dBm` });
    if (nombre(box.debit_descendant_mbps) !== null) lignes.push({ label: 'Débit descendant', valeur: `${nombre(box.debit_descendant_mbps)} Mb/s` });
    if (nombre(box.debit_montant_mbps) !== null) lignes.push({ label: 'Débit montant', valeur: `${nombre(box.debit_montant_mbps)} Mb/s` });
    if (box.nb_micro_coupures_24h !== null) lignes.push({ label: 'Micro-coupures (24 h)', valeur: String(box.nb_micro_coupures_24h) });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Constat de la box" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={chargement} onRefresh={charger} />}
      >
        {chargement && !situation && <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />}
        {!!erreur && <InfoBanner tone="warning" icon="alert-circle" text={erreur} />}

        {!!situation && (
          <>
            {/* Incident collectif dans le quartier (statut réel du système de suivi technique) */}
            {situation.incidents.map((i) => (
              <Card key={i.reference} style={styles.incidentCard}>
                <View style={styles.liveRow}>
                  <Ionicons name="warning" size={18} color={c.warning} />
                  <Text style={styles.incidentTitre}>Incident dans votre quartier</Text>
                </View>
                <Text style={[typography.body as any, { color: c.ink, marginTop: spacing.sm }]}>{i.message}</Text>
                {!!i.retablissement_estime && (
                  <Text style={[typography.caption as any, { marginTop: spacing.xs }]}>
                    Rétablissement estimé par l'équipe technique : {new Date(i.retablissement_estime).toLocaleString('fr-FR')}
                  </Text>
                )}
                <Text style={[typography.caption as any, { marginTop: spacing.xs, color: c.muted }]}>Référence {i.reference}</Text>
              </Card>
            ))}

            {/* Intervention technique en cours pour ce client */}
            {situation.interventions
              .filter((d) => d.message || d.technicien_prenom)
              .map((d) => (
                <Card key={d.numero_dossier} style={styles.card}>
                  <Text style={[typography.bodyBold as any, { color: c.ink }]}>Intervention · dossier {d.numero_dossier}</Text>
                  <Text style={[typography.body as any, { color: c.slate, marginTop: spacing.xs }]}>
                    {d.message ?? 'Un technicien est affecté ; il n\'a pas encore signalé son départ.'}
                  </Text>
                  {!!d.technicien_prenom && <Text style={typography.caption as any}>Technicien : {d.technicien_prenom}</Text>}
                </Card>
              ))}

            <Card style={styles.liveCard}>
              <View style={styles.liveRow}>
                <View style={[styles.liveDot, { backgroundColor: box?.fraiche ? c.success : c.muted }]} />
                <Text style={styles.liveText}>
                  {!box
                    ? 'Aucune mesure reçue de votre Fiberbox'
                    : box.fraiche
                    ? `Mesure reçue ${libelleAge(box.age_min)}`
                    : `Dernière mesure ${libelleAge(box.age_min)}`}
                </Text>
              </View>
              {!!box && !box.fraiche && (
                <Text style={[typography.caption as any, { marginTop: spacing.xs }]}>
                  Cette mesure est ancienne : elle ne permet pas de confirmer l'état actuel de votre box.
                </Text>
              )}
              {!box && (
                <Text style={[typography.caption as any, { marginTop: spacing.xs }]}>
                  Son état ne peut pas être confirmé pour le moment.
                </Text>
              )}
            </Card>

            {lignes.length > 0 && (
              <Card style={styles.card}>
                {lignes.map((l, k) => (
                  <View key={l.label} style={[styles.mesureRow, k > 0 && styles.mesureSep]}>
                    <Text style={styles.mesureLabel}>{l.label}</Text>
                    <Text style={styles.mesureValeur}>{l.valeur}</Text>
                  </View>
                ))}
              </Card>
            )}

            <Text style={styles.sectionTitle}>Anomalies en cours</Text>
            {anomalies.length === 0 ? (
              <Card style={styles.card}>
                <Text style={typography.body as any}>
                  {box?.fraiche
                    ? 'Aucune anomalie détectée par votre Fiberbox.'
                    : "Aucune anomalie enregistrée, mais l'état actuel de la box n'est pas confirmé (voir ci-dessus)."}
                </Text>
              </Card>
            ) : (
              anomalies.map((a, k) => (
                <Card key={`${a.type_anomalie}-${k}`} style={styles.card}>
                  <View style={styles.liveRow}>
                    <Text style={[typography.bodyBold as any, { color: c.ink, flex: 1 }]}>{a.titre}</Text>
                    <Badge label={a.gravite === 'CRITIQUE' ? 'Critique' : 'Alerte'} tone={a.gravite === 'CRITIQUE' ? 'danger' : 'warning'} />
                  </View>
                  {!!a.description && <Text style={[typography.body as any, { color: c.slate, marginTop: spacing.xs }]}>{a.description}</Text>}
                  {a.reference_reclamation ? (
                    <Text style={[typography.caption as any, { marginTop: spacing.sm, color: c.success }]}>
                      Signalée · référence {a.reference_reclamation}
                    </Text>
                  ) : (
                    <View style={{ marginTop: spacing.md }}>
                      <Button
                        label="Signaler cette anomalie"
                        icon="megaphone-outline"
                        variant="secondary"
                        onPress={() => signaler(a.id_anomalie)}
                      />
                    </View>
                  )}
                </Card>
              ))
            )}
            {!!signalement && <InfoBanner icon="information-circle" text={signalement} />}

            <View style={{ marginTop: spacing.lg }}>
              <Button label="En discuter avec Cortex" icon="chatbubble-ellipses-outline" onPress={discuter} />
            </View>
          </>
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: spacing.lg },
    card: { marginTop: spacing.md },
    liveCard: { marginTop: spacing.md },
    incidentCard: { marginTop: spacing.md, borderWidth: 1, borderColor: c.warning, backgroundColor: c.warningSoft },
    incidentTitre: { ...(typography.bodyBold as any), color: c.ink, marginLeft: spacing.sm },
    liveRow: { flexDirection: 'row', alignItems: 'center' },
    liveDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
    liveText: { ...(typography.bodyBold as any), color: c.ink, flex: 1 },
    sectionTitle: { ...(typography.h3 as any), color: c.ink, marginTop: spacing.xl },
    mesureRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
    mesureSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    mesureLabel: { ...(typography.body as any), color: c.slate },
    mesureValeur: { ...(typography.bodyBold as any), color: c.ink },
    radius: { borderRadius: radius.md },
  });
}
