import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  multiline?: boolean;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  icon,
  error,
  autoCapitalize = 'sentences',
  maxLength,
  multiline = false,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          !!error && styles.inputRowError,
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={c.muted} style={styles.icon} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top' }]}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md },
    label: { ...(typography.bodyBold as any), color: colors.ink, marginBottom: spacing.xs + 2 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
    inputRowFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
    inputRowError: { borderColor: colors.danger },
    icon: { marginRight: spacing.sm },
    input: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.ink,
    },
    error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs, fontWeight: '500' },
  });
}
