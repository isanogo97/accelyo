/**
 * Onglet "Profil".
 * ----------------------------------------------------------------
 * Infos etudiant + etablissement, toggle de consentement marketing
 * (RGPD, appelle /me/consent), liaison d'une carte etudiante PHYSIQUE
 * existante (lecture NFC de l'UID + association cote API) et bouton de
 * deconnexion (efface le token securise et reinitialise la session).
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { ScreenTitle, Card, Pill } from '../../components/ui';
import { Toggle } from '../../components/Toggle';
import { palette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import { useSessionStore } from '../../store/sessionStore';
import {
  linkPhysicalCard,
  errorMessage,
  type MeResponse,
} from '../../services/studentApi';
import {
  readCardUid,
  NfcCancelledError,
} from '../../services/nfcReaderService';

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
  const theme = useTheme();
  const setMe = useSessionStore((s) => s.setMe);
  const { student, establishment } = me;
  const fullName = `${student.firstName} ${student.lastName}`;

  const linkedUid = student.physicalCardUid ?? null;
  const [linking, setLinking] = useState(false);

  const onLinkCard = async () => {
    if (linking) return;
    setLinking(true);
    try {
      // 1) Lecture NFC ponctuelle (mode lecteur). L'UI affiche "Approche ta carte...".
      const uid = await readCardUid();
      // 2) Association cote API (Bearer etudiant gere par studentApi).
      const { physicalCardUid } = await linkPhysicalCard(uid);
      // 3) Mise a jour du cache local /me pour refleter la carte liee.
      setMe({
        ...me,
        student: { ...me.student, physicalCardUid },
      });
      Alert.alert('Carte liee', `Carte liee : ${physicalCardUid}`);
    } catch (e) {
      if (e instanceof NfcCancelledError) {
        return; // annulation utilisateur: pas d'alerte d'erreur.
      }
      Alert.alert(
        'Liaison impossible',
        errorMessage(e, "Impossible de lier la carte. Reessaie."),
      );
    } finally {
      setLinking(false);
    }
  };

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
        <View style={styles.cardHeader}>
          <Text style={styles.value}>Lier ma carte etudiante actuelle</Text>
          {linkedUid ? <Pill tone="green">Liee</Pill> : null}
        </View>
        <Text style={styles.subtle}>
          Approche ta carte etudiante physique du dos du telephone.
        </Text>

        {linkedUid ? (
          <Text style={styles.linkedUid}>Carte liee : {linkedUid}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.linkBtn,
            { borderColor: theme.brand },
            linking && styles.linkBtnDisabled,
          ]}
          onPress={() => void onLinkCard()}
          disabled={linking}
          activeOpacity={0.85}
        >
          <Text style={[styles.linkBtnText, { color: theme.brand }]}>
            {linking
              ? 'Approche ta carte...'
              : linkedUid
                ? 'Relier une autre carte'
                : 'Lier ma carte'}
          </Text>
        </TouchableOpacity>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkedUid: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.text,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  linkBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  linkBtnDisabled: { opacity: 0.6 },
  linkBtnText: { fontWeight: '700', fontSize: 14 },
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
