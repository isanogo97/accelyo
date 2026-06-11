/**
 * Toggle (interrupteur) controle, aux couleurs de la marque.
 */
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function Toggle({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        { backgroundColor: value ? theme.brand : '#CBD5E1' },
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: { width: 46, height: 26, borderRadius: 20, padding: 3, justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  thumbOn: { alignSelf: 'flex-end' },
  thumbOff: { alignSelf: 'flex-start' },
});
