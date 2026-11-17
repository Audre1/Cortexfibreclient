import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/ChatBubble';
import { CortexRobotIcon } from '@/components/CortexRobotIcon';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { suggestionsCortex } from '@/data/mockData';
import { Message } from '@/data/types';
import { useAppStore } from '@/store/useAppStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors } from '@/store/useSettingsStore';

// Questions proposées en mode réel : l'assistant y répond avec les données réelles du client connecté.
const SUGGESTIONS_REEL = [
  "Quel est l'état de ma Fiberbox ?",
  'Y a-t-il une panne dans mon quartier ?',
  'Un technicien a-t-il été envoyé ?',
  'Quand ma connexion sera-t-elle rétablie ?',
  'Comment redémarrer ma Fiberbox ?',
];

export default function CortexScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const messages = useAppStore((s) => s.messagesCortex);
  const modeReel = useSessionStore((s) => s.mode === 'reel');
  const envoyerMessageCortex = useAppStore((s) => s.envoyerMessageCortex);
  const [texte, setTexte] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  function envoyer(contenu?: string) {
    const valeur = (contenu ?? texte).trim();
    if (!valeur) return;
    envoyerMessageCortex(valeur);
    setTexte('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/accueil'))}
          hitSlop={10}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={c.ink} />
        </Pressable>
        <View style={styles.cortexIcon}>
          <CortexRobotIcon size={36} />
        </View>
        <View>
          <Text style={[typography.h3 as any, { color: c.ink }]}>Assistant Cortex</Text>
          <Text style={[typography.caption as any, { color: c.muted }]}>Toujours là pour vous aider</Text>
        </View>
      </View>

      {!modeReel && (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <InfoBanner
            tone="warning"
            icon="flask-outline"
            text="Mode démonstration : les réponses sont des exemples et ne reflètent pas l'état réel de votre Fiberbox. Connectez-vous avec votre code de box et votre téléphone pour interroger vos vraies données."
          />
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          style={styles.liste}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ChatBubble message={item} avatarInitiales="C" avatarColor={c.primary} />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestions}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        >
          {(modeReel ? SUGGESTIONS_REEL : suggestionsCortex).map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => envoyer(s)}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={texte}
            onChangeText={setTexte}
            placeholder="Écrivez votre question..."
            placeholderTextColor={c.muted}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={() => envoyer()}
            disabled={!texte.trim()}
            style={[styles.sendButton, !texte.trim() && styles.sendButtonDisabled]}
          >
            <Ionicons name="arrow-up" size={20} color={c.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1, minHeight: 0 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
      marginRight: spacing.sm,
    },
    cortexIcon: {
      marginRight: spacing.sm + 2,
    },
    list: { padding: spacing.lg },
    // La liste prend l'espace restant (et défile) ; les suggestions gardent toujours leur hauteur.
    liste: { flex: 1, minHeight: 0 },
    suggestions: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.sm },
    chip: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginRight: spacing.sm,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: c.primaryDark },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      maxHeight: 100,
      backgroundColor: c.background,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: 15,
      color: c.ink,
      marginRight: spacing.sm,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.4 },
  });
}
