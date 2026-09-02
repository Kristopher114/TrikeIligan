import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_400Regular, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TabBar from '../components/TabBar';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');

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

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.removeItem('userFullName');
                        router.replace('/');
                    }
                }
            ]
        );
    };

    const [fontsLoaded] = useFonts({
        Outfit_700Bold,
        Outfit_600SemiBold,
        Outfit_500Medium,
        Outfit_400Regular,
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>

                {/* Profile Info */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={60} color="#1B6E45" />
                    </View>
                    <Text style={styles.userName}>{fullName || 'Guest'}</Text>
                    <Text style={styles.userRole}>Passenger</Text>
                </View>

                {/* Menu List */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem}>
                        <Ionicons name="time-outline" size={24} color="#555" />
                        <Text style={styles.menuText}>Ride History</Text>
                        <Ionicons name="chevron-forward" size={24} color="#CCC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Ionicons name="settings-outline" size={24} color="#555" />
                        <Text style={styles.menuText}>Settings</Text>
                        <Ionicons name="chevron-forward" size={24} color="#CCC" />
                    </TouchableOpacity>

                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#D32F2F" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                {/* Reusable Tab Bar */}
                <TabBar activeTab="profile" />
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 20,
        color: '#000000',
        marginLeft: 12,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    userName: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 24,
        color: '#000000',
        marginBottom: 4,
    },
    userRole: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 16,
        color: '#7B9B88',
    },
    menuContainer: {
        marginTop: 24,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F0F0F0',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuText: {
        flex: 1,
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#333333',
        marginLeft: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFEBEB',
        marginHorizontal: 20,
        marginTop: 40,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFCDCD',
    },
    logoutText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 18,
        color: '#D32F2F',
        marginLeft: 8,
    },
});
