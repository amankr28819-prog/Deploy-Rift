import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';

// The 5 Core Consolidated Views
import 'dashboard_view.dart';
import 'gis_map_view.dart';
import 'ai_digital_twin_view.dart';
import 'alert_center_view.dart';
import 'weather_view.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final List<Widget> _views = const [
    DashboardView(),      // 1. Command Center (Merged Feed + Live Stats)
    GisMapView(),         // 2. GIS Map (Multi-layer map)
    AiDigitalTwinView(),  // 3. AI Prediction & Slope Digital Twin
    AlertCenterView(),    // 4. Incident Management & Warnings
    WeatherView(),        // 5. Analytics, Weather & Causal Physics
  ];

  final List<String> _titles = const [
    'Command Center',
    'GIS Risk Map',
    'AI & Digital Twin',
    'Incident & Response',
    'Disaster Analytics',
  ];

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Flexible(
                  child: Text(
                    _titles[_currentIndex],
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryAccent.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: AppTheme.primaryAccent),
                  ),
                  child: const Text(
                    'SIH 2026',
                    style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppTheme.primaryAccent),
                  ),
                ),
              ],
            ),
            Text(
              provider.getText('tagline'),
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 9, color: AppTheme.textSecondary),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 6.0),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.riskCritical,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                minimumSize: const Size(0, 30),
              ),
              onPressed: () => provider.runDemoStep(),
              icon: const Icon(Icons.play_circle_fill, size: 14),
              label: const Text('DEMO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ),
          DropdownButton<String>(
            value: provider.selectedLanguage,
            underline: const SizedBox(),
            dropdownColor: AppTheme.bgCard,
            icon: const Icon(Icons.language, color: AppTheme.primaryAccent, size: 16),
            items: const [
              DropdownMenuItem(value: 'English', child: Text('EN', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Hindi', child: Text('HI', style: TextStyle(fontSize: 11))),
            ],
            onChanged: (val) {
              if (val != null) provider.setLanguage(val);
            },
          ),
          const SizedBox(width: 8),
        ],
      ),

      body: IndexedStack(
        index: _currentIndex,
        children: _views,
      ),

      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        backgroundColor: AppTheme.bgSidebar,
        selectedItemColor: AppTheme.primaryAccent,
        unselectedItemColor: AppTheme.textSecondary,
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 10,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Command'),
          BottomNavigationBarItem(icon: Icon(Icons.map_rounded), label: 'GIS Map'),
          BottomNavigationBarItem(icon: Icon(Icons.psychology_rounded), label: 'AI Twin'),
          BottomNavigationBarItem(icon: Icon(Icons.warning_amber_rounded), label: 'Incidents'),
          BottomNavigationBarItem(icon: Icon(Icons.bar_chart_rounded), label: 'Analytics'),
        ],
      ),
    );
  }
}