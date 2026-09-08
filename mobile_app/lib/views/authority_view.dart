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
              _buildStatCard('Monitored Zones', '78 Districts', Icons.location_city, AppTheme.primaryAccent),
              _buildStatCard('Susceptibility Criteria', 'Model Evaluated', Icons.terrain, AppTheme.riskHigh),
              _buildStatCard('SDRF Telemetry', 'Unavailable', Icons.shield, AppTheme.textSecondary),
              _buildStatCard('Lifeline Corridors', '4 Highways', Icons.edit_road, AppTheme.primaryAccent),
            ],
          ),

          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Disaster Command Operational Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  SizedBox(height: 8),
                  Text('• 78 official administrative district boundaries loaded across 8 Northeast states', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  Text('• USGS NEIC global seismic network monitored for NER triggers (M >= 3.0)', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  Text('• SDRF responder GPS telemetry is currently unconfigured / unavailable', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  Text('• Corridors monitored: NH-6, NH-10, NH-29, NH-102 (OSM Reference)', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
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
