class FieldReportModel {
  final String id;
  final String reporterName;
  final String reporterRole;
  final String incidentType;
  final String locationName;
  final double lat;
  final double lng;
  final String severity;
  final String status;
  final String submittedAgo;
  final String description;

  FieldReportModel({
    required this.id,
    required this.reporterName,
    required this.reporterRole,
    required this.incidentType,
    required this.locationName,
    required this.lat,
    required this.lng,
    required this.severity,
    required this.status,
    required this.submittedAgo,
    required this.description,
  });

  factory FieldReportModel.fromJson(Map<String, dynamic> json) {
    return FieldReportModel(
      id: json['id'] ?? '',
      reporterName: json['reporterName'] ?? '',
      reporterRole: json['reporterRole'] ?? '',
      incidentType: json['incidentType'] ?? '',
      locationName: json['locationName'] ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
      severity: json['severity'] ?? 'Moderate',
      status: json['status'] ?? 'Submitted',
      submittedAgo: json['submittedAgo'] ?? 'Just now',
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'reporterName': reporterName,
      'reporterRole': reporterRole,
      'incidentType': incidentType,
      'locationName': locationName,
      'lat': lat,
      'lng': lng,
      'severity': severity,
      'description': description,
    };
  }
}
