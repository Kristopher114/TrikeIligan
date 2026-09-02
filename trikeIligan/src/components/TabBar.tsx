import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TabBar({ activeTab }) {
    const router = useRouter();

    return (
        <View style={styles.tabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/home')}>
                <Ionicons
                    name="home"
                    size={24}
                    color={activeTab === 'home' ? '#1B6E45' : '#A0A0A0'}
                />
                <Text style={[styles.tabText, { color: activeTab === 'home' ? '#1B6E45' : '#A0A0A0' }]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/rides')}>
                <MaterialCommunityIcons
                    name="motorbike"
                    size={24}
                    color={activeTab === 'rides' ? '#1B6E45' : '#A0A0A0'}
                />
                <Text style={[styles.tabText, { color: activeTab === 'rides' ? '#1B6E45' : '#A0A0A0' }]}>Rides</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/profile')}>
                <Ionicons
                    name="person-outline"
                    size={24}
                    color={activeTab === 'profile' ? '#1B6E45' : '#A0A0A0'}
                />
                <Text style={[styles.tabText, { color: activeTab === 'profile' ? '#1B6E45' : '#A0A0A0' }]}>Profile</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    tabItem: {
        alignItems: 'center',
    },
    tabText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12,
        marginTop: 4,
    },
});
