import 'package:flutter/material.dart';

class AppTheme {
  // Dark Theme Colors
  static const Color bgDark = Color(0xFF0B0F19);
  static const Color bgCard = Color(0xFF131B2E);
  static const Color bgCardHover = Color(0xFF1C2742);
  static const Color bgSidebar = Color(0xFF0F1524);
  static const Color borderColor = Color(0xFF1E293B);

  // Light Theme Colors
  static const Color bgLight = Color(0xFFF1F5F9);
  static const Color bgCardLight = Color(0xFFFFFFFF);
  static const Color bgCardHoverLight = Color(0xFFE2E8F0);
  static const Color borderLight = Color(0xFFCBD5E1);

  // Text Colors
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B); // <-- Restored here
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF475569);

  // Accents
  static const Color primaryAccent = Color(0xFF38BDF8);
  static const Color primaryAccentDark = Color(0xFF0284C7);

  // Risk Severity Colors
  static const Color riskLow = Color(0xFF22C55E);
  static const Color riskLowBg = Color(0x2622C55E);
  static const Color riskModerate = Color(0xFFEAB308);
  static const Color riskModerateBg = Color(0x26EAB308);
  static const Color riskHigh = Color(0xFFF97316);
  static const Color riskHighBg = Color(0x26F97316);
  static const Color riskCritical = Color(0xFFEF4444);
  static const Color riskCriticalBg = Color(0x33EF4444);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgDark,
      primaryColor: primaryAccent,
      colorScheme: const ColorScheme.dark(
        primary: primaryAccent,
        surface: bgCard,
        error: riskCritical,
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: borderColor, width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: bgSidebar,
        elevation: 0,
        titleTextStyle: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: bgLight,
      primaryColor: primaryAccentDark,
      colorScheme: const ColorScheme.light(
        primary: primaryAccentDark,
        surface: bgCardLight,
        error: riskCritical,
      ),
      cardTheme: CardThemeData(
        color: bgCardLight,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: borderLight, width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: IconThemeData(color: textPrimaryLight),
        titleTextStyle: TextStyle(color: textPrimaryLight, fontSize: 16, fontWeight: FontWeight.bold),
      ),
    );
  }

  static Color getRiskColor(String level) {
    switch (level.toUpperCase()) {
      case 'CRITICAL': return riskCritical;
      case 'HIGH': return riskHigh;
      case 'MODERATE': return riskModerate;
      default: return riskLow;
    }
  }

  static Color getRiskBgColor(String level) {
    switch (level.toUpperCase()) {
      case 'CRITICAL': return riskCriticalBg;
      case 'HIGH': return riskHighBg;
      case 'MODERATE': return riskModerateBg;
      default: return riskLowBg;
    }
  }
}