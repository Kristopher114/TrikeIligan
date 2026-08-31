import { StyleSheet, Text, View, TouchableOpacity, Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';

const { width } = Dimensions.get('window');

export default function RiderSelectionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [fare, setFare] = useState('55.00'); // Default
    const [eta, setEta] = useState('2'); // Default
    const [isCalculating, setIsCalculating] = useState(true);

    useEffect(() => {
        const fetchFare = async () => {
            if (params.pickupLat && params.pickupLon && params.dropoffLat && params.dropoffLon) {
                try {
                    // Use Render backend
                    const response = await fetch('https://trikeiligan.onrender.com/api/calculate-fare', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pickupLat: parseFloat(params.pickupLat as string),
                            pickupLon: parseFloat(params.pickupLon as string),
                            dropLat: parseFloat(params.dropoffLat as string),
                            dropLon: parseFloat(params.dropoffLon as string)
                        })
                    });
                    if (response.ok) {
                        const json = await response.json();
                        if (json.status === 'success') {
                            setFare(json.data.fare.toFixed(2));
                            setEta(json.data.estimatedTimeMins.toString());
                        }
                    } else {
                        setFare('Error');
                        console.error('Render returned: ' + response.status);
                    }
                } catch (error) {
                    console.error("Error calculating fare:", error);
                    setFare('Error');
                } finally {
                    setIsCalculating(false);
                }
            } else {
                setFare('No Coords');
                setIsCalculating(false); // Missing coordinates
            }
        };

        fetchFare();
    }, [params]);

    const [fontsLoaded] = useFonts({
        Outfit_700Bold,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_400Regular,
    });

    if (!fontsLoaded) return null;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            
            {/* Top Map Area Placeholder */}
            <View style={styles.mapArea}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Ionicons name="map-outline" size={64} color="#A0A0A0" />
                <Text style={styles.mapPlaceholderText}>Map View</Text>
            </View>

            {/* Bottom Sheet Area */}
            <View style={styles.bottomSheet}>
                
                {/* Header */}
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Select Available Ride</Text>
                    <Text style={styles.sheetSubtitle}>3 Riders Nearby</Text>
                </View>

                {/* Price */}
                <View style={styles.priceContainer}>
                    {isCalculating ? (
                        <Text style={styles.priceText}>Calculating...</Text>
                    ) : (
                        <Text style={styles.priceText}>₱{fare}</Text>
                    )}
                    <Text style={styles.priceSubtext}>Fixed price</Text>
                </View>

                {/* Driver Card */}
                <View style={styles.driverCard}>
                    {/* Status Badge */}
                    <View style={styles.badgeRow}>
                        <View style={styles.statusBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#1B6E45" style={{marginRight: 4}} />
                            <Text style={styles.statusText}>Confirmed</Text>
                        </View>
                        <View style={styles.etaBadge}>
                            <Ionicons name="time-outline" size={12} color="#000" style={{marginRight: 4}} />
                            <Text style={styles.etaText}>{eta} mins away</Text>
                        </View>
                    </View>

                    {/* Driver Profile */}
                    <View style={styles.driverProfileRow}>
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={24} color="#FFF" />
                        </View>
                        <View style={styles.driverInfo}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Text style={styles.driverName}>Danilo G.</Text>
                                <Ionicons name="star" size={14} color="#FFD700" style={{marginLeft: 4, marginRight: 2}} />
                                <Text style={styles.ratingText}>4.9</Text>
                            </View>
                            <Text style={styles.vehicleText}>Honda TMX 125 (Black)</Text>
                            <Text style={styles.etaSubtext}>{eta} mins away</Text>
                        </View>
                        <View style={styles.bestValueBadge}>
                            <Text style={styles.bestValueText}>BEST VALUE</Text>
                        </View>
                    </View>

                    {/* Route Info inside card */}
                    <View style={styles.routeAcceptedBox}>
                        <Text style={styles.routeAcceptedText}>Route accepted</Text>
                        <View style={styles.routeDetailsRow}>
                            <Ionicons name="location" size={16} color="#1B6E45" />
                            <View style={{marginLeft: 8}}>
                                <Text style={styles.routeTitle}>Pickup → Dropoff</Text>
                                <Text style={styles.routeDesc}>Fixed price • No extra charges</Text>
                            </View>
                        </View>
                        
                        {/* Track Button */}
                        <TouchableOpacity style={styles.trackButton}>
                            <Ionicons name="paper-plane" size={16} color="#FFF" style={{marginRight: 8}} />
                            <Text style={styles.trackButtonText}>Track</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Payment Row */}
                <View style={styles.paymentRow}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="cash-outline" size={20} color="#1B6E45" />
                        <Text style={styles.paymentText}>Cash Payment</Text>
                    </View>
                    <TouchableOpacity>
                        <Text style={styles.promoText}>Promo Applied {'>'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity style={styles.confirmButton}>
                    <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    mapArea: {
        flex: 1,
        backgroundColor: '#EAEAEA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: '#FFF',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    mapPlaceholderText: {
        fontFamily: 'Outfit_500Medium',
        color: '#A0A0A0',
        marginTop: 8,
    },
    bottomSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        marginTop: -20, // Overlap map
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sheetTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 18,
        color: '#000',
    },
    sheetSubtitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 12,
        color: '#1B6E45',
    },
    priceContainer: {
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    priceText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 24,
        color: '#000',
    },
    priceSubtext: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#757575',
    },
    driverCard: {
        backgroundColor: '#E4F6EB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1B6E45',
        marginBottom: 16,
    },
    badgeRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1F0DE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    statusText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 10,
        color: '#1B6E45',
    },
    etaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    etaText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 10,
        color: '#000',
    },
    driverProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#A0A0A0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: '#000',
    },
    ratingText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 12,
        color: '#757575',
    },
    vehicleText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#757575',
        marginTop: 2,
    },
    etaSubtext: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 12,
        color: '#1B6E45',
        marginTop: 2,
    },
    bestValueBadge: {
        backgroundColor: '#1B6E45',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    bestValueText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 8,
        color: '#FFF',
    },
    routeAcceptedBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
    },
    routeAcceptedText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 10,
        color: '#757575',
        marginBottom: 8,
    },
    routeDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    routeTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#000',
    },
    routeDesc: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 10,
        color: '#757575',
    },
    trackButton: {
        flexDirection: 'row',
        backgroundColor: '#1B6E45',
        borderRadius: 8,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#FFF',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    paymentText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#000',
        marginLeft: 8,
    },
    promoText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 12,
        color: '#1B6E45',
    },
    confirmButton: {
        backgroundColor: '#1B6E45',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    confirmButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 10 : 0,
    },
    cancelButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#FF3B30',
    }
});
