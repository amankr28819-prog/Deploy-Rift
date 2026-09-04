import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/main.dart';

void main() {
  testWidgets('NER-SAFE App Smoke Test', (WidgetTester tester) async {
    await tester.pumpWidget(const NerSafeMobileApp());
    expect(find.byType(NerSafeMobileApp), findsOneWidget);
  });
}
