import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';
import '../services/notification_service.dart';

class AlertCenterView extends StatelessWidget {
  const AlertCenterView({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Emergency Warning Dispatch Center',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(Icons.notifications_active, color: AppTheme.riskCritical),
                onPressed: () {
                  NotificationService.showEmergencyNotification(
                    title: '🚨 CRITICAL WARNING: Aizawl District',
                    body: 'Slope failure imminent on NH-6 km 42. Evacuate risk zone immediately.',
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('🔔 Push Notification Sent to Field Devices!')),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (provider.locations.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Row(
                      children: [
                        Icon(Icons.check_circle_outline, color: AppTheme.riskLow, size: 20),
                        SizedBox(width: 8),
                        Text('No Verified Active Alerts Available', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      'All monitored regional triggers (USGS seismic sensors, verified ground reports, and heavy rainfall thresholds) are currently below critical alert criteria.',
                      style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            )
          else
            ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: provider.locations.length,
            itemBuilder: (context, index) {
              final loc = provider.locations[index];
              final color = AppTheme.getRiskColor(loc.riskLevel);
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(loc.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.getRiskBgColor(loc.riskLevel),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: color),
                            ),
                            child: Text(
                              '${loc.riskLevel} (${loc.probability.toInt()}%)',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text('State: ${loc.state} • Rainfall: ${loc.rainfall24h}mm • Moisture: ${loc.soilMoisture}%', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                      const SizedBox(height: 8),
                      Text('Action: ${loc.recommendedAction}', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: color,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            ),
                            onPressed: () {
                              NotificationService.showEmergencyNotification(
                                title: '📢 EMERGENCY BROADCAST',
                                body: 'Warning issued for ${loc.name}. ${loc.recommendedAction}',
                              );
                            },
                            child: const Text('BROADCAST ALERT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
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
