import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import TabBar from '../components/TabBar';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

export default function HomeScreen() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [userId, setUserId] = useState('');
    const [walletBalance, setWalletBalance] = useState('0.00');
    const [isToppingUp, setIsToppingUp] = useState(false);

    const [showName, setShowName] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                try {
                    const name = await AsyncStorage.getItem('userFullName');
                    if (name) setFullName(name);

                    const id = await AsyncStorage.getItem('userId');
                    if (id) {
                        setUserId(id);
                        fetchBalance(id);
                    }
                } catch (e) {
                    console.error("Failed to load user data", e);
                }
            };
            loadData();
        }, [])
    );

    const fetchBalance = async (id: string) => {
        try {
            const res = await fetch(`https://trikeiligan.onrender.com/api/wallet/balance/${id}`);
            const data = await res.json();
            if (data.status === 'success') {
                setWalletBalance(data.balance);
            }
        } catch (error) {
            console.error('Fetch balance error:', error);
        }
    };

    const handleTopUp = async () => {
        if (!userId) return;
        setIsToppingUp(true);
        try {
            const res = await fetch('https://trikeiligan.onrender.com/api/wallet/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: 500 }) // Example fixed amount for now
            });
            const data = await res.json();
            
            if (data.status === 'success' && data.checkoutUrl && data.orderId) {
                // Open PayPal Checkout in a secure auth session that redirects back to the app
                const result = await WebBrowser.openAuthSessionAsync(
                    data.checkoutUrl, 
                    'trikeiligan://home'
                );

                // If user didn't cancel, capture the payment
                if (result.type === 'success') {
                    const captureRes = await fetch('https://trikeiligan.onrender.com/api/wallet/paypal/capture-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: data.orderId })
                    });
                    const captureData = await captureRes.json();
                    
                    if (captureData.status === 'success') {
                        alert('Top-up successful!');
                    } else {
                        alert('Payment was not completed.');
                    }
                } else if (result.type === 'cancel') {
                    alert('Top-up cancelled.');
                }
                
                // Refresh balance regardless
                fetchBalance(userId);
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
            <StatusBar style="light" backgroundColor="#1B6E45" />
            <View style={styles.container}>

                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>Good day 👋</Text>
                    <Text style={styles.userName}>{fullName || 'Guest'}</Text>
                </View>
                {/* Services Grid */}
                <View style={styles.gridContainer}>
                    {/* Single */}
                    <TouchableOpacity style={styles.serviceItem} onPress={() => router.push({ pathname: '/route', params: { vehicleType: 'SINGLE' } })}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="motorbike" size={40} color="#1B6E45" />
                        </View>
                        <Text style={styles.serviceText}>Single</Text>
                    </TouchableOpacity>

                    {/* Trike */}
                    <TouchableOpacity style={styles.serviceItem} onPress={() => router.push({ pathname: '/route', params: { vehicleType: 'TRICYCLE' } })}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="rickshaw" size={40} color="#1B6E45" />
                        </View>
                        <Text style={styles.serviceText}>Trike</Text>
                    </TouchableOpacity>


                </View>

                {/*Online Money Balance*/}
                <View style={styles.balanceCard}>
                    <View>
                        <Text style={styles.balanceLabel}>Online Money Balance</Text>
                        <Text style={styles.balanceAmount}>₱{walletBalance}</Text>
                    </View>
                    <TouchableOpacity style={styles.topupButton} onPress={handleTopUp} disabled={isToppingUp}>
                        <Text style={styles.topupButtonText}>{isToppingUp ? 'Loading...' : 'Top Up'}</Text>
                    </TouchableOpacity>
                </View>


                {/* Spacer to push TabBar to bottom */}
                <View style={{ flex: 1 }} />

                {/* Reusable Tab Bar */}
                <TabBar activeTab="home" />

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
        backgroundColor: '#F9F9F9',
    },
    header: {
        backgroundColor: '#1B6E45',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    greeting: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    userName: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 24,
        color: '#FFFFFF',
    },
    balanceCard: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 16,
        marginTop: 20,
        marginHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    balanceLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
    },
    balanceAmount: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 28,
        color: '#1B6E45',
    },
    topupButton: {
        backgroundColor: '#E4F6EB',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C6E8D4',
    },
    topupButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#1B6E45',
        fontSize: 14,
    },
    gridContainer: {
        flexDirection: 'row',
        padding: 24,
        gap: 20,
        marginTop: 20,
    },
    serviceItem: {
        alignItems: 'center',
        width: 100, // Fixed width for consistent grid
    },
    iconCircle: {
        width: 80,
        height: 80,
        backgroundColor: '#E4F6EB',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#C6E8D4',
    },
    serviceText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#333333',
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderColor: '#E0E0E0',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12,
        marginTop: 4,
    },
});
