/**
 * Conteneur principal de l'app authentifiee.
 * ----------------------------------------------------------------
 * Charge le profil /me, applique le theme (brandColor) via
 * ThemeProvider, affiche une app bar + une tab bar par secteur:
 *   - SCHOOL  -> onglet "Mon campus"
 *   - LIBRARY -> onglet "Mes emprunts"
 * Gere le consentement marketing (toggle -> PATCH /me/consent) et la
 * deconnexion. Aiguillage d'onglets par useState (pas de lib de tabs).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import {
  fetchMe,
  updateConsent,
  errorMessage,
  type MeResponse,
} from '../../services/studentApi';
import { useSessionStore } from '../../store/sessionStore';
import { ThemeProvider, useTheme } from '../../theme/ThemeContext';
import { palette } from '../../theme/theme';
import { PrimaryButton } from '../../components/ui';
import { CardScreen } from '../Card/CardScreen';
import { CampusScreen } from '../Sector/CampusScreen';
import { LibraryScreen } from '../Sector/LibraryScreen';
import { DealsScreen } from '../Deals/DealsScreen';
import { ProfileScreen } from '../Profile/ProfileScreen';

type TabId = 'card' | 'sector' | 'deals' | 'profile';

export function HomeScreen({ onLogout }: { onLogout: () => void }) {
  const me = useSessionStore((s) => s.me);
  const setMe = useSessionStore((s) => s.setMe);
  const [loading, setLoading] = useState(!me);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const data = await fetchMe();
      setMe(data);
    } catch (e) {
      setLoadError(errorMessage(e, 'Impossible de charger ton profil.'));
    } finally {
      setLoading(false);
    }
  }, [setMe]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !me) {
    return (
      <ThemeProvider>
        <View style={styles.center}>
          <ActivityIndicator color={palette.text} />
        </View>
      </ThemeProvider>
    );
  }

  if (!me) {
    return (
      <ThemeProvider>
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError ?? 'Aucune donnee disponible.'}</Text>
          <View style={styles.retryWrap}>
            <PrimaryButton label="Reessayer" onPress={() => void load()} />
          </View>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider brandColor={me.establishment.brandColor}>
      <HomeShell me={me} onLogout={onLogout} />
    </ThemeProvider>
  );
}

function HomeShell({ me, onLogout }: { me: MeResponse; onLogout: () => void }) {
  const theme = useTheme();
  const setMe = useSessionStore((s) => s.setMe);
  const [tab, setTab] = useState<TabId>('card');
  const [consent, setConsent] = useState(me.marketingConsent);
  const [consentBusy, setConsentBusy] = useState(false);

  const isSchool = me.establishment.sector === 'SCHOOL';
  const isLibrary = me.establishment.sector === 'LIBRARY';
  const hasSectorTab = isSchool || isLibrary;

  const onToggleConsent = async (next: boolean) => {
    setConsentBusy(true);
    const previous = consent;
    setConsent(next);
    try {
      await updateConsent(next);
      setMe({ ...me, marketingConsent: next });
    } catch {
      setConsent(previous); // rollback si l'API echoue
    } finally {
      setConsentBusy(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'card', label: 'Ma carte' },
    ...(isSchool ? [{ id: 'sector' as const, label: 'Mon campus' }] : []),
    ...(isLibrary ? [{ id: 'sector' as const, label: 'Mes emprunts' }] : []),
    { id: 'deals', label: 'Bons plans' },
    { id: 'profile', label: 'Profil' },
  ];

  // Si on bascule de secteur et que l'onglet courant n'existe plus, on retombe sur la carte.
  const activeTab: TabId = tab === 'sector' && !hasSectorTab ? 'card' : tab;

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.appbar, { backgroundColor: theme.brand }]}>
        <Text style={[styles.appbarTitle, { color: theme.onBrand }]} numberOfLines={1}>
          {me.establishment.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {activeTab === 'card' && <CardScreen me={me} />}
        {activeTab === 'sector' && isSchool && <CampusScreen />}
        {activeTab === 'sector' && isLibrary && <LibraryScreen />}
        {activeTab === 'deals' && (
          <DealsScreen
            consent={consent}
            onToggleConsent={(n) => void onToggleConsent(n)}
            consentBusy={consentBusy}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileScreen
            me={me}
            consent={consent}
            onToggleConsent={(n) => void onToggleConsent(n)}
            consentBusy={consentBusy}
            onLogout={onLogout}
          />
        )}
      </ScrollView>

      <View style={styles.tabbar}>
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={styles.tabBtn}
              onPress={() => setTab(t.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? theme.brand : palette.textFaint },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  center: {
    flex: 1,
    backgroundColor: palette.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: { color: palette.danger, textAlign: 'center', fontSize: 14 },
  retryWrap: { alignSelf: 'stretch', marginTop: 16 },
  appbar: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14 },
  appbarTitle: { fontSize: 17, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 24 },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  tabLabel: { fontSize: 11, fontWeight: '700' },
});
