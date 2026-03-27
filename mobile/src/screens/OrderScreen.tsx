import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation';
import { OrderItem } from '../types';

type NavProp   = StackNavigationProp<RootStackParamList, 'Order'>;
type RouteType = RouteProp<RootStackParamList, 'Order'>;

const ITEM_STATUS: Record<string, string> = {
  pending:   '⏳',
  preparing: '👨‍🍳',
  done:      '✅',
};

const STATUS_BANNER: Record<string, { color: string; label: string }> = {
  open:    { color: '#3498DB', label: '📝 Pedido abierto — agrega platos' },
  kitchen: { color: '#E67E22', label: '👨‍🍳 En cocina...' },
  ready:   { color: '#2ECC71', label: '✅ Listo para servir' },
  served:  { color: '#1ABC9C', label: '🛎️ Platos entregados — ¿segunda ronda?' },
  billing: { color: '#F39C12', label: '💰 Cuenta solicitada' },
};

function elapsed(iso?: string): string | null {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'justo ahora';
  if (mins < 60) return `hace ${mins} min`;
  return `hace ${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export default function OrderScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { tableId, tableNumber } = route.params;

  const {
    currentOrder, fetchOrCreateOrder,
    removeOrderItem, updateOrderItemQuantity,
    sendOrderToKitchen, markDelivered,
    requestBilling, closeTable, orderLoading: loading,
  } = useAppStore();

  useFocusEffect(useCallback(() => { fetchOrCreateOrder(tableId); }, [tableId]));

  const total = currentOrder?.items?.reduce(
    (sum, item) => sum + (item.effective_price ?? item.menu_item?.price ?? 0) * item.quantity, 0
  ) ?? 0;

  const totalSavings = currentOrder?.items?.reduce((sum, i) => {
    if (!i.menu_item) return sum;
    const original = i.menu_item.price * i.quantity;
    const paid     = (i.effective_price ?? i.menu_item.price) * i.quantity;
    return sum + (original - paid);
  }, 0) ?? 0;

  const isOpen    = !currentOrder || currentOrder.status === 'open';
  const isKitchen = currentOrder?.status === 'kitchen';
  const isReady   = currentOrder?.status === 'ready';
  const isServed  = isReady && !!currentOrder?.delivered_at;
  const isBilling = currentOrder?.status === 'billing';
  const canAdd    = isOpen || isServed;

  const handleSendToKitchen = () => {
    if (!currentOrder?.items?.length) {
      Alert.alert('Sin platos', 'Agrega al menos un plato antes de enviar.');
      return;
    }
    Alert.alert(
      '¿Enviar a cocina?',
      `${currentOrder.items.length} platos · S/ ${total.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Enviar 🍳', onPress: () => sendOrderToKitchen(currentOrder.id) },
      ]
    );
  };

  const handleDeliver = () => {
    Alert.alert(
      '¿Entregar platos a la mesa?',
      'Marca los platos como entregados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar 🛎️', onPress: () => { if (currentOrder) markDelivered(currentOrder.id); } },
      ]
    );
  };

  const handleRequestBilling = () => {
    Alert.alert(
      '¿Solicitar la cuenta?',
      `Total: S/ ${total.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar 💰', onPress: () => { if (currentOrder) requestBilling(currentOrder.id); } },
      ]
    );
  };

  const handleCloseTable = () => {
    Alert.alert(
      '¿Confirmar cobro?',
      `Total: S/ ${total.toFixed(2)}\nEsto liberará la mesa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cobrado ✅',
          onPress: () => {
            if (currentOrder) closeTable(currentOrder.id).then(() => navigation.goBack());
          },
        },
      ]
    );
  };

  const handleQuantityChange = (item: OrderItem, delta: number) => {
    if (!currentOrder) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      Alert.alert(
        '¿Quitar plato?',
        item.menu_item?.name,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Quitar', style: 'destructive', onPress: () => removeOrderItem(currentOrder.id, item.id) },
        ]
      );
    } else {
      updateOrderItemQuantity(currentOrder.id, item.id, newQty);
    }
  };

  if (loading && !currentOrder) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#E74C3C" /></View>;
  }

  const banner = isServed
    ? STATUS_BANNER['served']
    : STATUS_BANNER[currentOrder?.status ?? 'open'];

  // Agrupar items por ronda
  const maxRound = currentOrder?.items?.length
    ? Math.max(...(currentOrder.items.map(i => i.round ?? 1)))
    : 0;
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      {/* Banner de estado */}
      {banner && (
        <View style={[styles.banner, { backgroundColor: banner.color }]}>
          <Text style={styles.bannerText}>{banner.label}</Text>
        </View>
      )}

      {/* Aviso de entrega */}
      {currentOrder?.delivered_at && (
        <View style={styles.deliveredBar}>
          <Text style={styles.deliveredText}>🛎️ Platos entregados · {elapsed(currentOrder.delivered_at)}</Text>
        </View>
      )}

      {/* Lista de items por ronda */}
      <FlatList
        data={rounds}
        keyExtractor={r => String(r)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>Pedido vacío</Text>
            <Text style={styles.emptySub}>Toca "Agregar Platos" para empezar</Text>
          </View>
        }
        renderItem={({ item: round }) => {
          const roundItems = (currentOrder?.items ?? []).filter(i => (i.round ?? 1) === round);
          if (!roundItems.length) return null;
          return (
            <View>
              {maxRound > 1 && (
                <View style={styles.roundHeader}>
                  <Text style={styles.roundLabel}>RONDA {round}</Text>
                  <View style={styles.roundLine} />
                </View>
              )}
              {roundItems.map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={styles.itemName}>{item.menu_item?.name ?? '...'}</Text>
                      {item.promotion_name && (
                        <View style={styles.promoBadge}>
                          <Text style={styles.promoBadgeText}>🏷️ {item.promotion_name}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.priceRow}>
                      {item.effective_price != null && item.effective_price !== item.menu_item?.price ? (
                        <>
                          <Text style={styles.priceStrike}>
                            S/ {((item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
                          </Text>
                          <Text style={styles.priceDiscounted}>
                            S/ {(item.effective_price * item.quantity).toFixed(2)}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.priceMeta}>
                          S/ {((item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
                        </Text>
                      )}
                    </View>
                    {item.notes ? <Text style={styles.itemNotes}>📝 {item.notes}</Text> : null}
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemStatusIcon}>{ITEM_STATUS[item.status]}</Text>
                    {canAdd && (
                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          onPress={() => handleQuantityChange(item, -1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyNum}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => handleQuantityChange(item, +1)}
                          disabled={
                            item.menu_item?.stock != null &&
                            item.quantity >= (item.menu_item.stock ?? Infinity)
                          }
                          style={[styles.qtyBtn, styles.qtyBtnPlus]}
                        >
                          <Text style={[styles.qtyBtnText, { color: '#fff' }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {totalSavings > 0 && (
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>🎉 Ahorro total</Text>
            <Text style={styles.savingsAmount}>−S/ {totalSavings.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>S/ {total.toFixed(2)}</Text>
        </View>

        {/* Botón historial */}
        <TouchableOpacity
          style={styles.historialBtn}
          onPress={() => navigation.navigate('TableOrderHistory', { tableId, tableNumber })}
        >
          <Text style={styles.historialBtnText}>📋 Ver historial de la mesa</Text>
        </TouchableOpacity>

        {canAdd && (
          <>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => currentOrder && navigation.navigate('MenuSelect', { orderId: currentOrder.id })}
            >
              <Text style={styles.addButtonText}>+ Agregar Platos</Text>
            </TouchableOpacity>
            {!!currentOrder?.items?.length && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#E67E22' }]}
                onPress={handleSendToKitchen}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Enviar a Cocina 🍳</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {isKitchen && (
          <Text style={styles.waitingText}>Esperando que cocina termine los platos...</Text>
        )}

        {isReady && !isServed && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#1ABC9C' }]}
            onPress={handleDeliver}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>🛎️ Entregar a mesa</Text>
          </TouchableOpacity>
        )}

        {(isServed || isReady) && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F39C12' }]}
            onPress={handleRequestBilling}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Solicitar Cuenta 💰</Text>
          </TouchableOpacity>
        )}

        {isBilling && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E74C3C' }]}
            onPress={handleCloseTable}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>✅ Cobrado — Liberar mesa</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F5F5F5' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner:           { padding: 10, alignItems: 'center' },
  bannerText:       { color: '#fff', fontWeight: '600', fontSize: 14 },
  deliveredBar:     { backgroundColor: 'rgba(26,188,156,0.12)', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(26,188,156,0.2)' },
  deliveredText:    { color: '#16a085', fontSize: 13, fontWeight: '600' },
  list:             { padding: 12, paddingBottom: 8 },
  roundHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 4 },
  roundLabel:       { fontSize: 11, fontWeight: 'bold', color: '#999', letterSpacing: 0.5 },
  roundLine:        { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  itemRow:          { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  itemInfo:         { flex: 1 },
  itemNameRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  itemName:         { fontSize: 15, fontWeight: '600', color: '#333' },
  promoBadge:       { backgroundColor: '#FEF3C7', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  promoBadgeText:   { fontSize: 10, color: '#D97706', fontWeight: 'bold' },
  priceRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  priceMeta:        { fontSize: 13, color: '#888' },
  priceStrike:      { fontSize: 12, color: '#bbb', textDecorationLine: 'line-through' },
  priceDiscounted:  { fontSize: 13, color: '#F97316', fontWeight: 'bold' },
  itemNotes:        { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 2 },
  itemRight:        { alignItems: 'center', gap: 6, marginLeft: 8 },
  itemStatusIcon:   { fontSize: 20 },
  qtyRow:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus:       { backgroundColor: '#E74C3C' },
  qtyBtnText:       { fontSize: 16, fontWeight: 'bold', color: '#555', lineHeight: 20 },
  qtyNum:           { width: 24, textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#333' },
  emptyContainer:   { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:       { fontSize: 64 },
  emptyText:        { fontSize: 18, fontWeight: '600', color: '#555', marginTop: 14 },
  emptySub:         { fontSize: 14, color: '#aaa', marginTop: 6 },
  footer:           { backgroundColor: '#fff', padding: 14, paddingBottom: 24, elevation: 8, gap: 8 },
  savingsRow:       { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  savingsLabel:     { color: '#059669', fontWeight: '600', fontSize: 13 },
  savingsAmount:    { color: '#059669', fontWeight: 'bold', fontSize: 13 },
  totalRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:       { fontSize: 16, color: '#777', fontWeight: '600' },
  totalAmount:      { fontSize: 26, color: '#E74C3C', fontWeight: 'bold' },
  historialBtn:     { borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F0F0F0' },
  historialBtnText: { color: '#555', fontWeight: '600', fontSize: 13 },
  addButton:        { borderWidth: 2, borderColor: '#E74C3C', borderStyle: 'dashed', borderRadius: 10, padding: 13, alignItems: 'center' },
  addButtonText:    { color: '#E74C3C', fontWeight: '600', fontSize: 15 },
  actionButton:     { borderRadius: 10, padding: 15, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  waitingText:      { textAlign: 'center', color: '#999', fontSize: 13, paddingVertical: 8 },
});
