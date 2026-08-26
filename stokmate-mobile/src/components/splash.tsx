import { ActivityIndicator, View } from 'react-native';
import { useTheme } from 'react-native-paper';

/** Shown while the session rehydrates from SecureStore (async on native). */
export function Splash() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
