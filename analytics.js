// ==========================================================================
// LifeLens - Productivity Analytics Module
// ==========================================================================

import { db, isConfigured, collection, query, where, getDocs } from "./firebase-config.js";
import { initAuthGuard, setupLayout, getTodayDateString, showToast } from "./common.js";

let currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {
  initAuthGuard(async (userProfile) => {
    currentUserId = userProfile.uid;
    setupLayout("analytics", userProfile);

    await loadAnalyticsData();
  });
});

async function loadAnalyticsData() {
  const todayStr = getTodayDateString();

  let taskStats = { total: 0, completed: 0, pending: 0, highPriority: 0 };
  let focusStats = { count: 0, totalMinutes: 0 };
  let waterStats = { glasses: 0, target: 8 };
  let moodCount = 0;

  if (isConfigured) {
    try {
      // 1. Fetch Task Statistics
      const tasksQ = query(collection(db, "tasks"), where("userId", "==", currentUserId));
      const tasksSnap = await getDocs(tasksQ);
      taskStats.total = tasksSnap.size;
      tasksSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status === "Completed") taskStats.completed++;
        else taskStats.pending++;
        if (data.priority === "High") taskStats.highPriority++;
      });

      // 2. Fetch Focus Sessions
      const focusQ = query(collection(db, "focusSessions"), where("userId", "==", currentUserId));
      const focusSnap = await getDocs(focusQ);
      focusStats.count = focusSnap.size;
      focusSnap.forEach(docSnap => {
        focusStats.totalMinutes += docSnap.data().duration || 25;
      });

      // 3. Fetch Today's Water
      const waterQ = query(collection(db, "water"), where("userId", "==", currentUserId), where("date", "==", todayStr));
      const waterSnap = await getDocs(waterQ);
      if (!waterSnap.empty) {
        waterStats.glasses = waterSnap.docs[0].data().glasses || 0;
      }

      // 4. Fetch Mood Logs
      const moodQ = query(collection(db, "moods"), where("userId", "==", currentUserId));
      const moodSnap = await getDocs(moodQ);
      moodCount = moodSnap.size;

    } catch (err) {
      console.error("Error loading analytics:", err);
      showToast("Error loading analytics data.", "error");
    }
  } else {
    // Demo metrics
    taskStats = { total: 10, completed: 7, pending: 3, highPriority: 4 };
    focusStats = { count: 6, totalMinutes: 150 };
    waterStats = { glasses: 6, target: 8 };
    moodCount = 5;
  }

  renderAnalyticsUI(taskStats, focusStats, waterStats, moodCount);
}

function renderAnalyticsUI(tasks, focus, water, moodCount) {
  // Counters
  setVal("analytics-total-tasks", tasks.total);
  setVal("analytics-completed-tasks", tasks.completed);
  setVal("analytics-pending-tasks", tasks.pending);
  setVal("analytics-high-priority", tasks.highPriority);

  setVal("analytics-focus-sessions", focus.count);
  setVal("analytics-focus-minutes", `${focus.totalMinutes} mins`);
  
  const waterPct = Math.round(Math.min(100, (water.glasses / water.target) * 100));
  setVal("analytics-water-intake", `${water.glasses} / ${water.target} Glasses (${waterPct}%)`);
  setVal("analytics-mood-count", `${moodCount} Entries`);

  // Overall Daily Completion
  const taskPct = tasks.total > 0 ? (tasks.completed / tasks.total) * 100 : 0;
  const waterPctVal = (water.glasses / water.target) * 100;
  const focusPctVal = (focus.count / 4) * 100;
  const overall = Math.round((taskPct * 0.5) + (waterPctVal * 0.25) + (focusPctVal * 0.25));

  setVal("analytics-productivity-score", `${overall}%`);
  const fillEl = document.getElementById("analytics-score-fill");
  if (fillEl) fillEl.style.width = `${overall}%`;

  // Render Bar Charts
  renderBarChart("task-chart", [
    { label: "Completed", val: tasks.completed, max: Math.max(tasks.total, 1) },
    { label: "Pending", val: tasks.pending, max: Math.max(tasks.total, 1) },
    { label: "High Priority", val: tasks.highPriority, max: Math.max(tasks.total, 1) }
  ]);

  renderBarChart("productivity-chart", [
    { label: "Tasks %", val: Math.round(taskPct), max: 100 },
    { label: "Water %", val: Math.round(waterPctVal), max: 100 },
    { label: "Focus %", val: Math.round(focusPctVal), max: 100 },
    { label: "Overall %", val: overall, max: 100 }
  ]);
}

function setVal(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderBarChart(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = items.map(item => {
    const heightPct = Math.min(100, Math.max(10, Math.round((item.val / item.max) * 100)));
    return `
      <div class="bar-column">
        <span class="bar-value">${item.val}${containerId === 'productivity-chart' ? '%' : ''}</span>
        <div class="bar-fill" style="height: ${heightPct}%;"></div>
        <span class="bar-label">${item.label}</span>
      </div>
    `;
  }).join("");
}
