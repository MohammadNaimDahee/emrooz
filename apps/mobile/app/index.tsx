// Root redirect. Expo Router requires a route for the empty path
// (emrooz:///, /, or a cold launch with no deep link). We decide here
// whether the user should land in the tab shell (onboarded) or in the
// onboarding flow (not onboarded), based on locally persisted preferences.
import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useData } from '../src/data/context';
import { COLORS } from '../src/theme/tokens';

export default function Index() {
  const { preferences, ready } = useData();

  if (!ready) {
    // Preferences haven't loaded yet — hold on the cream background
    // rather than flashing a wrong destination. The AsyncStorage read
    // in DataProvider is typically <100 ms.
    return <View style={{ flex: 1, backgroundColor: COLORS.cream }} />;
  }

  return <Redirect href={preferences?.onboardedAt ? '/(tabs)/today' : '/onboarding'} />;
}
