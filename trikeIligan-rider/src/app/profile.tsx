import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_700Bold, Outfit_500Medium, Outfit_400Regular, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/fcscskwg/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'trike_profile_pictures';
const API_BASE_URL = 'https://trikeiligan.onrender.com';

export default function DriverProfileScreen() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [profileImage, setProfileImage] = useState('');
    const [selectedLocalImage, setSelectedLocalImage] = useState<string | null>(null);
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [vehicleType, setVehicleType] = useState('TRICYCLE');
    const [approvalStatus, setApprovalStatus] = useState('APPROVED');
    const [rating, setRating] = useState('5.00');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const id = await AsyncStorage.getItem('userId');
                setUserId(id);

                // Load cached local values
                const savedName = await AsyncStorage.getItem('userFullName') || await AsyncStorage.getItem('driverName');
                const savedEmail = await AsyncStorage.getItem('userEmail');
                const savedPhone = await AsyncStorage.getItem('userPhone');
                const savedImage = await AsyncStorage.getItem('userProfileImage');
                const savedVehicle = await AsyncStorage.getItem('driverVehicle');
                const savedVehicleType = await AsyncStorage.getItem('driverVehicleType');
                const savedRating = await AsyncStorage.getItem('driverRating');
                const savedPlate = await AsyncStorage.getItem('driverVehiclePlate');

                if (savedName) setFullName(savedName);
                if (savedEmail) setEmail(savedEmail);
                if (savedPhone) setPhoneNumber(savedPhone);
                if (savedImage) setProfileImage(savedImage);
                if (savedVehicle) {
                    const initialModel = savedVehicle === 'Trike' ? 'Kawasaki Barako 175' : savedVehicle;
                    setVehicleModel(initialModel);
                } else {
                    setVehicleModel('Kawasaki Barako 175');
                }
                if (savedVehicleType) setVehicleType(savedVehicleType);
                if (savedRating) setRating(savedRating);
                if (savedPlate) setVehiclePlate(savedPlate);

                // Fetch fresh profile data from backend if userId exists
                if (id) {
                    const res = await fetch(`${API_BASE_URL}/api/user-profile/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'success' && data.user) {
                            const u = data.user;
                            if (u.fullName) {
                                setFullName(u.fullName);
                                await AsyncStorage.setItem('driverName', u.fullName);
                            }
                            if (u.email) {
                                setEmail(u.email);
                                await AsyncStorage.setItem('userEmail', u.email);
                            }
                            if (u.phoneNumber) {
                                setPhoneNumber(u.phoneNumber);
                                await AsyncStorage.setItem('userPhone', u.phoneNumber);
                            }
                            if (u.vehicleModel) {
                                const cleanModel = u.vehicleModel === 'Trike' ? 'Kawasaki Barako 175' : u.vehicleModel;
                                setVehicleModel(cleanModel);
                                await AsyncStorage.setItem('driverVehicle', cleanModel);
                            } else {
                                const defaultModel = (u.vehicleType === 'SINGLE' ? 'Single Motorcycle' : 'Kawasaki Barako 175');
                                setVehicleModel(defaultModel);
                                await AsyncStorage.setItem('driverVehicle', defaultModel);
                            }
                            if (u.vehiclePlate) {
                                setVehiclePlate(u.vehiclePlate);
                                await AsyncStorage.setItem('driverVehiclePlate', u.vehiclePlate);
                            }
                            if (u.licenseNumber) setLicenseNumber(u.licenseNumber);
                            if (u.vehicleType) {
                                setVehicleType(u.vehicleType);
                                await AsyncStorage.setItem('driverVehicleType', u.vehicleType);
                            }
                            if (u.approvalStatus) setApprovalStatus(u.approvalStatus);
                            if (u.rating) {
                                const formattedRating = parseFloat(u.rating).toFixed(2);
                                setRating(formattedRating);
                                await AsyncStorage.setItem('driverRating', formattedRating);
                            }
                            if (u.profileImage) {
                                setProfileImage(u.profileImage);
                                await AsyncStorage.setItem('userProfileImage', u.profileImage);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading driver profile data:", e);
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

            // 1. Upload to Cloudinary if a new photo was selected
            if (selectedLocalImage) {
                let cloudRes = await FileSystem.uploadAsync(
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

                let cloudData = JSON.parse(cloudRes.body);

                // If new preset does not exist yet in Cloudinary, fall back to existing working preset
                if (cloudRes.status !== 200 && CLOUDINARY_UPLOAD_PRESET !== 'trike_driver_licenses') {
                    console.warn(`Preset ${CLOUDINARY_UPLOAD_PRESET} failed, trying trike_driver_licenses fallback...`);
                    cloudRes = await FileSystem.uploadAsync(
                        CLOUDINARY_UPLOAD_URL,
                        selectedLocalImage,
                        {
                            httpMethod: 'POST',
                            uploadType: 1 as any,
                            fieldName: 'file',
                            parameters: {
                                upload_preset: 'trike_driver_licenses',
                            },
                        }
                    );
                    cloudData = JSON.parse(cloudRes.body);
                }

                if (cloudRes.status !== 200 || !cloudData.secure_url) {
                    console.error("Cloudinary upload failed:", cloudData);
                    Alert.alert("Upload Error", cloudData.error?.message || "Failed to upload profile photo to Cloudinary. Please try again.");
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
                        phoneNumber: phoneNumber.trim(),
                        email: email.trim(),
                        profileImage: uploadedImageUrl,
                        vehicleModel: vehicleModel.trim(),
                        vehiclePlate: vehiclePlate.trim(),
                    }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.error("Backend driver update error:", errData);
                }
            }

            // 3. Save to AsyncStorage for instant local persistence
            await AsyncStorage.setItem('userFullName', fullName.trim());
            await AsyncStorage.setItem('driverName', fullName.trim());
            if (email) await AsyncStorage.setItem('userEmail', email.trim());
            if (phoneNumber) await AsyncStorage.setItem('userPhone', phoneNumber.trim());
            if (vehicleModel) await AsyncStorage.setItem('driverVehicle', vehicleModel.trim());
            if (vehiclePlate) await AsyncStorage.setItem('driverVehiclePlate', vehiclePlate.trim());
            if (uploadedImageUrl) await AsyncStorage.setItem('userProfileImage', uploadedImageUrl);

            Alert.alert("Success", "Profile updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (error) {
            console.error("Failed to update driver profile:", error);
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
                    <Text style={styles.subtitle}>Update your personal driver details & photo</Text>

                    {/* Avatar with Camera Badge */}
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

                        {/* Badges: Status, Rating, Vehicle Type */}
                        <View style={styles.badgesRow}>
                            <View style={[
                                styles.statusBadge, 
                                approvalStatus === 'APPROVED' ? styles.statusApproved : 
                                approvalStatus === 'REJECTED' ? styles.statusRejected : styles.statusPending
                            ]}>
                                <Ionicons 
                                    name={approvalStatus === 'APPROVED' ? "checkmark-circle" : approvalStatus === 'REJECTED' ? "close-circle" : "time"} 
                                    size={14} 
                                    color={approvalStatus === 'APPROVED' ? "#1B6E45" : approvalStatus === 'REJECTED' ? "#D32F2F" : "#E65100"} 
                                />
                                <Text style={[
                                    styles.statusText,
                                    approvalStatus === 'APPROVED' ? styles.statusTextApproved : 
                                    approvalStatus === 'REJECTED' ? styles.statusTextRejected : styles.statusTextPending
                                ]}>
                                    {approvalStatus}
                                </Text>
                            </View>

                            <View style={styles.infoBadge}>
                                <Ionicons name="star" size={14} color="#FFA000" />
                                <Text style={styles.infoBadgeText}>{rating} Rating</Text>
                            </View>

                            <View style={styles.infoBadge}>
                                <Ionicons name={vehicleType === 'TRICYCLE' ? "bicycle" : "flash"} size={14} color="#555555" />
                                <Text style={styles.infoBadgeText}>{vehicleType === 'TRICYCLE' ? 'Tricycle' : 'Single'}</Text>
                            </View>
                        </View>
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

                        {/* Vehicle Model */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Vehicle Model</Text>
                            <TextInput
                                style={styles.input}
                                value={vehicleModel}
                                onChangeText={setVehicleModel}
                                placeholder="e.g. Kawasaki Barako 175"
                                placeholderTextColor="#888888"
                            />
                        </View>

                        {/* Plate Number */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Vehicle Plate Number</Text>
                            <TextInput
                                style={styles.input}
                                value={vehiclePlate}
                                onChangeText={setVehiclePlate}
                                placeholder="e.g. XYZ-987"
                                placeholderTextColor="#888888"
                                autoCapitalize="characters"
                            />
                        </View>

                        {/* License Number (Read Only) */}
                        {licenseNumber ? (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Driver's License Number</Text>
                                <TextInput
                                    style={[styles.input, styles.inputDisabled]}
                                    value={licenseNumber}
                                    editable={false}
                                    placeholderTextColor="#888888"
                                />
                            </View>
                        ) : null}
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
        marginBottom: 20,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
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
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusApproved: {
        backgroundColor: '#E8F5E9',
    },
    statusPending: {
        backgroundColor: '#FFF3E0',
    },
    statusRejected: {
        backgroundColor: '#FFEBEE',
    },
    statusText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 12,
    },
    statusTextApproved: {
        color: '#1B6E45',
    },
    statusTextPending: {
        color: '#E65100',
    },
    statusTextRejected: {
        color: '#D32F2F',
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    infoBadgeText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12,
        color: '#444444',
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
    inputDisabled: {
        backgroundColor: '#ECECEC',
        color: '#777777',
        borderColor: '#DDDDDD',
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
