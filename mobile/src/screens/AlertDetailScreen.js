import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function AlertDetailScreen({ route, navigation }) {
  const [loading, setLoading] = useState(true);
  const [alertData, setAlertData] = useState(null);

  useEffect(() => {
    // Get alert data from navigation params
    const { alert } = route.params || {};
    
    if (alert) {
      setAlertData(alert);
      setLoading(false);
    } else {
      // If no alert data provided, show error and go back
      Alert.alert('Error', 'No alert information available', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [route.params]);

  const handleCallPress = async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const phoneNumber = alertData?.phone;
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }

    const phoneUrl = `tel:${phoneNumber}`;
    
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Unable to make phone calls on this device');
        }
      })
      .catch((err) => {
        console.error('Error opening phone dialer:', err);
        Alert.alert('Error', 'Failed to open phone dialer');
      });
  };

  const handleEmergencyCall = async () => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    Alert.alert(
      'Call Emergency Services',
      'Call 999 or 112?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 999',
          onPress: () => Linking.openURL('tel:999')
        },
        {
          text: 'Call 112',
          onPress: () => Linking.openURL('tel:112')
        }
      ]
    );
  };

  const handleLocationPress = async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const location = alertData?.location;
    if (!location || !location.latitude || !location.longitude) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    const { latitude, longitude } = location;
    const appleMapsUrl = `maps://maps.apple.com/?ll=${latitude},${longitude}&q=Emergency%20Location`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
    // Try Apple Maps first (iOS), fallback to Google Maps
    const mapUrl = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;

    Linking.canOpenURL(mapUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(mapUrl);
        } else {
          // Fallback to Google Maps web
          return Linking.openURL(googleMapsUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening maps:', err);
        Alert.alert('Error', 'Failed to open maps application');
      });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Loading alert details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = alertData?.name || 'Unknown User';
  const displayPhone = alertData?.phone || 'Not available';
  const alertTime = alertData?.timestamp 
    ? new Date(alertData.timestamp).toLocaleString('en-IE', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Just now';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.emergencyBadge}>
            <Text style={styles.emergencyIcon}>🚨</Text>
          </View>
          <Text style={styles.headerTitle}>Emergency Alert</Text>
          <Text style={styles.headerSubtitle}>{alertTime}</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <Text style={styles.userName}>{displayName}</Text>
          
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Needs Assistance</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>👤</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{displayName}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📞</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{displayPhone}</Text>
              </View>
            </View>

            {alertData?.location && (
              <>
                <View style={styles.divider} />
                <Pressable style={styles.infoRow} onPress={handleLocationPress}>
                  <View style={styles.infoIconContainer}>
                    <Text style={styles.infoIcon}>📍</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>
                      {alertData.location.latitude?.toFixed(6)}, {alertData.location.longitude?.toFixed(6)}
                    </Text>
                    <Text style={styles.tapToOpen}>Tap to open in Maps</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Pressable 
            style={styles.callButton}
            onPress={handleCallPress}
            disabled={!displayPhone || displayPhone === 'Not available'}
          >
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callButtonText}>Call User</Text>
          </Pressable>

          <Pressable 
            style={styles.emergencyButton}
            onPress={handleEmergencyCall}
          >
            <Text style={styles.emergencyButtonIcon}>🚑</Text>
            <Text style={styles.emergencyButtonText}>Call Emergency Services</Text>
          </Pressable>
        </View>

        {/* Warning Message */}
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            This is an emergency alert. Please respond as quickly as possible.
          </Text>
        </View>

        {/* Back Button */}
        <Pressable 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emergencyBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyIcon: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#ffebee',
  },
  avatarTextLarge: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d32f2f',
    marginRight: 6,
  },
  statusText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  tapToOpen: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: '#d32f2f',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  actionSection: {
    marginBottom: 20,
  },
  callButton: {
    flexDirection: 'row',
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  callIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  emergencyButton: {
    flexDirection: 'row',
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emergencyButtonIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff9800',
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#e65100',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
