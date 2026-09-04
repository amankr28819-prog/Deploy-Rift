import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme/app_theme.dart';

class WeatherView extends StatelessWidget {
  const WeatherView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'NER Weather & Monsoonal Rainfall Analytics',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          // Chart Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('24-Hour Rainfall Intensity (mm/h)', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 180,
                    child: LineChart(
                      LineChartData(
                        gridData: const FlGridData(show: true, drawVerticalLine: false),
                        titlesData: const FlTitlesData(
                          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        ),
                        borderData: FlBorderData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots: const [
                              FlSpot(0, 5),
                              FlSpot(4, 12),
                              FlSpot(8, 28),
                              FlSpot(12, 45),
                              FlSpot(16, 57),
                              FlSpot(20, 18),
                            ],
                            isCurved: true,
                            color: AppTheme.primaryAccent,
                            barWidth: 3,
                            belowBarData: BarAreaData(
                              show: true,
                              color: AppTheme.primaryAccent.withOpacity(0.2),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Causal Physics Pipeline
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Causal Physics Pipeline', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildCausalStep('🌧️ Torrential Rainfall', '165 mm / 24h (+42% anomaly)', AppTheme.primaryAccent),
                  const Icon(Icons.arrow_downward, size: 16, color: AppTheme.textMuted),
                  _buildCausalStep('💧 Soil Saturation', '82% Soil moisture content', AppTheme.riskModerate),
                  const Icon(Icons.arrow_downward, size: 16, color: AppTheme.textMuted),
                  _buildCausalStep('⛰️ Slope Instability', '37° Slope shear failure risk', AppTheme.riskHigh),
                  const Icon(Icons.arrow_downward, size: 16, color: AppTheme.textMuted),
                  _buildCausalStep('🚨 Landslide Trigger', '87% Risk Probability (CRITICAL)', AppTheme.riskCritical),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCausalStep(String title, String subtitle, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.bgDark,
        borderRadius: BorderRadius.circular(8),
        border: Border(left: BorderSide(color: color, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
          Text(subtitle, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}
