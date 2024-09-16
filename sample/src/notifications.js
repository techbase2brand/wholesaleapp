import PushNotification from 'react-native-push-notification';

export const configureNotifications = () => {
  PushNotification.configure({
    onNotification: function(notification) {
      // console.log('Notification received:', notification);
    },
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });
};

export const createNotificationChannel = () => {
  PushNotification.createChannel(
    {
      channelId: "default-channel-id",
      channelName: "Default Channel",
      channelDescription: "A default channel",
      soundName: "default",
      importance: 4,
      vibrate: true,
    },
    (created) => console.log(`createChannel returned '${created}'`)
  );
};

export const showNotification = (message) => {
  PushNotification.localNotification({
    channelId: "default-channel-id",
    title: message.notification.title,
    message: message.notification.body,
    // bigPictureUrl: message.notification.image || undefined, // Add image URL if present
    // bigLargeIcon: "ic_launcher", // Optional
    // largeIcon: "ic_launcher", // Optional
  });
};
