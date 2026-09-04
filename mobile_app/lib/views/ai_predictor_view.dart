import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/risk_prediction.dart';
import '../theme/app_theme.dart';

class AiPredictorView extends StatefulWidget {
  const AiPredictorView({super.key});

  @override
  State<AiPredictorView> createState() => _AiPredictorViewState();
}

class _AiPredictorViewState extends State<AiPredictorView> {
  final _rainfallController = TextEditingController(text: '165');
  final _soilController = TextEditingController(text: '82');
  final _slopeController = TextEditingController(text: '37');
  final _elevationController = TextEditingController(text: '1132');

  RiskPredictionModel? _result;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _computePrediction();
  }

  Future<void> _computePrediction() async {
    setState(() => _loading = true);
    final r = double.tryParse(_rainfallController.text) ?? 165.0;
    final sm = double.tryParse(_soilController.text) ?? 82.0;
    final sl = double.tryParse(_slopeController.text) ?? 37.0;
    final el = double.tryParse(_elevationController.text) ?? 1132.0;

    final res = await ApiService.predictRisk(
      rainfall: r,
      soilMoisture: sm,
      slope: sl,
      elevation: el,
    );

    setState(() {
      _result = res;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'AI Landslide Risk Prediction Engine',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildTextField(_rainfallController, '24h Rainfall (mm)', Icons.water_drop),
                  const SizedBox(height: 10),
                  _buildTextField(_soilController, 'Soil Saturation (%)', Icons.water_drop_outlined),
                  const SizedBox(height: 10),
                  _buildTextField(_slopeController, 'Slope Angle (°)', Icons.terrain),
                  const SizedBox(height: 10),
                  _buildTextField(_elevationController, 'Elevation (meters)', Icons.height),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryAccent,
                      minimumSize: const Size.fromHeight(44),
                    ),
                    onPressed: _computePrediction,
                    child: _loading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Compute AI Risk Score', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          if (_result != null) _buildResultCard(_result!),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      style: const TextStyle(fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 18, color: AppTheme.primaryAccent),
        border: const OutlineInputBorder(),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
    );
  }

  Widget _buildResultCard(RiskPredictionModel res) {
    final color = AppTheme.getRiskColor(res.riskLevel);
    return Card(
      color: AppTheme.bgCardHover,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${res.probability}%',
                  style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: color),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.getRiskBgColor(res.riskLevel),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: color),
                  ),
                  child: Text(
                    '${res.riskLevel} RISK',
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              res.explanation,
              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            const Text('Explainable AI (SHAP Factor Attribution)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            ...res.contributingFactors.entries.map((e) => _buildXaiBar(e.key, e.value)),
          ],
        ),
      ),
    );
  }

  Widget _buildXaiBar(String factor, double percent) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(factor, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
              Text('${percent.toStringAsFixed(1)}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: (percent / 100).clamp(0.0, 1.0),
            backgroundColor: AppTheme.borderColor,
            color: AppTheme.primaryAccent,
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
        ],
      ),
    );
  }
}
