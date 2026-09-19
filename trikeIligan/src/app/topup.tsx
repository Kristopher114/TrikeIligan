import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function TopUpScreen() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [isToppingUp, setIsToppingUp] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState<number>(500);

    const AMOUNTS = [100, 500, 1000, 2999];

    useEffect(() => {
        AsyncStorage.getItem('userId').then(id => {
            if (id) setUserId(id);
        });
    }, []);

    const handleTopUp = async () => {
        if (!userId) return;
        setIsToppingUp(true);
        try {
            const baseUrl = Linking.createURL('paypal-return');
            const returnUrl = `${baseUrl}?userId=${userId}`;
            
            const res = await fetch('https://trikeiligan.onrender.com/api/wallet/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: selectedAmount, returnUrl })
            });
            const data = await res.json();
            
            if (data.status === 'success' && data.checkoutUrl && data.orderId) {
                // Open PayPal Checkout
                const result = await WebBrowser.openAuthSessionAsync(
                    data.checkoutUrl, 
                    returnUrl
                );

                // Wait for the result
                if (result.type === 'success') {
                    const captureRes = await fetch('https://trikeiligan.onrender.com/api/wallet/paypal/capture-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: data.orderId })
                    });
                    const captureData = await captureRes.json();
                    
                    if (captureData.status === 'success') {
                        alert('Top-up successful!');
                        router.replace('/home');
                    } else if (captureData.message !== 'Topup already successful') {
                        // We ignore already captured because paypal-return.tsx might have captured it
                        alert('Payment was not completed.');
                    } else {
                        // It was already captured smoothly
                        alert('Top-up successful!');
                        router.replace('/home');
                    }
                } else if (result.type === 'cancel') {
                    alert('Top-up cancelled.');
                }
            } else {
                alert('Failed to initiate top-up.');
            }
        } catch (error) {
            console.error('Topup error:', error);
            alert('An error occurred while topping up.');
        } finally {
            setIsToppingUp(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Top Up Wallet</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.label}>Select Amount (₱)</Text>
                    
                    <View style={styles.grid}>
                        {AMOUNTS.map((amount) => (
                            <TouchableOpacity 
                                key={amount} 
                                style={[
                                    styles.amountCard, 
                                    selectedAmount === amount && styles.amountCardSelected
                                ]}
                                onPress={() => setSelectedAmount(amount)}
                            >
                                <Text style={[
                                    styles.amountText,
                                    selectedAmount === amount && styles.amountTextSelected
                                ]}>
                                    {amount}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity 
                        style={styles.payButton} 
                        onPress={handleTopUp} 
                        disabled={isToppingUp}
                    >
                        {isToppingUp ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.payButtonText}>Pay ₱{selectedAmount} with PayPal</Text>
                        )}
                    </TouchableOpacity>
                </View>
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
        backgroundColor: '#F9F9F9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 20,
        color: '#333333',
    },
    content: {
        padding: 24,
    },
    label: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#666666',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 40,
    },
    amountCard: {
        width: '47%',
        backgroundColor: '#FFFFFF',
        paddingVertical: 24,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#EEEEEE',
    },
    amountCardSelected: {
        borderColor: '#1B6E45',
        backgroundColor: '#E4F6EB',
    },
    amountText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 24,
        color: '#333333',
    },
    amountTextSelected: {
        color: '#1B6E45',
    },
    payButton: {
        backgroundColor: '#1B6E45',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#1B6E45',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    payButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 18,
        color: '#FFFFFF',
    }
});
