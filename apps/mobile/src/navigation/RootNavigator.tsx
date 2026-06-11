/**
 * Aiguillage racine de l'app (sans lib de navigation lourde).
 * ----------------------------------------------------------------
 * - Au demarrage: rehydrate le token depuis le secure store
 *   (utils/keychain) et traite un eventuel deep link d'activation
 *   (accelyo://activate?token=...).
 * - Non authentifie -> Activation ou Login (bascule par useState).
 * - Authentifie -> HomeScreen (carte + onglets).
 */
import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { useSessionStore } from '../store/sessionStore';
import { readSecure, deleteSecure, STORAGE_KEYS } from '../utils/keychain';
import { palette } from '../theme/theme';
import { ActivateScreen } from '../screens/Activate/ActivateScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { HomeScreen } from '../screens/Home/HomeScreen';

type AuthRoute = 'login' | 'activate';

/** Extrait un token d'activation d'une URL de deep link. */
function parseActivationToken(url: string | null): string | undefined {
  if (!url) return undefined;
  const match = /[?&]token=([^&]+)/.exec(url);
  if (match) return decodeURIComponent(match[1]);
  return undefined;
}

export function RootNavigator() {
  const token = useSessionStore((s) => s.token);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);
  const setBootstrapped = useSessionStore((s) => s.setBootstrapped);
  const clear = useSessionStore((s) => s.clear);

  const [route, setRoute] = useState<AuthRoute>('login');
  const [deepLinkToken, setDeepLinkToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const url = await Linking.getInitialURL();
        const activationToken = parseActivationToken(url);
        if (activationToken) {
          setDeepLinkToken(activationToken);
          setRoute('activate');
        }
        const stored = await readSecure(STORAGE_KEYS.ACCESS_TOKEN);
        setBootstrapped(stored ?? null);
      } catch {
        setBootstrapped(null);
      }
    })();
  }, [setBootstrapped]);

  const onLogout = useCallback(async () => {
    await deleteSecure(STORAGE_KEYS.ACCESS_TOKEN);
    clear();
    setRoute('login');
  }, [clear]);

  if (bootstrapping) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }

  if (token) {
    return <HomeScreen onLogout={() => void onLogout()} />;
  }

  if (route === 'activate') {
    return (
      <ActivateScreen
        initialToken={deepLinkToken}
        onGoToLogin={() => setRoute('login')}
      />
    );
  }

  return <LoginScreen onGoToActivate={() => setRoute('activate')} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: palette.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
