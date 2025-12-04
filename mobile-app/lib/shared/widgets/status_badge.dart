import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// Custom status badge widget for verification status
class StatusBadge extends StatelessWidget {
  final String label;
  final StatusType type;
  final double? fontSize;
  final EdgeInsetsGeometry? padding;
  
  const StatusBadge({
    Key? key,
    required this.label,
    required this.type,
    this.fontSize,
    this.padding,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colors = _getStatusColors(type);
    
    return Container(
      padding: padding ?? const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: colors.backgroundColor,
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        border: Border.all(
          color: colors.borderColor,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            colors.icon,
            size: (fontSize ?? 12) + 2,
            color: colors.textColor,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontFamily: AppTypography.inter,
              fontSize: fontSize ?? 12,
              fontWeight: FontWeight.w600,
              color: colors.textColor,
            ),
          ),
        ],
      ),
    );
  }
  
  _StatusColors _getStatusColors(StatusType type) {
    switch (type) {
      case StatusType.pending:
        return _StatusColors(
          backgroundColor: AppColors.warningOrange.withOpacity(0.1),
          borderColor: AppColors.warningOrange.withOpacity(0.3),
          textColor: AppColors.warningOrange,
          icon: Icons.schedule,
        );
      case StatusType.verified:
        return _StatusColors(
          backgroundColor: AppColors.successGreen.withOpacity(0.1),
          borderColor: AppColors.successGreen.withOpacity(0.3),
          textColor: AppColors.successGreen,
          icon: Icons.verified,
        );
      case StatusType.rejected:
        return _StatusColors(
          backgroundColor: AppColors.errorRed.withOpacity(0.1),
          borderColor: AppColors.errorRed.withOpacity(0.3),
          textColor: AppColors.errorRed,
          icon: Icons.cancel,
        );
      case StatusType.active:
        return _StatusColors(
          backgroundColor: AppColors.crisisRed.withOpacity(0.1),
          borderColor: AppColors.crisisRed.withOpacity(0.3),
          textColor: AppColors.crisisRed,
          icon: Icons.emergency,
        );
      case StatusType.resolved:
        return _StatusColors(
          backgroundColor: AppColors.successGreen.withOpacity(0.1),
          borderColor: AppColors.successGreen.withOpacity(0.3),
          textColor: AppColors.successGreen,
          icon: Icons.check_circle,
        );
      case StatusType.info:
        return _StatusColors(
          backgroundColor: AppColors.areivaTeal.withOpacity(0.1),
          borderColor: AppColors.areivaTeal.withOpacity(0.3),
          textColor: AppColors.areivaTeal,
          icon: Icons.info,
        );
    }
  }
}

enum StatusType {
  pending,
  verified,
  rejected,
  active,
  resolved,
  info,
}

class _StatusColors {
  final Color backgroundColor;
  final Color borderColor;
  final Color textColor;
  final IconData icon;
  
  _StatusColors({
    required this.backgroundColor,
    required this.borderColor,
    required this.textColor,
    required this.icon,
  });
}