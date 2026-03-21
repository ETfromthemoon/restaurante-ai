import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppStore } from '../store/useAppStore';

import LoginScreen              from '../screens/LoginScreen';
import TableMapScreen           from '../screens/TableMapScreen';
import OrderScreen              from '../screens/OrderScreen';
import MenuSelectScreen         from '../screens/MenuSelectScreen';
import KitchenQueueScreen       from '../screens/KitchenQueueScreen';
import KitchenOrderDetailScreen from '../screens/KitchenOrderDetailScreen';
import TableOrderHistoryScreen  from '../screens/TableOrderHistoryScreen';

export type RootStackParamList = {
  Login: undefined;
  TableMap: undefined;
  Order: { tableId: string; tableNumber: number };
  MenuSelect: { orderId: string };
  KitchenQueue: undefined;
  KitchenOrderDetail: { orderId: string };
  TableOrderHistory: { tableId: string; tableNumber: number };
};

const Stack = createStackNavigator<RootStackParamList>();

const headerStyle = {
  headerStyle: { backgroundColor: '#E74C3C' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

const darkHeaderStyle = {
  headerStyle: { backgroundColor: '#16213E' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

export default function Navigation() {
  const user = useAppStore(s => s.user);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : user.role === 'cook' ? (
          <>
            <Stack.Screen
              name="KitchenQueue"
              component={KitchenQueueScreen}
              options={{ ...darkHeaderStyle, title: '🍳 Cocina' }}
            />
            <Stack.Screen
              name="KitchenOrderDetail"
              component={KitchenOrderDetailScreen}
              options={{ ...darkHeaderStyle, title: 'Detalle de Pedido' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="TableMap"
              component={TableMapScreen}
              options={{ ...headerStyle, title: '🍽️ Mesas' }}
            />
            <Stack.Screen
              name="Order"
              component={OrderScreen}
              options={({ route }) => ({ ...headerStyle, title: `Mesa ${route.params.tableNumber}` })}
            />
            <Stack.Screen
              name="MenuSelect"
              component={MenuSelectScreen}
              options={{ ...headerStyle, title: '🍴 Agregar Platos' }}
            />
            <Stack.Screen
              name="TableOrderHistory"
              component={TableOrderHistoryScreen}
              options={({ route }) => ({ ...headerStyle, title: `Historial Mesa ${route.params.tableNumber}` })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
