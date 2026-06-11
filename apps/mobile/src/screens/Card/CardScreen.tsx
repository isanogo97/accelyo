/**
 * Ecran "Ma carte" (accueil).
 * ----------------------------------------------------------------
 * Affiche la carte etudiante aux couleurs de l'etablissement
 * (brandColor) avec nom, numero et statut. Bouton "Ajouter a Google
 * Wallet" qui recupere une saveUrl puis l'ouvre via Linking. Bouton
 * Apple Wallet en placeholder desactive (a venir).
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { fetchGoogleWalletUrl, errorMessage, type MeResponse } from '../../services/studentApi';
import { useTheme } from '../../theme/ThemeContext';
import { palette } from '../../theme/theme';

function statusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'PENDING':
      return 'En attente';
    case 'EXPIRED':
      return 'Expiree';
    case 'REVOKED':
      return 'Revoquee';
    default:
      return status;
  }
}

export function CardScreen({ me }: { me: MeResponse }) {
  const theme = useTheme();
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { student, card, establishment } = me;
  const fullName = `${student.firstName} ${student.lastName}`;
  const initials = `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();

  const onGoogleWallet = async () => {
    setError(null);
    setWalletLoading(true);
    try {
      const url = await fetchGoogleWalletUrl();
      await Linking.openURL(url);
    } catch (e) {
      setError(errorMessage(e, "Impossible d'ouvrir Google Wallet."));
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.idcard, { backgroundColor: theme.brand }]}>
        <View style={styles.idTop}>
          <Text style={[styles.estab, { color: theme.onBrand }]} numberOfLines={1}>
            {establishment.name}
          </Text>
          {card ? (
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Text style={[styles.badgeText, { color: theme.onBrand }]}>
                {statusLabel(card.status)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.who}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={[styles.avatarText, { color: theme.onBrand }]}>{initials}</Text>
          </View>
          <View style={styles.whoText}>
            <Text style={[styles.name, { color: theme.onBrand }]}>{fullName}</Text>
            <Text style={[styles.role, { color: theme.onBrand }]}>{student.program}</Text>
          </View>
        </View>

        <View>
          <Text style={[styles.metaLabel, { color: theme.onBrand }]}>Numero etudiant</Text>
          <Text style={[styles.cardNumber, { color: theme.onBrand }]}>
            {student.studentNumber}
          </Text>
          {card ? (
            <Text style={[styles.expiry, { color: theme.onBrand }]}>
              Expire le {new Date(card.expiresAt).toLocaleDateString('fr-FR')}
            </Text>
          ) : (
            <Text style={[styles.expiry, { color: theme.onBrand }]}>
              Carte non encore emise
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.addLabel}>Ajouter au telephone</Text>

      <View style={styles.walletRow}>
        <TouchableOpacity style={[styles.walletBtn, styles.appleBtn]} disabled>
          <Text style={styles.appleText}>Apple Wallet</Text>
          <Text style={styles.soon}>Bientot</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.walletBtn, styles.googleBtn]}
          onPress={onGoogleWallet}
          disabled={walletLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.googleText}>
            {walletLoading ? 'Ouverture...' : 'Google Wallet'}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.hint}>
        Presente ton telephone sur les lecteurs sans contact, comme une carte bancaire.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  idcard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  idTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  estab: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    opacity: 0.9,
  },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  who: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 13 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700' },
  whoText: { flex: 1 },
  name: { fontSize: 19, fontWeight: '800' },
  role: { fontSize: 12.5, opacity: 0.9, marginTop: 2 },
  metaLabel: { fontSize: 11, opacity: 0.8 },
  cardNumber: { fontFamily: 'monospace', fontSize: 14, letterSpacing: 1, marginTop: 2 },
  expiry: { fontSize: 12, opacity: 0.85, marginTop: 6 },
  addLabel: { fontSize: 13, fontWeight: '700', color: palette.text, marginBottom: 9 },
  walletRow: { flexDirection: 'row', gap: 10 },
  walletBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleBtn: { backgroundColor: '#000', opacity: 0.45 },
  appleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  soon: { color: '#fff', fontSize: 9, marginTop: 2, opacity: 0.8 },
  googleBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DADCE0' },
  googleText: { color: '#1F2937', fontWeight: '700', fontSize: 13 },
  error: { color: palette.danger, fontSize: 13, marginTop: 10 },
  hint: { fontSize: 11.5, color: palette.textFaint, marginTop: 12 },
});
