import { Card, Text } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { useProductStats } from './hooks';

export function StatsCards() {
  const stats = useProductStats();

  const cards = [
    { label: 'Toplam', value: stats.data?.total },
    { label: 'Tükenen', value: stats.data?.outOfStock },
    { label: 'Kritik', value: stats.data?.lowStock },
  ];

  return (
    <View style={styles.row}>
      {cards.map((card) => (
        <Card key={card.label} mode="elevated" style={styles.card}>
          <Card.Content>
            <Text variant="labelMedium">{card.label}</Text>
            <Text variant="headlineSmall" style={{ fontVariant: ['tabular-nums'] }}>
              {stats.isError ? '—' : (card.value ?? '…')}
            </Text>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  card: { flex: 1 },
});
