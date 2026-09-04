import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../models/field_report_model.dart';
import '../theme/app_theme.dart';

class FieldReportingView extends StatefulWidget {
  const FieldReportingView({super.key});

  @override
  State<FieldReportingView> createState() => _FieldReportingViewState();
}

class _FieldReportingViewState extends State<FieldReportingView> {
  final _nameController = TextEditingController(text: 'Officer T. Zothan');
  final _locationController = TextEditingController(text: 'NH-6 Km 42 Aizawl Pass');
  final _descController = TextEditingController(text: 'Debris accumulation on NH-6 shoulder after heavy rain.');
  String _selectedType = 'Landslide & Debris Flow';
  String _selectedSeverity = 'Critical';

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Citizen & Officer Incident Reporting',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: provider.isOnline ? AppTheme.riskLowBg : AppTheme.riskCriticalBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: provider.isOnline ? AppTheme.riskLow : AppTheme.riskCritical),
                ),
                child: Text(
                  provider.isOnline ? 'ONLINE' : 'OFFLINE MODE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: provider.isOnline ? AppTheme.riskLow : AppTheme.riskCritical,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Reporter Name', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    value: _selectedType,
                    decoration: const InputDecoration(labelText: 'Incident Type', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'Landslide & Debris Flow', child: Text('Landslide & Debris Flow')),
                      DropdownMenuItem(value: 'Road Blockage', child: Text('Road Blockage')),
                      DropdownMenuItem(value: 'Rockfall Hazard', child: Text('Rockfall Hazard')),
                      DropdownMenuItem(value: 'Soil Crack', child: Text('Soil Crack')),
                    ],
                    onChanged: (val) => setState(() => _selectedType = val!),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _locationController,
                    decoration: const InputDecoration(labelText: 'Location / Highway Pass', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    value: _selectedSeverity,
                    decoration: const InputDecoration(labelText: 'Severity Level', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'Critical', child: Text('Critical')),
                      DropdownMenuItem(value: 'High', child: Text('High')),
                      DropdownMenuItem(value: 'Moderate', child: Text('Moderate')),
                    ],
                    onChanged: (val) => setState(() => _selectedSeverity = val!),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _descController,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Field Description', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryAccent,
                      minimumSize: const Size.fromHeight(44),
                    ),
                    onPressed: () {
                      final report = FieldReportModel(
                        id: 'rep-${DateTime.now().millisecondsSinceEpoch}',
                        reporterName: _nameController.text,
                        reporterRole: provider.selectedRole,
                        incidentType: _selectedType,
                        locationName: _locationController.text,
                        lat: 23.73,
                        lng: 92.72,
                        severity: _selectedSeverity,
                        status: 'Submitted',
                        submittedAgo: 'Just now',
                        description: _descController.text,
                      );

                      provider.submitReport(report);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('✅ Incident Report Submitted & Synced!')),
                      );
                    },
                    icon: const Icon(Icons.send, color: Colors.black),
                    label: const Text('Submit Incident Report', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),
          const Text('Recent Incident Submissions', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: provider.fieldReports.length,
            itemBuilder: (context, index) {
              final rep = provider.fieldReports[index];
              final color = AppTheme.getRiskColor(rep.severity);
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  title: Text(rep.incidentType, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text('${rep.locationName} • By ${rep.reporterName}\n"${rep.description}"', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.getRiskBgColor(rep.severity),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: color),
                    ),
                    child: Text(rep.severity, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
