import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../models/location_model.dart';
import '../theme/app_theme.dart';

class GisMapView extends StatefulWidget {
  const GisMapView({super.key});

  @override
  State<GisMapView> createState() => _GisMapViewState();
}

class _GisMapViewState extends State<GisMapView> {
  final MapController _mapController = MapController();
  String _selectedState = 'ALL';

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    List<LocationModel> displayedLocations = _selectedState == 'ALL'
        ? provider.locations
        : provider.locations.where((l) => l.state == _selectedState).toList();

    return Column(
      children: [
        // Filter Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: AppTheme.bgSidebar,
          child: Row(
            children: [
              const Icon(Icons.filter_alt, size: 16, color: AppTheme.primaryAccent),
              const SizedBox(width: 8),
              const Text('Filter NER State:', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButton<String>(
                  value: _selectedState,
                  isExpanded: true,
                  dropdownColor: AppTheme.bgCard,
                  underline: const SizedBox(),
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                  items: const [
                    DropdownMenuItem(value: 'ALL', child: Text('All NER States (8)')),
                    DropdownMenuItem(value: 'Mizoram', child: Text('Mizoram')),
                    DropdownMenuItem(value: 'Nagaland', child: Text('Nagaland')),
                    DropdownMenuItem(value: 'Meghalaya', child: Text('Meghalaya')),
                    DropdownMenuItem(value: 'Sikkim', child: Text('Sikkim')),
                    DropdownMenuItem(value: 'Assam', child: Text('Assam')),
                    DropdownMenuItem(value: 'Arunachal Pradesh', child: Text('Arunachal Pradesh')),
                    DropdownMenuItem(value: 'Manipur', child: Text('Manipur')),
                    DropdownMenuItem(value: 'Tripura', child: Text('Tripura')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedState = val;
                      });
                      if (val != 'ALL' && displayedLocations.isNotEmpty) {
                        _mapController.move(
                          LatLng(displayedLocations[0].lat, displayedLocations[0].lng),
                          9.0,
                        );
                      } else {
                        _mapController.move(const LatLng(25.5788, 92.5), 7.0);
                      }
                    }
                  },
                ),
              ),
            ],
          ),
        ),

        // Flutter Map Canvas
        Expanded(
          child: FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: LatLng(25.5788, 92.5),
              initialZoom: 7.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
              ),
              MarkerLayer(
                markers: displayedLocations.map((loc) {
                  final color = AppTheme.getRiskColor(loc.riskLevel);
                  return Marker(
                    point: LatLng(loc.lat, loc.lng),
                    width: 40,
                    height: 40,
                    child: GestureDetector(
                      onTap: () => _showLocationDetailsBottomSheet(context, loc),
                      child: Container(
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.9),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [
                            BoxShadow(color: color.withOpacity(0.5), blurRadius: 8, spreadRadius: 2),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            '${loc.probability.toInt()}%',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showLocationDetailsBottomSheet(BuildContext context, LocationModel loc) {
    final color = AppTheme.getRiskColor(loc.riskLevel);
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  loc.name,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.getRiskBgColor(loc.riskLevel),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: color),
                  ),
                  child: Text(
                    '${loc.riskLevel} (${loc.probability.toInt()}%)',
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text('State: ${loc.state} • District: ${loc.district}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            const SizedBox(height: 8),
            Text('🌧️ 24h Rainfall: ${loc.rainfall24h} mm', style: const TextStyle(fontSize: 13)),
            Text('💧 Soil Saturation: ${loc.soilMoisture}%', style: const TextStyle(fontSize: 13)),
            Text('⛰️ Slope: ${loc.slope}° • Elevation: ${loc.elevation.toInt()}m', style: const TextStyle(fontSize: 13)),
            Text('🛣️ Nearby Highways: ${loc.nearbyRoads.join(", ")}', style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.bgDark,
                borderRadius: BorderRadius.circular(8),
                border: Border(left: BorderSide(color: color, width: 3)),
              ),
              child: Text(
                'Recommended Response Action:\n${loc.recommendedAction}',
                style: const TextStyle(fontSize: 11, color: AppTheme.textPrimary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
