import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:math_expressions/math_expressions.dart';

class CalculatorPage extends StatefulWidget {
  const CalculatorPage({super.key});

  @override
  State<CalculatorPage> createState() => _CalculatorPageState();
}

class _CalculatorPageState extends State<CalculatorPage> {
  String _output = '0';
  String _expression = '';
  String _history = '';

  void _buttonPressed(String buttonText) {
    HapticFeedback.lightImpact();
    
    setState(() {
      if (buttonText == 'C') {
        _clear();
      } else if (buttonText == '⌫') {
        _backspace();
      } else if (buttonText == '=') {
        _calculateResult();
      } else if (buttonText == '%') {
        _applyPercentage();
      } else {
        // Handle normal inputs (numbers, operators, brackets)
        if (_expression == 'Error' || (_expression == '0' && buttonText != '.')) {
          _expression = '';
        }
        
        // Prevent double operators
        final List<String> operators = ['+', '-', '×', '÷'];
        if (_expression.isNotEmpty && 
            operators.contains(_expression[_expression.length - 1]) && 
            operators.contains(buttonText)) {
          _expression = _expression.substring(0, _expression.length - 1) + buttonText;
        } else {
          _expression += buttonText;
        }
        
        _output = _expression;
      }
    });
  }

  void _applyPercentage() {
    if (_expression.isEmpty || _expression == 'Error') return;
    
    try {
      // Very naive percentage: divide the last number by 100
      // Find the last number in the expression
      final RegExp numRegExp = RegExp(r"(\d+\.?\d*)$");
      final match = numRegExp.firstMatch(_expression);
      if (match != null) {
        String lastNum = match.group(0)!;
        double val = double.parse(lastNum) / 100;
        _expression = _expression.substring(0, _expression.length - lastNum.length) + val.toString();
        if (_expression.endsWith('.0')) {
          _expression = _expression.substring(0, _expression.length - 2);
        }
        _output = _expression;
      }
    } catch (e) {
      _output = 'Error';
    }
  }

  void _clear() {
    _output = '0';
    _expression = '';
    _history = '';
  }

  void _backspace() {
    if (_expression.isNotEmpty) {
      _expression = _expression.substring(0, _expression.length - 1);
      _output = _expression.isEmpty ? '0' : _expression;
    }
  }

  void _calculateResult() {
    if (_expression.isEmpty) return;

    try {
      String finalExpression = _expression.replaceAll('×', '*').replaceAll('÷', '/');
      
      Parser p = Parser();
      Expression exp = p.parse(finalExpression);
      ContextModel cm = ContextModel();
      double eval = exp.evaluate(EvaluationType.REAL, cm);

      String resultStr = eval.toString();
      if (resultStr.endsWith('.0')) {
        resultStr = resultStr.substring(0, resultStr.length - 2);
      }

      _history = '$_expression =';
      _output = resultStr;
      _expression = resultStr; // Allow chaining
    } catch (e) {
      _output = 'Error';
      _expression = '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Calculator'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Display Area
          Expanded(
            flex: 3,
            child: Container(
              padding: const EdgeInsets.all(24),
              alignment: Alignment.bottomRight,
              color: colorScheme.surface,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    _history,
                    style: TextStyle(
                      fontSize: 24,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 8),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      _output,
                      style: TextStyle(
                        fontSize: 56,
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onSurface,
                      ),
                      maxLines: 1,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          // Keypad Area
          Expanded(
            flex: 6,
            child: Container(
              padding: const EdgeInsets.all(12),
              color: colorScheme.surface,
              child: Column(
                children: [
                  _buildButtonRow(['C', '(', ')', '÷'], 
                    textColor: colorScheme.error, 
                    opColor: colorScheme.primary),
                  _buildButtonRow(['7', '8', '9', '×'], opColor: colorScheme.primary),
                  _buildButtonRow(['4', '5', '6', '-'], opColor: colorScheme.primary),
                  _buildButtonRow(['1', '2', '3', '+'], opColor: colorScheme.primary),
                  _buildButtonRow(['%', '0', '.', '⌫'], opColor: colorScheme.primary),
                  _buildButtonRow(['='], isFullWidth: true),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButtonRow(List<String> buttons, {Color? textColor, Color? opColor, bool isFullWidth = false}) {
    return Expanded(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: buttons.map((text) {
          if (isFullWidth) {
             return Expanded(
              child: _buildButton(text, 
                textColor: Colors.white, 
                backgroundColor: Theme.of(context).colorScheme.primary
              ),
            );
          }

          return Expanded(
            child: _buildButton(text, textColor: textColor, opColor: opColor),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildButton(String text, {Color? textColor, Color? opColor, Color? backgroundColor}) {
    final isOperator = ['+', '-', '×', '÷', '=', '%', '(', ')'].contains(text);
    final isAction = ['C', '⌫'].contains(text);
    
    return Container(
      margin: const EdgeInsets.all(6),
      child: ElevatedButton(
        onPressed: () => _buttonPressed(text),
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor ?? (isOperator ? opColor?.withOpacity(0.1) : null),
          foregroundColor: backgroundColor != null ? Colors.white : (isOperator ? opColor : (isAction ? textColor : null)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: isOperator || isAction ? 0 : 2,
          padding: EdgeInsets.zero,
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: text.length > 1 ? 22 : 28,
            fontWeight: isOperator ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

