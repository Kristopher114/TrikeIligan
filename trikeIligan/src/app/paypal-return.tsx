import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaypalReturn() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [statusText, setStatusText] = useState('Finalizing top-up...');

    useEffect(() => {
        // Dismiss the browser if it's still open
        WebBrowser.dismissBrowser();

        const captureOrder = async () => {
            const orderId = params.token;
            if (!orderId) {
                setStatusText('No order ID found.');
                setTimeout(() => router.replace('/home'), 1500);
                return;
            }

            try {
                const urlUserId = params.userId;
                const finalUserId = urlUserId || await AsyncStorage.getItem('userId');
                
                const res = await fetch('https://trikeiligan.onrender.com/api/wallet/paypal/capture-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, userId: finalUserId })
                });
                const data = await res.json();
                
                if (data.status === 'success') {
                    setStatusText('Top-up successful! Redirecting...');
                } else {
                    setStatusText('Payment failed or already captured.');
                }
            } catch (error) {
                console.error('Capture error in return screen:', error);
                setStatusText('Network error.');
            } finally {
                setTimeout(() => {
                    router.replace('/home');
                }, 1500);
            }
        };

        captureOrder();
    }, [params.token]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#1B6E45" />
            <Text style={styles.text}>{statusText}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF'
    },
    text: {
        marginTop: 16,
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#1B6E45'
    }
});
