import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserProfile, updateUserProfile } from '../api/aws';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation, user, onLogout }) {
  const [profile, setProfile] = useState(user);
  const [avatarError, setAvatarError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    profileImage: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('ProfileScreen - User prop:', user);
    // Initialize with user prop
    if (user) {
      setProfile(user);
    }
    // Optionally load fresh profile data
    loadProfile();
  }, [user]);

  useEffect(() => {
    // Reset avatar error state when image changes
    setAvatarError(false);
  }, [profile?.profileImage]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await getUserProfile();
      console.log('ProfileScreen - API response:', profileData);
      if (profileData.success && profileData.user) {
        // Merge API data with existing user data
        const mergedProfile = {
          ...user,
          ...profileData.user
        };
        console.log('ProfileScreen - Merged profile:', mergedProfile);
        setProfile(mergedProfile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Keep using the user prop data
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            if (onLogout) {
              await onLogout();
            }
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const openEditModal = () => {
    setEditForm({
      name: profile?.name || '',
      phone: profile?.phone || '',
      profileImage: profile?.profileImage || null,
    });
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
  };

  const handleSaveProfile = async () => {
    try {
      // Validate inputs
      if (!editForm.name?.trim()) {
        Alert.alert('Error', 'Name is required');
        return;
      }

      if (!editForm.phone?.trim()) {
        Alert.alert('Error', 'Phone number is required');
        return;
      }

      setSaving(true);

      // Call API to update profile
      const response = await updateUserProfile({
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        profileImage: editForm.profileImage,
      });

      if (response.success && response.user) {
        // Update local state
        setProfile(response.user);
        
        // Update AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        
        Alert.alert('Success', 'Profile updated successfully!');
        closeEditModal();
        
        // Refresh profile data
        await loadProfile();
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Media library permission is required to choose photos');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setEditForm({ ...editForm, profileImage: result.assets[0].uri });
        setImagePickerVisible(false);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setEditForm({ ...editForm, profileImage: result.assets[0].uri });
        setImagePickerVisible(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const openImagePicker = () => {
    setImagePickerVisible(true);
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use profile state which is initialized with user prop
  const displayProfile = profile || {};
  
  console.log('ProfileScreen - Displaying:', {
    name: displayProfile.name,
    email: displayProfile.email,
    phone: displayProfile.phone,
    userId: displayProfile.userId
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#d32f2f"
            colors={['#d32f2f']}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Pressable style={styles.editButton} onPress={openEditModal}>
            <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
          </Pressable>
          
          <View style={styles.avatarContainer}>
            <Pressable onPress={openImagePicker}>
              <View style={styles.avatar}>
                {profile?.profileImage && !avatarError ? (
                  <Image 
                    source={{ uri: profile.profileImage }} 
                    style={styles.avatarImage}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {displayProfile.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                )}
                <View style={styles.cameraIconContainer}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </View>
            </Pressable>
          </View>
          <Text style={styles.userName}>{displayProfile.name || 'User'}</Text>
          <View style={styles.statusBadge}>
            <View style={[
              styles.statusDot,
              displayProfile.status === 'activated' && styles.statusDotActive
            ]} />
            <Text style={styles.statusText}>
              {displayProfile.status === 'activated' ? 'Active' : 
               displayProfile.status === 'approved' ? 'Approved' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>👤</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>
                  {displayProfile.name || 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📞</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>
                  {displayProfile.phone || 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📧</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {displayProfile.email || 'Not provided'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>🆔</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>User ID</Text>
                <Text style={styles.infoValueSmall}>
                  {displayProfile.userId || 'Not available'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📅</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {displayProfile.createdAt || displayProfile.joinedAt ? 
                    new Date(displayProfile.createdAt || displayProfile.joinedAt).toLocaleDateString('en-IE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 
                    'Not available'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Emergency Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Services</Text>
          
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyIcon}>🚨</Text>
              <View style={styles.emergencyContent}>
                <Text style={styles.emergencyTitle}>Ireland Emergency</Text>
                <Text style={styles.emergencyNumber}>999 or 112</Text>
              </View>
            </View>
            <Text style={styles.emergencyNote}>
              For immediate life-threatening emergencies, always call emergency services directly.
            </Text>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📱</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>App Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>ℹ️</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Support</Text>
                <Text style={styles.infoValue}>admin@rakshaireland.org</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            RAKSHA Ireland {new Date().getFullYear()}
          </Text>
          <Text style={styles.footerSubtext}>
            Emergency Response Network
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={closeEditModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Profile Image Preview */}
              <View style={styles.imagePreviewContainer}>
                <Pressable onPress={openImagePicker}>
                  <View style={styles.imagePreview}>
                    {editForm.profileImage ? (
                      <Image 
                        source={{ uri: editForm.profileImage }} 
                        style={styles.previewImage}
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Text style={styles.placeholderText}>
                          {editForm.name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.editImageBadge}>
                      <Text style={styles.editImageText}>📷 Change</Text>
                    </View>
                  </View>
                </Pressable>
              </View>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  placeholder="+353 XX XXX XXXX"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Email (Read-only) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email (Cannot be changed)</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={profile?.email || ''}
                  editable={false}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={closeEditModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={imagePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerTitle}>Choose Photo</Text>
            
            <TouchableOpacity style={styles.pickerOption} onPress={takePhoto}>
              <Text style={styles.pickerIcon}>📸</Text>
              <Text style={styles.pickerOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOption} onPress={pickImage}>
              <Text style={styles.pickerIcon}>🖼️</Text>
              <Text style={styles.pickerOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.pickerOption, styles.pickerCancel]} 
              onPress={() => setImagePickerVisible(false)}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#d32f2f',
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffa726',
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#66bb6a',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
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
  infoValueSmall: {
    fontSize: 13,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  emergencyCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 15,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  emergencyNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  emergencyNote: {
    fontSize: 13,
    color: '#e65100',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 30,
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d32f2f',
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
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },
  editButton: {
    position: 'absolute',
    top: 15,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d32f2f',
  },
  cameraIcon: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imagePreview: {
    position: 'relative',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#d32f2f',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#d32f2f',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#d32f2f',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  pickerIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  pickerOptionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  pickerCancel: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginTop: 8,
  },
  pickerCancelText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
});
