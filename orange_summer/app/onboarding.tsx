import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { useColors, useSettingsStore } from '@/store/useSettingsStore';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  titre: string;
  texte: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'wifi',
    titre: 'Bienvenue sur CORTEX FIBER',
    texte: 'Gérez votre fibre Orange, votre box, votre connexion et vos services, au même endroit, simplement.',
  },
  {
    icon: 'navigate',
    titre: 'Suivez votre technicien',
    texte: "Visualisez l'arrivée de votre technicien en temps réel sur la carte et soyez notifié dès qu'il arrive.",
  },
  {
    icon: 'chatbubble-ellipses',
    titre: 'Assistance Cortex',
    texte: 'Signalez un problème en quelques secondes ou discutez avec l’assistant Cortex à tout moment.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const marquerOnboardingVu = useSettingsStore((s) => s.marquerOnboardingVu);
  const [index, setIndex] = useState(0);

  const dernier = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function terminer() {
    marquerOnboardingVu();
    router.replace('/connexion');
  }

  function suivant() {
    if (dernier) terminer();
    else setIndex((i) => i + 1);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Visuel du projet en fond de page */}
      <View style={styles.fond} pointerEvents="none">
        <Image source={require('../assets/images/connexion.jpg')} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Cortex Fiber" />
      </View>
      <View style={styles.header}>
        <Pressable onPress={terminer} hitSlop={10}>
          <Text style={styles.passer}>Passer</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.titre}>{slide.titre}</Text>
        <Text style={styles.texte}>{slide.texte}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={dernier ? 'Commencer' : 'Suivant'}
          icon="arrow-forward"
          iconPosition="right"
          onPress={suivant}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    // Le visuel a un fond blanc cassé : les textes restent sombres quel que soit le thème de l'application.
    safe: { flex: 1, backgroundColor: '#FAFAFA' },
    fond: { position: 'absolute', top: 0, left: 0, right: 0, width: '100%', aspectRatio: 1122 / 1402 },
    header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    passer: { fontSize: 14, fontWeight: '700', color: '#6B6B6B' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
    titre: { ...(typography.h1 as any), color: '#111111', textAlign: 'center' },
    texte: { ...(typography.body as any), color: '#444444', textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
    footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.lg },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D6D6D6' },
    dotActive: { width: 22, backgroundColor: c.primary },
  });
}
