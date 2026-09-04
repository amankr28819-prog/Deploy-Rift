import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../theme/app_theme.dart';
import 'dashboard_view.dart';
import 'gis_map_view.dart';
import 'ai_predictor_view.dart';
import 'weather_view.dart';
import 'alert_center_view.dart';
import 'field_reporting_view.dart';
import 'infrastructure_view.dart';
import 'authority_view.dart';
import 'explainable_ai_view.dart';
import 'response_priority_view.dart';
import 'historical_view.dart';
import 'satellite_view.dart';
import 'simulator_view.dart';

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
    AiPredictorView(),
    WeatherView(),
    AlertCenterView(),
    FieldReportingView(),
    InfrastructureView(),
    AuthorityView(),
    ExplainableAiView(),
    ResponsePriorityView(),
    HistoricalView(),
    SatelliteView(),
    SimulatorView(),
  ];

  final List<String> _titles = const [
    'Main Command Center',
    'Live GIS Risk Map',
    'AI Risk Prediction',
    'Weather & Rainfall',
    'Early Warning Alerts',
    'Citizen & Field Reports',
    'Infrastructure Risk',
    'Authority Command',
    'Explainable AI (XAI)',
    'Response Priority',
    'Historical Analysis',
    'Satellite Monitor',
    'Landslide Simulator',
  ];

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(_titles[_currentIndex]),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryAccent.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: AppTheme.primaryAccent),
                  ),
                  child: const Text(
                    'MDoNER • SIH 2026',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.primaryAccent),
                  ),
                ),
              ],
            ),
            Text(
              provider.getText('tagline'),
              style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
            ),
          ],
        ),
        actions: [
          // Run Demo Button
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.riskCritical,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            ),
            onPressed: () {
              provider.runDemoStep();
            },
            icon: const Icon(Icons.play_circle_fill, size: 14),
            label: Text(provider.getText('run_demo'), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 8),

          // Language Switcher Dropdown
          DropdownButton<String>(
            value: provider.selectedLanguage,
            underline: const SizedBox(),
            dropdownColor: AppTheme.bgCard,
            icon: const Icon(Icons.language, color: AppTheme.primaryAccent, size: 18),
            items: const [
              DropdownMenuItem(value: 'English', child: Text('🇬🇧 EN', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Hindi', child: Text('🇮🇳 HI', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Assamese', child: Text('🇮🇳 AS', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Bengali', child: Text('🇮🇳 BN', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Mizo', child: Text('🇮🇳 MZ', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Khasi', child: Text('🇮🇳 KH', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Manipuri', child: Text('🇮🇳 MN', style: TextStyle(fontSize: 11))),
            ],
            onChanged: (val) {
              if (val != null) provider.setLanguage(val);
            },
          ),
          const SizedBox(width: 8),
        ],
      ),

      // Navigation Drawer for all 13 modules
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: AppTheme.bgCardHover),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CircleAvatar(
                    backgroundColor: AppTheme.primaryAccent,
                    radius: 20,
                    child: Text('N', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black)),
                  ),
                  const SizedBox(height: 10),
                  const Text('NER-SAFE Disaster Platform', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text('Role: ${provider.selectedRole} • Ministry of DoNER', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                ],
              ),
            ),
            _buildDrawerTile(0, 'Main Command Center', Icons.dashboard),
            _buildDrawerTile(1, 'Live GIS Risk Map', Icons.map),
            _buildDrawerTile(2, 'AI Risk Prediction', Icons.memory),
            const Divider(color: AppTheme.borderColor),
            _buildDrawerTile(3, 'Weather & Rainfall', Icons.water_drop),
            _buildDrawerTile(4, 'Early Warning Alerts', Icons.notifications),
            _buildDrawerTile(5, 'Citizen & Field Reports', Icons.report_problem),
            const Divider(color: AppTheme.borderColor),
            _buildDrawerTile(6, 'Infrastructure Risk', Icons.warning),
            _buildDrawerTile(7, 'Authority Command', Icons.business),
            _buildDrawerTile(8, 'Explainable AI (XAI)', Icons.psychology),
            _buildDrawerTile(9, 'Response Priority', Icons.format_list_numbered),
            _buildDrawerTile(10, 'Historical Analysis', Icons.show_chart),
            _buildDrawerTile(11, 'Satellite Monitor', Icons.satellite_alt),
            _buildDrawerTile(12, 'Landslide Simulator', Icons.tune),
          ],
        ),
      ),

      body: _views[_currentIndex],

      // Bottom Navigation Bar for quick access
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex < 4 ? _currentIndex : 0,
        backgroundColor: AppTheme.bgSidebar,
        selectedItemColor: AppTheme.primaryAccent,
        unselectedItemColor: AppTheme.textSecondary,
        type: BottomNavigationBarType.fixed,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.map), label: 'GIS Map'),
          BottomNavigationBarItem(icon: Icon(Icons.memory), label: 'AI Predict'),
          BottomNavigationBarItem(icon: Icon(Icons.water_drop), label: 'Weather'),
        ],
      ),
    );
  }

  Widget _buildDrawerTile(int index, String title, IconData icon) {
    final selected = _currentIndex == index;
    return ListTile(
      leading: Icon(icon, color: selected ? AppTheme.primaryAccent : AppTheme.textSecondary, size: 20),
      title: Text(
        title,
        style: TextStyle(
          color: selected ? AppTheme.primaryAccent : AppTheme.textPrimary,
          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          fontSize: 13,
        ),
      ),
      selected: selected,
      onTap: () {
        setState(() {
          _currentIndex = index;
        });
        Navigator.pop(context);
      },
    );
  }
}
