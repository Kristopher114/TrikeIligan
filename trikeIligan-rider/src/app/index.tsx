import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userName = await AsyncStorage.getItem('userFullName');
        if (userName) {
          // User is already logged in, redirect to home directly
          router.replace('/home');
        } else {
          setIsCheckingLogin(false);
        }
      } catch (e) {
        setIsCheckingLogin(false);
      }
    };
    checkLoginStatus();
  }, []);

  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  if (!fontsLoaded || isCheckingLogin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.iconContainer}>
            <Image
              source={require('../../assets/images/tricycle.png')}
              style={styles.icon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>TrikeIligan
          </Text>
          <Text style={styles.title}>Rider App
          </Text>
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupButton} onPress={() => router.push('/signup')}>
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1B6E45',
  },
  container: {
    flex: 1,
    backgroundColor: '#1B6E45',
    alignItems: 'center',
    paddingVertical: 50,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 100, // Make room for the absolute bottom container
  },
  iconContainer: {
    backgroundColor: '#c1e6cf',
    width: 130,
    height: 130,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 80,
    height: 80,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'Outfit_700Bold',
  },
  bottomContainer: {
    position: 'absolute',
    top: height - 180, // Glued to its original position relative to screen height
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },
  signupButton: {
    backgroundColor: '#e0e0e0',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',


  },
  signupText: {
    color: '#26734d',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
});
