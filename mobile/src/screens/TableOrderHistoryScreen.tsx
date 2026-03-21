import React, { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation';
import { Order } from '../types';

type RouteType = RouteProp<RootStackParamList, 'TableOrderHistory'>;

const STATUS_LABEL: Record<string, string> = {
  open:    '📝 Abierto',
  kitchen: '🍳 En cocina',
  ready:   '✅ Listo',
  billing: '💰 Cuenta',
  billed:  '✔️ Cobrado',
};

const STATUS_COLOR: Record<string, string> = {
  open:    '#3498DB',
  kitchen: '#E67E22',
  ready:   '#2ECC71',
  billing: '#F39C12',
  billed:  '#95A5A6',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TableOrderHistoryScreen() {
  const route = useRoute<RouteType>();
  const { tableId } = route.params;

  const { tableOrderHistory, fetchTableOrderHistory, loading } = useAppStore();

  useFocusEffect(useCallback(() => {
    fetchTableOrderHistory(tableId);
  }, [tableId]));

  const renderOrder = ({ item: order }: { item: Order }) => {
    const total = order.items?.reduce(
      (sum, i) => sum + (i.effective_price ?? i.menu_item?.price ?? 0) * i.quantity, 0
    ) ?? 0;

    return (
      <View style={styles.card}>
        {/* Cabecera */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{formatDate(order.created_at)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] ?? '#ccc' }]}>
            <Text style={styles.statusText}>{STATUS_LABEL[order.status] ?? order.status}</Text>
          </View>
        </View>

        {/* Items */}
        {order.items?.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemQty}>×{item.quantity}</Text>
            <Text style={styles.itemName}>{item.menu_item?.name ?? '—'}</Text>
            {item.notes ? <Text style={styles.itemNotes}>· {item.notes}</Text> : null}
            <Text style={styles.itemPrice}>
              S/ {((item.effective_price ?? item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>S/ {total.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  if (loading && tableOrderHistory.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E74C3C" />
      </View>
    );
  }

  return (
    <FlatList
      data={tableOrderHistory}
      keyExtractor={o => o.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>Sin historial de pedidos</Text>
          <Text style={styles.emptySub}>Los pedidos de esta mesa aparecerán aquí</Text>
        </View>
      }
      renderItem={renderOrder}
    />
  );
}

const styles = StyleSheet.create({
  list:         { padding: 12, paddingBottom: 32 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyEmoji:   { fontSize: 56, marginBottom: 12 },
  emptyText:    { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySub:     { fontSize: 13, color: '#aaa', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardDate:     { fontSize: 12, color: '#888' },
  statusBadge:  { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  statusText:   { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  itemQty:      { fontSize: 12, color: '#E74C3C', fontWeight: 'bold', width: 24 },
  itemName:     { flex: 1, fontSize: 13, color: '#444', fontWeight: '500' },
  itemNotes:    { fontSize: 11, color: '#bbb', fontStyle: 'italic', flexShrink: 1 },
  itemPrice:    { fontSize: 13, color: '#888', fontWeight: '600' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  totalLabel:   { fontSize: 14, color: '#777', fontWeight: '600' },
  totalAmount:  { fontSize: 16, color: '#E74C3C', fontWeight: 'bold' },
});
