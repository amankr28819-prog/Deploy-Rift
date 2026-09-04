import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SatelliteView extends StatefulWidget {
  const SatelliteView({super.key});

  @override
  State<SatelliteView> createState() => _SatelliteViewState();
}

class _SatelliteViewState extends State<SatelliteView> {
  double _sliderValue = 0.5;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Satellite Scar Monitoring & Surface Deformation',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Pre-Monsoon vs Post-Deluge Satellite Comparison', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),

                  Stack(
                    children: [
                      Container(
                        height: 220,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          image: const DecorationImage(
                            image: NetworkImage('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80'),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      ClipRect(
                        child: Align(
                          alignment: Alignment.centerLeft,
                          widthFactor: _sliderValue,
                          child: Container(
                            height: 220,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              image: const DecorationImage(
                                image: NetworkImage('https://images.unsplash.com/photo-1511497584788-8767611136f6?w=800&auto=format&fit=crop&q=80'),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  Slider(
                    value: _sliderValue,
                    activeColor: AppTheme.primaryAccent,
                    onChanged: (val) => setState(() => _sliderValue = val),
                  ),

                  const SizedBox(height: 8),
                  const Text(
                    '🛰️ SAR Sentinel-1 imagery detected 14.2mm surface displacement along Aizawl Ridge Sector 4 contour.',
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
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
