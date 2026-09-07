// mobile_app/lib/views/slope_twin_view.dart

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
class SlopeTwinView extends StatelessWidget {
  // Add the 'const' keyword and 'Key? key' here:
  const SlopeTwinView({super.key}); 

  @override
  Widget build(BuildContext context) {
      // ... rest of your code
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Search Bar for Location Input
          TextField(
            decoration: InputDecoration(
               hintText: "Enter Location (e.g., NH-10 km 42)",
               prefixIcon: Icon(Icons.search, color: AppTheme.primaryAccent),
               border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 16),

          // 2. The "Slope Health" Profile Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Slope #A-173 — NH-10 Digital Twin', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  
                  // InSAR Satellite Data Highlight
                  Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.riskCriticalBg,
                      border: Border.all(color: AppTheme.riskCritical),
                      borderRadius: BorderRadius.circular(8)
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.satellite_alt, color: AppTheme.riskCritical),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "🛰️ SATELLITE ALERT: +14mm ground displacement detected over 30 days.", 
                            style: TextStyle(color: AppTheme.riskCritical, fontWeight: FontWeight.bold)
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Health Metrics
                  _buildHealthRow('🌧️ Rainfall', '↑ 42% above normal', AppTheme.riskCritical),
                  _buildHealthRow('💧 Soil Moisture', '↑ Rapidly increasing', AppTheme.riskHigh),
                  _buildHealthRow('👷 Human Disturbance', 'HIGH (Road cutting detected)', AppTheme.riskCritical),
                  _buildHealthRow('🌿 Vegetation', '↓ 12% loss (NDVI drop)', AppTheme.riskModerate),
                ],
              ),
            ),
          ),
          
          // 3. Explainable AI & Impact Simulation Cards would go here...
        ],
      ),
    );
  }

  Widget _buildHealthRow(String label, String value, Color statusColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: AppTheme.textSecondary)),
          Text(value, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}