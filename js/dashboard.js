// ==========================================================================
// LifeLens - Main Dashboard Logic
// ==========================================================================

import { db, isConfigured, collection, query, where, getDocs, doc, updateDoc } from "./firebase-config.js";
import { initAuthGuard, setupLayout, getTodayDateString, showToast } from "./common.js";

document.addEventListener("DOMContentLoaded", () => {
  initWeatherWidget();
  initAuthGuard(async (userProfile) => {
    setupLayout("dashboard", userProfile);
    await loadDashboardMetrics(userProfile.uid);
  });
});

async function loadDashboardMetrics(userId) {
  const todayStr = getTodayDateString();

  let taskMetrics = { completed: 0, total: 0 };
  let goalData = null;
  let moodData = null;
  let waterMetrics = { glasses: 0, target: 8 };
  let focusMetrics = { count: 0 };

  if (isConfigured) {
    try {
      // 1. Fetch Tasks
      const tasksQ = query(collection(db, "tasks"), where("userId", "==", userId));
      const tasksSnapshot = await getDocs(tasksQ);
      taskMetrics.total = tasksSnapshot.size;
      tasksSnapshot.forEach(doc => {
        if (doc.data().status === "Completed") taskMetrics.completed++;
      });

      // 2. Fetch Today's Goal
      const goalsQ = query(
        collection(db, "goals"), 
        where("userId", "==", userId), 
        where("date", "==", todayStr)
      );
      const goalsSnapshot = await getDocs(goalsQ);
      if (!goalsSnapshot.empty) {
        goalData = { id: goalsSnapshot.docs[0].id, ...goalsSnapshot.docs[0].data() };
      }

      // 3. Fetch Today's Mood
      const moodQ = query(
        collection(db, "moods"), 
        where("userId", "==", userId), 
        where("date", "==", todayStr)
      );
      const moodSnapshot = await getDocs(moodQ);
      if (!moodSnapshot.empty) {
        moodData = moodSnapshot.docs[0].data();
      }

      // 4. Fetch Today's Water Record
      const waterQ = query(
        collection(db, "water"), 
        where("userId", "==", userId), 
        where("date", "==", todayStr)
      );
      const waterSnapshot = await getDocs(waterQ);
      if (!waterSnapshot.empty) {
        waterMetrics.glasses = waterSnapshot.docs[0].data().glasses || 0;
      }

      // 5. Fetch Today's Focus Sessions
      const focusQ = query(
        collection(db, "focusSessions"), 
        where("userId", "==", userId), 
        where("date", "==", todayStr)
      );
      const focusSnapshot = await getDocs(focusQ);
      focusMetrics.count = focusSnapshot.size;

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      showToast("Could not load dashboard data from Firestore.", "error");
    }
  } else {
    // Demo data for preview
    taskMetrics = { completed: 4, total: 6 };
    goalData = { id: "demo-goal", title: "Complete MCA JavaScript Project Assignment", completed: false };
    moodData = { mood: "😊 Happy" };
    waterMetrics = { glasses: 5, target: 8 };
    focusMetrics = { count: 3 };
  }

  // Render UI Widgets
  renderTodayGoal(goalData);
  renderTaskProgress(taskMetrics);
  renderMoodWidget(moodData);
  renderWaterWidget(waterMetrics);
  renderFocusWidget(focusMetrics);
  renderOverallProgress(taskMetrics, goalData, waterMetrics, focusMetrics);
}

function renderTodayGoal(goalData) {
  const goalTextEl = document.getElementById("dash-goal-text");
  const goalBtn = document.getElementById("dash-goal-btn");

  if (!goalTextEl) return;

  if (goalData) {
    goalTextEl.textContent = goalData.title;
    if (goalData.completed) {
      goalTextEl.style.textDecoration = "line-through";
      goalTextEl.style.color = "var(--text-muted)";
      if (goalBtn) {
        goalBtn.textContent = "Completed ✅";
        goalBtn.className = "btn btn-secondary";
        goalBtn.disabled = true;
      }
    } else {
      goalTextEl.style.textDecoration = "none";
      goalTextEl.style.color = "var(--text-main)";
      if (goalBtn) {
        goalBtn.textContent = "Mark Complete";
        goalBtn.className = "btn btn-success";
        goalBtn.disabled = false;
        goalBtn.onclick = async () => {
          if (isConfigured && goalData.id) {
            try {
              await updateDoc(doc(db, "goals", goalData.id), { completed: true });
              showToast("Goal completed! Great job 🎉", "success");
              window.location.reload();
            } catch (err) {
              showToast("Failed to update goal: " + err.message, "error");
            }
          } else {
            showToast("Demo goal marked complete!", "success");
            goalTextEl.style.textDecoration = "line-through";
            goalBtn.textContent = "Completed ✅";
            goalBtn.disabled = true;
          }
        };
      }
    }
  } else {
    goalTextEl.textContent = "No goal set for today yet.";
    goalTextEl.style.color = "var(--text-muted)";
    if (goalBtn) {
      goalBtn.textContent = "+ Set Goal";
      goalBtn.className = "btn btn-primary";
      goalBtn.onclick = () => window.location.href = "goals.html";
    }
  }
}

function renderTaskProgress(metrics) {
  const textEl = document.getElementById("dash-task-text");
  const fillEl = document.getElementById("dash-task-fill");

  if (textEl) {
    textEl.textContent = `${metrics.completed} / ${metrics.total} Completed`;
  }
  if (fillEl) {
    const pct = metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0;
    fillEl.style.width = `${pct}%`;
  }
}

function renderMoodWidget(moodData) {
  const moodEl = document.getElementById("dash-mood-display");
  if (moodEl) {
    moodEl.textContent = moodData ? moodData.mood : "Not Logged Today";
  }
}

function renderWaterWidget(waterMetrics) {
  const textEl = document.getElementById("dash-water-text");
  const fillEl = document.getElementById("dash-water-fill");

  if (textEl) {
    textEl.textContent = `${waterMetrics.glasses} / ${waterMetrics.target} Glasses`;
  }
  if (fillEl) {
    const pct = Math.min(100, (waterMetrics.glasses / waterMetrics.target) * 100);
    fillEl.style.width = `${pct}%`;
  }
}

function renderFocusWidget(focusMetrics) {
  const countEl = document.getElementById("dash-focus-count");
  if (countEl) {
    countEl.textContent = `${focusMetrics.count} Sessions`;
  }
}

function renderOverallProgress(taskMetrics, goalData, waterMetrics, focusMetrics) {
  // Composite percentage calculation
  const taskPct = taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0;
  const goalPct = goalData && goalData.completed ? 100 : 0;
  const waterPct = Math.min(100, (waterMetrics.glasses / waterMetrics.target) * 100);
  const focusPct = Math.min(100, (focusMetrics.count / 4) * 100); // 4 sessions target

  const overallPct = Math.round((taskPct * 0.4) + (goalPct * 0.2) + (waterPct * 0.2) + (focusPct * 0.2));

  const valEl = document.getElementById("dash-overall-val");
  const fillEl = document.getElementById("dash-overall-fill");

  if (valEl) valEl.textContent = `${overallPct}%`;
  if (fillEl) fillEl.style.width = `${overallPct}%`;
}

// ==========================================================================
// OpenWeatherMap Live Weather Widget Module
// ==========================================================================
const OPENWEATHER_API_KEY = "27b4d1e4dcc48a9438b87df5dd994b85";

function initWeatherWidget() {
  const cityEl = document.getElementById("dash-weather-city");
  const tempEl = document.getElementById("dash-weather-temp");
  const descEl = document.getElementById("dash-weather-desc");
  const iconEl = document.getElementById("dash-weather-icon");
  const humidityEl = document.getElementById("dash-weather-humidity");
  const windEl = document.getElementById("dash-weather-wind");

  if (!cityEl) return;

  const defaultCity = localStorage.getItem("lifelens_weather_city") || "London";

  cityEl.addEventListener("click", () => {
    const currentName = cityEl.textContent.split(",")[0].trim();
    const newCity = prompt("Enter a city name to view live weather:", currentName !== "Detecting..." ? currentName : "London");
    if (newCity && newCity.trim()) {
      localStorage.setItem("lifelens_weather_city", newCity.trim());
      fetchWeatherByCity(newCity.trim());
    }
  });

  if (!localStorage.getItem("lifelens_weather_city") && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        fetchWeatherByCity(defaultCity);
      },
      { timeout: 4000 }
    );
  } else {
    fetchWeatherByCity(defaultCity);
  }

  async function fetchWeatherByCity(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    await fetchWeatherData(url);
  }

  async function fetchWeatherByCoords(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    await fetchWeatherData(url);
  }

  async function fetchWeatherData(url) {
    try {
      if (descEl) descEl.textContent = "Updating...";
      const res = await fetch(url);
      if (!res.ok) throw new Error("City not found or API error");
      const data = await res.json();
      updateWeatherUI(data);
    } catch (err) {
      console.warn("Weather fetch error:", err);
      if (descEl) descEl.textContent = "Weather unavailable";
    }
  }

  function updateWeatherUI(data) {
    if (cityEl) cityEl.textContent = `${data.name}${data.sys?.country ? ', ' + data.sys.country : ''}`;
    if (tempEl && data.main) tempEl.textContent = `${Math.round(data.main.temp)}°C`;
    if (descEl && data.weather && data.weather[0]) {
      descEl.textContent = data.weather[0].description;
    }
    if (humidityEl && data.main) {
      humidityEl.textContent = `${data.main.humidity}%`;
    }
    if (windEl && data.wind) {
      windEl.textContent = `${data.wind.speed} m/s`;
    }
    if (iconEl && data.weather && data.weather[0]) {
      const iconCode = data.weather[0].icon;
      const emojiMap = {
        "01d": "☀️", "01n": "🌙",
        "02d": "⛅", "02n": "☁️",
        "03d": "☁️", "03n": "☁️",
        "04d": "☁️", "04n": "☁️",
        "09d": "🌧️", "09n": "🌧️",
        "10d": "🌦️", "10n": "🌧️",
        "11d": "⛈️", "11n": "⛈️",
        "13d": "❄️", "13n": "❄️",
        "50d": "🌫️", "50n": "🌫️"
      };
      iconEl.textContent = emojiMap[iconCode] || "🌤️";
    }
  }
}

