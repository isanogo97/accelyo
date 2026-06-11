/**
 * Ecran de connexion etudiant (email + mot de passe).
 */
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { login, errorMessage } from '../../services/studentApi';
import { useSessionStore } from '../../store/sessionStore';
import { saveSecure, STORAGE_KEYS } from '../../utils/keychain';
import { Field, PrimaryButton, ErrorText } from '../../components/ui';
import { palette } from '../../theme/theme';

export function LoginScreen({ onGoToActivate }: { onGoToActivate: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSessionToken = useSessionStore((s) => s.setToken);

  const onLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    setLoading(true);
    try {
      const token = await login(email.trim(), password);
      await saveSecure(STORAGE_KEYS.ACCESS_TOKEN, token);
      setSessionToken(token);
    } catch (e) {
      setError(errorMessage(e, 'Identifiants invalides.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.brand}>Accelyo</Text>
        <Text style={styles.tagline}>Ta carte etudiante, dans ta poche.</Text>

        <Field
          label="Email"
          placeholder="prenom.nom@etu.fr"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Mot de passe"
          placeholder="Ton mot de passe"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <ErrorText>{error}</ErrorText>
        <PrimaryButton label="Se connecter" onPress={onLogin} loading={loading} />

        <Text style={styles.switch} onPress={onGoToActivate}>
          Premiere connexion ? Activer mon compte
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  brand: { fontSize: 32, fontWeight: '800', color: palette.text, textAlign: 'center' },
  tagline: {
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 28,
  },
  switch: {
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: 18,
    fontWeight: '600',
  },
});
