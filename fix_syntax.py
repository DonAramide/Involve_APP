import sys
import os

file_path = r'C:\dev\Involve_APP\lib\features\invoicing\presentation\widgets\invoice_preview_dialog.dart'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('MposTransactionResult result,', 'MposTransactionResponse result,')
content = content.replace('void _printPosReceipt(MposTransactionResponse tx) {', 'void _printPosReceipt(MposTransactionData tx) {')
content = content.replace('settings?.businessName', 'settings?.organizationName')

# Now do string replacements for the commands using replace directly 
content = content.replace("PrintCommand.text(", "TextCommand(")
content = content.replace("align: PrintAlignment.center", "align: 'center'")
content = content.replace(", size: PrintSize.large", "")
content = content.replace(", )", ")") # clean up empty trailing commas if any
content = content.replace("PrintCommand.feed(3)", "SizedBoxCommand(height: 3)")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Syntax fixes applied successfully')
