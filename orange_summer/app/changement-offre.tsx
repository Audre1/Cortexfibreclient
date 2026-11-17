import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfferCard } from '@/components/OfferCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ColorTokens, spacing, typography } from '@/constants/theme';
import { ApiError } from '@/services/apiClient';
import { changementOffreApi } from '@/services/backendService';
import { chargerEspaceReel } from '@/services/modeReel';
import { useEspaceReelStore } from '@/store/useEspaceReelStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors } from '@/store/useSettingsStore';

export default function ChangementOffreScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const modeReel = useSessionStore((s) => s.mode === 'reel');
  const idClient = useSessionStore((s) => s.idClient);
  const ligne = useEspaceReelStore((s) => s.ligneActive);
  const offres = useEspaceReelStore((s) => s.offres);

  const [choix, setChoix] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [numeroDossier, setNumeroDossier] = useState('');

  const disponibles = offres.filter((o) => ligne?.idOffre === null || String(ligne?.idOffre) !== o.id);

  async function confirmer() {
    if (!idClient || !ligne || !choix) return;
    setEnvoi(true);
    setErreur('');
    try {
      const { changement } = await changementOffreApi.creer({ id_client: idClient, id_ligne: ligne.idLigne, nouvelle_offre: Number(choix) });
      setNumeroDossier(changement.numero_dossier);
      chargerEspaceReel().catch(() => {});
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : "La demande n'a pas pu être enregistrée.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!modeReel) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Changer d'offre" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <InfoBanner tone="warning" icon="flask-outline" text="Le changement d'offre n'est disponible qu'avec un compte connecté (code de box et téléphone), pas en mode démonstration." />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Changer d'offre" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.label}>OFFRE ACTUELLE</Text>
          <Text style={[typography.h3 as any, { color: c.ink }]}>{ligne?.offre?.nom ?? 'Aucune offre'}</Text>
          {!!ligne?.offre && (
            <Text style={typography.caption as any}>
              {ligne.offre.debit} · {ligne.offre.prixFCFA.toLocaleString('fr-FR')} FCFA/mois
            </Text>
          )}
        </Card>

        {!ligne ? (
          <View style={{ marginTop: spacing.lg }}>
            <InfoBanner tone="warning" icon="alert-circle" text="Aucune ligne Fibre n'est associée à votre compte." />
          </View>
        ) : numeroDossier ? (
          <>
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={[typography.h3 as any, { color: c.ink }]}>Demande enregistrée</Text>
              <Text style={[typography.body as any, { color: c.slate, marginTop: spacing.sm }]}>
                Votre demande de changement d'offre est enregistrée sous le dossier {numeroDossier}. Orange l'étudie : votre offre actuelle reste
                inchangée tant que la demande n'est pas validée.
              </Text>
            </Card>
            <View style={{ marginTop: spacing.lg }}>
              <Button label="Terminer" onPress={() => router.back()} />
            </View>
          </>
        ) : (
          <>
            <Text style={[typography.h3 as any, styles.section]}>Choisir une nouvelle offre</Text>
            {disponibles.length === 0 && <InfoBanner icon="information-circle" text="Aucune autre offre n'est disponible pour le moment." />}
            <View style={styles.liste}>
              {disponibles.map((o) => (
                // OfferCard est conçue pour une rangée (flex: 1) : on l'y place pour qu'elle garde sa hauteur naturelle.
                <View key={o.id} style={{ flexDirection: 'row' }}>
                  <OfferCard offre={o} selected={choix === o.id} onPress={() => setChoix(o.id)} />
                </View>
              ))}
            </View>
            {!!erreur && (
              <View style={{ marginTop: spacing.md }}>
                <InfoBanner tone="warning" icon="alert-circle" text={erreur} />
              </View>
            )}
            <View style={{ marginTop: spacing.lg }}>
              <Button label="Demander ce changement" icon="swap-horizontal" disabled={!choix} loading={envoi} onPress={confirmer} />
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
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: c.muted, marginBottom: spacing.xs },
    section: { color: c.ink, marginTop: spacing.xl, marginBottom: spacing.md },
    liste: { gap: spacing.md },
  });
}
