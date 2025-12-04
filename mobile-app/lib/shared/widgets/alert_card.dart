import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// Custom alert card widget for displaying emergency alerts
class AlertCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? location;
  final DateTime timestamp;
  final VoidCallback? onRespond;
  final VoidCallback? onIgnore;
  final bool isActive;
  final int? responderCount;
  
  const AlertCard({
    Key? key,
    required this.title,
    this.subtitle,
    this.location,
    required this.timestamp,
    this.onRespond,
    this.onIgnore,
    this.isActive = true,
    this.responderCount,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final timeAgo = _formatTimeAgo(timestamp);
    
    return Card(
      elevation: isActive ? AppElevation.md : AppElevation.sm,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        side: BorderSide(
          color: isActive ? AppColors.crisisRed : AppColors.grey300,
          width: isActive ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with icon and timestamp
            Row(
              children: [
                // Alert icon with pulse animation
                if (isActive) ...[
                  _PulsingIcon(
                    icon: Icons.emergency,
                    color: AppColors.crisisRed,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                ] else ...[
                  Icon(
                    Icons.info_outline,
                    color: AppColors.grey400,
                    size: 20,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                ],
                
                // Title
                Expanded(
                  child: Text(
                    title,
                    style: AppTypography.headingMedium.copyWith(
                      color: isActive ? AppColors.crisisRed : AppColors.textDark,
                      fontSize: 18,
                    ),
                  ),
                ),
                
                // Timestamp
                Text(
                  timeAgo,
                  style: AppTypography.caption.copyWith(
                    color: AppColors.textLight,
                  ),
                ),
              ],
            ),
            
            if (subtitle != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                subtitle!,
                style: AppTypography.bodyMedium,
              ),
            ],
            
            if (location != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Icon(
                    Icons.location_pin,
                    size: 16,
                    color: AppColors.textLight,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      location!,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.textLight,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            
            if (responderCount != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Icon(
                    Icons.people,
                    size: 16,
                    color: AppColors.textLight,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '$responderCount people responding',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.textLight,
                    ),
                  ),
                ],
              ),
            ],
            
            // Action buttons
            if (isActive && (onRespond != null || onIgnore != null)) ...[
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  if (onRespond != null) ...[
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: onRespond,
                        icon: const Icon(Icons.support_agent, size: 18),
                        label: const Text('Respond'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.areivaTeal,
                          foregroundColor: AppColors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    if (onIgnore != null) const SizedBox(width: AppSpacing.sm),
                  ],
                  
                  if (onIgnore != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onIgnore,
                        icon: const Icon(Icons.close, size: 18),
                        label: const Text('Ignore'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textLight,
                          side: BorderSide(color: AppColors.grey300),
                          padding: const EdgeInsets.symmetric(vertical: 12),
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
  
  String _formatTimeAgo(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);
    
    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}

/// Pulsing icon widget for active alerts
class _PulsingIcon extends StatefulWidget {
  final IconData icon;
  final Color color;
  final double size;
  
  const _PulsingIcon({
    required this.icon,
    required this.color,
    this.size = 20,
  });

  @override
  State<_PulsingIcon> createState() => _PulsingIconState();
}

class _PulsingIconState extends State<_PulsingIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    
    _animation = Tween<double>(
      begin: 0.5,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
    
    _controller.repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Opacity(
          opacity: _animation.value,
          child: Icon(
            widget.icon,
            color: widget.color,
            size: widget.size,
          ),
        );
      },
    );
  }
}