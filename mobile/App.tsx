import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import Navigation from './src/navigation';
import { useAppStore } from './src/store/useAppStore';
import { socketService } from './src/services/socketService';

export default function App() {
  const {
    restoreSession, error, clearError,
    user, token,
    handleOrderUpdated, handleTableUpdated, handleOrderReady, handleItemStatus,
  } = useAppStore();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  // ─── WebSockets: conectar al autenticarse, desconectar al cerrar sesión ─────
  useEffect(() => {
    if (!user || !token) {
      socketService.disconnect();
      return;
    }
    socketService.connect(token);
    socketService.on('order:updated',     (d: any) => handleOrderUpdated(d.order));
    socketService.on('table:updated',     (d: any) => handleTableUpdated(d.table));
    socketService.on('order:ready',       (d: any) => handleOrderReady(d));
    socketService.on('order:item_status', (d: any) => handleItemStatus(d));
    return () => socketService.disconnect();
  }, [user?.id]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Navigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
