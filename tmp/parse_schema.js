const fs = require('fs');

const code = fs.readFileSync('lib/features/stock/data/datasources/app_database.g.dart', 'utf-8');

const schema = [];

// Split into table chunks
const tableChunks = code.split('static const String $name =');
for (let i = 0; i < tableChunks.length - 1; i++) {
  const currentChunk = tableChunks[i];
  const nextChunk = tableChunks[i + 1];

  // Match the table name which is right after `static const String $name = '`
  const tableNameMatch = nextChunk.match(/^\s*'([^']+)'/);
  if (!tableNameMatch) continue;
  const tableName = tableNameMatch[1];

  // Find all columns in current chunk
  // They look like: GeneratedColumn<int> id = GeneratedColumn<int>('id', ... type: DriftSqlType.int, requiredDuringInsert: false ...
  const columns = [];
  const colRegex = /GeneratedColumn<[^>]+>\(\s*'([^']+)'[\s\S]*?type:\s*DriftSqlType\.(\w+),[\s\S]*?requiredDuringInsert:\s*(true|false)/g;
  
  let colMatch;
  while ((colMatch = colRegex.exec(currentChunk)) !== null) {
    const colName = colMatch[1];
    const type = colMatch[2];
    const required = colMatch[3] === 'true';

    let pgType = 'TEXT';
    if (type === 'int') pgType = 'INTEGER';
    else if (type === 'string') pgType = 'VARCHAR(255)';
    else if (type === 'bool') pgType = 'BOOLEAN';
    else if (type === 'dateTime') pgType = 'TIMESTAMP';
    else if (type === 'blob') pgType = 'BYTEA';
    else if (type === 'double') pgType = 'DOUBLE PRECISION';

    columns.push(`  "${colName}" ${pgType} ${required ? 'NOT NULL' : ''}`);
  }

  if (columns.length > 0) {
    schema.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (\n${columns.join(',\n')}\n);`);
  }
}

fs.writeFileSync('tmp/supabase_schema.sql', schema.join('\n\n'));
console.log('Schema dumped to tmp/supabase_schema.sql! found ' + schema.length + ' tables.');
