import { supabase } from "./supabase";

export async function testDatabasePerformance() {
  console.log("🧪 Testing database performance...");

  const startTime = performance.now();

  try {
    // Test 1: Simple tasks query
    const tasksStart = performance.now();
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    const tasksTime = performance.now() - tasksStart;
    console.log(`✅ Tasks query: ${tasksTime.toFixed(0)}ms`);

    if (tasksError) {
      console.error("❌ Tasks query error:", tasksError);
    }

    // Test 2: Collaborators query
    const collabStart = performance.now();
    const { data: collaborators, error: collabError } = await supabase
      .from("collaborators")
      .select("*, user:app_users(*)")
      .order("position");

    const collabTime = performance.now() - collabStart;
    console.log(`✅ Collaborators query: ${collabTime.toFixed(0)}ms`);

    if (collabError) {
      console.error("❌ Collaborators query error:", collabError);
    }

    // Test 3: User lookup by email
    const userStart = performance.now();
    const { data: users, error: userError } = await supabase
      .from("app_users")
      .select("*")
      .limit(5);

    const userTime = performance.now() - userStart;
    console.log(`✅ Users query: ${userTime.toFixed(0)}ms`);

    if (userError) {
      console.error("❌ Users query error:", userError);
    }

    const totalTime = performance.now() - startTime;
    console.log(`🎯 Total test time: ${totalTime.toFixed(0)}ms`);

    // Performance assessment
    if (totalTime < 500) {
      console.log("🚀 Excellent performance! Indexes are working well.");
    } else if (totalTime < 1000) {
      console.log("✅ Good performance. Some optimization may be needed.");
    } else {
      console.log("⚠️ Performance could be improved. Check database indexes.");
    }

    return {
      totalTime,
      tasksTime,
      collabTime,
      userTime,
      success: !tasksError && !collabError && !userError,
    };
  } catch (error) {
    console.error("❌ Database test failed:", error);
    return { success: false, error };
  }
}

// Function to check if indexes exist
export async function checkDatabaseIndexes() {
  console.log("🔍 Checking database indexes...");

  try {
    // This would require a more complex query to check actual indexes
    // For now, we'll just test the queries to see if they're fast

    const result = await testDatabasePerformance();

    if (result.success && result.totalTime && result.totalTime < 1000) {
      console.log("✅ Database indexes appear to be working correctly");
      return true;
    } else {
      console.log("⚠️ Database performance could be improved");
      return false;
    }
  } catch (error) {
    console.error("❌ Failed to check database indexes:", error);
    return false;
  }
}
