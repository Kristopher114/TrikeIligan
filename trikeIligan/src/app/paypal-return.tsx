import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function PaypalReturn() {
    const router = useRouter();

    useEffect(() => {
        // Expo WebBrowser typically consumes this intent before we even reach here.
        // If we do reach here (e.g. in standalone mode if WebBrowser closed prematurely), 
        // we just smoothly navigate back to home.
        const timer = setTimeout(() => {
            router.replace('/home');
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#1B6E45" />
            <Text style={styles.text}>Finalizing top-up...</Text>
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
