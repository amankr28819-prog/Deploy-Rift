import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';

class InfrastructureView extends StatelessWidget {
  const InfrastructureView({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Highway & Lifeline Infrastructure Vulnerability Matrix',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: provider.infrastructure.length,
            itemBuilder: (context, index) {
              final item = provider.infrastructure[index];
              final color = AppTheme.getRiskColor(item.riskLevel);
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
                          Expanded(
                            child: Text(
                              item.name,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.getRiskBgColor(item.riskLevel),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: color),
                            ),
                            child: Text(
                              item.riskLevel,
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text('Type: ${item.type} • Status: ${item.status}', style: const TextStyle(fontSize: 11, color: AppTheme.riskHigh)),
                      const SizedBox(height: 4),
                      Text('Location: ${item.location} • Affected Pop: ${item.affectedPopulation}', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                      const SizedBox(height: 4),
                      Text('🏥 Hospital Lifeline: ${item.nearestHospital}', style: const TextStyle(fontSize: 11, color: AppTheme.primaryAccent)),
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
