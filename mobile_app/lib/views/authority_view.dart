import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AuthorityView extends StatelessWidget {
  const AuthorityView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'MDoNER Disaster Authority Command Center',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.4,
            children: [
              _buildStatCard('Monitored Districts', '42 Districts', Icons.location_city, AppTheme.primaryAccent),
              _buildStatCard('Critical Risk Zones', '3 Areas', Icons.report_problem, AppTheme.riskCritical),
              _buildStatCard('SDRF Battalions', '12 Deployed', Icons.shield, AppTheme.riskLow),
              _buildStatCard('Highways at Risk', 'NH-6, NH-10', Icons.edit_road, AppTheme.riskHigh),
            ],
          ),

          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Disaster Management Protocol Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  SizedBox(height: 8),
                  Text('• NDRF Battalion 3 on Standby at Silchar Base', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  Text('• Emergency Lifeline Evacuation Order active for Aizawl Ridge Sector 4', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  Text('• Satellite SAR Deformation Alerts monitored every 6 hours', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(title, style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
            Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
