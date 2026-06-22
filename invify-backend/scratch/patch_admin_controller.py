import os

filepath = 'c:/dev/Involve_APP/invify-backend/src/controllers/admin.controller.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the import
content = content.replace("import { supabase } from '../db/supabase';", "import { supabase, supabaseAdmin } from '../db/supabase';")

# Replace supabase.from and supabase.rpc with supabaseAdmin.from and supabaseAdmin.rpc
content = content.replace("supabase.from", "supabaseAdmin.from")
content = content.replace("supabase.rpc", "supabaseAdmin.rpc")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patching of admin.controller.ts completed successfully!")
