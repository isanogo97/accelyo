/**
 * Onglet "Mes emprunts" (secteur LIBRARY).
 * Placeholder: liste d'emprunts en dur pour l'instant.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenTitle, Card, Pill } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { palette } from '../../theme/theme';

const LOANS = [
  {
    id: 'l1',
    title: 'Clean Code',
    author: 'R. C. Martin',
    tone: 'green' as const,
    badge: 'A rendre dans 9j',
    dates: 'Emprunte le 02/06 - Retour le 16/06',
  },
  {
    id: 'l2',
    title: 'Sapiens',
    author: 'Y. N. Harari',
    tone: 'red' as const,
    badge: 'En retard',
    dates: 'Emprunte le 12/05 - Retour le 09/06',
  },
];

export function LibraryScreen() {
  const theme = useTheme();
  return (
    <View>
      <ScreenTitle title="Mes emprunts" subtitle={`${LOANS.length} livres empruntes`} />
      {LOANS.map((loan) => (
        <Card key={loan.id}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.title}>{loan.title}</Text>
              <Text style={styles.sub}>{loan.author}</Text>
            </View>
            <Pill tone={loan.tone}>{loan.badge}</Pill>
          </View>
          <View style={styles.footer}>
            <Text style={styles.dates}>{loan.dates}</Text>
            <TouchableOpacity style={[styles.extendBtn, { borderColor: theme.brand }]}>
              <Text style={[styles.extendText, { color: theme.brand }]}>Prolonger</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
      <Text style={styles.hint}>
        Synchronise avec le systeme de pret de la mediatheque.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowText: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '700', color: palette.text },
  sub: { fontSize: 12.5, color: palette.textMuted, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
  },
  dates: { fontSize: 12, color: palette.textMuted, flex: 1 },
  extendBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
  extendText: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 11.5, color: palette.textFaint, marginTop: 4 },
});
