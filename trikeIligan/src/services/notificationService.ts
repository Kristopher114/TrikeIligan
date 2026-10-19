import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Configure how notifications behave in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// 2. Setup notification channels for Android
export async function setupNotificationChannels() {
    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('rides', {
                name: 'Ride Updates',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#1B6E45',
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });

            await Notifications.setNotificationChannelAsync('payments', {
                name: 'Payment Notifications',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 200, 100, 200],
                lightColor: '#1B6E45',
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });
        } catch (error) {
            console.error('Error creating Android notification channels:', error);
        }
    }
}

// 3. Register for Push Notifications & Save token to backend
export async function registerForPushNotificationsAsync(userId?: string | null): Promise<string | null> {
    try {
        await setupNotificationChannels();

        if (!Device.isDevice) {
            console.log('Push notifications require a physical device');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted!');
            return null;
        }

        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId ??
            '7c795a9c-636c-4119-9da6-48a3a92c75aa';

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId || undefined,
        });

        const token = tokenData.data;
        console.log('Passenger Expo Push Token:', token);

        if (token) {
            await AsyncStorage.setItem('expoPushToken', token);

            const activeUserId = userId || (await AsyncStorage.getItem('userId'));
            if (activeUserId) {
                await fetch('https://trikeiligan.onrender.com/api/save-push-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: activeUserId, pushToken: token }),
                }).catch((e) => console.log('Failed to save push token to server:', e));
            }
        }

        return token;
    } catch (error) {
        console.error('Error registering push notifications:', error);
        return null;
    }
}

// 4. Trigger an immediate system notification on the device
export async function triggerNotification(
    title: string,
    body: string,
    data: Record<string, any> = {},
    channelId: string = 'rides'
) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: 'default',
                priority: 'max',
            },
            trigger: channelId ? { channelId } : null,
        });
    } catch (error) {
        console.error('Error triggering local notification:', error);
    }
}
