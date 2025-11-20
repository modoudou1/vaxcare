// This is a basic Flutter widget test for VacxCare app.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:vacxcare_mobile/main.dart';

void main() {
  testWidgets('VacxCare app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const VacxCareApp());

    // Verify that the splash screen loads
    await tester.pumpAndSettle();
    
    // Basic test to verify app initializes without errors
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
