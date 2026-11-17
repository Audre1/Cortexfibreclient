import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors, useT } from '@/store/useSettingsStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const t = useT();

  // Disposition de la barre : l'onglet actif a une pastille arrondie derrière son icône (orange),
  // les autres icônes sont de la couleur du texte ; tous les libellés sont sous l'icône.
  const icone = (nom: React.ComponentProps<typeof Ionicons>['name']) =>
    ({ focused }: { focused: boolean }) => (
      <View style={[styles.pastille, focused && { backgroundColor: c.border }]}>
        <Ionicons name={nom} size={24} color={focused ? c.primary : c.ink} />
      </View>
    );
  const libelle = (titre: string) =>
    ({ focused }: { focused: boolean }) => (
      <Text style={[styles.libelle, { color: c.ink, fontWeight: focused ? '700' : '500' }]}>{titre}</Text>
    );

  return (
    <Tabs
      screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.ink,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarStyle: {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom + 6,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="accueil"
          options={{
            title: t('tabs.accueil'),
            tabBarIcon: icone('grid'),
            tabBarLabel: libelle(t('tabs.accueil')),
          }}
        />
        <Tabs.Screen
          name="suivi"
          options={{
            title: t('tabs.suivi'),
            tabBarIcon: icone('sync'),
            tabBarLabel: libelle(t('tabs.suivi')),
          }}
        />
        <Tabs.Screen
          name="signaler"
          options={{
            title: t('tabs.signaler'),
            tabBarIcon: icone('alert-circle'),
            tabBarLabel: libelle(t('tabs.signaler')),
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: t('tabs.profil'),
            tabBarIcon: icone('person'),
            tabBarLabel: libelle(t('tabs.profil')),
          }}
        />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pastille: { width: 64, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  libelle: { fontSize: 12, marginTop: 2 },
});
