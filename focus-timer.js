// ==========================================================================
// LifeLens - Focus/Pomodoro Timer Module
// ==========================================================================

import { 
  db, 
  isConfigured, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from "./firebase-config.js";
import { initAuthGuard, setupLayout, getTodayDateString, showToast } from "./common.js";

let currentUserId = null;
let selectedDurationMinutes = 25;
let secondsRemaining = 25 * 60;
let timerInterval = null;
let isRunning = false;
let todaySessionsCount = 0;

const CIRCLE_RADIUS = 110;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~691

document.addEventListener("DOMContentLoaded", () => {
  initAuthGuard(async (userProfile) => {
    currentUserId = userProfile.uid;
    setupLayout("focus", userProfile);

    initTimerControls();
    await fetchTodayFocusSessions();
  });
});

function initTimerControls() {
  // Preset Duration Buttons
  document.querySelectorAll(".timer-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (isRunning) {
        showToast("Please pause or reset timer before changing preset duration.", "info");
        return;
      }
      document.querySelectorAll(".timer-preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      selectedDurationMinutes = parseInt(btn.dataset.duration, 10);
      resetTimer();
    });
  });

  // Start Button
  const startBtn = document.getElementById("timer-start-btn");
  if (startBtn) startBtn.onclick = startTimer;

  // Pause Button
  const pauseBtn = document.getElementById("timer-pause-btn");
  if (pauseBtn) pauseBtn.onclick = pauseTimer;

  // Reset Button
  const resetBtn = document.getElementById("timer-reset-btn");
  if (resetBtn) resetBtn.onclick = resetTimer;
}

async function fetchTodayFocusSessions() {
  const todayStr = getTodayDateString();

  if (isConfigured) {
    try {
      const q = query(
        collection(db, "focusSessions"), 
        where("userId", "==", currentUserId), 
        where("date", "==", todayStr)
      );
      const snapshot = await getDocs(q);
      todaySessionsCount = snapshot.size;
    } catch (err) {
      console.error("Error fetching focus sessions:", err);
    }
  } else {
    todaySessionsCount = 3; // Demo initial count
  }

  updateSessionCounterUI();
}

function updateSessionCounterUI() {
  const counterEl = document.getElementById("today-focus-counter");
  if (counterEl) {
    counterEl.textContent = todaySessionsCount;
  }
}

function startTimer() {
  if (isRunning) return;

  isRunning = true;
  updateTimerButtonsUI();

  timerInterval = setInterval(() => {
    secondsRemaining--;
    renderTimerDisplay();

    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      onTimerCompleted();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  clearInterval(timerInterval);
  isRunning = false;
  updateTimerButtonsUI();
  showToast("Timer paused.", "info");
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  secondsRemaining = selectedDurationMinutes * 60;
  renderTimerDisplay();
  updateTimerButtonsUI();
}

function renderTimerDisplay() {
  const displayEl = document.getElementById("timer-display");
  const circleEl = document.getElementById("timer-ring-progress");

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (displayEl) {
    displayEl.textContent = timeStr;
  }

  // Update browser tab title during active countdown
  if (isRunning) {
    document.title = `(${timeStr}) Focus Timer - LifeLens`;
  } else {
    document.title = "Focus Timer - LifeLens";
  }

  // Update SVG Ring Progress
  if (circleEl) {
    const totalSeconds = selectedDurationMinutes * 60;
    const progressFraction = secondsRemaining / totalSeconds;
    const offset = CIRCLE_CIRCUMFERENCE - (progressFraction * CIRCLE_CIRCUMFERENCE);
    circleEl.style.strokeDashoffset = offset;
  }
}

function updateTimerButtonsUI() {
  const startBtn = document.getElementById("timer-start-btn");
  const pauseBtn = document.getElementById("timer-pause-btn");

  if (startBtn) startBtn.style.display = isRunning ? "none" : "inline-flex";
  if (pauseBtn) pauseBtn.style.display = isRunning ? "inline-flex" : "none";
}

async function onTimerCompleted() {
  updateTimerButtonsUI();
  playNotificationSound();

  showToast(`🎉 Focus Session Completed! (${selectedDurationMinutes} mins)`, "success");

  todaySessionsCount++;
  updateSessionCounterUI();

  const todayStr = getTodayDateString();

  if (isConfigured) {
    try {
      await addDoc(collection(db, "focusSessions"), {
        userId: currentUserId,
        duration: selectedDurationMinutes,
        date: todayStr,
        completedAt: serverTimestamp()
      });
      showToast("Session recorded in Firestore.", "info");
    } catch (err) {
      console.error("Error saving focus session:", err);
    }
  }

  resetTimer();
}

// Simple Web Audio API Synthesizer Chime for Completion Sound
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log("Audio alert blocked by browser autoplay policy.");
  }
}
