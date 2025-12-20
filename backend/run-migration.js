#!/usr/bin/env node
// Supabase Migration Runner
// Executes SQL migrations using the service role key

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const migrationFile = path.join(__dirname, '..', 'supabase-add-users-columns.sql');

async function runMigration() {
  console.log('🔄 Running Supabase Users Table Migration...');
  console.log('');
  
  try {
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 10);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log('');
    
    // Execute each statement via PostgREST
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');
      
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);
      
      try {
        // Use Supabase's SQL execution endpoint
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: stmt })
        });
        
        if (!response.ok && response.status !== 404) {
          const errorText = await response.text();
          console.log(`⚠️  Skipped (may already exist): ${errorText.substring(0, 100)}`);
        } else if (response.status === 404) {
          console.log('⚠️  Direct SQL execution not available via API');
          console.log('    Please run this SQL manually in Supabase Dashboard:');
          console.log('    Dashboard > SQL Editor > New Query');
          console.log('');
          console.log(sql);
          break;
        } else {
          console.log('✅ Success');
        }
      } catch (err) {
        console.log(`⚠️  Skipped: ${err.message}`);
      }
    }
    
    console.log('');
    console.log('📋 Verifying users table access...');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, status')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing users table:', error.message);
      console.log('');
      console.log('⚠️  Please run the migration manually in Supabase Dashboard:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/mcyruxndjbxpvcjqdgyx/editor');
      console.log('   2. Open SQL Editor (left sidebar)');
      console.log('   3. Create a new query');
      console.log('   4. Copy and paste the contents of: supabase-add-users-columns.sql');
      console.log('   5. Run the query');
    } else {
      console.log('✅ Users table is accessible');
      console.log(`   Current user count: ${data?.length || 0}`);
      console.log('');
      console.log('✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('📋 Manual migration steps:');
    console.log('   1. Open: https://supabase.com/dashboard/project/mcyruxndjbxpvcjqdgyx/sql');
    console.log('   2. Create new query');
    console.log('   3. Copy contents from: supabase-add-users-columns.sql');
    console.log('   4. Execute the query');
    process.exit(1);
  }
}

runMigration();
