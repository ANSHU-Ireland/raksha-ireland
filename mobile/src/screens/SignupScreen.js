import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { signupUser } from '../api/aws';

const IRISH_COUNTIES = [
  'Antrim', 'Armagh', 'Carlow', 'Cavan', 'Clare', 'Cork', 'Derry', 
  'Donegal', 'Down', 'Dublin', 'Fermanagh', 'Galway', 'Kerry', 
  'Kildare', 'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 
  'Louth', 'Mayo', 'Meath', 'Monaghan', 'Offaly', 'Roscommon', 
  'Sligo', 'Tipperary', 'Tyrone', 'Waterford', 'Westmeath', 'Wexford', 'Wicklow'
];

export default function SignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: '',
    county: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!formData.age || isNaN(formData.age) || parseInt(formData.age) < 18) {
      Alert.alert('Error', 'Please enter a valid age (18+)');
      return false;
    }
    if (!formData.sex) {
      Alert.alert('Error', 'Please select your gender');
      return false;
    }
    if (!formData.county) {
      Alert.alert('Error', 'Please select your county');
      return false;
    }
    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>RAKSHA Ireland</Text>
        <Text style={styles.subtitle}>Emergency Response Network</Text>
        
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={formData.age}
            onChangeText={(value) => handleInputChange('age', value)}
            placeholder="Enter your age"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.sex}
              style={styles.picker}
              onValueChange={(value) => handleInputChange('sex', value)}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>

          <Text style={styles.label}>County</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.county}
              style={styles.picker}
              onValueChange={(value) => handleInputChange('county', value)}
            >
              <Picker.Item label="Select County" value="" />
              {IRISH_COUNTIES.map(county => (
                <Picker.Item key={county} label={county} value={county} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
});