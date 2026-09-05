import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_400Regular, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

const { width, height } = Dimensions.get('window');

const leafletHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { padding: 0; margin: 0; background-color: #f5f5f5; }
        html, body, #map { height: 100%; width: 100%; }
        .leaflet-control-attribution { display: none !important; }
        
        /* Custom Marker */
        .driver-marker {
            background-color: #1B6E45;
            width: 32px;
            height: 32px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .driver-marker-inner {
            color: white;
            font-size: 16px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', {
            zoomControl: false,
            dragging: false,      
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false
        }).setView([8.2280, 124.2452], 16);

        L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(map);

        var driverIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div class='driver-marker'><div class='driver-marker-inner'>➤</div></div>",
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        var driverMarker = L.marker([8.2280, 124.2452], {icon: driverIcon, interactive: false}).addTo(map);

        function updateLocation(lat, lng) {
            var newLatLng = new L.LatLng(lat, lng);
            driverMarker.setLatLng(newLatLng);
            map.panTo(newLatLng);
        }
    </script>
</body>
</html>
`;

export default function RiderHome() {
    const router = useRouter();
    const webviewRef = useRef<WebView>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    // REAL-TIME RIDE STATES
    const [rideState, setRideState] = useState<'idle' | 'request' | 'active' | 'completed'>('idle');
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [timer, setTimer] = useState(15);
    const [currentRideOffer, setCurrentRideOffer] = useState<any>(null);
    const socketRef = useRef<Socket | null>(null);

    const [driverId, setDriverId] = useState<string>('driver_test_1');
    const [driverName, setDriverName] = useState<string>('Danilo G.');
    const [driverVehicle, setDriverVehicle] = useState<string>('Honda TMX 125 (Black)');
    const [driverRating, setDriverRating] = useState<string>('5.0');

    // Load Driver Info
    useEffect(() => {
        const loadDriverInfo = async () => {
            try {
                const id = await AsyncStorage.getItem('userId');
                const name = await AsyncStorage.getItem('userFullName');
                const vehicle = await AsyncStorage.getItem('driverVehicle');
                const rating = await AsyncStorage.getItem('driverRating');
                
                if (id) setDriverId(id);
                if (name) setDriverName(name);
                if (vehicle) setDriverVehicle(vehicle);
                if (rating) setDriverRating(rating);
            } catch (e) {
                console.error("Failed to load driver info", e);
            }
        };
        loadDriverInfo();
    }, []);

    // DEMO TIMER LOGIC FOR RIDE REQUEST
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (rideState === 'request') {
            setTimer(15);
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setRideState('idle'); // Auto-missed request
                        setCurrentRideOffer(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [rideState]);

    // LOCATION & SOCKET INIT
    useEffect(() => {
        let locationSubscription: Location.LocationSubscription;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // Wait a tiny bit for the webview to load before injecting
            setTimeout(async () => {
                const initialLoc = await Location.getCurrentPositionAsync({});
                if (webviewRef.current) {
                    webviewRef.current.injectJavaScript(`updateLocation(${initialLoc.coords.latitude}, ${initialLoc.coords.longitude}); true;`);
                }
            }, 1000);

            locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 2000,
                    distanceInterval: 1,
                },
                (loc) => {
                    if (webviewRef.current) {
                        const lat = loc.coords.latitude;
                        const lng = loc.coords.longitude;
                        webviewRef.current.injectJavaScript(`updateLocation(${lat}, ${lng}); true;`);
                    }
                }
            );
        })();

        // Connect socket
        const socket = io('https://trikeiligan.onrender.com');
        socketRef.current = socket;

        socket.on('ride_offer', (data) => {
            if (rideState === 'idle') {
                setCurrentRideOffer(data);
                setRideState('request');
            }
        });

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
            if (socketRef.current) socketRef.current.disconnect();
        };
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

    const toggleOnlineStatus = () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        
        if (newStatus && socketRef.current) {
            // Emulate driver ID and go online
            socketRef.current.emit('driver_online', { driverId: driverId });
        }
    };

    const handleAcceptRide = () => {
        if (!currentRideOffer || !socketRef.current) return;
        
        // Notify backend that driver accepted
        socketRef.current.emit('driver_accept_ride', {
            driverId: driverId,
            driverName: driverName,
            driverVehicle: driverVehicle,
            driverRating: driverRating,
            rideId: currentRideOffer.rideId,
            passengerId: currentRideOffer.passengerId
        });

        setRideState('active');
        setIsOnline(false); // Can't take more rides while active
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userFullName');
        await AsyncStorage.removeItem('userId');
        router.replace('/login');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            <WebView
                ref={webviewRef}
                source={{ html: leafletHTML }}
                style={styles.map}
                scrollEnabled={false}
                bounces={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            />

            <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
                <View style={styles.topRow}>
                    <TouchableOpacity style={styles.circularButton} onPress={() => setIsMenuVisible(true)}>
                        <Ionicons name="menu-outline" size={24} color="#333" />
                    </TouchableOpacity>

                    <View style={styles.locationPill}>
                        <View style={styles.locationDot} />
                        <Text style={styles.locationText}>Iligan City</Text>
                    </View>

                    <TouchableOpacity style={styles.circularButton}>
                        <Ionicons name="notifications-outline" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
                
                {/* Float Navigate Button during active ride */}
                {rideState === 'active' && (
                    <TouchableOpacity style={styles.navigateFloatingBtn}>
                        <Ionicons name="navigate" size={24} color="#FFF" />
                        <Text style={styles.navigateFloatingText}>NAVIGATE</Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>

            {rideState === 'idle' && (
                <View style={styles.earningsFloatingCard}>
                    <View style={styles.earningCol}>
                        <Text style={styles.earningLabel}>Today's Earnings</Text>
                        <Text style={styles.earningValue}>₱ 0.00</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.earningCol}>
                        <Text style={styles.earningLabel}>Total Rides</Text>
                        <Text style={styles.earningValue}>0</Text>
                    </View>
                </View>
            )}

            {/* 1. IDLE STATE BOTTOM SHEET */}
            {rideState === 'idle' && (
                <View style={styles.bottomSheet}>
                    <View style={styles.sheetHandle} />
                    
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#1B6E45' : '#D32F2F' }]} />
                        <Text style={styles.statusTitle}>
                            You are currently {isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                    
                    <Text style={styles.statusSubtitle}>
                        {isOnline ? 'Finding nearby passengers...' : 'Tap below to start earning.'}
                    </Text>

                    <TouchableOpacity 
                        style={[styles.toggleButton, { backgroundColor: isOnline ? '#1B6E45' : '#1B6E45' }]} 
                        onPress={toggleOnlineStatus}
                    >
                        <Text style={styles.toggleButtonText}>
                            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 2. REQUEST STATE BOTTOM SHEET */}
            {rideState === 'request' && (
                <View style={styles.bottomSheet}>
                    <View style={styles.sheetHandle} />
                    
                    <View style={styles.requestHeaderRow}>
                        <View style={styles.requestBadge}>
                            <Ionicons name="scan-outline" size={16} color="#1B6E45" style={{marginRight: 4}} />
                            <Text style={styles.requestBadgeText}>NEW RIDE REQUEST</Text>
                        </View>
                        <View style={styles.timerBadge}>
                            <Ionicons name="time-outline" size={14} color="#FFF" style={{marginRight: 4}} />
                            <Text style={styles.timerText}>{timer}s</Text>
                        </View>
                    </View>

                    <View style={styles.passengerInfoRow}>
                        <View style={styles.passengerAvatar}>
                            <Text style={styles.avatarInitials}>
                                {currentRideOffer?.passengerName ? currentRideOffer.passengerName.substring(0, 2).toUpperCase() : 'MS'}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.passengerName}>{currentRideOffer?.passengerName || 'Unknown Passenger'}</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={styles.passengerRating}>{currentRideOffer?.rating || '5.0'} • Cash Payment</Text>
                            </View>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <Text style={styles.farePrice}>₱ {currentRideOffer?.fare || '0.00'}</Text>
                            <Text style={styles.fareLabel}>Estimated Fare</Text>
                        </View>
                    </View>

                    <View style={styles.locationsContainer}>
                        <View style={styles.locationItem}>
                            <View style={[styles.locDot, {backgroundColor: '#1B6E45'}]} />
                            <View>
                                <Text style={styles.locLabel}>PICKUP LOCATION</Text>
                                <Text style={styles.locValue} numberOfLines={1}>{currentRideOffer?.pickup || 'Robinsons Mall, Iligan City'}</Text>
                            </View>
                        </View>
                        <View style={styles.locLine} />
                        <View style={styles.locationItem}>
                            <View style={[styles.locDot, {backgroundColor: '#F44336'}]} />
                            <View>
                                <Text style={styles.locLabel}>DROPOFF LOCATION</Text>
                                <Text style={styles.locValue} numberOfLines={1}>{currentRideOffer?.dropoff || "St. Michael's College"}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity style={styles.btnDecline} onPress={() => setShowDeclineModal(true)}>
                            <Text style={styles.btnDeclineText}>DECLINE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnAccept} onPress={handleAcceptRide}>
                            <Text style={styles.btnAcceptText}>ACCEPT RIDE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* 3. ACTIVE RIDE BOTTOM SHEET */}
            {rideState === 'active' && (
                <View style={styles.bottomSheet}>
                    <View style={styles.sheetHandle} />
                    
                    <View style={styles.activeRideHeader}>
                        <View style={[styles.locDot, {backgroundColor: '#1B6E45', marginTop: 4}]} />
                        <View>
                            <Text style={styles.activeTitle}>Pick up passenger in 5 mins</Text>
                            <Text style={styles.activeSubtitle}>Heading to Robinsons Mall</Text>
                        </View>
                    </View>

                    <View style={styles.passengerInfoRow}>
                        <View style={styles.passengerAvatar}>
                            <Text style={styles.avatarInitials}>MS</Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.passengerName}>Maria Santos</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={styles.passengerRating}>4.9 • Cash Payment</Text>
                            </View>
                        </View>
                        <View style={styles.contactButtons}>
                            <TouchableOpacity style={styles.contactBtn}>
                                <Ionicons name="chatbubble-outline" size={20} color="#1B6E45" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.contactBtn}>
                                <Ionicons name="call-outline" size={20} color="#1B6E45" />
                            </TouchableOpacity>
                        </View>
                        <View style={{alignItems: 'flex-end', marginLeft: 12}}>
                            <Text style={styles.farePrice}>₱ 55.00</Text>
                            <Text style={styles.fareLabel}>Est. Fare</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.btnPickedUp} onPress={() => setRideState('completed')}>
                        <Text style={styles.btnPickedUpText}>PASSENGER PICKED UP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{marginTop: 16}} onPress={() => setShowCancelModal(true)}>
                        <Text style={styles.cancelRideText}>Cancel Ride</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 4. COMPLETED RIDE BOTTOM SHEET */}
            {rideState === 'completed' && (
                <View style={[styles.bottomSheet, { paddingBottom: 40 }]}>
                    <View style={styles.successCircle}>
                        <Ionicons name="checkmark" size={32} color="#FFF" />
                    </View>
                    
                    <Text style={styles.completedTitle}>Ride Completed!</Text>
                    <Text style={styles.completedSubtitle}>TOTAL TO COLLECT</Text>
                    
                    <Text style={styles.totalFare}>₱ 55.00</Text>
                    <View style={styles.paymentModePill}>
                        <Text style={styles.paymentModeText}>Payment Mode: Cash</Text>
                    </View>
                    
                    <View style={{width: '100%', height: 1, backgroundColor: '#EEE', marginVertical: 20}} />
                    
                    <Text style={styles.ratingPrompt}>How was your passenger?</Text>
                    <View style={styles.starsRow}>
                        {[1,2,3,4,5].map(star => (
                           <Ionicons key={star} name="star-outline" size={32} color="#CCC" style={{marginHorizontal: 4}} />
                        ))}
                    </View>
                    
                    <TextInput 
                        style={styles.noteInput}
                        placeholder="Add a note (optional)..."
                        placeholderTextColor="#999"
                    />

                    <TouchableOpacity style={styles.btnConfirmPayment} onPress={() => { setRideState('idle'); setIsOnline(true); }}>
                        <Text style={styles.btnConfirmPaymentText}>CONFIRM PAYMENT & RATE</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Warning Modals */}
            <Modal visible={showDeclineModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.warningModalBox}>
                        <View style={styles.warningIconCircle}>
                            <Ionicons name="alert" size={48} color="#FFF" />
                        </View>
                        <Text style={styles.warningModalTitle}>Decline Ride Request?</Text>
                        <Text style={styles.warningModalText}>Are you sure you want to decline this ride? This action cannot be undone.</Text>
                        <View style={styles.warningButtonsRow}>
                            <TouchableOpacity style={styles.btnWarningCancel} onPress={() => setShowDeclineModal(false)}>
                                <Text style={styles.btnWarningCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnWarningConfirm} onPress={() => { setShowDeclineModal(false); setRideState('idle'); }}>
                                <Text style={styles.btnWarningConfirmText}>Yes, Decline</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showCancelModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.warningModalBox}>
                        <View style={styles.warningIconCircle}>
                            <Ionicons name="alert" size={48} color="#FFF" />
                        </View>
                        <Text style={styles.warningModalTitle}>Cancel Pickup?</Text>
                        <Text style={styles.warningModalText}>Are you sure you want to cancel this ride? This action cannot be undone.</Text>
                        <View style={styles.warningButtonsRow}>
                            <TouchableOpacity style={styles.btnWarningCancel} onPress={() => setShowCancelModal(false)}>
                                <Text style={styles.btnWarningCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnWarningConfirm} onPress={() => { setShowCancelModal(false); setRideState('idle'); }}>
                                <Text style={styles.btnWarningConfirmText}>Yes, Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Side Menu Modal */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <View style={styles.modalOverlayMenu}>
                    <TouchableOpacity 
                        style={styles.modalBackdropMenu} 
                        activeOpacity={1} 
                        onPress={() => setIsMenuVisible(false)} 
                    />
                    <View style={styles.sideMenu}>
                        <View style={styles.menuHeader}>
                            <View style={styles.menuProfilePic}>
                                <Ionicons name="person" size={32} color="#FFF" />
                            </View>
                            <Text style={styles.menuDriverName}>My Profile</Text>
                            <Text style={styles.menuDriverSubtitle}>Trike Driver</Text>
                        </View>
                        
                        <View style={styles.menuItemsList}>
                            <TouchableOpacity style={styles.menuItem}>
                                <Ionicons name="time-outline" size={24} color="#444" style={styles.menuItemIcon} />
                                <Text style={styles.menuItemText}>Ride History</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.menuItem}>
                                <Ionicons name="wallet-outline" size={24} color="#444" style={styles.menuItemIcon} />
                                <Text style={styles.menuItemText}>Earnings</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem}>
                                <Ionicons name="settings-outline" size={24} color="#444" style={styles.menuItemIcon} />
                                <Text style={styles.menuItemText}>Settings</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={24} color="#D32F2F" style={styles.menuItemIcon} />
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    map: { width: width, height: height, position: 'absolute' },
    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    circularButton: { width: 48, height: 48, backgroundColor: '#FFFFFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    locationPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    locationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#888', marginRight: 8 },
    locationText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: '#222' },
    
    navigateFloatingBtn: { flexDirection: 'row', position: 'absolute', top: 80, right: 20, backgroundColor: '#1B6E45', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    navigateFloatingText: { fontFamily: 'Outfit_700Bold', color: '#FFF', fontSize: 14, marginLeft: 8 },
    
    earningsFloatingCard: { position: 'absolute', bottom: 230, left: 20, right: 20, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 6 },
    earningCol: { flex: 1 },
    divider: { width: 1, backgroundColor: '#EEEEEE', marginHorizontal: 16 },
    earningLabel: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: '#888', marginBottom: 4 },
    earningValue: { fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#222' },
    
    bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, marginBottom: 24 },
    
    statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusTitle: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#222' },
    statusSubtitle: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: '#888', marginBottom: 24 },
    toggleButton: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    toggleButtonText: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#FFFFFF' },

    // NEW RIDE REQUEST STYLES
    requestHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
    requestBadge: { flexDirection: 'row', backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignItems: 'center' },
    requestBadgeText: { fontFamily: 'Outfit_700Bold', color: '#1B6E45', fontSize: 12 },
    timerBadge: { flexDirection: 'row', backgroundColor: '#F44336', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignItems: 'center' },
    timerText: { fontFamily: 'Outfit_700Bold', color: '#FFF', fontSize: 12 },
    
    passengerInfoRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0' },
    passengerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#B2DFDB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarInitials: { fontFamily: 'Outfit_700Bold', color: '#004D40', fontSize: 18 },
    passengerName: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#111' },
    passengerRating: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: '#666', marginLeft: 4 },
    farePrice: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#1B6E45' },
    fareLabel: { fontFamily: 'Outfit_500Medium', fontSize: 10, color: '#888' },
    
    locationsContainer: { width: '100%', paddingVertical: 16 },
    locationItem: { flexDirection: 'row', alignItems: 'flex-start' },
    locDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, marginTop: 4 },
    locLabel: { fontFamily: 'Outfit_700Bold', fontSize: 10, color: '#1B6E45', letterSpacing: 0.5 },
    locValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: '#333', marginTop: 2 },
    locLine: { width: 1, height: 16, backgroundColor: '#E0E0E0', marginLeft: 3, marginVertical: 2 },
    
    actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
    btnDecline: { flex: 1, borderWidth: 1, borderColor: '#CCC', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginRight: 8 },
    btnDeclineText: { fontFamily: 'Outfit_700Bold', color: '#888', fontSize: 14 },
    btnAccept: { flex: 1, backgroundColor: '#1B6E45', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginLeft: 8 },
    btnAcceptText: { fontFamily: 'Outfit_700Bold', color: '#FFF', fontSize: 14 },

    // ACTIVE RIDE STYLES
    activeRideHeader: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 12 },
    activeTitle: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#1B6E45' },
    activeSubtitle: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: '#888', marginTop: 2 },
    contactButtons: { flexDirection: 'row', gap: 8 },
    contactBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
    btnPickedUp: { width: '100%', backgroundColor: '#1B6E45', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
    btnPickedUpText: { fontFamily: 'Outfit_700Bold', color: '#FFF', fontSize: 14 },
    cancelRideText: { fontFamily: 'Outfit_700Bold', color: '#F44336', fontSize: 14 },

    // COMPLETED RIDE STYLES
    successCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1B6E45', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    completedTitle: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#111' },
    completedSubtitle: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: '#888', marginTop: 4, letterSpacing: 1 },
    totalFare: { fontFamily: 'Outfit_700Bold', fontSize: 40, color: '#1B6E45', marginVertical: 8 },
    paymentModePill: { backgroundColor: '#F5F5F5', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
    paymentModeText: { fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: '#333' },
    ratingPrompt: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#111', marginBottom: 12 },
    starsRow: { flexDirection: 'row', marginBottom: 20 },
    noteInput: { width: '100%', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 16, fontFamily: 'Outfit_400Regular', fontSize: 14, height: 80, textAlignVertical: 'top', marginBottom: 20 },
    btnConfirmPayment: { width: '100%', backgroundColor: '#1B6E45', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    btnConfirmPaymentText: { fontFamily: 'Outfit_700Bold', color: '#FFF', fontSize: 14 },

    // WARNING MODALS
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    warningModalBox: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
    warningIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center', marginTop: -60, marginBottom: 16, borderWidth: 4, borderColor: '#FFF' },
    warningModalTitle: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#111', marginBottom: 8, textAlign: 'center' },
    warningModalText: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    warningButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    btnWarningCancel: { flex: 1, borderWidth: 1, borderColor: '#CCC', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginRight: 8 },
    btnWarningCancelText: { fontFamily: 'Outfit_700Bold', color: '#333', fontSize: 14 },
    btnWarningConfirm: { flex: 1, backgroundColor: '#F44336', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginLeft: 8 },
    btnWarningConfirmText: { fontFamily: 'Outfit_700Bold', color: '#FFF', fontSize: 14 },

    // SIDE MENU
    modalOverlayMenu: { flex: 1, flexDirection: 'row' },
    modalBackdropMenu: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
    sideMenu: { width: width * 0.75, backgroundColor: '#FFFFFF', height: '100%', paddingTop: 60, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    menuHeader: { paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
    menuProfilePic: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1B6E45', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    menuDriverName: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#222', marginBottom: 4 },
    menuDriverSubtitle: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: '#888' },
    menuItemsList: { paddingTop: 16, flex: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24 },
    menuItemIcon: { marginRight: 16 },
    menuItemText: { fontFamily: 'Outfit_500Medium', fontSize: 16, color: '#444' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: '#EEEEEE', marginBottom: 24 },
    logoutText: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: '#D32F2F' }
});
