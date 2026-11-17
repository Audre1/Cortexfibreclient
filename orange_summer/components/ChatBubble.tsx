import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CortexRobotIcon } from '@/components/CortexRobotIcon';
import { Avatar } from '@/components/ui/Avatar';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { Message } from '@/data/types';
import { useColors } from '@/store/useSettingsStore';

interface ChatBubbleProps {
  message: Message;
  avatarInitiales: string;
  avatarColor?: string;
}

export function ChatBubble({ message, avatarInitiales, avatarColor }: ChatBubbleProps) {
  const isClient = message.auteur === 'client';
  const isCortex = message.auteur === 'cortex';
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[styles.row, isClient && styles.rowReverse]}>
      {!isClient && isCortex && <CortexRobotIcon size={30} />}
      {!isClient && !isCortex && (
        <Avatar initiales={avatarInitiales} size={30} background={avatarColor ?? c.primary} />
      )}
      <View style={[styles.bubble, isClient ? styles.bubbleClient : styles.bubbleAutre]}>
        <Text style={[typography.body as any, { color: isClient ? c.white : c.ink }]}>{message.texte}</Text>
        <Text style={[styles.heure, isClient && styles.heureClient]}>{message.heure}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: spacing.md,
      maxWidth: '88%',
      alignSelf: 'flex-start',
    },
    rowReverse: { flexDirection: 'row-reverse', alignSelf: 'flex-end' },
    bubble: {
      flexShrink: 1,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      marginHorizontal: spacing.sm,
    },
    bubbleAutre: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderBottomLeftRadius: 4,
    },
    bubbleClient: {
      backgroundColor: c.primary,
      borderBottomRightRadius: 4,
    },
    heure: { fontSize: 11, color: c.muted, marginTop: 4, textAlign: 'right' },
    heureClient: { color: 'rgba(255,255,255,0.75)' },
  });
}
