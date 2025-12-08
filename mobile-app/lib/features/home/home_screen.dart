import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/widget_service.dart';
import '../emergency/providers/emergency_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    
    // Initialize widget service to listen for widget interactions
    WidgetService.initialize((triggerSos) async {
      if (!mounted) return;
      
      if (triggerSos) {
        // Widget triggered SOS - automatically create emergency alert
        final emergencyProvider = context.read<EmergencyProvider>();
        try {
          await emergencyProvider.triggerSOS(
            customMessage: 'Emergency SOS triggered from widget',
          );
          
          // Navigate to emergency screen
          if (mounted) {
            Navigator.pushNamed(context, '/emergency');
          }
        } catch (e) {
          // Show error if alert creation fails
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Failed to create emergency alert: $e')),
            );
          }
        }
      } else {
        // Just navigate to emergency screen
        Navigator.pushNamed(context, '/emergency');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Raksha Ireland'),
        backgroundColor: AppColors.crisisRed,
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            tooltip: 'Profile',
            onPressed: () {
              Navigator.pushNamed(context, '/profile');
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.shield,
              size: 100,
              color: AppColors.crisisRed,
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              'Welcome to Raksha Ireland',
              style: AppTypography.headingLarge.copyWith(
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Emergency Safety Network',
              style: AppTypography.bodyLarge.copyWith(
                color: AppColors.textLight,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xxl),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pushNamed(context, '/emergency');
              },
              icon: const Icon(Icons.warning),
              label: const Text('Emergency SOS'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.crisisRed,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xxl,
                  vertical: AppSpacing.lg,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pushNamed(context, '/alert-history');
              },
              icon: const Icon(Icons.history),
              label: const Text('Alert History'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.areivaTeal,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xxl,
                  vertical: AppSpacing.lg,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
