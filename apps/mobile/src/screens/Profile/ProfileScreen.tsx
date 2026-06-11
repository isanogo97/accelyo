/**
 * Onglet "Profil".
 * ----------------------------------------------------------------
 * Infos etudiant + etablissement, toggle de consentement marketing
 * (RGPD, appelle /me/consent) et bouton de deconnexion (efface le
 * token securise et reinitialise la session).
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenTitle, Card } from '../../components/ui';
import { Toggle } from '../../components/Toggle';
import { palette } from '../../theme/theme';
import type { MeResponse } from '../../services/studentApi';

export function ProfileScreen({
  me,
  consent,
  onToggleConsent,
  consentBusy,
  onLogout,
}: {
  me: MeResponse;
  consent: boolean;
  onToggleConsent: (next: boolean) => void;
  consentBusy?: boolean;
  onLogout: () => void;
}) {
  const { student, establishment } = me;
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <View>
      <ScreenTitle title="Profil" subtitle={fullName} />

      <Card>
        <Text style={styles.label}>Etablissement</Text>
        <Text style={styles.value}>{establishment.name}</Text>
      </Card>

      <Card>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{student.email}</Text>
      </Card>

      <Card>
        <Text style={styles.label}>Numero etudiant</Text>
        <Text style={styles.value}>{student.studentNumber}</Text>
      </Card>

      <Card>
        <Text style={styles.label}>Annee d'inscription</Text>
        <Text style={styles.value}>{student.enrollmentYear}</Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.value}>Recevoir les bons plans</Text>
            <Text style={styles.subtle}>Consentement marketing (RGPD)</Text>
          </View>
          <Toggle value={consent} onValueChange={onToggleConsent} disabled={consentBusy} />
        </View>
      </Card>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Se deconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12.5, color: palette.textMuted },
  value: { fontSize: 14.5, fontWeight: '700', color: palette.text, marginTop: 2 },
  subtle: { fontSize: 12.5, color: palette.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  logoutBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: palette.danger, fontWeight: '700', fontSize: 14 },
});
