import { StyleSheet, Text, View, TouchableOpacity, Platform, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useRef, useState, useEffect } from 'react';
import * as Location from 'expo-location';

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

const leafletHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { padding: 0; margin: 0; background-color: #F0F0F0; }
        html, body, #map { height: 100%; width: 100%; }
        .leaflet-control-attribution { display: none !important; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', {
            zoomControl: false,
            dragging: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true
        }).setView([8.2280, 124.2452], 15);

        L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(map);

        // Send coordinates back to React Native when the map stops moving
        map.on('moveend', function() {
            var center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                event: 'moveend',
                lat: center.lat,
                lon: center.lng
            }));
        });
    </script>
</body>
</html>
`;

const mapSource = { html: leafletHTML };

export default function MapScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const webviewRef = useRef(null);

    // Flow State
    const [bookingStep, setBookingStep] = useState(params.mode || 'PICKUP'); // 'PICKUP' | 'DESTINATION'
    const [pickupLocation, setPickupLocation] = useState(params.pickup ? { address: params.pickup } : null);
    const [destinationLocation, setDestinationLocation] = useState(null);

    // Sync booking step if params change (e.g., screen is re-opened from router stack)
    useEffect(() => {
        if (params.mode) {
            setBookingStep(params.mode);
        }
    }, [params.mode]);

    // Map Center State
    const [mapCenterAddress, setMapCenterAddress] = useState('Loading location...');
    const [mapCenterCoords, setMapCenterCoords] = useState({ lat: 8.2280, lon: 124.2452 });
    const [isReversingLocation, setIsReversingLocation] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchVisible, setIsSearchVisible] = useState(false); // Toggle search overlay

    const reverseGeocodeTimeout = useRef(null);

    // Fetch user location on mount
    const handleCenterToGPS = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.log('Permission to access location was denied');
            return;
        }

        try {
            let location = await Location.getCurrentPositionAsync({});
            const lat = location.coords.latitude;
            const lon = location.coords.longitude;
            flyToLocation(lat, lon);
        } catch (error) {
            console.log("Could not get location", error);
        }
    };

    useEffect(() => {
        // Initial center on GPS
        setTimeout(handleCenterToGPS, 1000); // slight delay to let webview initialize
    }, []);

    // Handle incoming messages from Leaflet Map (Map dragged)
    const handleMapMessage = async (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.event === 'moveend') {
                setMapCenterCoords({ lat: data.lat, lon: data.lon });

                // Immediately show loading state
                setIsReversingLocation(true);
                setMapCenterAddress('Locating...');

                // Clear previous timeout if user is still dragging
                if (reverseGeocodeTimeout.current) {
                    clearTimeout(reverseGeocodeTimeout.current);
                }

                // Wait 600ms after the map STOPS moving before calling the API
                reverseGeocodeTimeout.current = setTimeout(() => {
                    reverseGeocode(data.lat, data.lon);
                }, 600);
            }
        } catch (e) {
            console.log("Error parsing map message", e);
        }
    };

    // Reverse Geocode (Coordinates -> Address)
    const reverseGeocode = async (lat, lon) => {
        try {
            // Using Nominatim for Reverse Geocoding as it's often more accurate for exact pin drops
            // and the debouncer guarantees we respect their 1-request-per-second rule.
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
                headers: {
                    'User-Agent': 'TrikeIliganApp/1.2'
                }
            });

            if (res.ok) {
                const json = await res.json();
                if (json && json.name) {
                    const title = json.name;
                    const subtitle = json.address ? [json.address.road, json.address.suburb, json.address.city].filter(Boolean).join(', ') : '';
                    setMapCenterAddress(title + (subtitle && title !== subtitle ? ', ' + subtitle : ''));
                } else if (json && json.display_name) {
                    setMapCenterAddress(json.display_name.split(',').slice(0, 2).join(', '));
                } else {
                    setMapCenterAddress("Unknown Location");
                }
            }
        } catch (error) {
            console.log('Reverse geocode failed:', error.message);
            setMapCenterAddress("Could not fetch address");
        } finally {
            setIsReversingLocation(false);
        }
    };

    // Forward Geocode (Search Query -> Coordinates)
    useEffect(() => {
        if (!isSearchVisible || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const delayDebounceFn = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&bbox=124.10,8.10,124.35,8.35&limit=5`
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.features) {
                        const formattedResults = data.features.map(f => {
                            const props = f.properties;
                            const coords = f.geometry.coordinates;
                            const title = props.name || props.street || props.city || "Unknown Location";
                            const subtitle = [props.street, props.district, props.city].filter(Boolean).join(', ');
                            return {
                                place_id: props.osm_id || Math.random().toString(),
                                name: title,
                                display_name: title + (subtitle ? ', ' + subtitle : ''),
                                lat: coords[1],
                                lon: coords[0]
                            };
                        });
                        setSearchResults(formattedResults);
                    }
                }
            } catch (error) {
                console.log('Search error:', error.message);
            } finally {
                setIsSearching(false);
            }
        }, 1000);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, isSearchVisible]);

    const flyToLocation = (lat, lon) => {
        if (webviewRef.current) {
            webviewRef.current.injectJavaScript(`
                map.flyTo([${lat}, ${lon}], 17);
                true;
            `);
        }
    };

    const handleSelectSearchResult = (place) => {
        setSearchQuery(place.display_name);
        setSearchResults([]);
        setIsSearchVisible(false);

        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        flyToLocation(lat, lon);
    };

    const handleConfirm = () => {
        if (bookingStep === 'PICKUP') {
            setPickupLocation({ address: mapCenterAddress, ...mapCenterCoords });

            if (params.returnTo) {
                // We came from the route screen just to pick the pickup on the map
                router.replace({
                    pathname: params.returnTo,
                    params: {
                        pickup: mapCenterAddress,
                        dropoff: params.dropoff || '',
                        pickupLat: mapCenterCoords.lat,
                        pickupLon: mapCenterCoords.lon,
                        dropoffLat: params.dropoffLat,
                        dropoffLon: params.dropoffLon
                    }
                });
                return;
            }

            setBookingStep('DESTINATION');
            // Drop a marker for pickup on the map
            webviewRef.current?.injectJavaScript(`
                var startIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                });
                window.pickupMarker = L.marker([${mapCenterCoords.lat}, ${mapCenterCoords.lon}], {icon: startIcon}).addTo(map);
                true;
            `);
        } else {
            setDestinationLocation({ address: mapCenterAddress, ...mapCenterCoords });
            // Drop destination marker
            webviewRef.current?.injectJavaScript(`
                var endIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                });
                window.destMarker = L.marker([${mapCenterCoords.lat}, ${mapCenterCoords.lon}], {icon: endIcon}).addTo(map);
                true;
            `);

            if (params.returnTo) {
                // We came from the route screen just to pick the dropoff on the map, so go back and pass the dropoff address
                router.replace({
                    pathname: params.returnTo,
                    params: {
                        pickup: params.pickup || pickupLocation?.address || '',
                        dropoff: mapCenterAddress,
                        pickupLat: params.pickupLat,
                        pickupLon: params.pickupLon,
                        dropoffLat: mapCenterCoords.lat,
                        dropoffLon: mapCenterCoords.lon
                    }
                });
            } else if (params.mode === 'DESTINATION') {
                // fallback for our previous fix just in case
                router.replace({
                    pathname: '/route',
                    params: {
                        pickup: pickupLocation?.address || '',
                        dropoff: mapCenterAddress,
                        pickupLat: params.pickupLat,
                        pickupLon: params.pickupLon,
                        dropoffLat: mapCenterCoords.lat,
                        dropoffLon: mapCenterCoords.lon
                    }
                });
            } else {
                alert("Ready to book!\nPickup: " + pickupLocation?.address + "\nDropoff: " + mapCenterAddress);
            }
        }
    };

    const [fontsLoaded] = useFonts({
        Outfit_700Bold,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_400Regular,
    });

    if (!fontsLoaded) return null;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" backgroundColor="transparent" translucent />

            {/* Map Section */}
            <View style={styles.mapContainer}>
                <WebView
                    ref={webviewRef}
                    source={mapSource}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    onMessage={handleMapMessage}
                    originWhitelist={['*']}
                    javaScriptEnabled={true}
                />

                {/* Absolute Center Pin */}
                <View style={styles.centerPinContainer} pointerEvents="none">
                    <MaterialCommunityIcons
                        name="map-marker-account"
                        size={48}
                        color={bookingStep === 'PICKUP' ? '#0D47A1' : '#D32F2F'} // Blue for pickup, Red for dest
                    />
                    <View style={styles.centerPinShadow} />
                </View>

                {/* Floating Back Button */}
                <TouchableOpacity onPress={() => router.back()} style={styles.floatingBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                {/* Floating GPS Button */}
                <TouchableOpacity onPress={handleCenterToGPS} style={styles.floatingGPSButton}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Bottom Action Card */}
            <View style={styles.bottomCard}>

                {/* Search Bar Toggle (Fake Input that opens overlay) */}
                {!isSearchVisible && (
                    <TouchableOpacity style={styles.searchBarToggle} onPress={() => setIsSearchVisible(true)}>
                        <Ionicons name="search" size={20} color="#7B9B88" />
                        <Text style={styles.searchBarToggleText}>Search location...</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.bookingTitle}>
                    {bookingStep === 'PICKUP' ? 'Set your Pickup Location' : 'Set your Destination'}
                </Text>
                <Text style={styles.bookingSubtitle}>Slide map to adjust pin location</Text>

                <View style={styles.addressBox}>
                    <MaterialCommunityIcons
                        name={bookingStep === 'PICKUP' ? "circle-slice-8" : "map-marker"}
                        size={24}
                        color={bookingStep === 'PICKUP' ? "#1B6E45" : "#D32F2F"}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.addressTitle} numberOfLines={1}>
                            {mapCenterAddress.split(',')[0]}
                        </Text>
                        <Text style={styles.addressSubtitle} numberOfLines={2}>
                            {mapCenterAddress}
                        </Text>
                    </View>
                    <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                        {isReversingLocation ? (
                            <ActivityIndicator size="small" color="#1B6E45" />
                        ) : (
                            <Ionicons name="star-outline" size={24} color="#FFA500" />
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.confirmButton, bookingStep === 'DESTINATION' && { backgroundColor: '#D32F2F' }]}
                    onPress={handleConfirm}
                >
                    <Text style={styles.confirmButtonText}>
                        {bookingStep === 'PICKUP' ? 'Confirm Pickup' : 'Confirm Destination'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Overlay */}
            {isSearchVisible && (
                <View style={styles.searchOverlay}>
                    <SafeAreaView edges={['top']}>
                        <View style={styles.searchOverlayHeader}>
                            <TouchableOpacity onPress={() => setIsSearchVisible(false)} style={styles.closeSearchButton}>
                                <Ionicons name="close" size={28} color="#000" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.searchOverlayInput}
                                placeholder="Search places in Iligan..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {isSearching && <ActivityIndicator size="small" color="#1B6E45" style={{ marginLeft: 10 }} />}
                        </View>

                        <View style={styles.searchResultsContainer}>
                            {searchResults.map((place, index) => (
                                <TouchableOpacity
                                    key={place.place_id || index}
                                    style={styles.searchResultItem}
                                    onPress={() => handleSelectSearchResult(place)}
                                >
                                    <Ionicons name="location-outline" size={20} color="#1B6E45" style={{ marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.searchResultTitle} numberOfLines={1}>
                                            {place.name || place.display_name.split(',')[0]}
                                        </Text>
                                        <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                                            {place.display_name}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </SafeAreaView>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    centerPinContainer: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 48, // offset to center the tip of the pin
    },
    centerPinShadow: {
        width: 14,
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 10,
        marginTop: -4,
    },
    floatingBackButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 20,
        backgroundColor: '#FFFFFF',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    floatingGPSButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#FFFFFF',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    bottomCard: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
        marginTop: -20, // Overlap the map slightly
    },
    searchBarToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    searchBarToggleText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#7B9B88',
        marginLeft: 8,
    },
    bookingTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 20,
        color: '#000000',
        textAlign: 'center',
    },
    bookingSubtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: '#7B9B88',
        textAlign: 'center',
        marginBottom: 16,
    },
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        height: 80, // Fixed height to prevent map layout resizing loop
    },
    addressTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#000000',
    },
    addressSubtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#7B9B88',
        marginTop: 4,
    },
    confirmButton: {
        backgroundColor: '#1B6E45', // Deep blue for pickup
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 18,
        color: '#FFFFFF',
    },
    searchOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 100,
    },
    searchOverlayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    closeSearchButton: {
        marginRight: 12,
    },
    searchOverlayInput: {
        flex: 1,
        fontFamily: 'Outfit_500Medium',
        fontSize: 18,
        color: '#000',
        padding: 0,
    },
    searchResultsContainer: {
        paddingHorizontal: 16,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    searchResultTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#1B6E45',
        marginBottom: 2,
    },
    searchResultSubtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#7B9B88',
    }
});
