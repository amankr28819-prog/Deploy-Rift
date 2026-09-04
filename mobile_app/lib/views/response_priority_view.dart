import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';

class ResponsePriorityView extends StatelessWidget {
  const ResponsePriorityView({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final sorted = [...provider.locations]..sort((a, b) => b.probability.compareTo(a.probability));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Smart Emergency Response Priority Order',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: sorted.length,
            itemBuilder: (context, index) {
              final loc = sorted[index];
              final color = AppTheme.getRiskColor(loc.riskLevel);
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.bgDark,
                    child: Text('#${index + 1}', style: TextStyle(fontWeight: FontWeight.bold, color: color)),
                  ),
                  title: Text(loc.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text(
                    'Affected Population: ${loc.populationAffected} • Highways: ${loc.nearbyRoads.join(", ")}',
                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.getRiskBgColor(loc.riskLevel),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: color),
                    ),
                    child: Text(
                      '${loc.riskLevel} (${loc.probability.toInt()}%)',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                    ),
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
