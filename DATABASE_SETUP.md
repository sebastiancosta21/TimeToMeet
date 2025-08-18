# Database Setup Instructions

## Running Migration Scripts

To add recurring meeting functionality, you need to run the migration script:

### Option 1: Using the v0 Interface
1. Click on the "Run Script" button for `scripts/06-add-recurring-fields.sql` in the v0 interface

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/06-add-recurring-fields.sql`
4. Click "Run" to execute the script

### Option 3: Using Supabase CLI
\`\`\`bash
supabase db reset
# or
supabase db push
\`\`\`

## What the Migration Does
- Adds `is_recurring` boolean column (defaults to false)
- Adds `recurrence_frequency` text column with check constraint for valid values
- Updates existing meetings to be non-recurring

After running this script, you'll be able to create recurring meetings with different frequencies (daily, weekly, bi-weekly, monthly).
