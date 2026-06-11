/**
 * Ecran d'activation du compte etudiant.
 * ----------------------------------------------------------------
 * Le "token" d'activation peut etre pre-rempli via un deep link
 * (accelyo://activate?token=...) ou saisi manuellement. On demande un
 * mot de passe + confirmation, on appelle /student-auth/activate, on
 * stocke le token de session et on bascule sur l'accueil.
 */
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { activate, errorMessage } from '../../services/studentApi';
import { useSessionStore } from '../../store/sessionStore';
import { saveSecure, STORAGE_KEYS } from '../../utils/keychain';
import { Field, PrimaryButton, ErrorText } from '../../components/ui';
import { palette } from '../../theme/theme';

export function ActivateScreen({
  initialToken,
  onGoToLogin,
}: {
  initialToken?: string;
  onGoToLogin: () => void;
}) {
  const [token, setToken] = useState(initialToken ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSessionToken = useSessionStore((s) => s.setToken);

  const onActivate = async () => {
    setError(null);
    if (!token.trim()) {
      setError("Le code d'activation est requis.");
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const sessionToken = await activate(token.trim(), password);
      await saveSecure(STORAGE_KEYS.ACCESS_TOKEN, sessionToken);
      setSessionToken(sessionToken);
    } catch (e) {
      setError(errorMessage(e, "Echec de l'activation."));
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
        <Text style={styles.tagline}>Active ta carte etudiante.</Text>

        <Field
          label="Code d'activation"
          placeholder="Recu par email"
          autoCapitalize="none"
          autoCorrect={false}
          value={token}
          onChangeText={setToken}
        />
        <Field
          label="Mot de passe"
          placeholder="8 caracteres minimum"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Field
          label="Confirmer le mot de passe"
          placeholder="Repete ton mot de passe"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <ErrorText>{error}</ErrorText>
        <PrimaryButton label="Activer mon compte" onPress={onActivate} loading={loading} />

        <Text style={styles.switch} onPress={onGoToLogin}>
          Deja active ? Se connecter
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
