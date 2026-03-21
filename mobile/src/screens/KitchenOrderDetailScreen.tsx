import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation';
import { OrderItem, OrderItemStatus } from '../types';

type RouteType = RouteProp<RootStackParamList, 'KitchenOrderDetail'>;

const ITEM_CONFIG: Record<OrderItemStatus, {
  color: string;
  label: string;
  nextStatus: OrderItemStatus | null;
  nextLabel: string;
  btnColor: string;
}> = {
  pending:   { color: '#888',    label: 'Pendiente',   nextStatus: 'preparing', nextLabel: 'Iniciar 🔥',   btnColor: '#E67E22' },
  preparing: { color: '#E67E22', label: 'Preparando',  nextStatus: 'done',      nextLabel: 'Listo ✓',      btnColor: '#2ECC71' },
  done:      { color: '#2ECC71', label: 'Listo',       nextStatus: null,         nextLabel: '',             btnColor: '#ccc' },
};

export default function KitchenOrderDetailScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation();
  const { orderId } = route.params;

  const { kitchenOrders, updateItemStatus, completeOrder } = useAppStore();
  const order = kitchenOrders.find(o => o.id === orderId);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Pedido no encontrado o ya completado.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allDone = (order.items?.length ?? 0) > 0 && order.items?.every(i => i.status === 'done');

  const handleComplete = () => {
    Alert.alert(
      '¿Pedido completo?',
      'El mesero será notificado que los platos están listos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar ✅',
          onPress: async () => {
            await completeOrder(orderId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: OrderItem }) => {
    const cfg = ITEM_CONFIG[item.status];
    return (
      <View style={[styles.itemCard, { borderLeftColor: cfg.color }]}>
        <View style={styles.itemLeft}>
          <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.menu_item?.name ?? '...'}</Text>
          <Text style={styles.itemQty}>Cantidad: {item.quantity}</Text>
          {item.notes ? <Text style={styles.itemNotes}>📝 {item.notes}</Text> : null}
          <Text style={[styles.itemStatus, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {cfg.nextStatus && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: cfg.btnColor }]}
            onPress={() => updateItemStatus(item.id, cfg.nextStatus!)}
          >
            <Text style={styles.actionBtnText}>{cfg.nextLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderTitle}>Mesa {order.table?.number ?? '?'}</Text>
          <Text style={styles.orderSub}>{order.items?.length ?? 0} platos en total</Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryText}>
            {order.items?.filter(i => i.status === 'done').length ?? 0}/{order.items?.length ?? 0} listos
          </Text>
        </View>
      </View>

      <FlatList
        data={order.items ?? []}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
      />

      {allDone && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
            <Text style={styles.completeBtnText}>✅ Pedido completo — Notificar mesero</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E', padding: 20 },
  errorText: { color: '#aaa', fontSize: 16, textAlign: 'center' },
  backBtn: { marginTop: 16, padding: 12 },
  backText: { color: '#E74C3C', fontSize: 15 },
  orderHeader: { padding: 16, backgroundColor: '#16213E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#0F3460' },
  orderTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  orderSub: { color: '#aaa', fontSize: 13, marginTop: 2 },
  summaryBadge: { backgroundColor: '#0F3460', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  summaryText: { color: '#2ECC71', fontWeight: 'bold', fontSize: 14 },
  list: { padding: 12 },
  itemCard: { backgroundColor: '#16213E', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, elevation: 2 },
  itemLeft: { marginRight: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  itemQty: { fontSize: 13, color: '#aaa', marginTop: 3 },
  itemNotes: { fontSize: 12, color: '#F39C12', marginTop: 4, fontStyle: 'italic' },
  itemStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginLeft: 10 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  footer: { padding: 16, paddingBottom: 28, backgroundColor: '#16213E', elevation: 8 },
  completeBtn: { backgroundColor: '#2ECC71', borderRadius: 12, padding: 18, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
