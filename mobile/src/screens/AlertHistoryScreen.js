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
  Image,
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

  const extractLocation = (item) => {
    const loc = item.location || item.coords || null;
    const lat = loc?.latitude ?? loc?.lat ?? item.latitude ?? item.lat ?? null;
    const lon = loc?.longitude ?? loc?.lng ?? loc?.long ?? item.longitude ?? item.lng ?? item.long ?? null;
    if (lat == null || lon == null) return null;
    const nLat = typeof lat === 'string' ? parseFloat(lat) : lat;
    const nLon = typeof lon === 'string' ? parseFloat(lon) : lon;
    if (!isFinite(nLat) || !isFinite(nLon)) return null;
    return { latitude: nLat, longitude: nLon };
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

  // Call action removed from Alert History

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

  const formatDate = (value) => {
    try {
      const d = typeof value === 'string' ? new Date(value) : value;
      if (!d || isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch {
      return '';
    }
  };

  const renderAlertItem = ({ item }) => {
    // Debug log to check if profileImage exists
    if (item.profileImage) {
      console.log('[AlertHistory] Profile image URL:', item.profileImage, 'for user:', item.name);
    }
    
    return (
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.avatarSmall}>
            {item.profileImage ? (
              <Image
                source={{ uri: item.profileImage }}
                style={styles.avatarImageSmall}
                onError={(e) => console.log('[AlertHistory] Image load error:', e.nativeEvent.error)}
                onLoad={() => console.log('[AlertHistory] Image loaded successfully for:', item.name)}
              />
            ) : (
              <Text style={styles.avatarTextSmall}>
                {item.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
        <View style={styles.alertInfo}>
          <Text style={styles.alertName}>{item.name || 'Unknown User'}</Text>
          <Text style={styles.alertTime}>{getTimeAgo(item.timestamp)}{item.created_at ? ` • ${formatDate(item.created_at)}` : ''}</Text>
        </View>
        <View style={styles.statusBadgeSmall}>
          <Text style={styles.emergencyIconSmall}>🚨</Text>
        </View>
      </View>

      <View style={styles.alertDetails}>
        <View style={styles.detailRowCompact}>
          <Text style={styles.detailIcon}>📞</Text>
          <View style={styles.detailContentCompact}>
            <Text style={styles.detailLabelCompact}>PHONE</Text>
            <Text style={styles.detailTextCompact} numberOfLines={1} ellipsizeMode="tail">
              {item.phone || 'No phone'}
            </Text>
          </View>
          {/* Action buttons removed on history screen */}
        </View>

        {extractLocation(item) && (
          <Pressable 
            style={styles.detailRowPressable}
            onPress={() => handleLocationPress(extractLocation(item), item.name)}
          >
            <Text style={styles.detailIcon}>📍</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>LOCATION</Text>
              <Text style={styles.detailText}>
                {extractLocation(item).latitude.toFixed(4)}, {extractLocation(item).longitude.toFixed(4)}
              </Text>
              <Text style={styles.tapHint}>Tap to open in Maps</Text>
            </View>
            <Text style={styles.actionIcon}>›</Text>
          </Pressable>
        )}
        {/* Secondary Directions button removed for cleaner UI */}
      </View>
    </View>
    );
  };

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
          {alerts.length > 0 
            ? `${alerts.length} ${alerts.length === 1 ? 'alert' : 'alerts'} received (last hour)` 
            : 'No alerts in the last hour'}
        </Text>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlertItem}
        keyExtractor={(item, index) => String(item.id ?? item.alertId ?? item.timestamp ?? index)}
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
    overflow: 'hidden',
  },
  avatarImageSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  detailRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
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
  detailContentCompact: {
    flex: 1,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  detailLabelCompact: {
    fontSize: 9,
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
  detailTextCompact: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actionIcon: {
    fontSize: 24,
    color: '#d32f2f',
    marginLeft: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconAction: {
    backgroundColor: '#d32f2f',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  iconEmoji: {
    fontSize: 16,
    color: '#fff',
  },
  tapHint: {
    fontSize: 11,
    color: '#d32f2f',
    marginTop: 2,
    fontWeight: '600',
  },
  directionsButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  directionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inlineDirectionsButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  inlineDirectionsText: {
    color: '#fff',
    fontSize: 12,
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
