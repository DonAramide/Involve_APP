import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class CalculatorPage extends StatefulWidget {
  const CalculatorPage({super.key});

  @override
  State<CalculatorPage> createState() => _CalculatorPageState();
}

class _CalculatorPageState extends State<CalculatorPage> {
  String _output = '0';
  String _currentInput = '';
  double _num1 = 0;
  double _num2 = 0;
  String _operand = '';
  String _history = '';

  void _buttonPressed(String buttonText) {
    HapticFeedback.lightImpact();
    
    if (buttonText == 'C') {
      _clear();
    } else if (buttonText == '⌫') {
      _backspace();
    } else if (buttonText == '+' || buttonText == '-' || buttonText == '×' || buttonText == '÷') {
      _setOperand(buttonText);
    } else if (buttonText == '=') {
      _calculateResult();
    } else if (buttonText == '.') {
      if (!_currentInput.contains('.')) {
        setState(() {
          _currentInput = _currentInput.isEmpty ? '0.' : '$_currentInput.';
          _output = _currentInput;
        });
      }
    } else {
      // Number input
      setState(() {
        if (_currentInput == '0') {
          _currentInput = buttonText;
        } else {
          _currentInput += buttonText;
        }
        _output = _currentInput;
      });
    }
  }

  void _clear() {
    setState(() {
      _output = '0';
      _currentInput = '';
      _num1 = 0;
      _num2 = 0;
      _operand = '';
      _history = '';
    });
  }

  void _backspace() {
    setState(() {
      if (_currentInput.isNotEmpty) {
        _currentInput = _currentInput.substring(0, _currentInput.length - 1);
        _output = _currentInput.isEmpty ? '0' : _currentInput;
      }
    });
  }

  void _setOperand(String newOperand) {
    if (_currentInput.isEmpty && _history.isEmpty) return; // No input
    
    setState(() {
      if (_currentInput.isNotEmpty) {
        _num1 = double.parse(_currentInput);
        _operand = newOperand;
        _history = '$_currentInput $newOperand';
        _currentInput = '';
      } else if (_history.isNotEmpty && _operand.isNotEmpty) {
        // Change operand if already set
        _operand = newOperand;
        // Update history to show new operand
        // This is a bit complex with simple history string, so we just reset if needed or keep it simple
        // For now, let's just update the display history if possible
        if (_history.length > 2) {
           _history = '${_history.substring(0, _history.length - 1)}$newOperand';
        }
      }
    });
  }

  void _calculateResult() {
    if (_currentInput.isEmpty || _operand.isEmpty) return;

    _num2 = double.parse(_currentInput);
    double result = 0;

    switch (_operand) {
      case '+':
        result = _num1 + _num2;
        break;
      case '-':
        result = _num1 - _num2;
        break;
      case '×':
        result = _num1 * _num2;
        break;
      case '÷':
        if (_num2 == 0) {
          setState(() {
            _output = 'Error';
            _currentInput = '';
            _history = '';
          });
          return;
        }
        result = _num1 / _num2;
        break;
    }

    setState(() {
      // Format result to remove trailing .0
      String resultStr = result.toString();
      if (resultStr.endsWith('.0')) {
        resultStr = resultStr.substring(0, resultStr.length - 2);
      }
      
      _output = resultStr;
      _history = '$_history $_currentInput =';
      _currentInput = resultStr; // Allow chaining
      _operand = '';
      _num1 = result; // Store result for next operation
    });
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
                  Text(
                    _output,
                    style: TextStyle(
                      fontSize: 56,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onSurface,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          // Keypad Area
          Expanded(
            flex: 5,
            child: Container(
              padding: const EdgeInsets.all(12),
              color: colorScheme.surface,
              child: Column(
                children: [
                  _buildButtonRow(['C', '÷', '×', '⌫'], 
                    textColor: colorScheme.error, 
                    opColor: colorScheme.primary),
                  _buildButtonRow(['7', '8', '9', '-'], opColor: colorScheme.primary),
                  _buildButtonRow(['4', '5', '6', '+'], opColor: colorScheme.primary),
                  _buildButtonRow(['1', '2', '3', '='], 
                    opColor: colorScheme.primary, 
                    isEquals: true), // We'll handle layout differently inside
                  _buildButtonRow(['0', '.'], isZeroRow: true),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButtonRow(List<String> buttons, {Color? textColor, Color? opColor, bool isZeroRow = false, bool isEquals = false}) {
    return Expanded(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: buttons.map((text) {
          // Special handling for 0 button to span 2 columns
          if (text == '0' && isZeroRow) {
            return Expanded(
              flex: 2,
              child: _buildButton(text, textColor: textColor, opColor: opColor),
            );
          }
          
          // Special handling for = button
          if (text == '=' && isEquals) {
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
    final isOperator = ['+', '-', '×', '÷', '='].contains(text);
    final isAction = ['C', '⌫'].contains(text);
    
    return Container(
      margin: const EdgeInsets.all(6),
      child: ElevatedButton(
        onPressed: () => _buttonPressed(text),
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor ?? (isOperator ? opColor?.withOpacity(0.1) : null), // Different shade for operators
          foregroundColor: backgroundColor != null ? Colors.white : (isOperator ? opColor : (isAction ? textColor : null)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: isOperator || isAction ? 0 : 2,
          padding: EdgeInsets.zero,
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 28,
            fontWeight: isOperator ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
