import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// Custom SOS button widget with pulse animation and hold-to-trigger
class SOSButton extends StatefulWidget {
  final VoidCallback? onSOS;
  final bool isEnabled;
  final bool isLoading;
  final String label;
  final double size;
  final Duration holdDuration;
  
  const SOSButton({
    Key? key,
    this.onSOS,
    this.isEnabled = true,
    this.isLoading = false,
    this.label = 'SOS',
    this.size = 120,
    this.holdDuration = const Duration(seconds: 2),
  }) : super(key: key);

  @override
  State<SOSButton> createState() => _SOSButtonState();
}

class _SOSButtonState extends State<SOSButton>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _holdController;
  late AnimationController _rippleController;
  
  late Animation<double> _pulseAnimation;
  late Animation<double> _holdAnimation;
  late Animation<double> _rippleAnimation;
  
  bool _isPressed = false;
  bool _isHolding = false;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _startPulseAnimation();
  }

  void _initializeAnimations() {
    // Pulse animation (continuous when idle)
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    // Hold progress animation
    _holdController = AnimationController(
      duration: widget.holdDuration,
      vsync: this,
    );
    
    _holdAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _holdController,
      curve: Curves.linear,
    ));
    
    // Ripple effect animation
    _rippleController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    
    _rippleAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _rippleController,
      curve: Curves.easeOut,
    ));
  }

  void _startPulseAnimation() {
    if (!widget.isLoading && widget.isEnabled) {
      _pulseController.repeat(reverse: true);
    }
  }

  void _stopPulseAnimation() {
    _pulseController.stop();
    _pulseController.reset();
  }

  void _onTapDown(TapDownDetails details) {
    if (!widget.isEnabled || widget.isLoading) return;
    
    setState(() {
      _isPressed = true;
      _isHolding = true;
    });
    
    _stopPulseAnimation();
    _holdController.forward();
    
    // Check if hold is completed
    _holdController.addStatusListener(_onHoldStatusChanged);
  }

  void _onTapUp(TapUpDetails details) {
    _cancelHold();
  }

  void _onTapCancel() {
    _cancelHold();
  }

  void _cancelHold() {
    if (!_isHolding) return;
    
    setState(() {
      _isPressed = false;
      _isHolding = false;
    });
    
    _holdController.removeStatusListener(_onHoldStatusChanged);
    _holdController.reset();
    _startPulseAnimation();
  }

  void _onHoldStatusChanged(AnimationStatus status) {
    if (status == AnimationStatus.completed && _isHolding) {
      // Hold completed - trigger SOS
      _triggerSOS();
    }
  }

  void _triggerSOS() {
    setState(() {
      _isPressed = false;
      _isHolding = false;
    });
    
    _holdController.removeStatusListener(_onHoldStatusChanged);
    _stopPulseAnimation();
    
    // Start ripple effect
    _rippleController.forward().then((_) {
      _rippleController.reset();
    });
    
    // Trigger callback
    widget.onSOS?.call();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _holdController.dispose();
    _rippleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Ripple effect
          AnimatedBuilder(
            animation: _rippleController,
            builder: (context, child) {
              return Container(
                width: widget.size * (1 + _rippleAnimation.value * 2),
                height: widget.size * (1 + _rippleAnimation.value * 2),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.crisisRed.withOpacity(
                      (1 - _rippleAnimation.value) * 0.5,
                    ),
                    width: 2,
                  ),
                ),
              );
            },
          ),
          
          // Main button
          AnimatedBuilder(
            animation: Listenable.merge([_pulseAnimation, _holdAnimation]),
            builder: (context, child) {
              final scale = _isPressed ? 1.05 : _pulseAnimation.value;
              
              return Transform.scale(
                scale: scale,
                child: GestureDetector(
                  onTapDown: _onTapDown,
                  onTapUp: _onTapUp,
                  onTapCancel: _onTapCancel,
                  child: Container(
                    width: widget.size,
                    height: widget.size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: widget.isEnabled 
                          ? AppColors.crisisRed 
                          : AppColors.grey400,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.crisisRed.withOpacity(0.3),
                          blurRadius: 20,
                          spreadRadius: 0,
                        ),
                      ],
                      border: Border.all(
                        color: AppColors.white,
                        width: 4,
                      ),
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Hold progress indicator
                        if (_isHolding)
                          CircularProgressIndicator(
                            value: _holdAnimation.value,
                            strokeWidth: 3,
                            backgroundColor: AppColors.white.withOpacity(0.3),
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              AppColors.white,
                            ),
                          ),
                        
                        // Button content
                        if (widget.isLoading)
                          const SizedBox(
                            width: 32,
                            height: 32,
                            child: CircularProgressIndicator(
                              strokeWidth: 3,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                AppColors.white,
                              ),
                            ),
                          )
                        else
                          Text(
                            widget.label,
                            style: const TextStyle(
                              fontFamily: AppTypography.montserrat,
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              color: AppColors.white,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}