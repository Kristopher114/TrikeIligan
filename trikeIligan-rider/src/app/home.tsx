import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_400Regular, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
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
        setIsOnline(!isOnline);
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
            </SafeAreaView>

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

            {/* Side Menu Modal */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackdrop} 
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
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    map: {
        width: width,
        height: height,
        position: 'absolute',
    },
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    circularButton: {
        width: 48,
        height: 48,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    locationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    locationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#888',
        marginRight: 8,
    },
    locationText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#222',
    },
    earningsFloatingCard: {
        position: 'absolute',
        bottom: 230,
        left: 20,
        right: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
    },
    earningCol: {
        flex: 1,
    },
    divider: {
        width: 1,
        backgroundColor: '#EEEEEE',
        marginHorizontal: 16,
    },
    earningLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    earningValue: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 22,
        color: '#222',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        marginBottom: 24,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 18,
        color: '#222',
    },
    statusSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#888',
        marginBottom: 24,
    },
    toggleButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    toggleButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        flexDirection: 'row',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sideMenu: {
        width: width * 0.75,
        backgroundColor: '#FFFFFF',
        height: '100%',
        paddingTop: 60,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    menuHeader: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    menuProfilePic: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#1B6E45',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    menuDriverName: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 20,
        color: '#222',
        marginBottom: 4,
    },
    menuDriverSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#888',
    },
    menuItemsList: {
        paddingTop: 16,
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    menuItemIcon: {
        marginRight: 16,
    },
    menuItemText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#444',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        marginBottom: 24,
    },
    logoutText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#D32F2F',
    }
});
