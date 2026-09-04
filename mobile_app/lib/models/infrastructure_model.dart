class InfrastructureModel {
  final String id;
  final String name;
  final String type;
  final String riskLevel;
  final String status;
  final String location;
  final int affectedPopulation;
  final String nearestHospital;
  final double lat;
  final double lng;

  InfrastructureModel({
    required this.id,
    required this.name,
    required this.type,
    required this.riskLevel,
    required this.status,
    required this.location,
    required this.affectedPopulation,
    required this.nearestHospital,
    required this.lat,
    required this.lng,
  });

  factory InfrastructureModel.fromJson(Map<String, dynamic> json) {
    return InfrastructureModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? '',
      riskLevel: json['riskLevel'] ?? 'LOW',
      status: json['status'] ?? 'Normal',
      location: json['location'] ?? '',
      affectedPopulation: (json['affectedPopulation'] as num?)?.toInt() ?? 0,
      nearestHospital: json['nearestHospital'] ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
