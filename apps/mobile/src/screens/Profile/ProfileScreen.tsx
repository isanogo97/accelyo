/**
 * Profil etudiant + redirection Izly + gestion des appareils.
 */
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { api } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { deleteSecure, STORAGE_KEYS } from '../../utils/keychain';

export function ProfileScreen() {
  const clear = useAuthStore((s) => s.clear);

  const onIzly = async () => {
    try {
      const { data } = await api.get('/izly/redirect');
      const url = data.data.url ?? data.data.webFallback;
      if (url) Linking.openURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const onLogout = async () => {
    await deleteSecure(STORAGE_KEYS.ACCESS_TOKEN);
    await deleteSecure(STORAGE_KEYS.REFRESH_TOKEN);
    clear();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Mon compte</Text>
      <TouchableOpacity style={styles.btn} onPress={onIzly}>
        <Text style={styles.btnText}>Payer a la cantine (Izly)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={onLogout}>
        <Text style={styles.btnSecondaryText}>Deconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A', padding: 24, paddingTop: 80 },
  title: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 24 },
  btn: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, marginBottom: 12 },
  btnText: { color: 'white', textAlign: 'center', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#1E293B', padding: 14, borderRadius: 8 },
  btnSecondaryText: { color: '#94A3B8', textAlign: 'center' },
});
