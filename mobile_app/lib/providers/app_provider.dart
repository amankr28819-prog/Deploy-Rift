import 'package:flutter/material.dart';
import '../models/location_model.dart';
import '../models/infrastructure_model.dart';
import '../models/field_report_model.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../services/notification_service.dart';

class AppProvider with ChangeNotifier {
  String selectedRole = 'RESPONSE_OFFICER';
  String selectedLanguage = 'English';
  bool isDarkMode = true;
  bool isOnline = true;
  int demoStep = 0;
  bool isLoading = false;

  List<LocationModel> locations = [];
  List<InfrastructureModel> infrastructure = [];
  List<FieldReportModel> fieldReports = [];
  LocationModel? activeLocation;

  AppProvider() {
    loadInitialData();
  }

  void toggleTheme() {
    isDarkMode = !isDarkMode;
    notifyListeners();
  }

  void setRole(String role) {
    selectedRole = role;
    notifyListeners();
  }

  void setLanguage(String lang) {
    selectedLanguage = lang;
    notifyListeners();
  }

  void setActiveLocation(LocationModel loc) {
    activeLocation = loc;
    notifyListeners();
  }

  void searchAndSetLocation(String query) {
    if (query.trim().isEmpty) return;
    final match = locations.firstWhere(
      (l) => l.name.toLowerCase().contains(query.toLowerCase()) || 
             l.state.toLowerCase().contains(query.toLowerCase()) ||
             l.nearbyRoads.any((r) => r.toLowerCase().contains(query.toLowerCase())),
      orElse: () => locations.isNotEmpty ? locations.first : activeLocation!,
    );
    setActiveLocation(match);
  }

  Future<void> loadInitialData() async {
    isLoading = true;
    notifyListeners();

    try {
      locations = await ApiService.fetchLocations();
      infrastructure = await ApiService.fetchInfrastructure();
      fieldReports = await ApiService.fetchFieldReports();
      isOnline = true;
      if (locations.isNotEmpty) {
        activeLocation = locations[0]; // Default to first location (Aizawl)
      }
    } catch (e) {
      isOnline = false;
    }

    isLoading = false;
    notifyListeners();
  }

  Future<void> runDemoStep() async {
    final demoResult = await ApiService.triggerDemoStep();
    if (demoResult != null) {
      demoStep = demoResult['step'] ?? (demoStep + 1) % 6;
      final title = demoResult['title'] ?? 'Emergency Alert';
      final desc = demoResult['description'] ?? 'Rainfall surge detected.';

      NotificationService.showEmergencyNotification(
        title: '🚨 SIH DEMO: $title',
        body: desc,
      );
      await loadInitialData();
    }
  }

  Future<void> submitReport(FieldReportModel report) async {
    final success = await ApiService.submitFieldReport(report);
    if (success) {
      fieldReports.insert(0, report);
    } else {
      await StorageService.saveOfflineReport(report.toJson());
      fieldReports.insert(0, report);
    }
    notifyListeners();
  }

  // --- Dynamic Multilingual Dictionary ---
 // --- Dynamic Multilingual Dictionary ---
  String getText(String key) {
    Map<String, Map<String, String>> dict = {
      'cmd_center': {
        'English': 'Command Center',
        'Hindi': 'कमान केंद्र',
        'Mizo': 'Command Center',
        'Assamese': 'নিৰ্দেশনা কেন্দ্ৰ',
        'Bengali': 'কমান্ড সেন্টার',
      },
      'tagline': {
        'English': 'North Eastern Region - Landslide Risk System',
        'Hindi': 'उत्तर पूर्वी क्षेत्र - भूस्खलन जोखिम प्रणाली',
        'Mizo': 'Mizo Rám - Tlang Min Vengtu System',
        'Assamese': 'উত্তৰ-পূৰ্বাঞ্চল - ভূমিস্খলন বিপদাশংকা ব্যৱস্থা',
        'Bengali': 'উত্তর-পূর্বাঞ্চল - ভূমিধস ঝুঁকি ব্যবস্থাপনা',
      },
      'search_hint': {
        'English': 'Search sector, highway...',
        'Hindi': 'क्षेत्र या राजमार्ग खोजें...',
        'Mizo': 'Hmun zawnna...',
        'Assamese': 'স্থান সন্ধান কৰক...',
        'Bengali': 'স্থান খুঁজুন...',
      },
      'gps_locked': {
        'English': 'GPS LOCKED',
        'Hindi': 'जीपीएस सक्रिय',
        'Mizo': 'GPS ENKAUWL',
        'Assamese': 'GPS সক্ৰিয়',
        'Bengali': 'জিপিএস সক্রিয়',
      },
      'live_feed': {
        'English': 'Live Emergency Risk Feed',
        'Hindi': 'लाइव आपातकालीन जोखिम फीड',
        'Mizo': 'Tlang Min Hlauhawm Feed',
        'Assamese': 'লাইভ জৰুৰীকালীন তথ্য',
        'Bengali': 'লাইভ জরুরি ঝুঁকি ফিড',
      },
      'dispatch_btn': {
        'English': 'DISPATCH SDRF QUICK RESPONSE',
        'Hindi': 'एसडीआरएफ तुरंत रवाना करें',
        'Mizo': 'SDRF THAWNTIR RAWH',
        'Assamese': 'SDRF ততালিকে প্ৰেৰণ কৰক',
        'Bengali': 'এসডিআরএফ দল পাঠান',
      },
      // Added new headers for the dashboard:
      'monitored_sectors': {
        'English': 'Monitored Sectors',
        'Hindi': 'निगरानी वाले क्षेत्र',
        'Mizo': 'Vengtu Sector-te',
        'Assamese': 'নিৰীক্ষণ কৰা স্থান',
        'Bengali': 'পর্যবেক্ষণ করা এলাকা',
      },
      'active_risk': {
        'English': 'Active High-Risk Zones',
        'Hindi': 'सक्रिय उच्च-जोखिम क्षेत्र',
        'Mizo': 'Hlauhawm Zual Zone',
        'Assamese': 'সক্ৰিয় উচ্চ-বিপদাশংকা অঞ্চল',
        'Bengali': 'সক্রিয় উচ্চ-ঝুঁকিপূর্ণ অঞ্চল',
      },
      'emergency_dir': {
        'English': 'ACTIVE EMERGENCY DIRECTIVE',
        'Hindi': 'सक्रिय आपातकालीन निर्देश',
        'Mizo': 'EMERGENCY THUPEK',
        'Assamese': 'সক্ৰিয় জৰুৰীকালীন নিৰ্দেশনা',
        'Bengali': 'সক্রিয় জরুরি নির্দেশনা',
      },
    };
    return dict[key]?[selectedLanguage] ?? dict[key]?['English'] ?? key;
  }
}