import sys

file_path = r'C:\dev\Involve_APP\lib\features\stock\data\datasources\app_database.dart'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('int get schemaVersion => 81;', 'int get schemaVersion => 82;')

migration_81 = '''        if (from < 81) {
          // Schema V81: Add barcode field to Items table
          await _safeAddColumn(m, items, items.barcode);
        }'''

migration_82 = '''        if (from < 81) {
          // Schema V81: Add barcode field to Items table
          await _safeAddColumn(m, items, items.barcode);
        }
        if (from < 82) {
          // Schema V82: Add mergePosReceipt setting
          await _safeAddColumn(m, settings, settings.mergePosReceipt);
        }'''

content = content.replace(migration_81, migration_82)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Migration added successfully.')
