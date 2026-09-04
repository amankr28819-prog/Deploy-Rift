import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/risk_prediction.dart';
import '../theme/app_theme.dart';

class SimulatorView extends StatefulWidget {
  const SimulatorView({super.key});

  @override
  State<SimulatorView> createState() => _SimulatorViewState();
}

class _SimulatorViewState extends State<SimulatorView> {
  double _rainfall = 165.0;
  double _soilMoisture = 82.0;
  double _slope = 37.0;

  RiskPredictionModel? _simResult;

  @override
  void initState() {
    super.initState();
    _updateSim();
  }

  Future<void> _updateSim() async {
    final res = await ApiService.predictRisk(
      rainfall: _rainfall,
      soilMoisture: _soilMoisture,
      slope: _slope,
    );
    setState(() => _simResult = res);
  }

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getRiskColor(_simResult?.riskLevel ?? 'LOW');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Interactive Monsoonal Landslide Risk Simulator',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  Text('Rainfall: ${_rainfall.toInt()} mm', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Slider(
                    min: 10,
                    max: 300,
                    value: _rainfall,
                    activeColor: AppTheme.primaryAccent,
                    onChanged: (val) {
                      setState(() => _rainfall = val);
                      _updateSim();
                    },
                  ),
                  const SizedBox(height: 10),

                  Text('Soil Saturation: ${_soilMoisture.toInt()}%', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Slider(
                    min: 10,
                    max: 100,
                    value: _soilMoisture,
                    activeColor: AppTheme.riskModerate,
                    onChanged: (val) {
                      setState(() => _soilMoisture = val);
                      _updateSim();
                    },
                  ),
                  const SizedBox(height: 10),

                  Text('Slope Angle: ${_slope.toInt()}°', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Slider(
                    min: 5,
                    max: 60,
                    value: _slope,
                    activeColor: AppTheme.riskHigh,
                    onChanged: (val) {
                      setState(() => _slope = val);
                      _updateSim();
                    },
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          if (_simResult != null)
            Card(
              color: AppTheme.bgCardHover,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    const Text('Simulated Dynamic Risk Gauge', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                    const SizedBox(height: 6),
                    Text(
                      '${_simResult!.probability}%',
                      style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: color),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.getRiskBgColor(_simResult!.riskLevel),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: color),
                      ),
                      child: Text(
                        '${_simResult!.riskLevel} RISK',
                        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
