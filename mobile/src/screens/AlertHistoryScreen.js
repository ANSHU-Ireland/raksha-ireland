import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getAlertHistory } from '../api/aws';

export default function AlertHistoryScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlertHistory();
  }, []);

  const loadAlertHistory = async () => {
    try {
      setLoading(true);
      const response = await getAlertHistory();
      if (response?.success) setAlerts(response.alerts || []);
    } catch (error) {
      console.error('Failed to load alert history:', error);
      // Set empty array on error
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlertHistory();
    setRefreshing(false);
  };

  const handleAlertPress = (alert) => {
    // Show action options instead of navigating
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCallPress = async (phoneNumber, name) => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }

    Alert.alert(
      `Call ${name}?`,
      phoneNumber,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${phoneNumber}`)
        }
      ]
    );
  };

  const handleLocationPress = async (location, name) => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!location || !location.latitude || !location.longitude) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    const { latitude, longitude } = location;
    const appleMapsUrl = `maps://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(name)}%20Emergency`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
    const mapUrl = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;

    Linking.canOpenURL(mapUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(mapUrl);
        } else {
          return Linking.openURL(googleMapsUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening maps:', err);
        Alert.alert('Error', 'Failed to open maps application');
      });
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return alertTime.toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: alertTime.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderAlertItem = ({ item }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarTextSmall}>
            {item.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.alertInfo}>
          <Text style={styles.alertName}>{item.name || 'Unknown User'}</Text>
          <Text style={styles.alertTime}>{getTimeAgo(item.timestamp)}</Text>
        </View>
        <View style={styles.statusBadgeSmall}>
          <Text style={styles.emergencyIconSmall}>🚨</Text>
        </View>
      </View>

      <View style={styles.alertDetails}>
        <Pressable 
          style={styles.detailRowPressable}
          onPress={() => handleCallPress(item.phone, item.name)}
        >
          <Text style={styles.detailIcon}>📞</Text>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>PHONE NUMBER</Text>
            <Text style={styles.detailText}>{item.phone || 'No phone'}</Text>
          </View>
          <Text style={styles.actionIcon}>›</Text>
        </Pressable>

        {item.location && (
          <Pressable 
            style={styles.detailRowPressable}
            onPress={() => handleLocationPress(item.location, item.name)}
          >
            <Text style={styles.detailIcon}>📍</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>LOCATION</Text>
              <Text style={styles.detailText}>
                {item.location.latitude?.toFixed(4)}, {item.location.longitude?.toFixed(4)}
              </Text>
              <Text style={styles.tapHint}>Tap to open in Maps</Text>
            </View>
            <Text style={styles.actionIcon}>›</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No Alerts Yet</Text>
      <Text style={styles.emptyText}>
        Emergency alerts from nearby users will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alert History</Text>
        <Text style={styles.headerSubtitle}>
          {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} received
        </Text>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlertItem}
        keyExtractor={(item) => item.alertId || item.timestamp}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#d32f2f"
            colors={['#d32f2f']}
          />
        }
      />
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
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
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 13,
    color: '#999',
  },
  statusBadgeSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyIconSmall: {
    fontSize: 20,
  },
  alertDetails: {
    paddingTop: 8,
  },
  detailRowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  actionIcon: {
    fontSize: 24,
    color: '#d32f2f',
    marginLeft: 8,
  },
  tapHint: {
    fontSize: 11,
    color: '#d32f2f',
    marginTop: 2,
    fontWeight: '600',
  },
  alertFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
