import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';

export default function RiderVerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Countdown timer for Resend Code
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (text: string, index: number) => {
    const numeric = text.replace(/[^0-9]/g, '');

    // Handle paste of full 6-digit code
    if (numeric.length > 1) {
      const pasted = numeric.slice(0, 6).split('');
      const nextDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        nextDigits[i] = pasted[i] || '';
      }
      setDigits(nextDigits);
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = numeric;
    setDigits(nextDigits);

    if (numeric && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter the full 6-digit verification code sent to your email.');
      return;
    }

    if (!email) {
      Alert.alert('Missing Email', 'Email address is missing. Please go back and try again.');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('https://trikeiligan.onrender.com/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Email Verified!',
          'Your email has been verified and your driver application is currently PENDING admin review. Please wait for the admin to approve your license before receiving rides.',
          [{ text: 'Go to Login', onPress: () => router.replace('/login') }]
        );
      } else {
        Alert.alert('Verification Failed', data.message || 'Invalid or expired verification code.');
      }
    } catch (error) {
      console.error('Verify email error:', error);
      Alert.alert('Network Error', 'Could not connect to the server. Please check your internet connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    if (!email) {
      Alert.alert('Error', 'Missing email address.');
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('https://trikeiligan.onrender.com/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setDigits(['', '', '', '', '', '']);
        setCooldown(60);
        inputRefs.current[0]?.focus();
        Alert.alert('Code Sent', data.message || 'A new 6-digit code has been sent to your email.');
      } else {
        Alert.alert('Resend Failed', data.message || 'Could not resend verification code.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      Alert.alert('Network Error', 'Could not connect to the server. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        bounces={false}
        enableOnAndroid={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/login');
              }
            }}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={38} color="#1B6E45" />
          </View>

          <Text style={styles.title}>Verify Driver Email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit verification code to{'\n'}
            <Text style={styles.emailHighlight}>{email || 'your email address'}</Text>
          </Text>

          {/* 6-Digit OTP Boxes */}
          <View style={styles.otpContainer}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={cooldown > 0 || isResending}
            >
              <Text
                style={[
                  styles.resendLink,
                  (cooldown > 0 || isResending) && styles.resendLinkDisabled,
                ]}
              >
                {isResending
                  ? 'Sending...'
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Verify Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.verifyButton, isVerifying && { opacity: 0.7 }]}
            onPress={handleVerify}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Email</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#000000',
    fontFamily: 'Outfit_500Medium',
  },
  backText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    alignItems: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E4F6EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1B6E45',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 30,
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  emailHighlight: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#1B6E45',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
    marginBottom: 28,
  },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    backgroundColor: '#F4FBF7',
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
    color: '#111111',
  },
  otpBoxFilled: {
    borderColor: '#1B6E45',
    backgroundColor: '#E4F6EB',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resendPrompt: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#666666',
  },
  resendLink: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#1B6E45',
  },
  resendLinkDisabled: {
    color: '#999999',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  verifyButton: {
    backgroundColor: '#1B6E45',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
    fontSize: 16,
  },
});
