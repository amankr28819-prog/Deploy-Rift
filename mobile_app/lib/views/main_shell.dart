import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';

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
    DashboardView(),
    GisMapView(),
    AiDigitalTwinView(),
    AlertCenterView(),
    WeatherView(),
  ];

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    final titles = [
      provider.getText('cmd_center'),
      'GIS Risk Map',
      'AI & Digital Twin',
      'Incident & Response',
      'Disaster Analytics',
    ];

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
                    titles[_currentIndex],
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
          // 1. Dark/Light Mode Switcher Button
          IconButton(
            icon: Icon(
              provider.isDarkMode ? Icons.light_mode : Icons.dark_mode,
              size: 20,
              color: provider.isDarkMode ? Colors.amber : Colors.blueGrey,
            ),
            tooltip: 'Toggle Dark/Light Mode',
            onPressed: () => provider.toggleTheme(),
          ),

          // 2. Demo Trigger Button
          Padding(
            padding: const EdgeInsets.only(right: 4.0),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.riskCritical,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                minimumSize: const Size(0, 28),
              ),
              onPressed: () => provider.runDemoStep(),
              icon: const Icon(Icons.play_circle_fill, size: 12),
              label: const Text('DEMO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ),

          // 3. Language Selector (English, Hindi, Mizo, Assamese, Bengali)
          DropdownButton<String>(
            value: provider.selectedLanguage,
            underline: const SizedBox(),
            icon: const Icon(Icons.language, color: AppTheme.primaryAccent, size: 16),
            items: const [
              DropdownMenuItem(value: 'English', child: Text('EN', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Hindi', child: Text('HI', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Mizo', child: Text('MZ', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Assamese', child: Text('AS', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Bengali', child: Text('BN', style: TextStyle(fontSize: 11))),
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
        selectedItemColor: AppTheme.primaryAccent,
        unselectedItemColor: AppTheme.textSecondary,
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 10,
        onTap: (index) => setState(() => _currentIndex = index),
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