import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** Action destructive : bouton de confirmation rouge + icône d'alerte. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Boîte de confirmation cross-platform (web + natif). Remplace Alert.alert à
// boutons, qui n'est pas fiable sur navigateur.
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  loading = false,
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c, danger), [c, danger]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={danger ? 'warning-outline' : 'help-circle-outline'}
              size={28}
              color={danger ? c.danger : c.primary}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} loading={loading} onPress={onConfirm} />
          <View style={{ marginTop: spacing.sm }}>
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ColorTokens, danger: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
    },
    iconWrap: {
      alignSelf: 'center',
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: danger ? c.dangerSoft : c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: { ...(typography.h3 as any), color: c.ink, textAlign: 'center', marginBottom: spacing.xs },
    message: { ...(typography.body as any), color: c.slate, textAlign: 'center', marginBottom: spacing.lg },
  });
}
