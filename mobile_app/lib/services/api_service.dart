import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

import '../models/location_model.dart';
import '../models/risk_prediction.dart';
import '../models/infrastructure_model.dart';
import '../models/field_report_model.dart';

class ApiService {
  // Configured with Android emulator (10.0.2.2) and localhost fallbacks
  static String get baseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8000';
    }
    return 'http://localhost:8000';
  }

  // Fetch all NER GIS location points
  static Future<List<LocationModel>> fetchLocations() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/locations')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = (data['locations'] as List);
        return list.map((item) => LocationModel.fromJson(item)).toList();
      }
    } catch (e) {
      // Return local fallback data if server offline
    }
    return [];
  }

  // Predict Landslide Risk ML Endpoint
  static Future<RiskPredictionModel> predictRisk({
    required double rainfall,
    required double soilMoisture,
    required double slope,
    double elevation = 1200.0,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/predict-risk'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'rainfall': rainfall,
          'soilMoisture': soilMoisture,
          'slope': slope,
          'elevation': elevation,
        }),
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        return RiskPredictionModel.fromJson(jsonDecode(res.body));
      }
    } catch (e) {
      // Calculate local fallback prediction if offline
    }

    // Local fallback calculation
    double score = (rainfall / 200.0 * 35.0) + (soilMoisture * 0.25) + (slope / 45.0 * 20.0);
    double prob = score.clamp(5.0, 95.0);
    String risk = prob >= 80 ? 'CRITICAL' : (prob >= 60 ? 'HIGH' : (prob >= 40 ? 'MODERATE' : 'LOW'));

    return RiskPredictionModel(
      probability: double.parse(prob.toStringAsFixed(1)),
      riskLevel: risk,
      confidence: 65.0,
      recommendedAction: 'Active monitoring and slope inspection required.',
      explanation: '[Offline Synthetic Estimate] Backend AI model unreachable. Estimated from heuristic slope-rainfall formula.',
      contributingFactors: {'Rainfall': 38.0, 'SoilMoisture': 28.0, 'Slope': 22.0, 'Historical': 12.0},
    );
  }

  // Fetch Infrastructure Asset List
  static Future<List<InfrastructureModel>> fetchInfrastructure() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/infrastructure')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return (data['infrastructure'] as List).map((i) => InfrastructureModel.fromJson(i)).toList();
      }
    } catch (e) {
      // Ignore
    }
    return [];
  }

  // Fetch Submitted Field Reports
  static Future<List<FieldReportModel>> fetchFieldReports() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/reports')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return (data['reports'] as List).map((r) => FieldReportModel.fromJson(r)).toList();
      }
    } catch (e) {
      // Ignore
    }
    return [];
  }

  // Submit Field Report
  static Future<bool> submitFieldReport(FieldReportModel report) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/reports'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(report.toJson()),
      );
      return res.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Trigger Hackathon Demo Step
  static Future<Map<String, dynamic>?> triggerDemoStep() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/demo/trigger'));
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }
}
