import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/ConfirmModal';
import { DetailsIntervention } from '@/components/DetailsIntervention';
import { StatusTimeline } from '@/components/StatusTimeline';
import { TechnicienTrackingCard } from '@/components/TechnicienTrackingCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { useAppelerTechnicien } from '@/hooks/useAppelerTechnicien';
import { dossierModifiable, LIBELLE_STATUT_TERRAIN } from '@/services/demandes';
import { useAppStore } from '@/store/useAppStore';
import { useColors } from '@/store/useSettingsStore';

export default function DossierDetailScreen() {
  const params = useLocalSearchParams<{ id: string; modifier?: string }>();
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const dossier = useAppStore((s) => s.dossiers.find((d) => d.id === params.id));
  const modifierDossier = useAppStore((s) => s.modifierDossier);
  const annulerDossier = useAppStore((s) => s.annulerDossier);
  const appeler = useAppelerTechnicien();

  const [edition, setEdition] = useState(params.modifier === '1');
  const [adresse, setAdresse] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [confirmerSuppr, setConfirmerSuppr] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (dossier) setAdresse(dossier.adresse.rue || '');
  }, [dossier?.id]);

  if (!dossier) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Demande" />
        <View style={styles.empty}>
          <Text style={[typography.body as any, { color: c.ink }]}>Demande introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const modifiable = dossierModifiable(dossier);
  const enCoursDossier = dossier.statutGlobal === 'en_cours' && !dossier.annule;
  const badge = dossier.annule
    ? { label: 'Annulée', tone: 'neutral' as const }
    : dossier.statutGlobal === 'termine'
      ? { label: 'Terminé', tone: 'success' as const }
      : { label: 'En cours', tone: 'info' as const };

  async function enregistrer() {
    if (!dossier) return;
    const adresseChangee = adresse.trim() && adresse.trim() !== (dossier.adresse.rue || '');
    if (!adresseChangee) {
      setMessage({ texte: "Vous n'avez rien modifié.", ok: false });
      return;
    }
    setEnCours(true);
    const erreur = await modifierDossier(dossier.id, {
      adresse: adresseChangee ? adresse.trim() : undefined,
    });
    setEnCours(false);
    if (erreur) {
      setMessage({ texte: erreur, ok: false });
      return;
    }
    setMessage({ texte: 'Votre demande a été modifiée.', ok: true });
    setEdition(false);
  }

  async function supprimer() {
    if (!dossier) return;
    setEnCours(true);
    const erreur = await annulerDossier(dossier.id);
    setEnCours(false);
    setConfirmerSuppr(false);
    if (erreur) {
      setMessage({ texte: erreur, ok: false });
      return;
    }
    router.replace('/mes-demandes');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={dossier.numero} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {message ? (
          <View style={{ marginBottom: spacing.lg }}>
            <InfoBanner icon={message.ok ? 'checkmark-circle' : 'alert-circle'} text={message.texte} />
          </View>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.labelSmall}>ADRESSE</Text>
              <Text style={[typography.bodyBold as any, { color: c.ink }]}>
                {[dossier.adresse.rue, dossier.adresse.ville].filter(Boolean).join(', ') || 'Non renseignée'}
              </Text>
            </View>
            <Badge label={badge.label} tone={badge.tone} />
          </View>
          {dossier.offre && (
            <Text style={[typography.caption as any, { marginTop: spacing.sm, color: c.muted }]}>
              {dossier.offre.nom} · {dossier.offre.prixFCFA.toLocaleString('fr-FR')} FCFA / mois
            </Text>
          )}
          {dossier.dateActivation && (
            <Text style={[typography.caption as any, { marginTop: 2, color: c.muted }]}>Clôturé le {dossier.dateActivation}</Text>
          )}
        </Card>

        {dossier.technicien && enCoursDossier && (
          <Card style={styles.card}>
            <TechnicienTrackingCard
              technicien={dossier.technicien}
              etaMinutes={0}
              arrive={false}
              titre={(dossier.statutTerrain && LIBELLE_STATUT_TERRAIN[dossier.statutTerrain]) || 'Technicien affecté'}
              sousTitre={dossier.planification ? `Intervention prévue à ${dossier.planification.heureArrivee}` : undefined}
              onAppeler={() => appeler(dossier.technicien)}
              onDiscussion={() => router.push(`/chat/${dossier.technicien!.id}`)}
              onDetails={() => router.push(`/technicien/${dossier.technicien!.id}`)}
            />
          </Card>
        )}

        <DetailsIntervention dossier={dossier} titre="Détails de la demande" />

        {enCoursDossier && (
          <>
            <Text style={styles.sectionTitle}>Gérer ma demande</Text>
            {!modifiable.ok && (
              <View style={{ marginBottom: spacing.md }}>
                <InfoBanner icon="lock-closed" text={modifiable.raison ?? 'Cette demande ne peut plus être modifiée.'} />
              </View>
            )}

            {edition && modifiable.ok ? (
              <Card style={styles.card}>
                <TextField label="Adresse d'intervention" value={adresse} onChangeText={setAdresse} maxLength={255} />
                <Text style={[typography.caption as any, { color: c.muted }]}>
                  Le jour et l'heure de l'intervention sont fixés par Orange : vous les recevez dans l'application.
                </Text>
                <View style={{ marginTop: spacing.md }}>
                  <Button label="Enregistrer les modifications" icon="checkmark" loading={enCours} onPress={enregistrer} />
                </View>
                <View style={{ marginTop: spacing.sm }}>
                  <Button label="Annuler" variant="ghost" onPress={() => { setEdition(false); setMessage(null); }} />
                </View>
              </Card>
            ) : (
              <View style={styles.actionsRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Modifier"
                    icon="create-outline"
                    variant="secondary"
                    disabled={!modifiable.ok}
                    onPress={() => { setMessage(null); setEdition(true); }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Supprimer" icon="trash-outline" variant="ghost" disabled={!modifiable.ok} onPress={() => setConfirmerSuppr(true)} />
                </View>
              </View>
            )}

            <View style={{ marginTop: spacing.sm }}>
              <Button label="Suivre ma demande" icon="navigate-outline" onPress={() => router.push('/(tabs)/suivi')} />
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Historique</Text>
        <Card>
          <StatusTimeline etapes={dossier.etapes} />
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <ConfirmModal
        visible={confirmerSuppr}
        danger
        loading={enCours}
        title="Supprimer cette demande ?"
        message={`La demande ${dossier.numero} sera annulée et retirée de vos demandes en cours. Orange en conserve la trace dans votre historique.`}
        confirmLabel="Supprimer"
        onConfirm={supprimer}
        onCancel={() => setConfirmerSuppr(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: spacing.lg },
    card: { marginBottom: spacing.lg },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    labelSmall: { fontSize: 11, fontWeight: '700', color: c.muted, letterSpacing: 0.5, marginBottom: 6 },
    sectionTitle: { ...(typography.h3 as any), color: c.ink, marginTop: spacing.xl, marginBottom: spacing.md },
    actionsRow: { flexDirection: 'row', gap: spacing.sm },
  });
}
