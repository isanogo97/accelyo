/**
 * Petits composants UI reutilisables, themables via useTheme().
 */
import { type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { palette } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.primaryBtn,
        { backgroundColor: theme.brand },
        isDisabled && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={theme.onBrand} />
      ) : (
        <Text style={[styles.primaryBtnText, { color: theme.onBrand }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Field({
  label,
  ...inputProps
}: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={palette.textFaint}
        {...inputProps}
      />
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

type PillTone = 'brand' | 'green' | 'red';

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const theme = useTheme();
  const toneStyle =
    tone === 'green'
      ? { bg: palette.successBg, fg: palette.success }
      : tone === 'red'
        ? { bg: palette.dangerBg, fg: palette.danger }
        : { bg: theme.brandTint, fg: theme.brandDark };
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.pillText, { color: toneStyle.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleWrap: { marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: palette.text },
  subtitle: { fontSize: 13, color: palette.textMuted, marginTop: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  primaryBtn: {
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontWeight: '700', fontSize: 15 },
  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 5,
  },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: palette.text,
  },
  error: { color: palette.danger, fontSize: 13, marginBottom: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '700' },
});
