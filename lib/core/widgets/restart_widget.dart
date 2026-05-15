import 'package:flutter/material.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class RestartWidget<T> extends StatefulWidget {
  const RestartWidget({
    super.key, 
    required this.childBuilder,
    required this.initialize,
    this.loadingBuilder,
  });

  final Widget Function(BuildContext, T) childBuilder;
  final Future<T> Function() initialize;
  final WidgetBuilder? loadingBuilder;

  static void restartApp(BuildContext context) {
    context.findAncestorStateOfType<_RestartWidgetState>()?.restartApp();
  }

  @override
  State<RestartWidget<T>> createState() => _RestartWidgetState<T>();
}

class _RestartWidgetState<T> extends State<RestartWidget<T>> {
  late Future<T> _dependenciesFuture;

  @override
  void initState() {
    super.initState();
    _dependenciesFuture = widget.initialize();
  }

  void restartApp() {
    setState(() {
      _dependenciesFuture = widget.initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: _dependenciesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done && snapshot.hasData) {
          return KeyedSubtree(
            key: ValueKey(snapshot.data),
            child: widget.childBuilder(context, snapshot.data as T),
          );
        }
        
        if (snapshot.hasError) {
          return MaterialApp(
            home: Scaffold(
              body: Center(child: Text('Initialization Error: ${snapshot.error}')),
            ),
          );
        }

        return widget.loadingBuilder?.call(context) ?? 
               const MaterialApp(
                 home: Scaffold(
                   body: InvifyLoadingIndicator(message: 'INITIALIZING SYSTEM ARCHITECTURE...'),
                 ),
               );
      },
    );
  }
}
