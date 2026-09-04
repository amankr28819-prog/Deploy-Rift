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
  bool isOnline = true;
  int demoStep = 0;
  bool isLoading = false;

  List<LocationModel> locations = [];
  List<InfrastructureModel> infrastructure = [];
  List<FieldReportModel> fieldReports = [];

  AppProvider() {
    loadInitialData();
  }

  void setRole(String role) {
    selectedRole = role;
    notifyListeners();
  }

  void setLanguage(String lang) {
    selectedLanguage = lang;
    notifyListeners();
  }

  Future<void> loadInitialData() async {
    isLoading = true;
    notifyListeners();

    try {
      locations = await ApiService.fetchLocations();
      infrastructure = await ApiService.fetchInfrastructure();
      fieldReports = await ApiService.fetchFieldReports();
      isOnline = true;
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

      final title = demoResult['title'] ?? 'Emergency Scenario Updated';
      final desc = demoResult['description'] ?? 'Rainfall surge detected.';

      // Show local push notification
      NotificationService.showEmergencyNotification(
        title: '🚨 SIH DEMO: $title',
        body: desc,
      );

      // Refresh data
      await loadInitialData();
    }
  }

  Future<void> submitReport(FieldReportModel report) async {
    final success = await ApiService.submitFieldReport(report);
    if (success) {
      fieldReports.insert(0, report);
    } else {
      // Save offline
      await StorageService.saveOfflineReport(report.toJson());
      fieldReports.insert(0, report);
    }
    notifyListeners();
  }

  // Multilingual Strings Lookup
  String getText(String key) {
    Map<String, Map<String, String>> dictionary = {
      'title': {
        'English': 'NER-SAFE Mobile',
        'Hindi': 'NER-SAFE मोबाइल',
        'Assamese': 'NER-SAFE মবাইল',
        'Bengali': 'NER-SAFE মোবাইল',
        'Mizo': 'NER-SAFE Mobile',
        'Khasi': 'NER-SAFE Mobile',
        'Manipuri': 'NER-SAFE ꯃꯣꯕꯥꯏꯜ',
      },
      'tagline': {
        'English': 'North Eastern Region - Landslide Risk System',
        'Hindi': 'उत्तर पूर्वी क्षेत्र - भूस्खलन जोखिम प्रणाली',
        'Assamese': 'উত্তৰ-পূৰ্বাঞ্চল - ভূমিস্খলন বিপদাশংকা ব্যৱস্থা',
        'Bengali': 'উত্তর-পূর্বাঞ্চল - ভূমিধস ঝুঁকি ব্যবস্থাপনা',
        'Mizo': 'Mizo Rám - Tlang Min Vengtu System',
        'Khasi': 'Dong Mihngi - Twep Khyndew System',
        'Manipuri': 'Nongpok Chingkhei - Landslide Risk System',
      },
      'run_demo': {
        'English': 'RUN DEMO SCENARIO',
        'Hindi': 'डेमो चलाएं',
        'Assamese': 'ডেমো আৰম্ভ কৰক',
        'Bengali': 'ডেমো চালান',
        'Mizo': 'DEMO ENNA',
        'Khasi': 'LEH DEMO',
        'Manipuri': 'DEMO UTPA',
      }
    };

    return dictionary[key]?[selectedLanguage] ?? dictionary[key]?['English'] ?? key;
  }
}
