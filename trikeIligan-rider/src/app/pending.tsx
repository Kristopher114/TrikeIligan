import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_400Regular } from '@expo-google-fonts/outfit';

export default function PendingScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_500Medium,
    Outfit_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={80} color="#F59E0B" />
        </View>
        <Text style={styles.title}>Application Pending</Text>
        <Text style={styles.message}>
          Your driver application is currently under review by our administration team. 
          Please check back later or wait for our notification once you are approved.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: '#111111',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#1B6E45',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Outfit_600SemiBold',
    color: 'white',
    fontSize: 16,
  }
});
