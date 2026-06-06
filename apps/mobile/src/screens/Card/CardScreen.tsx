/**
 * Ecran principal - carte etudiante affichee + bouton "Approcher du lecteur".
 */
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchAndStoreCard } from '../../services/cardService';
import { nfcService } from '../../services/nfcService';

interface CardData {
  card: {
    cardUid: string;
    status: string;
    expiresAt: string;
  };
  token: string;
  payload: { sub: string; university_id: string; expires_at: number };
}

export function CardScreen() {
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emitting, setEmitting] = useState(false);

  useEffect(() => {
    fetchAndStoreCard()
      .then((d) => setData(d as unknown as CardData))
      .catch((err) => console.error('[card] fetch failed', err))
      .finally(() => setLoading(false));
  }, []);

  const onApproachReader = async () => {
    if (!data) return;
    setEmitting(true);
    try {
      await nfcService.startHCE(data.token, data.payload as never);
    } finally {
      // On stoppe automatiquement apres 30s (timeout transaction NFC).
      setTimeout(() => {
        void nfcService.stopHCE().then(() => setEmitting(false));
      }, 30_000);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="white" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Aucune carte disponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.cardVisual}>
        <Text style={styles.cardLabel}>CARTE ETUDIANTE</Text>
        <Text style={styles.cardNumber}>UID {data.card.cardUid}</Text>
        <Text style={styles.cardExpiry}>
          Expire {new Date(data.card.expiresAt).toLocaleDateString('fr-FR')}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={onApproachReader}
        disabled={emitting}
      >
        <Text style={styles.buttonText}>
          {emitting ? 'NFC actif - approchez du lecteur' : 'Activer NFC'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A', padding: 24, paddingTop: 80 },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  cardVisual: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    height: 220,
    justifyContent: 'space-between',
  },
  cardLabel: { color: '#94A3B8', fontSize: 12, letterSpacing: 2 },
  cardNumber: { color: 'white', fontSize: 22, fontFamily: 'monospace' },
  cardExpiry: { color: '#94A3B8' },
  button: {
    backgroundColor: '#2563EB',
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 10,
  },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
  errorText: { color: '#FCA5A5' },
});
