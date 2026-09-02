import { StyleSheet, Text, View, TouchableOpacity, Platform, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';

export default function RouteScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [pickupQuery, setPickupQuery] = useState(params.pickup || '');
    const [dropoffQuery, setDropoffQuery] = useState(params.dropoff || '');
    const [pickupCoords, setPickupCoords] = useState(params.pickupLat ? { lat: params.pickupLat, lon: params.pickupLon } : null);
    const [dropoffCoords, setDropoffCoords] = useState(params.dropoffLat ? { lat: params.dropoffLat, lon: params.dropoffLon } : null);
    const [activeInput, setActiveInput] = useState(null); // 'pickup' | 'dropoff' | null

    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState('Recent');

    const searchTimeout = useRef(null);

    // Swap pickup and dropoff
    const handleSwap = () => {
        const temp = pickupQuery;
        setPickupQuery(dropoffQuery);
        setDropoffQuery(temp);
    };

    // Forward Geocode (Search)
    const performSearch = (query) => {
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=124.10,8.10,124.35,8.35&limit=5`
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.features) {
                        const formattedResults = data.features.map(f => {
                            const props = f.properties;
                            const title = props.name || props.street || props.city || "Unknown Location";
                            const subtitle = [props.street, props.district, props.city].filter(Boolean).join(', ');
                            const coords = f.geometry.coordinates;
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
        }, 800);
    };

    useEffect(() => {
        if (activeInput === 'pickup') performSearch(pickupQuery);
    }, [pickupQuery, activeInput]);

    useEffect(() => {
        if (activeInput === 'dropoff') performSearch(dropoffQuery);
    }, [dropoffQuery, activeInput]);

    const handleSelectResult = (place) => {
        if (activeInput === 'pickup') {
            setPickupQuery(place.display_name);
            setPickupCoords({ lat: place.lat, lon: place.lon });
        } else if (activeInput === 'dropoff') {
            setDropoffQuery(place.display_name);
            setDropoffCoords({ lat: place.lat, lon: place.lon });
        }
        setSearchResults([]);
        setActiveInput(null);
    };

    const handleMapIconPress = (type) => {
        if (type === 'pickup') {
            router.push({
                pathname: '/map',
                params: {
                    mode: 'PICKUP',
                    returnTo: '/route',
                    dropoff: dropoffQuery,
                    dropoffLat: dropoffCoords?.lat,
                    dropoffLon: dropoffCoords?.lon
                }
            });
        } else {
            router.push({
                pathname: '/map',
                params: {
                    mode: 'DESTINATION',
                    returnTo: '/route',
                    pickup: pickupQuery,
                    pickupLat: pickupCoords?.lat,
                    pickupLon: pickupCoords?.lon
                }
            });
        }
    };

    useEffect(() => {
        if (params.pickup) setPickupQuery(params.pickup);
        if (params.dropoff) setDropoffQuery(params.dropoff);
        if (params.pickupLat) setPickupCoords({ lat: params.pickupLat, lon: params.pickupLon });
        if (params.dropoffLat) setDropoffCoords({ lat: params.dropoffLat, lon: params.dropoffLon });
    }, [params.pickup, params.dropoff, params.pickupLat, params.dropoffLat]);

    const [fontsLoaded] = useFonts({
        Outfit_700Bold,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_400Regular,
    });

    if (!fontsLoaded) return null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back('/home')} style={{ paddingRight: 16 }}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Your Iligan Route</Text>
                </View>

                {/* Inputs Section */}
                <View style={styles.inputsSection}>
                    <View style={styles.inputsWrapper}>
                        {/* Pickup Input */}
                        <View style={[styles.inputBox, activeInput === 'pickup' && styles.inputBoxActive]}>
                            <Ionicons name="radio-button-on" size={20} color="#1B6E45" />
                            <TextInput
                                style={styles.textInput}
                                value={pickupQuery}
                                onChangeText={setPickupQuery}
                                onFocus={() => setActiveInput('pickup')}
                                placeholder="Pick-up Location"
                                placeholderTextColor="#A0A0A0"
                            />
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {activeInput === 'pickup' && isSearching && <ActivityIndicator size="small" color="#1B6E45" style={{ position: 'absolute', right: 45 }} />}
                                <TouchableOpacity onPress={() => handleMapIconPress('pickup')} style={styles.mapIconButton}>
                                    <MaterialCommunityIcons name="map" size={20} color="#1B6E45" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Dropoff Input */}
                        <View style={[styles.inputBox, activeInput === 'dropoff' && styles.inputBoxActive, { marginTop: 12 }]}>
                            <Ionicons name="radio-button-on" size={20} color="#1B6E45" />
                            <TextInput
                                style={styles.textInput}
                                value={dropoffQuery}
                                onChangeText={setDropoffQuery}
                                onFocus={() => setActiveInput('dropoff')}
                                placeholder="Enter Drop-off Location"
                                placeholderTextColor="#A0A0A0"
                            />
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {activeInput === 'dropoff' && isSearching && <ActivityIndicator size="small" color="#1B6E45" style={{ position: 'absolute', right: 45 }} />}
                                <TouchableOpacity onPress={() => handleMapIconPress('dropoff')} style={styles.mapIconButton}>
                                    <MaterialCommunityIcons name="map" size={20} color="#1B6E45" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Swap Button */}
                    <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
                        <Ionicons name="swap-vertical" size={20} color="#1B6E45" />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                {!activeInput && searchResults.length === 0 && (
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'Recent' && styles.tabButtonActive]}
                            onPress={() => setActiveTab('Recent')}
                        >
                            <Ionicons name="time" size={18} color={activeTab === 'Recent' ? "#1B6E45" : "#757575"} />
                            <Text style={[styles.tabText, activeTab === 'Recent' && styles.tabTextActive]}>Recent</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'Favorites' && styles.tabButtonActive]}
                            onPress={() => setActiveTab('Favorites')}
                        >
                            <Ionicons name="star" size={18} color={activeTab === 'Favorites' ? "#1B6E45" : "#757575"} />
                            <Text style={[styles.tabText, activeTab === 'Favorites' && styles.tabTextActive]}>Favorites</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* List Section */}
                <ScrollView style={styles.listContainer} keyboardShouldPersistTaps="handled">

                    {/* Search Results */}
                    {activeInput && searchResults.length > 0 ? (
                        searchResults.map((place, index) => (
                            <TouchableOpacity key={index} style={styles.listItem} onPress={() => handleSelectResult(place)}>
                                <Ionicons name="location" size={24} color="#1B6E45" style={styles.listIcon} />
                                <View style={styles.listItemTextContainer}>
                                    <Text style={styles.listItemTitle} numberOfLines={1}>{place.name}</Text>
                                    <Text style={styles.listItemSubtitle} numberOfLines={2}>{place.display_name}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : activeInput ? (
                        // Typing state but no results yet
                        <View style={{ padding: 24, alignItems: 'center' }}>
                            <Text style={{ fontFamily: 'Outfit_400Regular', color: '#A0A0A0' }}>
                                {isSearching
                                    ? 'Searching places...'
                                    : ((activeInput === 'pickup' ? pickupQuery.length : dropoffQuery.length) >= 3
                                        ? 'No results found.'
                                        : 'Type to search...')}
                            </Text>
                        </View>
                    ) : (
                        // No locations available
                        <View style={{ padding: 24, alignItems: 'center' }}>
                            <Text style={{ fontFamily: 'Outfit_400Regular', color: '#A0A0A0' }}>
                                No {activeTab.toLowerCase()} locations yet.
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* Book a Rider Button */}
                {pickupQuery.trim().length > 0 && dropoffQuery.trim().length > 0 && (
                    <View style={styles.bookButtonContainer}>
                        <TouchableOpacity
                            style={styles.bookButton}
                            onPress={() => {
                                router.push({
                                    pathname: '/rider-selection',
                                    params: {
                                        pickup: pickupQuery,
                                        dropoff: dropoffQuery,
                                        pickupLat: pickupCoords?.lat,
                                        pickupLon: pickupCoords?.lon,
                                        dropoffLat: dropoffCoords?.lat,
                                        dropoffLon: dropoffCoords?.lon
                                    }
                                });
                            }}
                        >
                            <Text style={styles.bookButtonText}>Book a Rider</Text>
                        </TouchableOpacity>
                    </View>
                )}
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
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: 18,
        color: '#000000',
    },
    inputsSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    inputsWrapper: {
        flex: 1,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    inputBoxActive: {
        borderColor: '#1B6E45',
        backgroundColor: '#FFFFFF',
    },
    textInput: {
        flex: 1,
        marginLeft: 10,
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#000',
        padding: 0,
    },
    mapIconButton: {
        padding: 4,
        borderLeftWidth: 1,
        borderLeftColor: '#E0E0E0',
        marginLeft: 8,
        paddingLeft: 12,
    },
    swapButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E4F6EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        gap: 6,
    },
    tabButtonActive: {
        borderBottomColor: '#1B6E45',
    },
    tabText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#757575',
    },
    tabTextActive: {
        color: '#1B6E45',
    },
    listContainer: {
        flex: 1,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    listIcon: {
        marginRight: 16,
    },
    listItemTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    listItemTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#000',
        marginBottom: 2,
    },
    listItemSubtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#757575',
    },
    bookButtonContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 32 : 24,
        left: 16,
        right: 16,
    },
    bookButton: {
        backgroundColor: '#1B6E45',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    bookButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: '#FFFFFF',
    }
});
