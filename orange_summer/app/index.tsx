import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { ColorTokens, spacing } from '@/constants/theme';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors } from '@/store/useSettingsStore';

// Écran d'intro : « cortex » (le logo, en orange) apparaît, puis « FIBER » et
// le slogan, avant de laisser place à l'onboarding (ou à la connexion).
export default function IntroScreen() {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const nomOpacity = useRef(new Animated.Value(0)).current;
  const nomTranslate = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(nomOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(nomTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(1000),
    ]);
    anim.start(({ finished }) => {
      if (!finished) return;
      // Session réelle conservée sur l'appareil : on entre directement dans l'espace abonné.
      const sessionReelle = useSessionStore.getState().mode === 'reel';
      router.replace(sessionReelle ? '/(tabs)/accueil' : '/onboarding');
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Text style={styles.logo}>cortex</Text>
      </Animated.View>

      <Animated.View style={[styles.nameWrap, { opacity: nomOpacity, transform: [{ translateY: nomTranslate }] }]}>
        <Text style={styles.fiber}>F I B E R</Text>
        <Text style={styles.tagline}>La fibre nouvelle génération</Text>
      </Animated.View>
    </View>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  logo: { color: colors.primary, fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  nameWrap: { alignItems: 'center' },
  fiber: { color: colors.ink, fontSize: 20, fontWeight: '700', letterSpacing: 6 },
  tagline: { color: colors.slate, fontSize: 13.5, fontWeight: '600', marginTop: spacing.sm },
});
}