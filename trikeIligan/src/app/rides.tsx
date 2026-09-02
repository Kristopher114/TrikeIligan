import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_400Regular, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TabBar from '../components/TabBar';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RidesScreen() {
    const router = useRouter();
    const [rides, setRides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRides = async () => {
            try {
                const userId = await AsyncStorage.getItem('userId');
                if (!userId) {
                    setIsLoading(false);
                    return;
                }

                // Call the backend API (ensure backend is updated locally or pushed to Render)
                const res = await fetch(`https://trikeiligan.onrender.com/api/rides/${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        setRides(data.rides || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch rides", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRides();
    }, []);

    const [fontsLoaded] = useFonts({
        Outfit_700Bold,
        Outfit_600SemiBold,
        Outfit_500Medium,
        Outfit_400Regular,
    });

    if (!fontsLoaded) {
        return null;
    }

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderItem = ({ item }) => (
        <View style={styles.rideCard}>
            <View style={styles.rideHeader}>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
                <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
            </View>

            <View style={styles.locationContainer}>
                <Ionicons name="location" size={20} color="#D32F2F" />
                <Text style={styles.destinationText} numberOfLines={2}>
                    {item.dropoff_address}
                </Text>
            </View>

            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#7B9B88" />
                    <Text style={styles.detailText}>{item.driver_name || 'No driver yet'}</Text>
                </View>

                <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={20} color="#1B6E45" />
                    <Text style={[styles.detailText, { color: '#1B6E45', fontFamily: 'Outfit_600SemiBold' }]}>
                        ₱{item.base_fare}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Recent Rides</Text>
                </View>

                {/* Ride List */}
                {isLoading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#1B6E45" />
                        <Text style={styles.loadingText}>Loading your rides...</Text>
                    </View>
                ) : rides.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <MaterialCommunityIcons name="motorbike" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>You haven't taken any rides yet!</Text>
                    </View>
                ) : (
                    <FlatList
                        data={rides}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                    />
                )}

                {/* Reusable Tab Bar */}
                <TabBar activeTab="rides" />
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
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 20,
        color: '#000000',
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#7B9B88',
        marginTop: 12,
    },
    emptyText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 18,
        color: '#A0A0A0',
        marginTop: 16,
        textAlign: 'center',
    },
    rideCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    rideHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 12,
        color: '#1B6E45',
    },
    timeText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#A0A0A0',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    destinationText: {
        flex: 1,
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#333333',
        marginLeft: 8,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#555555',
        marginLeft: 6,
    },
});
