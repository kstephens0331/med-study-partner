/**
 * Apply Database Migrations to Supabase
 *
 * Instructions for applying migrations:
 * 1. Go to https://supabase.com/dashboard/project/bqnmswxuzfguxrfgulps/sql/new
 * 2. Copy and paste the SQL from the migration files below
 * 3. Run each migration in order
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

function printMigration(filePath: string, name: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 ${name}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const sql = readFileSync(filePath, 'utf-8');
    console.log(sql);
    console.log(`\n${'='.repeat(80)}\n`);
  } catch (error: any) {
    console.error(`  ❌ Failed to read migration: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Database Migration SQL\n');
  console.log('Copy and paste each migration into the Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/bqnmswxuzfguxrfgulps/sql/new\n');

  const migrations = [
    {
      path: resolve(process.cwd(), 'supabase/migrations/20250119000000_add_generated_vignettes.sql'),
      name: 'Migration 1: Generated Vignettes Table'
    },
    {
      path: resolve(process.cwd(), 'supabase/migrations/20250120000000_add_base_vignettes.sql'),
      name: 'Migration 2: Base Vignettes Table'
    }
  ];

  for (const migration of migrations) {
    printMigration(migration.path, migration.name);
  }

  console.log('After running these migrations, you can proceed with vignette generation.\n');
}

main().catch(console.error);
