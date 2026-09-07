import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/risk_prediction.dart';
import '../theme/app_theme.dart';

class AiDigitalTwinView extends StatefulWidget {
  const AiDigitalTwinView({super.key});

  @override
  State<AiDigitalTwinView> createState() => _AiDigitalTwinViewState();
}

class _AiDigitalTwinViewState extends State<AiDigitalTwinView> {
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
    if(!mounted) return;
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
if(!mounted) return;
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
          // --- 1. DIGITAL TWIN HEADER ---
          const Text('Slope #A-173 — NH-10 Digital Twin', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.riskCriticalBg,
                      border: Border.all(color: AppTheme.riskCritical),
                      borderRadius: BorderRadius.circular(8)
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Icon(Icons.satellite_alt, color: AppTheme.riskCritical),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "🛰️ SATELLITE ALERT: +14mm ground displacement detected over 30 days.", 
                            style: TextStyle(color: AppTheme.riskCritical, fontWeight: FontWeight.bold)
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildHealthRow('🌧️ Rainfall', '↑ 42% above normal', AppTheme.riskCritical),
                  _buildHealthRow('💧 Soil Moisture', '↑ Rapidly increasing', AppTheme.riskHigh),
                  _buildHealthRow('👷 Human Disturbance', 'HIGH (Road cutting detected)', AppTheme.riskCritical),
                  _buildHealthRow('🌿 Vegetation', '↓ 12% loss (NDVI drop)', AppTheme.riskModerate),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // --- 2. INTERACTIVE AI PREDICTOR ---
          const Text('AI Risk Engine Parameters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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
                  const SizedBox(height: 16),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryAccent,
                      minimumSize: const Size.fromHeight(44),
                    ),
                    onPressed: _computePrediction,
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                        : const Text('Simulate Risk Score', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // --- 3. EXPLAINABLE AI RESULT (XAI) ---
          if (_result != null) _buildXaiResultCard(_result!),
        ],
      ),
    );
  }

  // FIX 1: Wrapping the value Text in Expanded to prevent the yellow/black overflow error!
  Widget _buildHealthRow(String label, String value, Color statusColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textSecondary)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(color: statusColor, fontWeight: FontWeight.bold),
            ),
          ),
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

  Widget _buildXaiResultCard(RiskPredictionModel res) {
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
                Text('${res.probability}%', style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: color)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.getRiskBgColor(res.riskLevel),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: color),
                  ),
                  child: Text('${res.riskLevel} RISK', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text('Why is this area rated this way?', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            ...res.contributingFactors.entries.map((e) => _buildXaiBar(e.key, e.value)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.bgDark,
                border: Border.all(color: AppTheme.borderColor),
                borderRadius: BorderRadius.circular(8)
              ),
              child: Text("🤖 AI Explanation: ${res.explanation}", style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary, height: 1.4)),
            )
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
              Text('+${percent.toStringAsFixed(1)}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.riskCritical)),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: (percent / 100).clamp(0.0, 1.0),
            backgroundColor: AppTheme.borderColor,
            color: AppTheme.riskCritical,
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
        ],
      ),
    );
  }
}