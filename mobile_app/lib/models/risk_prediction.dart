class RiskPredictionModel {
  final double probability;
  final String riskLevel;
  final double confidence;
  final String recommendedAction;
  final String explanation;
  final Map<String, double> contributingFactors;

  RiskPredictionModel({
    required this.probability,
    required this.riskLevel,
    required this.confidence,
    required this.recommendedAction,
    required this.explanation,
    required this.contributingFactors,
  });

  factory RiskPredictionModel.fromJson(Map<String, dynamic> json) {
    Map<String, double> factors = {};
    if (json['contributingFactors'] != null) {
      (json['contributingFactors'] as Map<String, dynamic>).forEach((k, v) {
        factors[k] = (v as num).toDouble();
      });
    }

    return RiskPredictionModel(
      probability: (json['probability'] as num?)?.toDouble() ?? 0.0,
      riskLevel: json['riskLevel'] ?? 'LOW',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 90.0,
      recommendedAction: json['recommendedAction'] ?? '',
      explanation: json['explanation'] ?? '',
      contributingFactors: factors,
    );
  }
}
