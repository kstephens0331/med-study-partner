import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load migration file
const migrationPath = path.join(
  __dirname,
  "../supabase/migrations/20250122000000_interactive_coach_system.sql"
);
const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log("🚀 Applying Interactive Coach Migration...\n");

  try {
    // Split migration into individual statements (simple split by semicolon)
    // This is a basic approach - for production, you'd want a more sophisticated SQL parser
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ";";

      // Skip comment-only statements
      if (statement.trim().startsWith("--")) {
        continue;
      }

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const { error } = await supabase.rpc("exec_sql", { sql: statement }).single();

      if (error) {
        // Check if it's a "already exists" error (which is OK)
        if (
          error.message.includes("already exists") ||
          error.message.includes("SQLSTATE 42P07") ||
          error.message.includes("SQLSTATE 42710")
        ) {
          console.log(`   ⚠️  Already exists (skipping): ${error.message}\n`);
        } else {
          console.error(`   ❌ Error:`, error);
          throw error;
        }
      } else {
        console.log(`   ✅ Success\n`);
      }
    }

    console.log("\n✅ Interactive Coach Migration Applied Successfully!");
    console.log("\n📊 Verifying tables created...");

    // Verify tables were created
    const tablesToCheck = [
      "skill_taxonomy",
      "user_skill_levels",
      "user_gamification",
      "badge_definitions",
      "user_badges",
      "xp_transactions",
      "coach_sessions",
      "coach_interactions",
      "daily_challenges",
      "user_challenge_attempts",
      "speed_round_templates",
      "boss_battle_templates",
      "multimodal_questions",
    ];

    for (const table of tablesToCheck) {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`   ❌ ${table}: NOT FOUND`);
      } else {
        console.log(`   ✅ ${table}: EXISTS (${count} rows)`);
      }
    }

    console.log("\n🎉 Migration complete! The interactive coach system is ready.");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigration();
