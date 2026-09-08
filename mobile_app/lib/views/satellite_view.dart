import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SatelliteView extends StatefulWidget {
  const SatelliteView({super.key});

  @override
  State<SatelliteView> createState() => _SatelliteViewState();
}

class _SatelliteViewState extends State<SatelliteView> {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Satellite Scar Monitoring & Surface Deformation',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('SAR Surface Deformation & Scar Scanner', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.riskCritical.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: AppTheme.riskCritical.withOpacity(0.3)),
                        ),
                        child: const Text(
                          'UNAVAILABLE',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.riskCritical),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.bgDark,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.borderSubtle),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.satellite_alt, size: 48, color: AppTheme.primaryAccent),
                        const SizedBox(height: 12),
                        const Text(
                          'Live SAR Satellite Telemetry Not Configured',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Per RIFT Real-Data Integrity Policy, stock photographs and fabricated displacement figures have been removed. Live interferometric InSAR monitoring requires authenticated Copernicus Sentinel-1 or ISRO Bhuvan credentials.',
                          style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.4),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppTheme.borderSubtle),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('• Optical Basemap: Verified Esri Imagery available in GIS Map', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                        SizedBox(height: 4),
                        Text('• SAR InSAR Telemetry: Unavailable in local deployment', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
