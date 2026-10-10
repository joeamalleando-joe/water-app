// ==========================================================================
// LifeLens - Interactive Water Tracker Module
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
let todayWaterDocId = null;
let currentGlasses = 0;
const DAILY_TARGET = 8;

document.addEventListener("DOMContentLoaded", () => {
  initAuthGuard(async (userProfile) => {
    currentUserId = userProfile.uid;
    setupLayout("water", userProfile);

    initWaterControls();
    await fetchTodayWater();
  });
});

function initWaterControls() {
  const plusBtn = document.getElementById("water-plus-btn");
  const minusBtn = document.getElementById("water-minus-btn");
  const resetBtn = document.getElementById("water-reset-btn");

  if (plusBtn) plusBtn.onclick = () => updateWaterCount(1);
  if (minusBtn) minusBtn.onclick = () => updateWaterCount(-1);
  if (resetBtn) resetBtn.onclick = () => updateWaterCount(-currentGlasses);
}

async function fetchTodayWater() {
  const todayStr = getTodayDateString();

  if (isConfigured) {
    try {
      const q = query(
        collection(db, "water"), 
        where("userId", "==", currentUserId), 
        where("date", "==", todayStr)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        todayWaterDocId = snapshot.docs[0].id;
        currentGlasses = snapshot.docs[0].data().glasses || 0;
      } else {
        currentGlasses = 0;
        todayWaterDocId = null;
      }
    } catch (err) {
      console.error("Error fetching water data:", err);
      showToast("Could not load water tracking data.", "error");
    }
  } else {
    currentGlasses = 5; // Demo initial count
  }

  renderWaterUI();
}

function renderWaterUI() {
  const countEl = document.getElementById("water-count-display");
  const pctEl = document.getElementById("water-pct-display");
  const fillEl = document.getElementById("water-bar-fill");
  const glassIconsContainer = document.getElementById("water-glasses-icons");

  if (countEl) {
    countEl.textContent = `${currentGlasses} / ${DAILY_TARGET}`;
  }

  const pct = Math.round(Math.min(100, (currentGlasses / DAILY_TARGET) * 100));

  if (pctEl) {
    pctEl.textContent = `${pct}% of daily target reached`;
  }

  if (fillEl) {
    fillEl.style.width = `${pct}%`;
  }

  if (glassIconsContainer) {
    let iconsHtml = "";
    for (let i = 1; i <= DAILY_TARGET; i++) {
      if (i <= currentGlasses) {
        iconsHtml += `<span style="font-size: 2rem; filter: drop-shadow(0 0 8px rgba(6,182,212,0.6));">🥛</span>`;
      } else {
        iconsHtml += `<span style="font-size: 2rem; opacity: 0.25; filter: grayscale(100%);">🥛</span>`;
      }
    }
    glassIconsContainer.innerHTML = iconsHtml;
  }
}

async function updateWaterCount(delta) {
  const newCount = Math.max(0, currentGlasses + delta);
  if (newCount === currentGlasses && delta < 0) return;

  currentGlasses = newCount;
  renderWaterUI();

  const todayStr = getTodayDateString();

  if (isConfigured) {
    try {
      if (todayWaterDocId) {
        await updateDoc(doc(db, "water", todayWaterDocId), {
          glasses: currentGlasses,
          updatedAt: serverTimestamp()
        });
      } else {
        const docRef = await addDoc(collection(db, "water"), {
          userId: currentUserId,
          glasses: currentGlasses,
          target: DAILY_TARGET,
          date: todayStr,
          updatedAt: serverTimestamp()
        });
        todayWaterDocId = docRef.id;
      }
      showToast(`Water intake updated: ${currentGlasses} glasses 💧`, "success");
    } catch (err) {
      showToast("Error updating water count: " + err.message, "error");
    }
  } else {
    showToast(`Water intake updated: ${currentGlasses} glasses (Demo) 💧`, "success");
  }
}
