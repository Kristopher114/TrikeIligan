import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_400Regular, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EarningsScreen() {
    const router = useRouter();
    const [balance, setBalance] = useState<number>(0);
    const [amount, setAmount] = useState('');
    const [paypalEmail, setPaypalEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const [fontsLoaded] = useFonts({
        Outfit_700Bold,
        Outfit_600SemiBold,
        Outfit_500Medium,
        Outfit_400Regular,
    });

    const fetchBalance = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) return;

            const res = await fetch(`https://trikeiligan.onrender.com/api/wallet/balance/${userId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success') {
                    setBalance(parseFloat(data.balance) || 0);
                }
            }
        } catch (error) {
            console.error("Failed to fetch balance", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, []);

    const handleWithdraw = async () => {
        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount to withdraw.");
            return;
        }

        if (withdrawAmount > balance) {
            Alert.alert("Insufficient Balance", "You cannot withdraw more than your current balance.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(paypalEmail)) {
            Alert.alert("Invalid Email", "Please enter a valid PayPal email address.");
            return;
        }

        setIsWithdrawing(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            const res = await fetch(`https://trikeiligan.onrender.com/api/wallet/payout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    amount: withdrawAmount,
                    paypalEmail: paypalEmail.trim()
                })
            });

            const data = await res.json();
            if (data.status === 'success') {
                Alert.alert("Success", "Your withdrawal request has been processed and sent to your PayPal account!");
                setAmount('');
                setPaypalEmail('');
                fetchBalance(); // Refresh balance
            } else {
                Alert.alert("Withdrawal Failed", data.message || "Something went wrong.");
            }
        } catch (error) {
            console.error("Cashout error", error);
            Alert.alert("Error", "Network error. Please try again later.");
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Earnings & Cashout</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        {/* Balance Card */}
                        <View style={styles.balanceCard}>
                            <Ionicons name="wallet" size={40} color="#1B6E45" style={styles.walletIcon} />
                            <Text style={styles.balanceLabel}>Current Wallet Balance</Text>
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#1B6E45" style={{ marginTop: 10 }} />
                            ) : (
                                <Text style={styles.balanceValue}>₱ {balance.toFixed(2)}</Text>
                            )}
                        </View>

                        {/* Withdrawal Form */}
                        <View style={styles.formContainer}>
                            <Text style={styles.sectionTitle}>Withdraw to PayPal</Text>
                            
                            <Text style={styles.inputLabel}>Amount to Withdraw (₱)</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.currencyPrefix}>₱</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    value={amount}
                                    onChangeText={setAmount}
                                    editable={!isWithdrawing && !isLoading}
                                />
                            </View>
                            
                            <Text style={styles.inputLabel}>PayPal Email Address</Text>
                            <View style={[styles.inputContainer, { paddingLeft: 16 }]}>
                                <Ionicons name="mail-outline" size={20} color="#7B9B88" style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="driver@example.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={paypalEmail}
                                    onChangeText={setPaypalEmail}
                                    editable={!isWithdrawing && !isLoading}
                                />
                            </View>

                            <TouchableOpacity 
                                style={[styles.withdrawButton, (isWithdrawing || isLoading || balance <= 0) && styles.withdrawButtonDisabled]}
                                onPress={handleWithdraw}
                                disabled={isWithdrawing || isLoading || balance <= 0}
                            >
                                {isWithdrawing ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.withdrawButtonText}>Withdraw to PayPal</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.infoBox}>
                                <Ionicons name="information-circle-outline" size={20} color="#0277BD" />
                                <Text style={styles.infoText}>
                                    Withdrawals are processed instantly via PayPal. Make sure your PayPal account is verified to avoid any issues receiving funds.
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
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
        backgroundColor: '#F9F9F9',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 20,
        color: '#000000',
    },
    scrollContent: {
        padding: 20,
    },
    balanceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#1B6E45',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E8F5E9',
    },
    walletIcon: {
        marginBottom: 12,
    },
    balanceLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#555555',
        marginBottom: 8,
    },
    balanceValue: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 36,
        color: '#1B6E45',
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 18,
        color: '#333333',
        marginBottom: 20,
    },
    inputLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#555555',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    currencyPrefix: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 18,
        color: '#333',
        paddingLeft: 16,
        paddingRight: 8,
    },
    input: {
        flex: 1,
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#333',
        paddingVertical: 14,
        paddingRight: 16,
    },
    withdrawButton: {
        backgroundColor: '#1B6E45',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#1B6E45',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    withdrawButtonDisabled: {
        backgroundColor: '#A0C2B0',
        shadowOpacity: 0,
        elevation: 0,
    },
    withdrawButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#E1F5FE',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#0277BD',
        marginLeft: 8,
        lineHeight: 18,
    },
});
