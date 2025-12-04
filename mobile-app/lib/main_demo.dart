import 'package:flutter/material.dart';

void main() {
  runApp(const RakshaIrelandDemo());
}

class RakshaIrelandDemo extends StatelessWidget {
  const RakshaIrelandDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Raksha Ireland Emergency App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE63946), // Crisis Red
          primary: const Color(0xFFE63946),
          secondary: const Color(0xFF005F73), // Areiva Teal
        ),
      ),
      home: const DemoHomePage(),
    );
  }
}

class DemoHomePage extends StatefulWidget {
  const DemoHomePage({super.key});

  @override
  State<DemoHomePage> createState() => _DemoHomePageState();
}

class _DemoHomePageState extends State<DemoHomePage> {
  bool _isPressed = false;
  bool _emergencyTriggered = false;

  void _triggerEmergency() {
    setState(() {
      _emergencyTriggered = true;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('🚨 Emergency Alert Sent! Nearby users within 3km have been notified.'),
        backgroundColor: Color(0xFFE63946),
        duration: Duration(seconds: 3),
      ),
    );

    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() {
          _emergencyTriggered = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFE63946),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Icon(Icons.shield, color: Colors.white, size: 24),
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'Raksha Ireland',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Backend API Status Card
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                border: Border.all(color: Colors.green),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 32),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Backend API Connected',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'http://localhost:3000',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // SOS Emergency Button
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
              child: Column(
                children: [
                  const Text(
                    'Emergency SOS',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Press and hold for 3 seconds to trigger',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 32),
                  GestureDetector(
                    onTapDown: (_) => setState(() => _isPressed = true),
                    onTapUp: (_) => setState(() => _isPressed = false),
                    onTapCancel: () => setState(() => _isPressed = false),
                    onLongPress: _triggerEmergency,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: _isPressed ? 190 : 200,
                      height: _isPressed ? 190 : 200,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _emergencyTriggered
                            ? Colors.green
                            : const Color(0xFFE63946),
                        boxShadow: [
                          BoxShadow(
                            color: (_emergencyTriggered ? Colors.green : const Color(0xFFE63946))
                                .withOpacity(_isPressed ? 0.6 : 0.4),
                            blurRadius: _isPressed ? 20 : 30,
                            spreadRadius: _isPressed ? 5 : 10,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _emergencyTriggered ? Icons.check : Icons.warning,
                              size: 60,
                              color: Colors.white,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _emergencyTriggered ? 'SENT!' : 'SOS',
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Features Grid
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'App Features',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    children: [
                      _buildFeatureCard(
                        icon: Icons.location_on,
                        title: '3km Radius',
                        subtitle: 'Location-based alerts',
                        color: Colors.blue,
                      ),
                      _buildFeatureCard(
                        icon: Icons.notifications_active,
                        title: 'Real-time',
                        subtitle: 'Instant broadcasts',
                        color: Colors.orange,
                      ),
                      _buildFeatureCard(
                        icon: Icons.verified_user,
                        title: 'Verified',
                        subtitle: 'Admin approval',
                        color: Colors.green,
                      ),
                      _buildFeatureCard(
                        icon: Icons.security,
                        title: 'Secure',
                        subtitle: 'GDPR compliant',
                        color: const Color(0xFF005F73),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Powered by Areiva
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF005F73), Color(0xFF0A9396)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    'Supported by',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'AREIVA',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Empowering Immigrant Communities',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.9),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        border: Border.all(color: color.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 40, color: color),
          const SizedBox(height: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[700],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
