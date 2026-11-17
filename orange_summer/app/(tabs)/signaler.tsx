import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AutoCarousel, Slide } from '@/components/AutoCarousel';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { ReclamationCategorie } from '@/data/types';
import { useColors, useT } from '@/store/useSettingsStore';

const SLIDES: Slide[] = [
  { id: 's1', plain: true, bg: '#FF7900', image: require('../../assets/images/cortex-logo.jpg') },
  { id: 's2', plain: true, bg: '#161719', image: require('../../assets/images/fibre-simple.jpg') },
];

type ProblemeId = Extract<
  ReclamationCategorie,
  'connexion_ne_fonctionne_pas' | 'installation_incomplete' | 'connexion_lente'
>;

export default function SignalerScreen() {
  const router = useRouter();
  const c = useColors();
  const t = useT();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  const problemes: { id: ProblemeId; titre: string; sous: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'connexion_ne_fonctionne_pas', titre: t('signaler.panneTitre'), sous: t('signaler.panneSous'), icon: 'cloud-offline-outline' },
    { id: 'installation_incomplete', titre: t('signaler.installTitre'), sous: t('signaler.installSous'), icon: 'construct-outline' },
    { id: 'connexion_lente', titre: t('signaler.lenteTitre'), sous: t('signaler.lenteSous'), icon: 'speedometer-outline' },
  ];

  function ouvrir(id: ProblemeId) {
    if (id === 'installation_incomplete') {
      router.push('/(tabs)/suivi');
      return;
    }
    router.push({ pathname: '/reclamation', params: { categorie: id } });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h1 as any, { color: c.ink }]}>{t('signaler.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AutoCarousel slides={SLIDES} />

        <View style={styles.body}>
          <Text style={[typography.h3 as any, { marginTop: spacing.lg, color: c.ink }]}>{t('signaler.sousTitre')}</Text>
          <Text style={[typography.caption as any, { marginTop: spacing.xs, marginBottom: spacing.lg, color: c.muted }]}>
            {t('signaler.choisir')}
          </Text>

          {problemes.map((p) => (
            <Pressable key={p.id} style={styles.card} onPress={() => ouvrir(p.id)}>
              <View style={styles.cardIcon}>
                <Ionicons name={p.icon} size={24} color={c.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyBold as any, { color: c.ink }]}>{p.titre}</Text>
                <Text style={[typography.caption as any, { color: c.muted }]}>{p.sous}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.muted} />
            </Pressable>
          ))}

          <Text style={[typography.bodyBold as any, styles.sectionSpacing]}>{t('signaler.discuter')}</Text>
          <Pressable style={styles.constatCard} onPress={() => router.push('/cortex')}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.constatTitre}>{t('signaler.discuter')}</Text>
              <Text style={styles.constatSub}>{t('signaler.discuterSous')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>

          <View style={{ height: spacing.xxl }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
    scroll: { paddingTop: spacing.xs },
    body: { paddingHorizontal: spacing.lg },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionSpacing: { marginTop: spacing.lg, marginBottom: spacing.sm, color: c.ink },
    constatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000000',
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    constatTitre: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
    constatSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  });
}
