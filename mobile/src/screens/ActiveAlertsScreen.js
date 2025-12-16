import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Pressable, Image, Platform, Alert, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { getActiveAlerts } from '../api/aws';

export default function ActiveAlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActiveAlerts();
  }, []);

  // Refresh the list whenever the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      loadActiveAlerts();
    }, [])
  );

  const loadActiveAlerts = async () => {
    try {
      setLoading(true);
      const response = await getActiveAlerts();
      if (response?.success) setAlerts(response.alerts || []);
    } catch (error) {
      console.error('Failed to load active alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveAlerts();
    setRefreshing(false);
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

  const handleLocationPress = async (location, name) => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!location) return;
    const { latitude, longitude } = location;
    const appleMapsUrl = `maps://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(name)}%20Emergency`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const mapUrl = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;
    try {
      const supported = await Linking.canOpenURL(mapUrl);
      await Linking.openURL(supported ? mapUrl : googleMapsUrl);
    } catch (err) {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Failed to open maps');
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
    Alert.alert(`Call ${name}?`, phoneNumber, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) }
    ]);
  };

  const renderAlertItem = ({ item }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.avatarSmall}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.avatarImageSmall} />
          ) : (
            <Text style={styles.avatarTextSmall}>
              {item.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          )}
        </View>
        <View style={styles.alertInfo}>
          <Text style={styles.alertName}>{item.name || 'Unknown User'}</Text>
          <Text style={styles.alertTime}>Active • {new Date(item.timestamp).toLocaleString()}</Text>
        </View>
        <View style={styles.statusBadgeSmall}>
          <Text style={styles.emergencyIconSmall}>🔔</Text>
        </View>
      </View>

      <View style={styles.alertDetails}>
        {/* Phone row with call action moved here from history */}
        <View style={styles.detailRowCompact}>
          <Text style={styles.detailIcon}>📞</Text>
          <View style={styles.detailContentCompact}>
            <Text style={styles.detailLabelCompact}>PHONE</Text>
            <Text style={styles.detailTextCompact} numberOfLines={1} ellipsizeMode="tail">
              {item.phone || 'No phone'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.iconAction}
            onPress={() => handleCallPress(item.phone, item.name)}
          >
            <Text style={styles.iconEmoji}>📞</Text>
          </TouchableOpacity>
        </View>

        {extractLocation(item) && (
          <Pressable style={styles.detailRowPressable} onPress={() => handleLocationPress(extractLocation(item), item.name)}>
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
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Loading active alerts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Alerts</Text>
        <Text style={styles.headerSubtitle}>
          {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} active
        </Text>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlertItem}
        keyExtractor={(item, index) => String(item.alertId ?? index)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d32f2f" colors={["#d32f2f"]} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#999' },
  listContent: { padding: 16, flexGrow: 1 },
  alertCard: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#d32f2f', elevation: 3 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarSmall: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#d32f2f', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  avatarImageSmall: { width: 48, height: 48, borderRadius: 24 },
  avatarTextSmall: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 2 },
  alertTime: { fontSize: 13, color: '#999' },
  statusBadgeSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff8e1', justifyContent: 'center', alignItems: 'center' },
  emergencyIconSmall: { fontSize: 20 },
  alertDetails: { paddingTop: 8 },
  detailRowCompact: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#f8f8f8', marginBottom: 8 },
  detailRowPressable: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#f8f8f8', marginBottom: 8 },
  detailIcon: { fontSize: 20, marginRight: 12, width: 24 },
  detailContent: { flex: 1 },
  detailContentCompact: { flex: 1, marginRight: 8 },
  detailLabel: { fontSize: 10, color: '#999', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  detailLabelCompact: { fontSize: 9, color: '#999', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  detailText: { fontSize: 15, color: '#333', fontWeight: '500' },
  detailTextCompact: { fontSize: 14, color: '#333', fontWeight: '500' },
  tapHint: { fontSize: 11, color: '#d32f2f', marginTop: 2, fontWeight: '600' },
  actionIcon: { fontSize: 24, color: '#d32f2f', marginLeft: 8 },
  iconAction: { backgroundColor: '#d32f2f', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  iconEmoji: { fontSize: 16, color: '#fff' },
});
