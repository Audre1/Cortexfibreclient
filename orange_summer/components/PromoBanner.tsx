import React, { useEffect, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';

export interface PromoSlide {
  id: string;
  /** Début du titre (couleur de texte du fond) ; `accent` est affiché en orange. */
  titre: string;
  accent: string;
  sous: string;
  cta: string;
  fond: string;
  texte: string;
  couleurAccent: string;
  onPress: () => void;
}

interface Props {
  slides: PromoSlide[];
  intervalMs?: number;
}

const HAUTEUR = 168;

// Bannière à défilement automatique, avec pastilles de pagination en bas à gauche.
export function PromoBanner({ slides, intervalMs = 5000 }: Props) {
  const [largeur, setLargeur] = useState(0);
  const [index, setIndex] = useState(0);
  const liste = useRef<FlatList<PromoSlide>>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (largeur === 0 || slides.length < 2) return;
    const minuteur = setInterval(() => {
      const suivant = (indexRef.current + 1) % slides.length;
      liste.current?.scrollToOffset({ offset: suivant * largeur, animated: true });
      indexRef.current = suivant;
      setIndex(suivant);
    }, intervalMs);
    return () => clearInterval(minuteur);
  }, [largeur, slides.length, intervalMs]);

  function surFin(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (largeur === 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / largeur);
    indexRef.current = i;
    setIndex(i);
  }

  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}>
      {largeur > 0 && (
        <FlatList
          ref={liste}
          data={slides}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={surFin}
          getItemLayout={(_, i) => ({ length: largeur, offset: largeur * i, index: i })}
          renderItem={({ item }) => (
            <Pressable onPress={item.onPress} style={[styles.slide, { width: largeur, backgroundColor: item.fond }]}>
              <Text style={[styles.titre, { color: item.texte }]}>
                {item.titre}
                <Text style={{ color: item.couleurAccent }}>{item.accent}</Text>
              </Text>
              <Text style={[styles.sous, { color: item.texte }]}>{item.sous}</Text>
              <View style={[styles.cta, { backgroundColor: item.couleurAccent }]}>
                <Text style={styles.ctaTexte}>{item.cta}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
      <View style={styles.points} pointerEvents="none">
        {slides.map((s, i) => (
          <View key={s.id} style={[styles.point, i === index && { backgroundColor: slides[index].couleurAccent }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HAUTEUR, borderRadius: radius.xl, overflow: 'hidden' },
  slide: { height: HAUTEUR, padding: spacing.lg, paddingBottom: spacing.xl + spacing.md, justifyContent: 'center' },
  titre: { fontSize: 25, fontWeight: '800', lineHeight: 30, maxWidth: '85%' },
  sous: { fontSize: 14.5, fontWeight: '600', marginTop: spacing.xs },
  cta: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.md,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  ctaTexte: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  points: { position: 'absolute', left: spacing.lg, bottom: spacing.md + 4, flexDirection: 'row', gap: 6 },
  point: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(128,128,128,0.55)' },
});
