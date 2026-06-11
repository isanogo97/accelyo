/**
 * Onglet "Bons plans".
 * ----------------------------------------------------------------
 * Gate par marketingConsent: tant que le consentement n'est pas donne,
 * on affiche un toggle (qui appelle /me/consent) au lieu des offres.
 * Une fois consenti, on affiche une liste de deals en dur.
 */
import { View, Text, StyleSheet } from 'react-native';
import { ScreenTitle, Card } from '../../components/ui';
import { Toggle } from '../../components/Toggle';
import { palette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';

const DEALS = [
  { id: 'd1', partner: 'Spotify Premium', offer: '-50% pendant 3 mois', code: 'ETUD50' },
  { id: 'd2', partner: 'Cinema Pathe', offer: 'Place a 6,90 EUR', code: 'CAMPUS690' },
  { id: 'd3', partner: 'Fnac', offer: '-15% sur les fournitures', code: 'RENTREE15' },
];

export function DealsScreen({
  consent,
  onToggleConsent,
  consentBusy,
}: {
  consent: boolean;
  onToggleConsent: (next: boolean) => void;
  consentBusy?: boolean;
}) {
  const theme = useTheme();

  if (!consent) {
    return (
      <View>
        <ScreenTitle title="Bons plans" subtitle="Des offres pour les etudiants" />
        <View style={[styles.consent, { backgroundColor: theme.brandTint, borderColor: theme.brand }]}>
          <View style={styles.consentRow}>
            <View style={styles.consentText}>
              <Text style={styles.consentTitle}>Activer les bons plans</Text>
              <Text style={styles.consentSub}>
                Recevoir des offres partenaires. Facultatif, desactivable a tout moment (RGPD).
              </Text>
            </View>
            <Toggle value={consent} onValueChange={onToggleConsent} disabled={consentBusy} />
          </View>
        </View>
        <Text style={styles.empty}>
          Active les bons plans ci-dessus pour decouvrir les offres partenaires.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <ScreenTitle title="Bons plans" subtitle="Rien que pour toi" />
      {DEALS.map((deal) => (
        <Card key={deal.id}>
          <Text style={styles.dealPartner}>{deal.partner}</Text>
          <Text style={styles.dealOffer}>{deal.offer}</Text>
          <View style={styles.codeBox}>
            <Text style={[styles.code, { color: theme.brandDark }]}>{deal.code}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  consent: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consentText: { flex: 1 },
  consentTitle: { fontSize: 14.5, fontWeight: '700', color: palette.text },
  consentSub: { fontSize: 12.5, color: palette.textMuted, marginTop: 3 },
  empty: { textAlign: 'center', color: palette.textFaint, fontSize: 13, paddingVertical: 30 },
  dealPartner: { fontSize: 14.5, fontWeight: '700', color: palette.text },
  dealOffer: { fontSize: 12.5, color: palette.textMuted, marginTop: 2 },
  codeBox: {
    marginTop: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  code: { fontFamily: 'monospace', fontWeight: '700', letterSpacing: 1, fontSize: 14 },
});
