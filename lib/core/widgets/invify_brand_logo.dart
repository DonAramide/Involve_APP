import 'package:flutter/material.dart';

/// Invify mark that never shows Flutter's red asset-error box.
class InvifyBrandLogo extends StatelessWidget {
  final double size;
  final BoxFit fit;
  final Color? backgroundColor;

  const InvifyBrandLogo({
    super.key,
    this.size = 64,
    this.fit = BoxFit.contain,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/images/logo.png',
      width: size,
      height: size,
      fit: fit,
      filterQuality: FilterQuality.medium,
      errorBuilder: (context, error, stackTrace) {
        return Image.asset(
          'assets/images/logo_transparent.png',
          width: size,
          height: size,
          fit: fit,
          errorBuilder: (context, error, stackTrace) => _InvifyBrandMark(size: size),
        );
      },
    );
  }
}

class _InvifyBrandMark extends StatelessWidget {
  final double size;
  const _InvifyBrandMark({required this.size});

  @override
  Widget build(BuildContext context) {
    final checkSize = size * 0.42;
    return SizedBox(
      width: size,
      height: size,
      child: FittedBox(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFF1565C0),
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(color: Color(0x331E88E5), blurRadius: 8, offset: Offset(0, 3)),
                ],
              ),
              child: Icon(Icons.verified, color: const Color(0xFFFFD54F), size: checkSize.clamp(28, 48)),
            ),
            const SizedBox(height: 6),
            const Text(
              'Invify',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 18,
                color: Color(0xFF1565C0),
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
