import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAppStore();

  const handleLogin = () => {
    if (email && password) login(email, password);
  };

  const fillDemo = (role: 'waiter' | 'cook' | 'manager') => {
    const emails = {
      waiter: 'mesero@restaurante.com',
      cook: 'cocina@restaurante.com',
      manager: 'gerente@restaurante.com',
    };
    setEmail(emails[role]);
    setPassword('1234');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>🍽️</Text>
        <Text style={styles.title}>Restaurante AI</Text>
        <Text style={styles.subtitle}>Sistema de gestión inteligente</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Ingresar</Text>
          }
        </TouchableOpacity>

        <Text style={styles.demoTitle}>Acceso rápido demo:</Text>
        <View style={styles.demoRow}>
          <TouchableOpacity style={styles.demoBtn} onPress={() => fillDemo('waiter')}>
            <Text style={styles.demoText}>🧑‍🍽️ Mesero</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoBtn} onPress={() => fillDemo('cook')}>
            <Text style={styles.demoText}>👨‍🍳 Cocina</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoBtn} onPress={() => fillDemo('manager')}>
            <Text style={styles.demoText}>👔 Gerente</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E74C3C', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 28, elevation: 8 },
  logo: { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#E74C3C' },
  subtitle: { fontSize: 13, textAlign: 'center', color: '#999', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 15, color: '#333', backgroundColor: '#fafafa' },
  button: { backgroundColor: '#E74C3C', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  demoTitle: { textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 24, marginBottom: 10 },
  demoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  demoBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, alignItems: 'center' },
  demoText: { fontSize: 12, color: '#555', fontWeight: '500' },
});
