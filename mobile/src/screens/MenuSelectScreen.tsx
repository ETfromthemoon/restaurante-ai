import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SectionList, TextInput, Modal, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { aiService } from '../services/api';
import { RootStackParamList } from '../navigation';
import { MenuItem, Promotion, PairingSuggestion } from '../types';

type RouteType = RouteProp<RootStackParamList, 'MenuSelect'>;

const CATEGORY_ICONS: Record<string, string> = {
  'Entradas':    '🥗',
  'Principales': '🍽️',
  'Postres':     '🍰',
  'Bebidas':     '🥤',
};

export default function MenuSelectScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation();
  const { orderId } = route.params;

  const { menuItems, fetchMenu, addOrderItem, fetchActivePromotions, activePromotions, menuLoading, orderLoading } = useAppStore();

  const [search, setSearch]               = useState('');
  const [activeCategory, setCategory]     = useState<string | null>(null);
  const [adding, setAdding]               = useState<string | null>(null);
  const [added, setAdded]                 = useState<Set<string>>(new Set());

  // Modal de notas
  const [noteItem, setNoteItem]           = useState<MenuItem | null>(null);
  const [noteText, setNoteText]           = useState('');

  // Modal de maridaje IA
  const [pairingItem, setPairingItem]         = useState<MenuItem | null>(null);
  const [pairingSuggestions, setPairingSuggestions] = useState<PairingSuggestion[]>([]);
  const [pairingLoading, setPairingLoading]   = useState(false);

  useEffect(() => {
    if (menuItems.length === 0) fetchMenu();
    fetchActivePromotions();
  }, []);

  // ─── Promociones ────────────────────────────────────────────────────────────
  function getPromoForItem(item: MenuItem): Promotion | undefined {
    const priority: Record<string, number> = { item: 0, category: 1, all: 2 };
    return [...activePromotions]
      .sort((a, b) => priority[a.applies_to] - priority[b.applies_to])
      .find(p =>
        p.applies_to === 'item'     ? p.target_id === item.id :
        p.applies_to === 'category' ? p.target_id === item.category : true
      );
  }

  function promoBadge(p: Promotion): string {
    if (p.type === '2x1')        return '2×1';
    if (p.type === 'percentage') return `-${p.value}%`;
    if (p.type === 'fixed')      return `-S/${p.value}`;
    return '🏷️';
  }

  function discountedPrice(item: MenuItem, p: Promotion): number | null {
    if (p.type === 'percentage') return item.price * (1 - p.value / 100);
    if (p.type === 'fixed')      return Math.max(0, item.price - p.value);
    return null;
  }

  // ─── Filtrado ────────────────────────────────────────────────────────────────
  const allCategories = useMemo(
    () => [...new Set(menuItems.filter(m => m.available).map(m => m.category))],
    [menuItems]
  );

  const sections = useMemo(() => {
    const filtered = menuItems.filter(m =>
      m.available &&
      (!activeCategory || m.category === activeCategory) &&
      (!search || m.name.toLowerCase().includes(search.toLowerCase()))
    );
    const grouped: Record<string, MenuItem[]> = {};
    filtered.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [menuItems, search, activeCategory]);

  // ─── Agregar plato ───────────────────────────────────────────────────────────
  const handleAddClick = (item: MenuItem) => {
    setNoteItem(item);
    setNoteText('');
  };

  const handleConfirmAdd = async () => {
    if (!noteItem) return;
    const item = noteItem;
    setNoteItem(null);
    setAdding(item.id);
    await addOrderItem(orderId, item.id, 1, noteText.trim() || undefined);
    setAdding(null);
    setAdded(prev => new Set(prev).add(item.id));

    // Sugerencias de maridaje en segundo plano
    setPairingItem(item);
    setPairingSuggestions([]);
    setPairingLoading(true);
    try {
      const res = await aiService.getPairing(item.id);
      setPairingSuggestions(res.suggestions);
    } catch {
      // silencioso
    } finally {
      setPairingLoading(false);
    }
  };

  const handleAddPairing = async (s: PairingSuggestion) => {
    if (!s.id) return;
    setAdding(s.id);
    await addOrderItem(orderId, s.id, 1, undefined);
    setAdding(null);
    setAdded(prev => new Set(prev).add(s.id!));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (menuLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E74C3C" />
        <Text style={styles.loadingText}>Cargando menú...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Buscador */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar plato..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtro de categorías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={styles.catContent}>
        <TouchableOpacity
          style={[styles.catBtn, !activeCategory && styles.catBtnActive]}
          onPress={() => setCategory(null)}
        >
          <Text style={[styles.catBtnText, !activeCategory && styles.catBtnTextActive]}>Todos</Text>
        </TouchableOpacity>
        {allCategories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catBtn, activeCategory === cat && styles.catBtnActive]}
            onPress={() => setCategory(activeCategory === cat ? null : cat)}
          >
            <Text style={[styles.catBtnText, activeCategory === cat && styles.catBtnTextActive]}>
              {CATEGORY_ICONS[cat] ?? '🍴'} {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sin resultados */}
      {sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>Sin resultados para "{search}"</Text>
          <TouchableOpacity onPress={() => { setSearch(''); setCategory(null); }}>
            <Text style={styles.clearText}>Limpiar filtros</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {CATEGORY_ICONS[section.title] ?? '🍴'} {section.title.toUpperCase()}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isAdded   = added.has(item.id);
            const isLoading = adding === item.id;
            const promo     = getPromoForItem(item);
            const dPrice    = promo ? discountedPrice(item, promo) : null;
            return (
              <View style={styles.menuItem}>
                <View style={styles.menuInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.menuName}>{item.name}</Text>
                    {promo && (
                      <View style={styles.promoBadge}>
                        <Text style={styles.promoBadgeText}>{promoBadge(promo)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.menuDesc}>{item.description}</Text>
                </View>
                <View style={styles.menuRight}>
                  <View style={styles.priceBlock}>
                    {dPrice !== null ? (
                      <>
                        <Text style={styles.priceStrike}>S/ {item.price}</Text>
                        <Text style={styles.priceDiscounted}>S/ {dPrice.toFixed(2)}</Text>
                      </>
                    ) : promo?.type === '2x1' ? (
                      <>
                        <Text style={styles.menuPrice}>S/ {item.price}</Text>
                        <Text style={styles.price2x1}>lleva 2, paga 1</Text>
                      </>
                    ) : (
                      <Text style={styles.menuPrice}>S/ {item.price}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      isLoading && styles.addBtnLoading,
                      isAdded  && styles.addBtnAdded,
                    ]}
                    onPress={() => handleAddClick(item)}
                    disabled={isLoading || orderLoading}
                  >
                    <Text style={styles.addBtnText}>
                      {isLoading ? '·' : isAdded ? '✓' : '+'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Botón ver pedido */}
      {added.size > 0 && (
        <View style={styles.footerBar}>
          <TouchableOpacity style={styles.viewOrderBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.viewOrderText}>✅ Ver pedido ({added.size} agregados)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Modal: Notas ─────────────────────────────────────────────────────── */}
      <Modal visible={!!noteItem} transparent animationType="slide" onRequestClose={() => setNoteItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {noteItem && (
              <>
                <Text style={styles.modalTitle}>{noteItem.name}</Text>
                <Text style={styles.modalPrice}>S/ {noteItem.price}</Text>
                <Text style={styles.modalLabel}>¿Alguna indicación para cocina? (opcional)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Ej: sin cebolla, sin gluten, término medio..."
                  placeholderTextColor="#bbb"
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={2}
                  autoFocus
                />
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={styles.modalConfirm}
                    onPress={handleConfirmAdd}
                    disabled={adding === noteItem?.id}
                  >
                    <Text style={styles.modalConfirmText}>
                      {adding === noteItem?.id ? 'Agregando...' : 'Agregar al pedido'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setNoteItem(null)}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Maridaje IA ────────────────────────────────────────────────── */}
      <Modal visible={!!pairingItem} transparent animationType="slide" onRequestClose={() => setPairingItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '70%' }]}>
            <View style={styles.pairingHeader}>
              <View>
                <Text style={styles.pairingSubtitle}>✨ Sugerencias de maridaje</Text>
                <Text style={styles.pairingTitle}>Combina bien con {pairingItem?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setPairingItem(null)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            {pairingLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#F97316" />
                <Text style={styles.pairingWait}>Claude está pensando...</Text>
              </View>
            ) : pairingSuggestions.length === 0 ? (
              <Text style={styles.pairingEmpty}>No se obtuvieron sugerencias.</Text>
            ) : (
              <ScrollView style={{ marginTop: 8 }}>
                {pairingSuggestions.map((s, i) => {
                  const alreadyAdded = s.id ? added.has(s.id) : false;
                  return (
                    <View key={i} style={styles.pairingItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pairingName}>{s.name}</Text>
                        <Text style={styles.pairingReason}>"{s.reason}"</Text>
                        {s.price && <Text style={styles.pairingPrice}>S/ {s.price}</Text>}
                      </View>
                      {s.id && (
                        <TouchableOpacity
                          onPress={() => handleAddPairing(s)}
                          disabled={alreadyAdded || adding === s.id}
                          style={[
                            styles.addBtn,
                            adding === s.id && styles.addBtnLoading,
                            alreadyAdded    && styles.addBtnAdded,
                            { backgroundColor: alreadyAdded ? '#2ECC71' : '#F97316' },
                          ]}
                        >
                          <Text style={styles.addBtnText}>
                            {adding === s.id ? '·' : alreadyAdded ? '✓' : '+'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={[styles.modalCancel, { marginTop: 12 }]} onPress={() => setPairingItem(null)}>
              <Text style={styles.modalCancelText}>Continuar sin agregar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F5F5F5' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText:        { marginTop: 8, color: '#aaa', fontSize: 14 },
  searchBox:          { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput:        { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#333' },
  catRow:             { maxHeight: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  catContent:         { paddingHorizontal: 10, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  catBtn:             { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa' },
  catBtnActive:       { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  catBtnText:         { fontSize: 12, fontWeight: '600', color: '#666' },
  catBtnTextActive:   { color: '#fff' },
  list:               { paddingBottom: 100 },
  sectionHeader:      { backgroundColor: '#EFEFEF', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  sectionTitle:       { fontSize: 12, fontWeight: 'bold', color: '#E74C3C', letterSpacing: 0.5 },
  menuItem:           { backgroundColor: '#fff', flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  menuInfo:           { flex: 1, marginRight: 10 },
  nameRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  menuName:           { fontSize: 15, fontWeight: '600', color: '#333' },
  promoBadge:         { backgroundColor: '#FEF3C7', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  promoBadgeText:     { fontSize: 10, color: '#D97706', fontWeight: 'bold' },
  menuDesc:           { fontSize: 12, color: '#999', marginTop: 2 },
  menuRight:          { alignItems: 'center', gap: 6 },
  priceBlock:         { alignItems: 'flex-end' },
  menuPrice:          { fontSize: 15, fontWeight: 'bold', color: '#E74C3C' },
  priceStrike:        { fontSize: 12, color: '#bbb', textDecorationLine: 'line-through' },
  priceDiscounted:    { fontSize: 14, fontWeight: 'bold', color: '#F97316' },
  price2x1:           { fontSize: 10, color: '#F97316' },
  addBtn:             { backgroundColor: '#E74C3C', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  addBtnLoading:      { backgroundColor: '#ccc' },
  addBtnAdded:        { backgroundColor: '#2ECC71' },
  addBtnText:         { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 26 },
  emptyEmoji:         { fontSize: 48, marginBottom: 12 },
  emptyText:          { fontSize: 15, color: '#888', fontWeight: '600', marginBottom: 10 },
  clearText:          { color: '#E74C3C', fontWeight: '600', fontSize: 14 },
  footerBar:          { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  viewOrderBtn:       { backgroundColor: '#2ECC71', borderRadius: 12, padding: 14, alignItems: 'center' },
  viewOrderText:      { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  // Modales
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:           { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  modalTitle:         { fontSize: 17, fontWeight: 'bold', color: '#333' },
  modalPrice:         { fontSize: 13, color: '#E74C3C', fontWeight: '600' },
  modalLabel:         { fontSize: 13, color: '#777' },
  noteInput:          { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, fontSize: 14, color: '#333', minHeight: 64, textAlignVertical: 'top' },
  modalBtns:          { flexDirection: 'row', gap: 8 },
  modalConfirm:       { flex: 1, backgroundColor: '#E74C3C', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalConfirmText:   { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalCancel:        { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalCancelText:    { color: '#555', fontWeight: '600', fontSize: 15 },
  pairingHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pairingSubtitle:    { fontSize: 11, color: '#F97316', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  pairingTitle:       { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 2 },
  closeX:             { fontSize: 22, color: '#aaa', lineHeight: 26 },
  pairingWait:        { marginTop: 8, color: '#aaa', fontSize: 13 },
  pairingEmpty:       { textAlign: 'center', color: '#aaa', paddingVertical: 20, fontSize: 14 },
  pairingItem:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pairingName:        { fontSize: 14, fontWeight: '600', color: '#333' },
  pairingReason:      { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 2 },
  pairingPrice:       { fontSize: 13, color: '#E74C3C', fontWeight: 'bold', marginTop: 2 },
});
