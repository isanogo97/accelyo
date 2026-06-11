/**
 * Onglet "Mon campus" (secteur SCHOOL).
 * Placeholder: emploi du temps + infos en dur pour l'instant.
 */
import { View, Text, StyleSheet } from 'react-native';
import { ScreenTitle, SectionLabel, Card, Pill } from '../../components/ui';
import { palette } from '../../theme/theme';

const SCHEDULE = [
  { id: 's1', title: 'Algorithmique', sub: '08:30 - 10:30 - Amphi B', tone: 'brand' as const, badge: 'En cours' },
  { id: 's2', title: 'Base de donnees', sub: '11:00 - 13:00 - Salle 204', tone: null },
];

const INFOS = [
  { id: 'i1', title: 'Fermeture exceptionnelle', sub: 'La BU ferme a 18h vendredi', tone: null },
  { id: 'i2', title: 'Forum des metiers', sub: 'Jeudi 14h - Hall principal', tone: 'green' as const, badge: 'Nouveau' },
];

export function CampusScreen() {
  return (
    <View>
      <ScreenTitle title="Mon campus" subtitle="Aujourd'hui" />

      <SectionLabel>Emploi du temps</SectionLabel>
      {SCHEDULE.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
            {item.tone ? <Pill tone={item.tone}>{item.badge}</Pill> : null}
          </View>
        </Card>
      ))}

      <SectionLabel>Infos & activites</SectionLabel>
      {INFOS.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
            {item.tone ? <Pill tone={item.tone}>{item.badge}</Pill> : null}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowText: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '700', color: palette.text },
  sub: { fontSize: 12.5, color: palette.textMuted, marginTop: 2 },
});
