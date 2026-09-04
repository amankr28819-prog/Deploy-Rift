import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ExplainableAiView extends StatelessWidget {
  const ExplainableAiView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Explainable AI (XAI) Model Feature Attribution',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('SHAP Factor Feature Contribution Analysis', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildFactorRow('24h Rainfall Intensity', 38.8, AppTheme.riskCritical),
                  _buildFactorRow('Soil Saturation Index', 26.3, AppTheme.riskHigh),
                  _buildFactorRow('Terrain Slope Steepness', 19.7, AppTheme.riskModerate),
                  _buildFactorRow('Historical Landslide Density', 11.6, AppTheme.primaryAccent),
                  _buildFactorRow('Satellite SAR Surface Deformation', 3.6, AppTheme.riskLow),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.bgDark,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.borderColor),
                    ),
                    child: const Text(
                      '💡 XAI Summary: Extreme Rainfall (38.8%) and Soil Saturation (26.3%) are currently driving the slope instability calculation over Aizawl Ridge.',
                      style: TextStyle(fontSize: 12, color: AppTheme.textPrimary),
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

  Widget _buildFactorRow(String label, double percentage, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              Text('${percentage.toStringAsFixed(1)}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: percentage / 100,
            color: color,
            backgroundColor: AppTheme.borderColor,
            minHeight: 8,
            borderRadius: BorderRadius.circular(4),
          ),
        ],
      ),
    );
  }
}
