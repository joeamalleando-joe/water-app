// ==========================================================================
// LifeLens - Interactive Mood Tracker Module
// ==========================================================================

import { 
  db, 
  isConfigured, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "./firebase-config.js";
import { initAuthGuard, setupLayout, getTodayDateString, showToast } from "./common.js";

let currentUserId = null;
let todayMoodDocId = null;
let moodHistory = [];

const MOOD_OPTIONS = [
  { mood: "😊 Happy", label: "Happy", icon: "😊" },
  { mood: "😎 Excited", label: "Excited", icon: "😎" },
  { mood: "😐 Normal", label: "Normal", icon: "😐" },
  { mood: "😔 Sad", label: "Sad", icon: "😔" },
  { mood: "😡 Angry", label: "Angry", icon: "😡" },
  { mood: "😴 Tired", label: "Tired", icon: "😴" }
];

document.addEventListener("DOMContentLoaded", () => {
  initAuthGuard(async (userProfile) => {
    currentUserId = userProfile.uid;
    setupLayout("mood", userProfile);

    initMoodGrid();
    await fetchMoodData();
  });
});

function initMoodGrid() {
  const grid = document.getElementById("mood-selector-grid");
  if (!grid) return;

  grid.innerHTML = MOOD_OPTIONS.map(m => `
    <button class="mood-btn" data-mood="${m.mood}">
      <span class="emoji">${m.icon}</span>
      <span class="label">${m.label}</span>
    </button>
  `).join("");

  grid.querySelectorAll(".mood-btn").forEach(btn => {
    btn.addEventListener("click", () => handleMoodSelect(btn.dataset.mood));
  });
}

async function fetchMoodData() {
  const todayStr = getTodayDateString();

  if (isConfigured) {
    try {
      const q = query(collection(db, "moods"), where("userId", "==", currentUserId));
      const snapshot = await getDocs(q);
      moodHistory = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.date === todayStr) {
          todayMoodDocId = docSnap.id;
        }
        moodHistory.push({ id: docSnap.id, ...data });
      });
      // Sort history descending by date
      moodHistory.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    } catch (err) {
      console.error("Error fetching mood history:", err);
      showToast("Could not fetch mood data.", "error");
    }
  } else {
    moodHistory = [
      { id: "m1", date: todayStr, mood: "😊 Happy" },
      { id: "m2", date: "2026-10-06", mood: "😎 Excited" },
      { id: "m3", date: "2026-10-05", mood: "😐 Normal" },
      { id: "m4", date: "2026-10-04", mood: "😴 Tired" }
    ];
    todayMoodDocId = "m1";
  }

  // Highlight today's mood if selected
  const todayMoodObj = moodHistory.find(m => m.date === todayStr);
  if (todayMoodObj) {
    highlightSelectedMood(todayMoodObj.mood);
  }

  renderMoodHistory();
}

function highlightSelectedMood(selectedMood) {
  const grid = document.getElementById("mood-selector-grid");
  if (!grid) return;

  grid.querySelectorAll(".mood-btn").forEach(btn => {
    if (btn.dataset.mood === selectedMood) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });

  const displayEl = document.getElementById("current-mood-status");
  if (displayEl) {
    displayEl.textContent = `Today's logged mood: ${selectedMood}`;
  }
}

async function handleMoodSelect(selectedMood) {
  const todayStr = getTodayDateString();
  highlightSelectedMood(selectedMood);

  if (isConfigured) {
    try {
      if (todayMoodDocId) {
        await updateDoc(doc(db, "moods", todayMoodDocId), { mood: selectedMood });
        showToast("Updated today's mood! " + selectedMood, "success");
      } else {
        const docRef = await addDoc(collection(db, "moods"), {
          userId: currentUserId,
          mood: selectedMood,
          date: todayStr,
          createdAt: serverTimestamp()
        });
        todayMoodDocId = docRef.id;
        showToast("Logged today's mood! " + selectedMood, "success");
      }
      await fetchMoodData();
    } catch (err) {
      showToast("Error saving mood: " + err.message, "error");
    }
  } else {
    const existing = moodHistory.find(m => m.date === todayStr);
    if (existing) {
      existing.mood = selectedMood;
    } else {
      moodHistory.unshift({ id: Date.now().toString(), date: todayStr, mood: selectedMood });
    }
    showToast("Logged today's mood! " + selectedMood + " (Demo)", "success");
    renderMoodHistory();
  }
}

function renderMoodHistory() {
  const listEl = document.getElementById("mood-history-list");
  if (!listEl) return;

  if (moodHistory.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😊</div>
        <h4>No mood logs yet</h4>
        <p>Select how you feel today above to start your mood journal.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = moodHistory.map(item => `
    <div class="mood-history-item">
      <div>
        <strong style="color: var(--text-main); font-size: 1rem;">${formatDateReadable(item.date)}</strong>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${item.date}</div>
      </div>
      <span style="font-size: 1.5rem; font-weight: 600;">${item.mood}</span>
    </div>
  `).join("");
}

function formatDateReadable(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }
  return dateStr;
}
