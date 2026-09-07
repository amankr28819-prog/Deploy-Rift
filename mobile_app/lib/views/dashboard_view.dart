import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';

class DashboardView extends StatefulWidget {
  const DashboardView({super.key});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  final TextEditingController _searchController = TextEditingController();
  bool _isLocating = false;

  void _triggerGps(AppProvider provider) async {
    setState(() => _isLocating = true);
    await Future.delayed(const Duration(milliseconds: 1200));

    if (mounted) {
      setState(() => _isLocating = false);
      if (provider.locations.isNotEmpty) {
        provider.setActiveLocation(provider.locations[0]); // Aizawl GPS lock
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('📍 GPS Locked! Fetched live telemetry from Aizawl Ridge.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final loc = provider.activeLocation ?? 
        (provider.locations.isNotEmpty ? provider.locations[0] : null);

    final color = loc != null ? AppTheme.getRiskColor(loc.riskLevel) : AppTheme.riskLow;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // --- 1. SEARCH BAR & GPS BUTTON ---
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
              child: Row(
                children: [
                  const Icon(Icons.search, color: AppTheme.primaryAccent, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: provider.getText('search_hint'),
                        border: InputBorder.none,
                      ),
                      onSubmitted: (val) {
                        provider.searchAndSetLocation(val);
                        _searchController.clear();
                      },
                    ),
                  ),
                  IconButton(
                    icon: _isLocating 
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.my_location, color: AppTheme.primaryAccent, size: 20),
                    tooltip: 'Detect Live GPS Location',
                    onPressed: () => _triggerGps(provider),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // --- 2. ACTIVE LOCATION TELEMETRY CARD ---
          if (loc != null)
            Card(
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
                            'Sector: ${loc.name}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.getRiskBgColor(loc.riskLevel),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: color),
                          ),
                          child: Text(
                            '${loc.riskLevel} (${loc.probability.toInt()}%)',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildReading('🌧️ 24h Rain', '${loc.rainfall24h} mm'),
                        _buildReading('💧 Saturation', '${loc.soilMoisture}%'),
                        _buildReading('⛰️ Slope', '${loc.slope}°'),
                        _buildReading('🛣️ Highway', loc.nearbyRoads.isNotEmpty ? loc.nearbyRoads[0] : 'N/A'),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 14),

          // --- 3. TOP SUMMARY STATS ---
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  title: 'Monitored Sectors',
                  value: '${provider.locations.length} Locations',
                  icon: Icons.map,
                  color: AppTheme.primaryAccent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  title: 'Active High-Risk Zones',
                  value: '${provider.locations.where((l) => l.riskLevel == "CRITICAL" || l.riskLevel == "HIGH").length} Critical',
                  icon: Icons.warning_amber_rounded,
                  color: AppTheme.riskCritical,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // --- 4. RESPONSE ACTION CARD ---
          if (loc != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ACTIVE EMERGENCY DIRECTIVE',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.riskCritical, letterSpacing: 0.8),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      loc.recommendedAction,
                      style: const TextStyle(fontSize: 13, height: 1.3),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.riskCritical,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(40),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('📢 Alert Dispatched to Response Units in ${loc.name}!')),
                        );
                      },
                      icon: const Icon(Icons.send_rounded, size: 16),
                      label: Text(provider.getText('dispatch_btn'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 16),

          // --- 5. REGIONAL RISK FEED ---
          Text(
            provider.getText('live_feed'),
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: provider.locations.length,
            itemBuilder: (context, index) {
              final item = provider.locations[index];
              final itemColor = AppTheme.getRiskColor(item.riskLevel);
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  onTap: () => provider.setActiveLocation(item),
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.getRiskBgColor(item.riskLevel),
                    child: Icon(Icons.location_on, color: itemColor, size: 20),
                  ),
                  title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text('${item.state} • ${item.rainfall24h}mm rain • ${item.soilMoisture}% moisture', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.getRiskBgColor(item.riskLevel),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: itemColor),
                    ),
                    child: Text('${item.riskLevel} (${item.probability.toInt()}%)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: itemColor)),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildReading(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildMetricCard({required String title, required String value, required IconData icon, required Color color}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 16),
                const SizedBox(width: 6),
                Expanded(child: Text(title, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary), overflow: TextOverflow.ellipsis)),
              ],
            ),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}