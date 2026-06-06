/**
 * Ecran de connexion etudiant.
 * Login simplifie - email + mot de passe (ou magic link).
 */
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { saveSecure, STORAGE_KEYS } from '../../utils/keychain';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);

  const onLogin = async () => {
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const tokens = data.data.tokens;
      if (!tokens) {
        setError('MFA requise - non disponible sur mobile');
        return;
      }
      setTokens(tokens);
      await saveSecure(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await saveSecure(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err.response?.data?.error?.message ?? 'Erreur');
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Accelyo</Text>
      <Text style={styles.subtitle}>Ta carte etudiante, dans ta poche.</Text>
      <TextInput
        style={styles.input}
        placeholder="Email universitaire"
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor="#94A3B8"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={onLogin}>
        <Text style={styles.btnText}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 24,
    justifyContent: 'center',
  },
  title: { color: 'white', fontSize: 32, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
  },
  btnText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  error: { color: '#FCA5A5', marginBottom: 8 },
});
