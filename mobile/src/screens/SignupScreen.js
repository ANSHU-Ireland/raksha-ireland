import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signupUser } from '../api/aws';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function SignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileImage: '',
    idDocument: null,
  });
  const [loading, setLoading] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [documentPickerVisible, setDocumentPickerVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!formData.phone || formData.phone.length < 7) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!formData.profileImage?.trim()) {
      Alert.alert('Error', 'Please add a profile photo');
      return false;
    }
    if (!formData.idDocument) {
      Alert.alert('Error', 'Please upload a proof of identification document');
      return false;
    }
    // Validate document size (max 10MB - industry standard)
    if (formData.idDocument.size > 10 * 1024 * 1024) {
      Alert.alert('Error', 'Document size must be less than 10MB');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signupUser(formData);
      Alert.alert(
        'Registration Submitted',
        'Your registration has been submitted for approval. You will receive an email once approved.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit registration. Please try again.');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, profileImage: result.assets[0].uri }));
        setImagePickerVisible(false);
        setAvatarError(false);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photos access is needed to choose an image.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, profileImage: result.assets[0].uri }));
        setImagePickerVisible(false);
        setAvatarError(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocumentFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        
        // Check file size (10MB limit - industry standard)
        if (doc.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Document size must be less than 10MB');
          return;
        }
        
        setFormData(prev => ({ ...prev, idDocument: doc }));
        setDocumentPickerVisible(false);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const takeDocumentPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        
        // Convert to document format
        const doc = {
          uri: photo.uri,
          name: `id-document-${Date.now()}.jpg`,
          size: photo.fileSize || 0,
          mimeType: 'image/jpeg',
        };
        
        if (doc.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Photo size must be less than 10MB');
          return;
        }
        
        setFormData(prev => ({ ...prev, idDocument: doc }));
        setDocumentPickerVisible(false);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickDocumentFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photos access is needed to choose an image.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        
        // Convert to document format
        const doc = {
          uri: photo.uri,
          name: `id-document-${Date.now()}.jpg`,
          size: photo.fileSize || 0,
          mimeType: 'image/jpeg',
        };
        
        if (doc.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Photo size must be less than 10MB');
          return;
        }
        
        setFormData(prev => ({ ...prev, idDocument: doc }));
        setDocumentPickerVisible(false);
      }
    } catch (error) {
      console.error('Gallery picker error:', error);
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>RAKSHA Ireland</Text>
        <Text style={styles.subtitle}>Emergency Response Network</Text>
        
        <View style={styles.form}>
              {/* Avatar Picker */}
              <View style={styles.signupAvatarContainer}>
                <Pressable onPress={() => setImagePickerVisible(true)}>
                  <View style={styles.signupAvatar}>
                    {formData.profileImage && !avatarError ? (
                      <Image
                        source={{ uri: formData.profileImage }}
                        style={styles.signupAvatarImage}
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <Text style={styles.signupAvatarText}>
                        {formData.name?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    )}
                    <View style={styles.cameraIconContainer}>
                      <Text style={styles.cameraIcon}>📷</Text>
                    </View>
                  </View>
                </Pressable>
                {imagePickerVisible && (
                  <View style={styles.pickerSheet}>
                    <Pressable style={styles.pickerOption} onPress={takePhoto}>
                      <Text style={styles.pickerOptionText}>Take Photo</Text>
                    </Pressable>
                    <Pressable style={styles.pickerOption} onPress={pickImage}>
                      <Text style={styles.pickerOptionText}>Choose from Library</Text>
                    </Pressable>
                    <Pressable style={styles.pickerCancel} onPress={() => setImagePickerVisible(false)}>
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                )}
              </View>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />


          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="Create a password"
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            placeholder="Re-enter your password"
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>Proof of Identification *</Text>
          <Text style={styles.helperText}>Upload a government-issued ID (Driver's License, Passport, etc.)</Text>
          <Pressable
            style={styles.documentPicker}
            onPress={() => setDocumentPickerVisible(true)}
          >
            <Text style={styles.documentPickerIcon}>📄</Text>
            <View style={styles.documentPickerContent}>
              <Text style={styles.documentPickerText}>
                {formData.idDocument ? formData.idDocument.name : 'Choose Document'}
              </Text>
              {formData.idDocument && (
                <Text style={styles.documentPickerSize}>
                  {(formData.idDocument.size / 1024).toFixed(2)} KB
                </Text>
              )}
            </View>
            <Text style={styles.documentPickerArrow}>›</Text>
          </Pressable>
          {documentPickerVisible && (
            <View style={styles.pickerSheet}>
              <Pressable style={styles.pickerOption} onPress={takeDocumentPhoto}>
                <Text style={styles.pickerOptionText}>📷 Take Photo</Text>
              </Pressable>
              <Pressable style={styles.pickerOption} onPress={pickDocumentFromGallery}>
                <Text style={styles.pickerOptionText}>🖼️ Choose from Gallery</Text>
              </Pressable>
              <Pressable style={styles.pickerOption} onPress={pickDocumentFromFiles}>
                <Text style={styles.pickerOptionText}>📁 Browse Files</Text>
              </Pressable>
              <Pressable style={styles.pickerCancel} onPress={() => setDocumentPickerVisible(false)}>
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}
          {formData.idDocument && (
            <Text style={styles.documentSuccess}>✓ Document uploaded successfully</Text>
          )}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Submitting...' : 'Register for RAKSHA'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Already registered? Login here</Text>
          </Pressable>
        </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#d32f2f',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signupAvatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  signupAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  signupAvatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  signupAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cameraIcon: {
    fontSize: 14,
  },
  pickerSheet: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerCancel: {
    padding: 12,
    alignItems: 'center',
  },
  pickerCancelText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#d32f2f',
    fontSize: 16,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  documentPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    marginBottom: 8,
  },
  documentPickerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  documentPickerContent: {
    flex: 1,
  },
  documentPickerText: {
    fontSize: 16,
    color: '#333',
  },
  documentPickerSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  documentPickerArrow: {
    fontSize: 24,
    color: '#999',
  },
  documentSuccess: {
    fontSize: 14,
    color: '#4caf50',
    marginBottom: 20,
  },
});