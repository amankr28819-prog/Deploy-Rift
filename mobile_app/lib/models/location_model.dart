class LocationModel {
  final String id;
  final String name;
  final String state;
  final String district;
  final double lat;
  final double lng;
  final String riskLevel;
  final double probability;
  final double rainfall24h;
  final double soilMoisture;
  final double slope;
  final double elevation;
  final String historicalRisk;
  final List<String> nearbyRoads;
  final int populationAffected;
  final String recommendedAction;

  LocationModel({
    required this.id,
    required this.name,
    required this.state,
    required this.district,
    required this.lat,
    required this.lng,
    required this.riskLevel,
    required this.probability,
    required this.rainfall24h,
    required this.soilMoisture,
    required this.slope,
    required this.elevation,
    required this.historicalRisk,
    required this.nearbyRoads,
    required this.populationAffected,
    required this.recommendedAction,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      state: json['state'] ?? '',
      district: json['district'] ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
      riskLevel: json['riskLevel'] ?? 'LOW',
      probability: (json['probability'] as num?)?.toDouble() ?? 0.0,
      rainfall24h: (json['rainfall24h'] as num?)?.toDouble() ?? 0.0,
      soilMoisture: (json['soilMoisture'] as num?)?.toDouble() ?? 0.0,
      slope: (json['slope'] as num?)?.toDouble() ?? 0.0,
      elevation: (json['elevation'] as num?)?.toDouble() ?? 0.0,
      historicalRisk: json['historicalRisk'] ?? 'Low',
      nearbyRoads: List<String>.from(json['nearbyRoads'] ?? []),
      populationAffected: (json['populationAffected'] as num?)?.toInt() ?? 0,
      recommendedAction: json['recommendedAction'] ?? '',
    );
  }
}
