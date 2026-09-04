import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme/app_theme.dart';

class HistoricalView extends StatelessWidget {
  const HistoricalView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Historical NER Landslide Analytics (2021 - 2025)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Yearly Landslide Incident Trend', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 200,
                    child: BarChart(
                      BarChartData(
                        gridData: const FlGridData(show: true, drawVerticalLine: false),
                        borderData: FlBorderData(show: false),
                        titlesData: FlTitlesData(
                          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (val, meta) {
                                const years = ['2021', '2022', '2023', '2024', '2025'];
                                if (val.toInt() < years.length) {
                                  return Text(years[val.toInt()], style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary));
                                }
                                return const SizedBox();
                              },
                            ),
                          ),
                        ),
                        barGroups: [
                          BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 142, color: AppTheme.riskHigh)]),
                          BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 189, color: AppTheme.riskHigh)]),
                          BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 215, color: AppTheme.riskHigh)]),
                          BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 278, color: AppTheme.riskCritical)]),
                          BarChartGroupData(x: 4, barRods: [BarChartRodData(toY: 310, color: AppTheme.riskCritical)]),
                        ],
                      ),
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
