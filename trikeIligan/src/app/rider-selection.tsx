import { StyleSheet, Text, View, TouchableOpacity, Platform, Image, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

export default function RiderSelectionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [fare, setFare] = useState('55.00'); // Default
    const [eta, setEta] = useState('2'); // Default
    const [isCalculating, setIsCalculating] = useState(true);

    const [passengerId, setPassengerId] = useState<string | null>(null);
    const [passengerName, setPassengerName] = useState<string>('Passenger');
    const [rideStatus, setRideStatus] = useState<'idle' | 'searching' | 'accepted'>('idle');
    const [driverData, setDriverData] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WALLET'>('CASH');
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [driverRatingScore, setDriverRatingScore] = useState(5);
    const socketRef = useRef<Socket | null>(null);

    // Load user info for socket
    useEffect(() => {
        const loadUser = async () => {
            try {
                const id = await AsyncStorage.getItem('userId');
                const name = await AsyncStorage.getItem('userFullName');
                if (id) {
                    setPassengerId(id);
                    // Fetch balance
                    fetch(`https://trikeiligan.onrender.com/api/wallet/balance/${id}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === 'success') {
                                setWalletBalance(parseFloat(data.balance));
                            }
                        })
                        .catch(err => console.error("Balance fetch error", err));
                } else {
                    setPassengerId(`guest_${Date.now()}`); // Fallback
                }
                if (name) {
                    setPassengerName(name);
                }
            } catch (e) {
                setPassengerId(`guest_${Date.now()}`);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        const calculateFare = async () => {
            if (!params.pickupLat || !params.dropoffLat) {
                setIsCalculating(false);
                return;
            }
            try {
                setIsCalculating(true);
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
                const data = await response.json();
                if (data.status === 'success' && data.data) {
                    setFare(data.data.fare.toFixed(2));
                    setEta(data.data.estimatedTimeMins.toString());
                }
            } catch (err) {
                console.error("Error calculating fare", err);
            } finally {
                setIsCalculating(false);
            }
        };
        calculateFare();
    }, [params.pickupLat, params.pickupLon, params.dropoffLat, params.dropoffLon]);
    // Socket.io initialization
    useEffect(() => {
        if (!passengerId) return;

        const socket = io('https://trikeiligan.onrender.com', {
            transports: ['websocket']
        });
        socketRef.current = socket;

        // Listen for driver accepting the ride
        socket.on(`ride_accepted_${passengerId}`, (data) => {
            console.log('Driver accepted!', data);
            setDriverData(data);
            setRideStatus('accepted');
        });

        socket.on(`ride_declined_${passengerId}`, () => {
            alert("Driver declined. Please try booking again.");
            setRideStatus('idle');
        });

        socket.on(`ride_completed_${passengerId}`, (data) => {
            console.log('Ride completed, showing rating modal');
            setShowRatingModal(true);
        });

        return () => {
            socket.disconnect();
        };
    }, [passengerId]);

    const handleConfirmBooking = () => {
        if (!socketRef.current) {
            alert("Socket is not connected yet!");
            return;
        }
        if (!passengerId) {
            alert("Passenger ID is missing!");
            return;
        }
        setRideStatus('searching');

        console.log("Emitting passenger_request_ride for", passengerId);
        // Emit ride request
        socketRef.current.emit('passenger_request_ride', {
            rideId: `ride_${Date.now()}`,
            passengerId: passengerId,
            passengerName: passengerName,
            pickup: params.pickup || 'Current Location',
            dropoff: params.dropoff || 'Destination',
            pickupLat: params.pickupLat,
            pickupLon: params.pickupLon,
            dropoffLat: params.dropoffLat,
            dropoffLon: params.dropoffLon,
            vehicleType: params.vehicleType || 'TRICYCLE',
            fare: fare,
            rating: 5.0,
            paymentMethod: paymentMethod
        });
    };

    const togglePaymentMethod = () => {
        if (paymentMethod === 'CASH') {
            const fareNum = parseFloat(fare);
            if (walletBalance < fareNum) {
                alert(`Insufficient wallet balance (₱${walletBalance.toFixed(2)}). Please top up first.`);
                return;
            }
            setPaymentMethod('WALLET');
        } else {
            setPaymentMethod('CASH');
        }
    };

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

            {/* Top Map Area */}
            <View style={styles.mapArea}>
                {(params.pickupLat && params.dropoffLat) ? (
                    <WebView
                        source={{
                            html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                            <style>
                                body { padding: 0; margin: 0; background-color: #EAEAEA; }
                                html, body, #map { height: 100%; width: 100%; }
                                .leaflet-control-attribution { display: none !important; }
                            </style>
                        </head>
                        <body>
                            <div id="map"></div>
                            <script>
                                var map = L.map('map', { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView([${params.pickupLat}, ${params.pickupLon}], 14);
                                L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
                                
                                var startIcon = L.icon({
                                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                                });
                                var endIcon = L.icon({
                                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                                });
                                
                                L.marker([${params.pickupLat}, ${params.pickupLon}], {icon: startIcon}).addTo(map);
                                L.marker([${params.dropoffLat}, ${params.dropoffLon}], {icon: endIcon}).addTo(map);
                                
                                var bounds = L.latLngBounds([[${params.pickupLat}, ${params.pickupLon}], [${params.dropoffLat}, ${params.dropoffLon}]]);
                                map.fitBounds(bounds, { padding: [50, 50] });
                                
                                // Fetch street route using OSRM API
                                fetch(\`https://router.project-osrm.org/route/v1/driving/\${${params.pickupLon}},\${${params.pickupLat}};\${${params.dropoffLon}},\${${params.dropoffLat}}?overview=full&geometries=geojson\`)
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.routes && data.routes.length > 0) {
                                            var coords = data.routes[0].geometry.coordinates;
                                            var latLngs = coords.map(function(coord) {
                                                return [coord[1], coord[0]]; // OSRM is [lon, lat], Leaflet is [lat, lon]
                                            });
                                            L.polyline(latLngs, {color: '#1B6E45', weight: 5}).addTo(map);
                                            map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [40, 40] });
                                        } else {
                                            throw new Error('No route found');
                                        }
                                    })
                                    .catch(err => {
                                        // Fallback to straight dashed line if routing fails
                                        L.polyline([
                                            [${params.pickupLat}, ${params.pickupLon}],
                                            [${params.dropoffLat}, ${params.dropoffLon}]
                                        ], {color: '#1B6E45', weight: 4, dashArray: '5, 10'}).addTo(map);
                                    });
                            </script>
                        </body>
                        </html>
                        ` }}
                        style={{ flex: 1, width: width }}
                        scrollEnabled={false}
                    />
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="map-outline" size={64} color="#A0A0A0" />
                        <Text style={styles.mapPlaceholderText}>No Coordinates Provided</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet Area */}
            <View style={styles.bottomSheet}>

                {/* Header */}
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Select Available Ride</Text>
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

                {/* Driver Card or Searching State */}
                {rideStatus === 'idle' && (
                    <View style={[styles.driverCard, { alignItems: 'center', padding: 32 }]}>
                        <Ionicons name="location-outline" size={48} color="#1B6E45" style={{ marginBottom: 16 }} />
                        <Text style={styles.sheetTitle}>Ready to Book?</Text>
                        <Text style={styles.sheetSubtitle}>Tap confirm below to find a driver.</Text>
                    </View>
                )}

                {rideStatus === 'searching' && (
                    <View style={[styles.driverCard, { alignItems: 'center', padding: 32 }]}>
                        <MaterialCommunityIcons name="radar" size={48} color="#1B6E45" style={{ marginBottom: 16 }} />
                        <Text style={styles.sheetTitle}>Finding a Driver...</Text>
                        <Text style={styles.sheetSubtitle}>Please wait while we connect you to a nearby driver.</Text>
                    </View>
                )}

                {rideStatus === 'accepted' && driverData && (
                    <View style={styles.driverCard}>
                        {/* Status Badge */}
                        <View style={styles.badgeRow}>
                            <View style={styles.statusBadge}>
                                <Ionicons name="checkmark-circle" size={12} color="#1B6E45" style={{ marginRight: 4 }} />
                                <Text style={styles.statusText}>Confirmed</Text>
                            </View>
                            <View style={styles.etaBadge}>
                                <Ionicons name="time-outline" size={12} color="#000" style={{ marginRight: 4 }} />
                                <Text style={styles.etaText}>{eta} mins away</Text>
                            </View>
                        </View>

                        {/* Driver Profile */}
                        <View style={styles.driverProfileRow}>
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={24} color="#FFF" />
                            </View>
                            <View style={styles.driverInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.driverName}>{driverData.driverName || 'Driver'}</Text>
                                    <Ionicons name="star" size={14} color="#FFD700" style={{ marginLeft: 4, marginRight: 2 }} />
                                    <Text style={styles.ratingText}>{driverData.driverRating || '4.9'}</Text>
                                </View>
                                <Text style={styles.vehicleText}>{driverData.driverVehicle || 'Trike'}</Text>
                                <Text style={styles.etaSubtext}>{eta} mins away</Text>
                            </View>
                            <View style={styles.bestValueBadge}>
                                <Text style={styles.bestValueText}>BEST VALUE</Text>
                            </View>
                        </View>

                    </View>
                )}

                {/* Payment Row */}
                <TouchableOpacity style={styles.paymentRow} onPress={togglePaymentMethod} disabled={rideStatus !== 'idle'}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={paymentMethod === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={20} color="#1B6E45" />
                        <Text style={styles.paymentText}>
                            {paymentMethod === 'CASH' ? 'Cash Payment' : 'Wallet Payment'}
                        </Text>
                    </View>
                    <Text style={styles.promoText}>
                        {paymentMethod === 'WALLET' ? `Bal: ₱${walletBalance.toFixed(2)}` : 'Change >'}
                    </Text>
                </TouchableOpacity>

                {/* Confirm Button */}
                {rideStatus === 'idle' && (
                    <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmBooking}>
                        <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                    </TouchableOpacity>
                )}
                {rideStatus === 'searching' && (
                    <TouchableOpacity style={[styles.confirmButton, { backgroundColor: '#757575' }]} disabled>
                        <Text style={styles.confirmButtonText}>Searching...</Text>
                    </TouchableOpacity>
                )}

                {/* Cancel Button */}
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsCancelModalVisible(true)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

            </View>

            {/* Cancel Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isCancelModalVisible}
                onRequestClose={() => setIsCancelModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Cancel Booking?</Text>
                        <Text style={styles.modalText}>Are you sure you want to cancel this booking?</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonNo]}
                                onPress={() => setIsCancelModalVisible(false)}
                            >
                                <Text style={styles.modalButtonTextNo}>No, Keep it</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonYes]}
                                onPress={() => {
                                    setIsCancelModalVisible(false);
                                    router.back();
                                }}
                            >
                                <Text style={styles.modalButtonTextYes}>Yes, Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Arrival & Rating Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showRatingModal}
                onRequestClose={() => {}}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <Ionicons name="checkmark-circle" size={64} color="#1B6E45" />
                            <Text style={[styles.modalTitle, { marginTop: 12 }]}>You have arrived!</Text>
                            <Text style={styles.modalText}>How was your ride?</Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setDriverRatingScore(star)}>
                                    <Ionicons 
                                        name={star <= driverRatingScore ? "star" : "star-outline"} 
                                        size={40} 
                                        color="#F59E0B" 
                                        style={{ marginHorizontal: 4 }}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <TouchableOpacity
                            style={[styles.confirmButton, { width: '100%', marginBottom: 12 }]}
                            onPress={async () => {
                                if (driverData?.driverId) {
                                    try {
                                        await fetch('https://trikeiligan.onrender.com/api/rate-driver', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                driverId: driverData.driverId,
                                                passengerId: passengerId,
                                                rating: driverRatingScore
                                            })
                                        });
                                    } catch (e) {
                                        console.error("Error submitting rating", e);
                                    }
                                }
                                setShowRatingModal(false);
                                router.replace('/home');
                            }}
                        >
                            <Text style={styles.confirmButtonText}>Submit Rating</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.cancelButton, { width: '100%' }]} 
                            onPress={() => {
                                setShowRatingModal(false);
                                router.replace('/home');
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Skip</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
        zIndex: 10,
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
    mapHeaderTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#333333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '80%',
        alignItems: 'center',
    },
    modalTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 20,
        color: '#333333',
        marginBottom: 12,
    },
    modalText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonNo: {
        backgroundColor: '#E4F6EB',
    },
    modalButtonYes: {
        backgroundColor: '#FFEBEE',
    },
    modalButtonTextNo: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#1B6E45',
        fontSize: 16,
    },
    modalButtonTextYes: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#D32F2F',
        fontSize: 16,
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
