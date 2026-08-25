import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
export default function SignupScreen() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);

    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSignUp = async () => {
        // Basic email regex pattern
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            setEmailError('Email is required.');
            Alert.alert('Error', 'Please enter your email address');
            return;
        } else if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address.');
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        } else if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        } else if (password.length < 6) {
            Alert.alert('Error', 'Passwords must be at least 6 characters long');
            return;
        }

        if (!username || !fullName || !phoneNumber) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('https://trikeiligan.onrender.com/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    fullName,
                    email,
                    phoneNumber,
                    password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', 'Account created successfully!');
                router.replace('/login');
            } else {
                Alert.alert('Signup Failed', data.message || 'An error occurred during signup.');
            }
        } catch (error) {
            console.error('Signup error:', error);
            Alert.alert('Network Error', 'Could not connect to the server. Please check your connection.');
        } finally {
            setIsSubmitting(false);
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
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backIcon}>←</Text>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Stationary Content */}
                <View style={{ paddingHorizontal: 24, paddingTop: 30 }}>
                    <Text style={styles.title}>Create an Account</Text>
                    <Text style={styles.subtitle}>Join us and explore Iligan!</Text>
                </View>

                {/* Form Content */}
                <KeyboardAwareScrollView
                    enableOnAndroid={true}
                    extraScrollHeight={20}
                    style={{ flex: 1, paddingHorizontal: 24 }}
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="juandelacruz123"
                                placeholderTextColor="#A0A0A0"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Juan Dela Cruz"
                                placeholderTextColor="#A0A0A0"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={[styles.input, emailError ? { borderColor: 'red' } : null]}
                                placeholder='juandlc@gmail.com'
                                placeholderTextColor="#A0A0A0"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setEmailError('');
                                }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder='+63 9123456789'
                                placeholderTextColor="#A0A0A0"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    secureTextEntry={!showPassword}
                                    placeholder="*****"
                                    placeholderTextColor="#A0A0A0"
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#1B6E45" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    secureTextEntry={!showPassword}
                                    placeholder="*****"
                                    placeholderTextColor="#A0A0A0"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#1B6E45" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Bottom Button */}
                    <View style={[styles.bottomContainer, { paddingHorizontal: 0, paddingBottom: 20 }]}>
                        <TouchableOpacity
                            style={[styles.loginButton, isSubmitting && { opacity: 0.7 }]}
                            onPress={handleSignUp}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAwareScrollView>

            </KeyboardAvoidingView>
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
        paddingTop: 30,
    },
    title: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 32,
        color: '#000000',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#1B6E45',
        marginBottom: 40,
    },
    form: {
        gap: 6,
    },
    inputGroup: {
        gap: 2,
    },
    label: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#000000',
    },
    input: {
        fontFamily: 'Outfit_500Medium',
        backgroundColor: '#E4F6EB',
        borderWidth: 1,
        borderColor: '#1B6E45',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#000000',
    },
    errorText: {
        fontFamily: 'Outfit_400Regular',
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E4F6EB',
        borderWidth: 1,
        borderColor: '#1B6E45',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    passwordInput: {
        flex: 1,
        fontFamily: 'Outfit_500Medium',
        paddingVertical: 14,
        fontSize: 16,
        color: '#000000',
    },
    eyeIcon: {
        padding: 4,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    forgotPasswordText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#1B6E45',
    },
    bottomContainer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 20,
    },
    loginButton: {
        backgroundColor: '#1B6E45',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    loginButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#FFFFFF',
        fontSize: 16,
    },
});
