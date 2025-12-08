import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'dart:convert';
import 'dart:io';
import '../../core/theme/app_theme.dart';
import '../../core/config/app_config.dart';
import '../auth/providers/auth_provider.dart' as app_auth;
import 'providers/profile_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _nationalityController;
  late TextEditingController _phoneController;
  late TextEditingController _profilePicController;
  bool _isEditing = false;
  final ImagePicker _imagePicker = ImagePicker();
  bool _isUploadingImage = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<app_auth.AuthProvider>().currentUser;
    _nameController = TextEditingController(text: user?.fullName ?? '');
    _nationalityController = TextEditingController(text: user?.nationality ?? '');
    _phoneController = TextEditingController(text: user?.phoneNumber ?? '');
    _profilePicController = TextEditingController(text: user?.profilePicUrl ?? '');
    
    // Refresh profile data from backend
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshProfile();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _nationalityController.dispose();
    _phoneController.dispose();
    _profilePicController.dispose();
    super.dispose();
  }

  Future<void> _refreshProfile() async {
    final authProvider = context.read<app_auth.AuthProvider>();
    await authProvider.refreshUserProfile();
    
    // Update text controllers with refreshed data
    final user = authProvider.currentUser;
    if (user != null && mounted) {
      setState(() {
        _nameController.text = user.fullName ?? '';
        _nationalityController.text = user.nationality ?? '';
        _phoneController.text = user.phoneNumber ?? '';
        _profilePicController.text = user.profilePicUrl ?? '';
      });
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final profileProvider = context.read<ProfileProvider>();
    final success = await profileProvider.updateProfile(
      fullName: _nameController.text.trim(),
      nationality: _nationalityController.text.trim(),
      phoneNumber: _phoneController.text.trim(),
      profilePicUrl: _profilePicController.text.trim().isEmpty ? null : _profilePicController.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      setState(() => _isEditing = false);
      
      // Refresh profile to get latest data from backend
      await _refreshProfile();
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(profileProvider.errorMessage ?? 'Failed to update profile'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _showImageSourceDialog() async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Choose Profile Picture'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take Photo'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
            if (_profilePicController.text.isNotEmpty)
              ListTile(
                leading: const Icon(Icons.delete),
                title: const Text('Remove Picture'),
                onTap: () {
                  Navigator.pop(context);
                  _removeProfilePicture();
                },
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (image == null) return;

      setState(() => _isUploadingImage = true);

      try {
        // Get current user
        final user = FirebaseAuth.instance.currentUser;
        if (user == null) {
          throw Exception('User not authenticated');
        }

        print('📤 Starting image upload for user ${user.uid}');

        final File imageFile = File(image.path);
        print('📁 File path: ${imageFile.path}');
        print('📁 File exists: ${await imageFile.exists()}');
        print('📁 File size: ${await imageFile.length()} bytes');

        // Get auth token
        final token = await user.getIdToken();
        if (token == null) {
          throw Exception('Failed to get authentication token');
        }

        // Upload to backend (Supabase Storage)
        final request = http.MultipartRequest(
          'POST',
          Uri.parse('${AppConfig.apiBaseUrl}/users/upload-profile-picture'),
        );

        request.headers['Authorization'] = 'Bearer $token';
        request.files.add(await http.MultipartFile.fromPath(
          'profilePicture',
          imageFile.path,
          contentType: MediaType('image', 'jpeg'),
        ));

        print('📤 Sending upload request to backend...');
        final streamedResponse = await request.send();
        final response = await http.Response.fromStream(streamedResponse);

        print('📥 Upload response status: ${response.statusCode}');
        print('📥 Response body: ${response.body}');

        if (response.statusCode == 200) {
          final data = json.decode(response.body);
          final imageUrl = data['profile_pic_url'];
          
          if (imageUrl == null) {
            throw Exception('No profile picture URL in response');
          }

          print('✅ Upload successful! URL: $imageUrl');

          // Update the profile picture URL field
          _profilePicController.text = imageUrl;

          // Auto-save the profile with new image
          final profileProvider = context.read<ProfileProvider>();
          final success = await profileProvider.updateProfile(
            fullName: _nameController.text.trim(),
            nationality: _nationalityController.text.trim(),
            phoneNumber: _phoneController.text.trim(),
            profilePicUrl: imageUrl,
          );

          if (mounted) {
            setState(() => _isUploadingImage = false);

            if (success) {
              await _refreshProfile();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Profile picture updated successfully!'),
                  backgroundColor: Colors.green,
                ),
              );
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(profileProvider.errorMessage ?? 'Failed to update picture'),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
        } else {
          throw Exception('Upload failed with status ${response.statusCode}: ${response.body}');
        }
      } catch (uploadError) {
        if (mounted) {
          setState(() => _isUploadingImage = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Upload failed: ${uploadError.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingImage = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error picking image: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _removeProfilePicture() async {
    setState(() => _isUploadingImage = true);
    
    _profilePicController.text = '';
    
    final profileProvider = context.read<ProfileProvider>();
    final success = await profileProvider.updateProfile(
      fullName: _nameController.text.trim(),
      nationality: _nationalityController.text.trim(),
      phoneNumber: _phoneController.text.trim(),
      profilePicUrl: '',
    );

    if (mounted) {
      setState(() => _isUploadingImage = false);
      
      if (success) {
        await _refreshProfile();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile picture removed'),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: AppColors.crisisRed,
            actions: [
              IconButton(
                tooltip: 'Alert History',
                icon: const Icon(Icons.history),
                onPressed: () {
                  Navigator.pushNamed(context, '/alert-history');
                },
              ),
              if (!_isEditing)
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () => setState(() => _isEditing = true),
                )
              else
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    // Reset fields
                    final user = context.read<app_auth.AuthProvider>().currentUser;
                    _nameController.text = user?.fullName ?? '';
                    _nationalityController.text = user?.nationality ?? '';
                    _phoneController.text = user?.phoneNumber ?? '';
                    _profilePicController.text = user?.profilePicUrl ?? '';
                    setState(() => _isEditing = false);
                  },
                ),
        ],
      ),
      body: Consumer2<app_auth.AuthProvider, ProfileProvider>(
        builder: (context, authProvider, profileProvider, child) {
          final user = authProvider.currentUser;

          if (user == null) {
            return const Center(child: Text('No user data available'));
          }

          return RefreshIndicator(
            onRefresh: _refreshProfile,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Form(
                key: _formKey,
                child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Profile Header
                  Center(
                    child: Column(
                      children: [
                        Stack(
                          children: [
                            CircleAvatar(
                              radius: 50,
                              backgroundColor: AppColors.crisisRed.withOpacity(0.1),
                              backgroundImage: user.profilePicUrl != null && user.profilePicUrl!.isNotEmpty
                                  ? NetworkImage(user.profilePicUrl!)
                                  : null,
                              child: _isUploadingImage
                                  ? const CircularProgressIndicator()
                                  : (user.profilePicUrl == null || user.profilePicUrl!.isEmpty
                                      ? Icon(
                                          Icons.person,
                                          size: 60,
                                          color: AppColors.crisisRed,
                                        )
                                      : null),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: InkWell(
                                onTap: _showImageSourceDialog,
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppColors.crisisRed,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 2,
                                    ),
                                  ),
                                  child: const Icon(
                                    Icons.camera_alt,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          user.email,
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.textLight,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        _buildVerificationBadge(user.verificationStatus.name),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // Profile Information
                  Card(
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Personal Information',
                            style: AppTypography.headingMedium.copyWith(
                              color: AppColors.white,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // Full Name
                          TextFormField(
                            controller: _nameController,
                            enabled: _isEditing,
                            decoration: InputDecoration(
                              labelText: 'Full Name',
                              prefixIcon: const Icon(Icons.person_outline),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Name is required';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // Nationality
                          TextFormField(
                            controller: _nationalityController,
                            enabled: _isEditing,
                            decoration: InputDecoration(
                              labelText: 'Nationality',
                              prefixIcon: const Icon(Icons.flag_outlined),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Nationality is required';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // Phone Number
                          TextFormField(
                            controller: _phoneController,
                            enabled: _isEditing,
                            decoration: InputDecoration(
                              labelText: 'Phone Number',
                              prefixIcon: const Icon(Icons.phone_outlined),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // Profile Picture URL
                          TextFormField(
                            controller: _profilePicController,
                            enabled: _isEditing,
                            decoration: InputDecoration(
                              labelText: 'Profile Picture URL',
                              prefixIcon: const Icon(Icons.image_outlined),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              hintText: 'https://example.com/photo.jpg',
                            ),
                            keyboardType: TextInputType.url,
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // Email (read-only)
                          TextFormField(
                            initialValue: user.email,
                            enabled: false,
                            decoration: InputDecoration(
                              labelText: 'Email',
                              prefixIcon: const Icon(Icons.email_outlined),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Account Information
                  Card(
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Account Information',
                            style: AppTypography.headingMedium.copyWith(
                              color: AppColors.white,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          _buildInfoRow('Role', user.role.toUpperCase()),
                          const Divider(),
                          _buildInfoRow('Status', user.status.toUpperCase()),
                          const Divider(),
                          _buildInfoRow(
                            'Location Enabled',
                            user.locationEnabled ? 'Yes' : 'No',
                          ),
                          const Divider(),
                          _buildInfoRow(
                            'Member Since',
                            _formatDate(user.createdAt),
                          ),
                        ],
                      ),
                    ),
                  ),

                  if (_isEditing) ...[
                    const SizedBox(height: AppSpacing.xxl),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: profileProvider.isLoading ? null : _saveProfile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.crisisRed,
                          padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
                        ),
                        child: profileProvider.isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Save Changes'),
                      ),
                    ),
                  ],
                  
                  // Logout Button
                  const SizedBox(height: AppSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final authProvider = context.read<app_auth.AuthProvider>();
                        await authProvider.signOut();
                        if (mounted) {
                          Navigator.of(context).pushReplacementNamed('/login');
                        }
                      },
                      icon: const Icon(Icons.logout),
                      label: const Text('Logout'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.crisisRed,
                        side: BorderSide(color: AppColors.crisisRed),
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
      ),
    );
  }

  Widget _buildVerificationBadge(String? status) {
    Color color;
    IconData icon;
    String text;

    switch (status) {
      case 'verified':
        color = Colors.green;
        icon = Icons.verified_user;
        text = 'Verified';
        break;
      case 'pending':
        color = Colors.orange;
        icon = Icons.hourglass_empty;
        text = 'Pending';
        break;
      case 'rejected':
        color = Colors.red;
        icon = Icons.cancel;
        text = 'Rejected';
        break;
      default:
        color = Colors.grey;
        icon = Icons.help_outline;
        text = 'Unknown';
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: AppSpacing.xs),
          Text(
            text,
            style: TextStyle(color: color, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textLight,
            ),
          ),
          Text(
            value,
            style: AppTypography.bodyMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: AppColors.white,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Unknown';
    return '${date.day}/${date.month}/${date.year}';
  }
}
