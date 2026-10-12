import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Image,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_400Regular, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/fcscskwg/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'trike_profile_pictures';
const API_BASE_URL = 'https://trikeiligan.onrender.com';

export default function EditProfileScreen() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [profileImage, setProfileImage] = useState('');
    const [selectedLocalImage, setSelectedLocalImage] = useState<string | null>(null);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const id = await AsyncStorage.getItem('userId');
                setUserId(id);

                // Load cached values first
                const savedName = await AsyncStorage.getItem('user_full_name') || await AsyncStorage.getItem('userFullName');
                const savedUsername = await AsyncStorage.getItem('user_username');
                const savedPhone = await AsyncStorage.getItem('user_phone');
                const savedEmail = await AsyncStorage.getItem('user_email');
                const savedImage = await AsyncStorage.getItem('user_profile_image');

                if (savedName) setFullName(savedName);
                if (savedUsername) setUsername(savedUsername);
                if (savedPhone) setPhoneNumber(savedPhone);
                if (savedEmail) setEmail(savedEmail);
                if (savedImage) setProfileImage(savedImage);

                // Fetch fresh data from backend if userId exists
                if (id) {
                    const res = await fetch(`${API_BASE_URL}/api/user-profile/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'success' && data.user) {
                            if (data.user.fullName) setFullName(data.user.fullName);
                            if (data.user.username) setUsername(data.user.username);
                            if (data.user.phoneNumber) setPhoneNumber(data.user.phoneNumber);
                            if (data.user.email) setEmail(data.user.email);
                            if (data.user.profileImage) {
                                setProfileImage(data.user.profileImage);
                                await AsyncStorage.setItem('user_profile_image', data.user.profileImage);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading profile data:", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, []);

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission Required", "Please allow photo library access to change your profile picture.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedLocalImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert("Validation Error", "Full Name cannot be empty.");
            return;
        }

        setIsSaving(true);
        try {
            let uploadedImageUrl = profileImage;

            // 1. Upload to Cloudinary if user selected a new local image
            if (selectedLocalImage) {
                const cloudRes = await FileSystem.uploadAsync(
                    CLOUDINARY_UPLOAD_URL,
                    selectedLocalImage,
                    {
                        httpMethod: 'POST',
                        uploadType: 1 as any, // MULTIPART
                        fieldName: 'file',
                        parameters: {
                            upload_preset: CLOUDINARY_UPLOAD_PRESET,
                        },
                    }
                );

                const cloudData = JSON.parse(cloudRes.body);

                if (cloudRes.status !== 200 || !cloudData.secure_url) {
                    console.error("Cloudinary upload failed:", cloudData);
                    Alert.alert("Upload Error", "Failed to upload profile photo to Cloudinary. Please try again.");
                    setIsSaving(false);
                    return;
                }

                uploadedImageUrl = cloudData.secure_url;
                setProfileImage(uploadedImageUrl);
            }

            // 2. Persist to Backend if userId exists
            if (userId) {
                const res = await fetch(`${API_BASE_URL}/api/user-profile/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName: fullName.trim(),
                        username: username.trim(),
                        phoneNumber: phoneNumber.trim(),
                        email: email.trim(),
                        profileImage: uploadedImageUrl,
                    }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.error("Backend update error:", errData);
                }
            }

            // 3. Save to AsyncStorage for offline / instant availability
            await AsyncStorage.setItem('user_full_name', fullName.trim());
            await AsyncStorage.setItem('userFullName', fullName.trim());
            if (username) await AsyncStorage.setItem('user_username', username.trim());
            if (phoneNumber) await AsyncStorage.setItem('user_phone', phoneNumber.trim());
            if (email) await AsyncStorage.setItem('user_email', email.trim());
            if (uploadedImageUrl) await AsyncStorage.setItem('user_profile_image', uploadedImageUrl);

            Alert.alert("Success", "Profile updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (error) {
            console.error("Failed to update profile:", error);
            Alert.alert("Error", "Could not update profile. Please check your internet connection.");
        } finally {
            setIsSaving(false);
        }
    };

    let [fontsLoaded] = useFonts({
        Outfit_700Bold,
        Outfit_500Medium,
        Outfit_400Regular,
        Outfit_600SemiBold,
    });

    if (!fontsLoaded || isLoading) {
        return (
            <View style={styles.loadingScreen}>
                <ActivityIndicator size="large" color="#1B6E45" />
            </View>
        );
    }

    const currentDisplayImage = selectedLocalImage || profileImage;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" />
            <KeyboardAwareScrollView contentContainerStyle={styles.container} bounces={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#000000" />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content */}
                <View style={styles.content}>
                    <Text style={styles.title}>Edit Profile</Text>
                    <Text style={styles.subtitle}>Update your personal information & photo</Text>

                    {/* Avatar with Cloudinary Edit Badge */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} activeOpacity={0.8}>
                            {currentDisplayImage ? (
                                <Image source={{ uri: currentDisplayImage }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={54} color="#1B6E45" />
                                </View>
                            )}
                            <View style={styles.cameraBadge}>
                                <Ionicons name="camera" size={18} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={pickImage}>
                            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.form}>
                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Enter full name"
                                placeholderTextColor="#888888"
                            />
                        </View>

                        {/* Username */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Enter username"
                                placeholderTextColor="#888888"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Phone Number */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                placeholder="Enter phone number"
                                placeholderTextColor="#888888"
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* Email Address */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter email"
                                placeholderTextColor="#888888"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>

            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    container: {
        flexGrow: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'space-between',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
    },
    backText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 16,
        color: '#000000',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    title: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 28,
        color: '#000000',
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: '#666666',
        marginBottom: 24,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    avatarWrapper: {
        position: 'relative',
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#E4F6EB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#1B6E45',
    },
    avatarImage: {
        width: 104,
        height: 104,
        borderRadius: 52,
    },
    avatarPlaceholder: {
        width: 104,
        height: 104,
        borderRadius: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: '#1B6E45',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    changePhotoText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#1B6E45',
        marginTop: 10,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#333333',
    },
    input: {
        fontFamily: 'Outfit_500Medium',
        backgroundColor: '#F7FAF8',
        borderWidth: 1,
        borderColor: '#D4E8DC',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#000000',
    },
    bottomContainer: {
        paddingHorizontal: 24,
        paddingBottom: 30,
        paddingTop: 20,
    },
    saveButton: {
        backgroundColor: '#1B6E45',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#1B6E45',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    saveButtonText: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#FFFFFF',
        fontSize: 16,
    },
});