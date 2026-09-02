import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TabBar from '../components/TabBar';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');

    const [showName, setShowName] = useState(false);

    useEffect(() => {
        const loadName = async () => {
            try {
                const name = await AsyncStorage.getItem('userFullName');
                if (name) setFullName(name);
            } catch (e) {
                console.error("Failed to load name", e);
            }
        };
        loadName();
    }, []);




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
                    <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/route')}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="motorbike" size={40} color="#1B6E45" />
                        </View>
                        <Text style={styles.serviceText}>Single</Text>
                    </TouchableOpacity>

                    {/* Trike */}
                    <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/route')}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="rickshaw" size={40} color="#1B6E45" />
                        </View>
                        <Text style={styles.serviceText}>Trike</Text>
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
