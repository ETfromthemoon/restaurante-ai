import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation';
import { Order } from '../types';

type NavProp = StackNavigationProp<RootStackParamList, 'KitchenQueue'>;

function elapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export default function KitchenQueueScreen() {
  const navigation = useNavigation<NavProp>();
  const { kitchenOrders, fetchKitchenOrders, logout, loading, user } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      fetchKitchenOrders();
      // Auto-refresh cada 30 segundos
      const interval = setInterval(fetchKitchenOrders, 30_000);
      return () => clearInterval(interval);
    }, [])
  );

  const sorted = [...kitchenOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const renderOrder = ({ item: order }: { item: Order }) => {
    const elapsed   = elapsedMinutes(order.created_at);
    const isUrgent  = elapsed > 20;
    const doneCount = order.items?.filter(i => i.status === 'done').length ?? 0;
    const total     = order.items?.length ?? 0;
    const pct       = total > 0 ? (doneCount / total) * 100 : 0;

    return (
      <TouchableOpacity
        style={[styles.card, isUrgent && styles.cardUrgent]}
        onPress={() => navigation.navigate('KitchenOrderDetail', { orderId: order.id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <Text style={styles.tableNum}>Mesa {order.table?.number ?? '?'}</Text>
          <View style={[styles.timeBadge, isUrgent && styles.timeBadgeUrgent]}>
            <Text style={styles.timeText}>{elapsed}min {isUrgent ? '🔥' : '⏱️'}</Text>
          </View>
        </View>

        <Text style={styles.itemsLabel}>{total} platos</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{doneCount}/{total}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Hola, {user?.name?.split(' ')[0]} 👨‍🍳</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sorted}
        renderItem={renderOrder}
        keyExtractor={o => o.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchKitchenOrders} tintColor="#E74C3C" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyText}>Sin pedidos pendientes</Text>
            <Text style={styles.emptySub}>Jalá hacia abajo para actualizar</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#16213E', elevation: 4 },
  welcome: { fontSize: 16, fontWeight: '600', color: '#fff' },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  logoutText: { color: '#E74C3C', fontWeight: '600' },
  list: { padding: 12 },
  card: { backgroundColor: '#16213E', borderRadius: 14, padding: 18, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#E67E22', elevation: 3 },
  cardUrgent: { borderLeftColor: '#E74C3C' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tableNum: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  timeBadge: { backgroundColor: '#E67E22', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  timeBadgeUrgent: { backgroundColor: '#E74C3C' },
  timeText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  itemsLabel: { color: '#aaa', fontSize: 13, marginBottom: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 8, backgroundColor: '#0F3460', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2ECC71', borderRadius: 4 },
  progressText: { color: '#2ECC71', fontWeight: 'bold', fontSize: 14, minWidth: 30, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyEmoji: { fontSize: 70 },
  emptyText: { fontSize: 20, color: '#aaa', marginTop: 16, fontWeight: '600' },
  emptySub: { fontSize: 13, color: '#555', marginTop: 6 },
});
