import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, TextInput, Animated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_600SemiBold, Outfit_400Regular } from '@expo-google-fonts/outfit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef } from 'react';

const { height: windowHeight } = Dimensions.get('window');
const SNAP_TOP = windowHeight * 0.15; // Expanded (15% from top)
const SNAP_BOTTOM = windowHeight * 0.58; // Collapsed (58% from top)

export default function HomeScreen() {
    const router = useRouter();

    const translateY = useRef(new Animated.Value(SNAP_BOTTOM)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                translateY.extractOffset();
            },
            onPanResponderMove: Animated.event(
                [null, { dy: translateY }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (e, gestureState) => {
                translateY.flattenOffset();
                let dest = SNAP_BOTTOM;
                if (gestureState.dy < -50 || gestureState.vy < -0.5) {
                    dest = SNAP_TOP;
                } else if (gestureState.dy > 50 || gestureState.vy > 0.5) {
                    dest = SNAP_BOTTOM;
                }
                Animated.spring(translateY, {
                    toValue: dest,
                    useNativeDriver: true,
                    bounciness: 4,
                }).start();
            }
        })
    ).current;

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
                    <Text style={styles.userName}>Juan Dela Cruz</Text>
                </View>

                {/* Map Placeholder Section */}
                <View style={styles.mapPlaceholder}>
                    {/* Faked Map Area */}
                    <Text style={styles.placeholderText}>Map Box</Text>
                    
                    {/* Floating Location Pill */}
                    <View style={styles.floatingLocation}>
                        <Ionicons name="location-sharp" size={16} color="#d9534f" />
                        <Text style={styles.floatingLocationText}>Pala-o, Iligan, City</Text>
                    </View>
                </View>

                {/* Bottom Sheet Section */}
                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
                    {/* Drag Handle */}
                    <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                        {/* Search Input */}
                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search" size={20} color="#1B6E45" />
                            <TextInput 
                                style={styles.searchInput}
                                placeholder="Where are you going?"
                                placeholderTextColor="#7B9B88"
                            />
                        </View>

                        {/* Quick Tags */}
                        <View style={styles.quickTagsContainer}>
                            <TouchableOpacity style={styles.quickTag}>
                                <Text style={styles.quickTagText}>Work</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickTag}>
                                <Text style={styles.quickTagText}>School</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickTag}>
                                <Text style={styles.quickTagText}>Saved</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Recent Destinations */}
                        <Text style={styles.sectionTitle}>Recent Destinations</Text>

                        <TouchableOpacity style={styles.recentItem}>
                            <Text style={styles.recentItemTitle}>Robinsons Mall</Text>
                            <Text style={styles.recentItemSubtitle}>Macapagal Ave, Iligan City, Lanao del Norte</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.recentItem}>
                            <Text style={styles.recentItemTitle}>St. Michael's College</Text>
                            <Text style={styles.recentItemSubtitle}>74 Manuel L. Quezon Ave, Iligan City, 9200 Lanao del Norte</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </Animated.View>

                {/* Static Tab Bar (Mock) */}
                <View style={styles.tabBar}>
                    <TouchableOpacity style={styles.tabItem}>
                        <Ionicons name="home-outline" size={24} color="#1B6E45" />
                        <Text style={[styles.tabText, { color: '#1B6E45' }]}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem}>
                        <MaterialCommunityIcons name="motorbike" size={24} color="#1B6E45" />
                        <Text style={[styles.tabText, { color: '#1B6E45' }]}>Rides</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem}>
                        <Ionicons name="person-outline" size={24} color="#1B6E45" />
                        <Text style={[styles.tabText, { color: '#1B6E45' }]}>Profile</Text>
                    </TouchableOpacity>
                </View>

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
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#1B6E45',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
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
    mapPlaceholder: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 200,
    },
    placeholderText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 20,
        color: '#A0A0A0',
    },
    floatingLocation: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E4F6EB',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1B6E45',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    floatingLocationText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#000000',
        marginLeft: 6,
    },
    bottomSheet: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: windowHeight,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 2,
        borderColor: '#E4F6EB',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    dragHandleContainer: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#CCC',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 100, // Space for tab bar
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#E4F6EB',
        borderWidth: 1,
        borderColor: '#1B6E45',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Outfit_500Medium',
        fontSize: 18,
        color: '#000000',
        padding: 0,
    },
    quickTagsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    quickTag: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#1B6E45',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 24,
    },
    quickTagText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#1B6E45',
    },
    sectionTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#1B6E45',
        marginBottom: 12,
    },
    recentItem: {
        backgroundColor: '#E4F6EB',
        borderWidth: 1,
        borderColor: '#1B6E45',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    recentItemTitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#7B9B88',
        marginBottom: 4,
    },
    recentItemSubtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 12,
        color: '#7B9B88',
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
