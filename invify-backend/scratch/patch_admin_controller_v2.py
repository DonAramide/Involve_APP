import re

filepath = 'c:/dev/Involve_APP/invify-backend/src/controllers/admin.controller.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any whole word 'supabase' with 'supabaseAdmin', except in import statement
# Wait, let's look at the import statement:
# import { supabase } from '../db/supabase'; -> we want import { supabase, supabaseAdmin } from '../db/supabase';
# Let's replace the import statement first to something unique, then do the word replacement, then restore/adjust the import.

# Temporary placeholder for import statement
import_placeholder = "IMPORT_SUPABASE_PLACEHOLDER"
content = content.replace("import { supabase, supabaseAdmin } from '../db/supabase';", import_placeholder)
content = content.replace("import { supabase } from '../db/supabase';", import_placeholder)

# Replace all whole-word occurrences of 'supabase' with 'supabaseAdmin'
content = re.sub(r'\bsupabase\b', 'supabaseAdmin', content)

# Restore the import statement
content = content.replace(import_placeholder, "import { supabase, supabaseAdmin } from '../db/supabase';")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patching of admin.controller.ts v2 completed successfully!")
