import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import 'providers/emergency_provider.dart';

class EmergencyScreen extends StatelessWidget {
  const EmergencyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.offWhite,
      appBar: AppBar(
        title: const Text('Emergency SOS'),
        backgroundColor: AppColors.crisisRed,
        foregroundColor: Colors.white,
      ),
      body: Consumer<EmergencyProvider>(
        builder: (context, emergencyProvider, child) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Location Status
                _buildLocationStatus(emergencyProvider),
                const SizedBox(height: AppSpacing.xl),
                
                // Current Alert Status
                if (emergencyProvider.currentEmergencyAlert != null)
                  _buildCurrentAlertCard(context, emergencyProvider),
                
                const SizedBox(height: AppSpacing.xl),
                
                // SOS Button
                _buildSOSButton(context, emergencyProvider),
                
                const SizedBox(height: AppSpacing.md),
                
                // Cooldown Timer
                if (emergencyProvider.sosButtonState == SOSButtonState.cooldown)
                  _buildCooldownText(emergencyProvider),
                
                const SizedBox(height: AppSpacing.md),
                
                // Error Message
                if (emergencyProvider.errorMessage != null)
                  _buildErrorMessage(emergencyProvider),
                
                const SizedBox(height: AppSpacing.xl),
                
                // Instructions
                _buildInstructions(),
                
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildLocationStatus(EmergencyProvider provider) {
    final location = provider.currentLocation;
    
    return Card(
      color: AppColors.grey100,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  provider.isLocationEnabled 
                    ? Icons.location_on 
                    : Icons.location_off,
                  color: provider.isLocationEnabled 
                    ? AppColors.successGreen 
                    : AppColors.errorRed,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  'Location Status',
                  style: AppTypography.bodyLarge.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            if (location != null) ...[
              Text(
                'Latitude: ${location.latitude.toStringAsFixed(6)}',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.textLight,
                ),
              ),
              Text(
                'Longitude: ${location.longitude.toStringAsFixed(6)}',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.textLight,
                ),
              ),
              if (location.address != null)
                Text(
                  'Address: ${location.address}',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.textLight,
                  ),
                ),
            ] else ...[
              Text(
                'No location available',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.errorRed,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              ElevatedButton.icon(
                onPressed: () => provider.requestLocationPermission(),
                icon: const Icon(Icons.location_searching),
                label: const Text('Enable Location'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.areivaTeal,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentAlertCard(BuildContext context, EmergencyProvider provider) {
    final alert = provider.currentEmergencyAlert!;
    
    Color statusColor;
    IconData statusIcon;
    
    switch (alert.status) {
      case EmergencyStatus.active:
        statusColor = AppColors.errorRed;
        statusIcon = Icons.warning;
        break;
      case EmergencyStatus.resolved:
        statusColor = AppColors.successGreen;
        statusIcon = Icons.check_circle;
        break;
      case EmergencyStatus.cancelled:
        statusColor = AppColors.textLight;
        statusIcon = Icons.cancel;
        break;
    }
    
    return Card(
      color: statusColor.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(statusIcon, color: statusColor),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  'Current Alert - ${alert.status.name.toUpperCase()}',
                  style: AppTypography.bodyLarge.copyWith(
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              alert.message,
              style: AppTypography.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Sent: ${alert.timestamp.toLocal().toString().substring(0, 19)}',
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.textLight,
              ),
            ),
            if (alert.status == EmergencyStatus.active) ...[
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final success = await provider.resolveEmergencyAlert();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                success
                                    ? 'Alert marked as resolved'
                                    : 'Failed to resolve alert. Please try again.',
                              ),
                              backgroundColor: success ? Colors.green : Colors.red,
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.check),
                      label: const Text('Mark Resolved'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.successGreen,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final success = await provider.cancelEmergencyAlert();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                success
                                    ? 'Alert cancelled'
                                    : 'Failed to cancel alert. Please try again.',
                              ),
                              backgroundColor: success ? Colors.green : Colors.red,
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.cancel),
                      label: const Text('Cancel'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.errorRed,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSOSButton(BuildContext context, EmergencyProvider provider) {
    final isDisabled = provider.sosButtonState == SOSButtonState.cooldown ||
                       provider.sosButtonState == SOSButtonState.sending;
    
    return GestureDetector(
      onTap: isDisabled ? null : () => _handleSOSTap(context, provider),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        height: 200,
        decoration: BoxDecoration(
          color: isDisabled 
            ? AppColors.textLight 
            : (provider.sosButtonState == SOSButtonState.pressed 
              ? AppColors.errorRed.withOpacity(0.8) 
              : AppColors.errorRed),
          shape: BoxShape.circle,
          boxShadow: isDisabled ? [] : [
            BoxShadow(
              color: AppColors.errorRed.withOpacity(0.3),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                provider.sosButtonState == SOSButtonState.sending
                  ? Icons.upload
                  : provider.sosButtonState == SOSButtonState.sent
                    ? Icons.check_circle
                    : Icons.warning,
                color: Colors.white,
                size: 60,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                _getSOSButtonText(provider.sosButtonState),
                style: AppTypography.headingMedium.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              if (provider.sosButtonState == SOSButtonState.sending)
                const Padding(
                  padding: EdgeInsets.only(top: AppSpacing.sm),
                  child: CircularProgressIndicator(
                    color: Colors.white,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _getSOSButtonText(SOSButtonState state) {
    switch (state) {
      case SOSButtonState.idle:
        return 'TAP TO SEND\nSOS ALERT';
      case SOSButtonState.pressed:
        return 'PRESSED';
      case SOSButtonState.sending:
        return 'SENDING...';
      case SOSButtonState.sent:
        return 'ALERT SENT!';
      case SOSButtonState.cooldown:
        return 'COOLDOWN';
    }
  }

  Widget _buildCooldownText(EmergencyProvider provider) {
    return Text(
      'Wait ${provider.cooldownSeconds}s before sending another alert',
      style: AppTypography.bodyMedium.copyWith(
        color: AppColors.textLight,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildErrorMessage(EmergencyProvider provider) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.errorRed.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.error, color: AppColors.errorRed),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              provider.errorMessage!,
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.errorRed,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 20),
            onPressed: provider.clearError,
            color: AppColors.errorRed,
          ),
        ],
      ),
    );
  }

  Widget _buildInstructions() {
    return Card(
      color: AppColors.grey100,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'How SOS Works',
              style: AppTypography.bodyLarge.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            _buildInstructionItem(
              '1. Your current location will be captured',
            ),
            _buildInstructionItem(
              '2. Alert sent to all Raksha users within 3km',
            ),
            _buildInstructionItem(
              '3. Nearby users will be notified',
            ),
            _buildInstructionItem(
              '4. You can see other alerts and provide directions',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInstructionItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.check_circle_outline,
            size: 16,
            color: AppColors.areivaTeal,
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Text(
              text,
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.textLight,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleSOSTap(
    BuildContext context,
    EmergencyProvider provider,
  ) async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Send Emergency SOS?'),
        content: const Text(
          'This will send an emergency alert to all nearby Raksha users. '
          'Only use in real emergencies.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.errorRed,
            ),
            child: const Text('Send SOS'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final success = await provider.triggerSOS(
        customMessage: 'Emergency assistance needed',
      );

      if (success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Emergency alert sent successfully!'),
            backgroundColor: AppColors.successGreen,
          ),
        );
      }
    }
  }
}



