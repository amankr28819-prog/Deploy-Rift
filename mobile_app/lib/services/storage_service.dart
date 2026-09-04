import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyOfflineReports = 'offline_field_reports';

  static Future<void> saveOfflineReport(Map<String, dynamic> reportJson) async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getStringList(_keyOfflineReports) ?? [];
    existing.add(jsonEncode(reportJson));
    await prefs.setStringList(_keyOfflineReports, existing);
  }

  static Future<List<Map<String, dynamic>>> getOfflineReports() async {
    final prefs = await SharedPreferences.getInstance();
    final rawList = prefs.getStringList(_keyOfflineReports) ?? [];
    return rawList.map((str) => jsonDecode(str) as Map<String, dynamic>).toList();
  }

  static Future<void> clearOfflineReports() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyOfflineReports);
  }
}
