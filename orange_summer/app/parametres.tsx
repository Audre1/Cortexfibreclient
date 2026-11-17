import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ColorTokens, spacing } from '@/constants/theme';
import { LANGUES } from '@/constants/i18n';
import { ThemeMode, useColors, useSettingsStore, useT } from '@/store/useSettingsStore';

export default function ParametresScreen() {
  const c = useColors();
  const t = useT();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const langue = useSettingsStore((s) => s.langue);
  const setLangue = useSettingsStore((s) => s.setLangue);

  const themes: { mode: ThemeMode; label: string }[] = [
    { mode: 'light', label: t('param.clair') },
    { mode: 'dark', label: t('param.sombre') },
    { mode: 'system', label: t('param.systeme') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('param.title')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Thème */}
        <Text style={styles.sectionTitle}>{t('param.themeSection')}</Text>
        <View style={styles.group}>
          {themes.map((item, i) => {
            const actif = themeMode === item.mode;
            return (
              <View key={item.mode}>
                <Pressable style={styles.row} onPress={() => setThemeMode(item.mode)}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Ionicons
                    name={actif ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={actif ? c.primary : c.muted}
                  />
                </Pressable>
                {i < themes.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        {/* Langue */}
        <Text style={styles.sectionTitle}>{t('param.langueSection')}</Text>
        <View style={styles.group}>
          {LANGUES.map((item, i) => {
            const actif = langue === item.code;
            return (
              <View key={item.code}>
                <Pressable style={styles.row} onPress={() => setLangue(item.code)}>
                  <Text style={styles.label}>{item.nom}</Text>
                  <Ionicons
                    name={actif ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={actif ? c.primary : c.muted}
                  />
                </Pressable>
                {i < LANGUES.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingVertical: spacing.sm },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.primaryDark,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    group: { backgroundColor: c.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
    },
    label: { fontSize: 16, color: c.ink },
    divider: { height: 1, backgroundColor: c.border, marginLeft: spacing.lg },
  });
}
