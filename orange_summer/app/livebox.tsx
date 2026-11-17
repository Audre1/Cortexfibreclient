import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { ageMesureMinutes, libelleAge, MESURE_FRAICHE_MIN } from '@/services/modeReel';
import { useAppStore } from '@/store/useAppStore';
import { useEspaceReelStore } from '@/store/useEspaceReelStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors } from '@/store/useSettingsStore';

type EtatTest = 'idle' | 'en_cours' | 'termine';

export default function LiveboxScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const livebox = useAppStore((s) => s.livebox);
  const wifi = useAppStore((s) => s.wifi);
  const modeReel = useSessionStore((s) => s.mode === 'reel');
  const mesure = useEspaceReelStore((s) => s.mesure);
  const ageMin = ageMesureMinutes(mesure);
  const mesureFraiche = ageMin !== null && ageMin <= MESURE_FRAICHE_MIN;

  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [etatTest, setEtatTest] = useState<EtatTest>('idle');
  const [valeurAffichee, setValeurAffichee] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Test de débit simulé : la jauge monte jusqu'à la dernière mesure connue.
  function lancerTest() {
    if (etatTest === 'en_cours') return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    setEtatTest('en_cours');
    setValeurAffichee(0);

    const cible = livebox.debit.descendant;
    const duree = 1800;
    const pas = 60;
    const debut = Date.now();

    intervalRef.current = setInterval(() => {
      const progression = Math.min((Date.now() - debut) / duree, 1);
      const base = cible * (1 - Math.pow(1 - progression, 2));
      const bruit = progression < 1 ? (Math.random() - 0.5) * cible * 0.08 : 0;
      setValeurAffichee(Math.max(0, base + bruit));

      if (progression >= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setValeurAffichee(cible);
        setEtatTest('termine');
      }
    }, pas);
  }

  const afficheDetail = etatTest === 'termine';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Ma Livebox" subtitle="Espace Abonné" showNotifications />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* En-tête équipement */}
        <Card style={styles.boxCard}>
          <View style={styles.boxHeaderRow}>
            <View style={styles.boxIconWrap}>
              <Ionicons name="wifi" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.boxModele}>{livebox.modele}</Text>
              <Text style={styles.boxSerie}>N° Série : {livebox.numeroSerie}</Text>
            </View>
          </View>
          <View style={styles.enLigneRow}>
            <View style={[styles.statutDot, { backgroundColor: modeReel && !mesureFraiche ? c.muted : livebox.enLigne ? c.success : c.danger }]} />
            <Text style={styles.enLigneText}>
              {modeReel && !mesureFraiche ? 'État actuel inconnu' : livebox.enLigne ? 'En ligne' : 'Hors ligne'}
            </Text>
          </View>
        </Card>

        {/* Mode réel : dernière mesure réellement remontée par la Fiberbox (aucune simulation) */}
        {modeReel && (
          <>
            <Text style={styles.sectionTitle}>Dernière mesure de ma Fiberbox</Text>
            <Card style={styles.card}>
              {mesure ? (
                <>
                  <Text style={[typography.caption as any, { color: mesureFraiche ? c.success : c.warning, marginBottom: spacing.sm }]}>
                    {mesureFraiche
                      ? `Mesure reçue ${libelleAge(ageMin)}`
                      : `Mesure ancienne (${libelleAge(ageMin)}) : elle ne reflète pas forcément l'état actuel de la box.`}
                  </Text>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="arrow-down" size={16} color={c.primary} />
                      <Text style={styles.detailValue}>{mesure.debitDescendantMbps !== null ? mesure.debitDescendantMbps.toFixed(1) : '—'}</Text>
                      <Text style={styles.detailLabel}>Descendant (Mb/s)</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="arrow-up" size={16} color={c.info} />
                      <Text style={styles.detailValue}>{mesure.debitMontantMbps !== null ? mesure.debitMontantMbps.toFixed(1) : '—'}</Text>
                      <Text style={styles.detailLabel}>Montant (Mb/s)</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="pulse" size={16} color={c.warning} />
                      <Text style={styles.detailValue}>{mesure.signalDbm !== null ? mesure.signalDbm : '—'}</Text>
                      <Text style={styles.detailLabel}>Signal (dBm)</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: spacing.md }}>
                    <Button label="Voir le constat détaillé" icon="analytics-outline" onPress={() => router.push('/constat')} />
                  </View>
                </>
              ) : (
                <Text style={typography.body as any}>
                  Aucune mesure n'a encore été reçue de votre Fiberbox : son état ne peut pas être confirmé pour le moment.
                </Text>
              )}
            </Card>
          </>
        )}

        {/* Mode démonstration : test de débit simulé (aucune mesure réelle) */}
        {!modeReel && (
          <>
        {/* Test de débit */}
        <Text style={styles.sectionTitle}>Test de Débit Fibre Live</Text>
        <Card style={styles.card}>
          <View style={styles.speedtestHead}>
            <Ionicons name="speedometer-outline" size={18} color={c.primary} />
            <Text style={[typography.bodyBold as any, { marginLeft: spacing.sm, color: c.ink }]}>Orange Speedtest</Text>
          </View>

          <View style={styles.gaugeWrap}>
            <Text style={styles.gaugeValue}>{valeurAffichee.toFixed(1)}</Text>
            <Text style={styles.gaugeUnit}>Mbps</Text>
          </View>

          {afficheDetail && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="arrow-down" size={16} color={c.primary} />
                <Text style={styles.detailValue}>{livebox.debit.descendant.toFixed(1)}</Text>
                <Text style={styles.detailLabel}>Descendant (Mb/s)</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="arrow-up" size={16} color={c.info} />
                <Text style={styles.detailValue}>{livebox.debit.envoi.toFixed(1)}</Text>
                <Text style={styles.detailLabel}>Envoi (Mb/s)</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="flash" size={16} color={c.warning} />
                <Text style={styles.detailValue}>{livebox.debit.latenceMs}</Text>
                <Text style={styles.detailLabel}>Ping (ms)</Text>
              </View>
            </View>
          )}

          <View style={{ marginTop: spacing.md }}>
            <Button
              label={etatTest === 'en_cours' ? 'Test en cours...' : etatTest === 'termine' ? 'Relancer le test' : 'Lancer le test'}
              icon="play"
              loading={etatTest === 'en_cours'}
              onPress={lancerTest}
            />
          </View>
        </Card>
          </>
        )}

        {/* Réseau Wi-Fi */}
        <Text style={styles.sectionTitle}>Votre Réseau Wi-Fi 6</Text>
        <Card style={styles.card}>
          <View style={styles.wifiRow}>
            <Text style={styles.wifiLabel}>Nom du réseau (SSID)</Text>
            <Text style={styles.wifiValue}>{wifi.nomReseau}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.wifiRow}>
            <Text style={styles.wifiLabel}>Mot de passe</Text>
            <View style={styles.wifiPwdRow}>
              <Text style={styles.wifiValue}>
                {motDePasseVisible ? wifi.motDePasse : '•'.repeat(wifi.motDePasse.length)}
              </Text>
              <Pressable onPress={() => setMotDePasseVisible((v) => !v)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
                <Ionicons name={motDePasseVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.slate} />
              </Pressable>
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button label="Gérer mon Wi-Fi" variant="ghost" icon="wifi" onPress={() => router.push('/gerer-wifi')} />
          </View>
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: spacing.lg },
    card: { marginBottom: spacing.lg },
    sectionTitle: { ...(typography.h3 as any), color: c.ink, marginBottom: spacing.md },

    boxCard: { backgroundColor: '#000000', borderColor: c.border, marginBottom: spacing.lg },
    boxHeaderRow: { flexDirection: 'row', alignItems: 'center' },
    boxIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxModele: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    boxSerie: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
    enLigneRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
    statutDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
    enLigneText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },

    etatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    etatIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    etatLibelle: { flex: 1, marginLeft: spacing.sm, fontSize: 14, fontWeight: '600', color: c.ink },
    etatValeur: { fontSize: 13, fontWeight: '700' },
    divider: { height: 1, backgroundColor: c.border, marginLeft: spacing.lg },

    speedtestHead: { flexDirection: 'row', alignItems: 'center' },
    gaugeWrap: { alignItems: 'center', paddingVertical: spacing.lg },
    gaugeValue: { fontSize: 48, fontWeight: '800', color: c.ink, letterSpacing: -1 },
    gaugeUnit: { fontSize: 14, fontWeight: '700', color: c.primaryDark, marginTop: -spacing.xs },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    detailItem: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: c.background,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      marginHorizontal: spacing.xs / 2,
    },
    detailValue: { fontSize: 18, fontWeight: '800', color: c.ink, marginTop: spacing.xs },
    detailLabel: { fontSize: 10.5, color: c.muted, marginTop: 2, fontWeight: '600', textAlign: 'center' },

    wifiRow: { paddingVertical: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    wifiLabel: { fontSize: 13, color: c.muted, fontWeight: '600' },
    wifiValue: { fontSize: 14, fontWeight: '700', color: c.ink },
    wifiPwdRow: { flexDirection: 'row', alignItems: 'center' },

    deplacerHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    deplacerText: { marginBottom: spacing.md, lineHeight: 18, color: c.muted },
  });
}
