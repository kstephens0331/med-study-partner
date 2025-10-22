import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("📝 Loaded environment from .env.local\n");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE:", supabaseServiceKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedChallenges() {
  console.log("🌱 Seeding challenge data...\n");

  // Seed Speed Round Templates
  console.log("📝 Creating Speed Round templates...");
  const speedRounds = [
    {
      name: "Hematology Blitz",
      description: "60-second rapid-fire hematology questions",
      target_skills: ["heme.coag_cascade", "heme.anemia_workup", "heme.transfusion_medicine"],
      question_count: 10,
      time_limit_seconds: 60,
      difficulty_level: 2,
    },
    {
      name: "Cardiology Quick Fire",
      description: "Test your cardiology knowledge under pressure",
      target_skills: ["cards.ecg_interpretation", "cards.heart_failure", "cards.arrhythmias"],
      question_count: 12,
      time_limit_seconds: 60,
      difficulty_level: 3,
    },
    {
      name: "Renal Rapid Round",
      description: "Acid-base and electrolytes speed challenge",
      target_skills: ["renal.acid_base", "renal.electrolytes", "renal.aki_ckd"],
      question_count: 10,
      time_limit_seconds: 60,
      difficulty_level: 4,
    },
    {
      name: "Neuro Sprint",
      description: "Quick neurology assessment",
      target_skills: ["neuro.stroke", "neuro.seizures", "neuro.cranial_nerves"],
      question_count: 10,
      time_limit_seconds: 60,
      difficulty_level: 3,
    },
    {
      name: "Endocrine Express",
      description: "Fast-paced endocrinology challenge",
      target_skills: ["endo.diabetes", "endo.thyroid", "endo.adrenal"],
      question_count: 10,
      time_limit_seconds: 60,
      difficulty_level: 2,
    },
  ];

  const { error: speedError } = await supabase
    .from("speed_round_templates")
    .insert(speedRounds);

  if (speedError) {
    console.error("❌ Error creating speed rounds:", speedError);
  } else {
    console.log(`✅ Created ${speedRounds.length} speed round templates\n`);
  }

  // Seed Boss Battle Templates
  console.log("⚔️  Creating Boss Battle templates...");
  const bossBattles = [
    {
      name: "The Hematology Hydra",
      description:
        "A multi-headed beast testing all aspects of hematology. Defeat it by demonstrating mastery across coagulation, anemia, and transfusion medicine.",
      required_skills: [
        "heme.coag_cascade",
        "heme.anemia_workup",
        "heme.transfusion_medicine",
      ],
      difficulty_level: 3,
      estimated_duration_minutes: 20,
      xp_reward: 500,
      badge_reward: "heme_master",
      unlock_requirement: { min_level: 5 },
    },
    {
      name: "Cardiac Colossus",
      description:
        "An enormous heart-themed boss. Master ECG interpretation, heart failure, and arrhythmias to claim victory.",
      required_skills: [
        "cards.ecg_interpretation",
        "cards.heart_failure",
        "cards.arrhythmias",
      ],
      difficulty_level: 4,
      estimated_duration_minutes: 25,
      xp_reward: 600,
      badge_reward: "cardio_master",
      unlock_requirement: { min_level: 8 },
    },
    {
      name: "Renal Titan",
      description:
        "A towering kidney-based adversary. Prove your understanding of acid-base, electrolytes, and kidney disease.",
      required_skills: ["renal.acid_base", "renal.electrolytes", "renal.aki_ckd"],
      difficulty_level: 5,
      estimated_duration_minutes: 30,
      xp_reward: 750,
      badge_reward: "renal_master",
      unlock_requirement: { min_level: 10 },
    },
    {
      name: "Medical Mastery Mega Boss",
      description:
        "The ultimate challenge. Face questions from ALL medical disciplines. Only the most skilled can prevail.",
      required_skills: [
        "heme.coag_cascade",
        "cards.ecg_interpretation",
        "renal.acid_base",
        "pulm.abg_interpretation",
        "neuro.stroke",
        "endo.diabetes",
        "gi.liver_disease",
      ],
      difficulty_level: 5,
      estimated_duration_minutes: 45,
      xp_reward: 1500,
      badge_reward: null,
      unlock_requirement: { min_level: 20, required_badges: ["heme_master", "cardio_master", "renal_master"] },
    },
  ];

  const { error: bossError } = await supabase
    .from("boss_battle_templates")
    .insert(bossBattles);

  if (bossError) {
    console.error("❌ Error creating boss battles:", bossError);
  } else {
    console.log(`✅ Created ${bossBattles.length} boss battle templates\n`);
  }

  // Seed Daily Challenges
  console.log("📅 Creating daily challenges...");
  const today = new Date();
  const dailyChallenges = [];

  const themes = [
    {
      name: "Manic Monday - Hematology",
      skills: ["heme.coag_cascade", "heme.anemia_workup"],
      xp: 50,
    },
    {
      name: "Terrific Tuesday - Cardiology",
      skills: ["cards.ecg_interpretation", "cards.heart_failure"],
      xp: 50,
    },
    {
      name: "Wonderful Wednesday - Renal",
      skills: ["renal.acid_base", "renal.electrolytes"],
      xp: 50,
    },
    {
      name: "Thoughtful Thursday - Neurology",
      skills: ["neuro.stroke", "neuro.seizures"],
      xp: 50,
    },
    {
      name: "Fantastic Friday - Endocrinology",
      skills: ["endo.diabetes", "endo.thyroid"],
      xp: 50,
    },
    {
      name: "Super Saturday - Multi-System",
      skills: ["pulm.abg_interpretation", "gi.liver_disease"],
      xp: 75,
    },
    {
      name: "Supreme Sunday - All Systems",
      skills: [
        "heme.coag_cascade",
        "cards.ecg_interpretation",
        "renal.acid_base",
        "neuro.stroke",
      ],
      xp: 100,
    },
  ];

  // Create challenges for the next 14 days
  for (let i = 0; i < 14; i++) {
    const challengeDate = new Date(today);
    challengeDate.setDate(today.getDate() + i);
    const dayOfWeek = challengeDate.getDay(); // 0 = Sunday, 6 = Saturday
    const theme = themes[dayOfWeek];

    dailyChallenges.push({
      challenge_date: challengeDate.toISOString().split("T")[0],
      theme: theme.name,
      description: `Complete 5 questions focused on ${theme.name.split("-")[1].trim()}`,
      target_skills: theme.skills,
      xp_reward: theme.xp,
      badge_reward: i === 0 && dayOfWeek === 0 ? "week_warrior" : null, // Reward for first Sunday
    });
  }

  const { error: dailyError } = await supabase
    .from("daily_challenges")
    .insert(dailyChallenges);

  if (dailyError) {
    console.error("❌ Error creating daily challenges:", dailyError);
  } else {
    console.log(`✅ Created ${dailyChallenges.length} daily challenges\n`);
  }

  // Summary
  console.log("🎉 Challenge seeding complete!\n");
  console.log("📊 Summary:");
  console.log(`   • ${speedRounds.length} Speed Round templates`);
  console.log(`   • ${bossBattles.length} Boss Battle templates`);
  console.log(`   • ${dailyChallenges.length} Daily Challenges\n`);

  console.log("🎮 You can now:");
  console.log("   1. Navigate to the Challenges tab in the app");
  console.log("   2. Try a Speed Round (60-second rapid-fire)");
  console.log("   3. Attempt a Boss Battle (if you meet level requirements)");
  console.log("   4. Complete today's Daily Challenge");
}

seedChallenges().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
