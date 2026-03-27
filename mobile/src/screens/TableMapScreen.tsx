import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '../store/useAppStore';
import { RootStackParamList } from '../navigation';
import { Table } from '../types';

type NavProp = StackNavigationProp<RootStackParamList, 'TableMap'>;

const STATUS_CONFIG = {
  free:     { color: '#2ECC71', bg: '#EAFAF1', label: 'Libre',    emoji: '✅' },
  occupied: { color: '#E67E22', bg: '#FEF9E7', label: 'Ocupada',  emoji: '🔴' },
  billing:  { color: '#F39C12', bg: '#FEF5E7', label: 'Cuenta',   emoji: '💰' },
};

export default function TableMapScreen() {
  const navigation = useNavigation<NavProp>();
  const { tables, fetchTables, logout, loading, user } = useAppStore();

  useFocusEffect(useCallback(() => { fetchTables(); }, []));

  const handleTablePress = (table: Table) => {
    if (table.status === 'billing') {
      Alert.alert('Mesa en facturación', 'Esta mesa ya solicitó la cuenta.');
      return;
    }
    navigation.navigate('Order', { tableId: table.id, tableNumber: table.number });
  };

  const free = tables.filter(t => t.status === 'free').length;
  const occupied = tables.filter(t => t.status !== 'free').length;

  const renderTable = ({ item: table }: { item: Table }) => {
    const cfg = STATUS_CONFIG[table.status];
    return (
      <TouchableOpacity
        style={[styles.tableCard, { borderColor: cfg.color, backgroundColor: cfg.bg }]}
        onPress={() => handleTablePress(table)}
        activeOpacity={0.7}
      >
        <Text style={styles.tableEmoji}>{cfg.emoji}</Text>
        <Text style={styles.tableNumber}>Mesa {table.number}</Text>
        <Text style={[styles.tableStatus, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={styles.tableCapacity}>👥 {table.capacity}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{free}</Text>
          <Text style={styles.statLabel}>Libres</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#E67E22' }]}>{occupied}</Text>
          <Text style={styles.statLabel}>Ocupadas</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{tables.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tables}
        renderItem={renderTable}
        keyExtractor={t => t.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTables} tintColor="#E74C3C" />}
        ListEmptyComponent={<Text style={styles.empty}>Cargando mesas...</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  statsBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', elevation: 2 },
  stat: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#2ECC71' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#eee' },
  logoutBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  logoutText: { color: '#E74C3C', fontWeight: '600', fontSize: 13 },
  grid: { padding: 8 },
  tableCard: { flex: 1, margin: 8, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 2, elevation: 2 },
  tableEmoji: { fontSize: 30, marginBottom: 6 },
  tableNumber: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  tableStatus: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  tableCapacity: { fontSize: 12, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 60, color: '#bbb', fontSize: 15 },
});
