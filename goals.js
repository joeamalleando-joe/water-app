// ==========================================================================
// LifeLens - Daily Goal Module (Firestore CRUD)
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
  deleteDoc, 
  serverTimestamp 
} from "./firebase-config.js";
import { initAuthGuard, setupLayout, getTodayDateString, showToast, showConfirmModal } from "./common.js";

let currentUserId = null;
let goalsList = [];

document.addEventListener("DOMContentLoaded", () => {
  initAuthGuard(async (userProfile) => {
    currentUserId = userProfile.uid;
    setupLayout("goals", userProfile);

    initGoalEventListeners();
    await fetchGoals();
  });
});

async function fetchGoals() {
  const container = document.getElementById("goals-history-container");
  const todayContainer = document.getElementById("today-goal-card");
  if (!container) return;

  const todayStr = getTodayDateString();

  if (isConfigured) {
    try {
      const q = query(collection(db, "goals"), where("userId", "==", currentUserId));
      const snapshot = await getDocs(q);
      goalsList = [];
      snapshot.forEach(docSnap => {
        goalsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by date descending
      goalsList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch (err) {
      console.error("Error fetching goals:", err);
      showToast("Could not load goals from Firestore.", "error");
    }
  } else {
    if (goalsList.length === 0) {
      goalsList = [
        { id: "g1", userId: currentUserId, title: "Complete MCA JavaScript Assignment", completed: false, date: todayStr },
        { id: "g2", userId: currentUserId, title: "Study Database Normalization Concepts", completed: true, date: "2026-10-06" }
      ];
    }
  }

  // Find today's goal
  const todayGoal = goalsList.find(g => g.date === todayStr);

  renderTodayGoalCard(todayGoal, todayContainer);
  renderGoalHistory(goalsList, container);
}

function renderTodayGoalCard(todayGoal, container) {
  if (!container) return;

  if (todayGoal) {
    container.innerHTML = `
      <div class="card goal-card-active">
        <span class="badge badge-medium">Today's Main Focus 🎯</span>
        <h2 class="goal-title-display ${todayGoal.completed ? 'completed-text' : ''}" style="${todayGoal.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">
          "${escapeHtml(todayGoal.title)}"
        </h2>
        <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
          <button class="btn ${todayGoal.completed ? 'btn-secondary' : 'btn-success'}" id="today-goal-toggle-btn">
            ${todayGoal.completed ? 'Completed ✅' : '✓ Mark Completed'}
          </button>
          <button class="btn btn-secondary" id="today-goal-edit-btn">✏️ Edit</button>
          <button class="btn btn-danger btn-icon" id="today-goal-delete-btn" title="Delete Goal">🗑️</button>
        </div>
      </div>
    `;

    document.getElementById("today-goal-toggle-btn").onclick = () => toggleGoalStatus(todayGoal.id);
    document.getElementById("today-goal-edit-btn").onclick = () => openGoalModal(todayGoal.id);
    document.getElementById("today-goal-delete-btn").onclick = () => confirmDeleteGoal(todayGoal.id);
  } else {
    container.innerHTML = `
      <div class="card goal-card-active">
        <span class="badge badge-medium">Today's Main Focus 🎯</span>
        <h2 class="goal-title-display" style="color: var(--text-muted);">
          No primary goal set for today!
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Set one clear priority objective to guide your day's work.</p>
        <button class="btn btn-primary" id="today-set-goal-btn">+ Set Today's Goal</button>
      </div>
    `;

    document.getElementById("today-set-goal-btn").onclick = () => openGoalModal(null);
  }
}

function renderGoalHistory(goals, container) {
  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <h4>No Goal History</h4>
        <p>Start setting daily objectives to build consistency.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = goals.map(goal => `
    <div class="card" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">📅 ${goal.date}</div>
        <h4 style="font-size: 1.1rem; ${goal.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
          ${escapeHtml(goal.title)}
        </h4>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <span class="badge ${goal.completed ? 'badge-completed' : 'badge-pending'}">
          ${goal.completed ? 'Completed' : 'Pending'}
        </span>
        <button class="btn btn-secondary btn-icon edit-goal-btn" data-id="${goal.id}">✏️</button>
        <button class="btn btn-secondary btn-icon delete-goal-btn" data-id="${goal.id}">🗑️</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".edit-goal-btn").forEach(btn => {
    btn.onclick = () => openGoalModal(btn.dataset.id);
  });

  container.querySelectorAll(".delete-goal-btn").forEach(btn => {
    btn.onclick = () => confirmDeleteGoal(btn.dataset.id);
  });
}

function initGoalEventListeners() {
  const addBtn = document.getElementById("add-goal-btn");
  if (addBtn) addBtn.onclick = () => openGoalModal(null);

  const goalForm = document.getElementById("goal-form");
  if (goalForm) goalForm.onsubmit = handleGoalFormSubmit;

  const closeBtn = document.getElementById("goal-modal-close");
  const cancelBtn = document.getElementById("goal-modal-cancel");
  if (closeBtn) closeBtn.onclick = closeGoalModal;
  if (cancelBtn) cancelBtn.onclick = closeGoalModal;
}

function openGoalModal(goalId = null) {
  const modal = document.getElementById("goal-modal-backdrop");
  const form = document.getElementById("goal-form");
  const titleEl = document.getElementById("goal-modal-title");

  if (!modal || !form) return;

  form.reset();
  document.getElementById("goal-id").value = goalId || "";
  document.getElementById("goal-date-input").value = getTodayDateString();

  if (goalId) {
    const goal = goalsList.find(g => g.id === goalId);
    if (goal) {
      titleEl.textContent = "Edit Goal";
      document.getElementById("goal-title-input").value = goal.title;
      document.getElementById("goal-date-input").value = goal.date;
    }
  } else {
    titleEl.textContent = "Set Daily Goal";
  }

  modal.classList.add("active");
}

function closeGoalModal() {
  const modal = document.getElementById("goal-modal-backdrop");
  if (modal) modal.classList.remove("active");
}

async function handleGoalFormSubmit(e) {
  e.preventDefault();

  const goalId = document.getElementById("goal-id").value;
  const title = document.getElementById("goal-title-input").value.trim();
  const date = document.getElementById("goal-date-input").value;

  if (!title) {
    showToast("Please enter a goal title.", "error");
    return;
  }

  const goalData = {
    userId: currentUserId,
    title,
    date: date || getTodayDateString(),
    completed: false
  };

  if (isConfigured) {
    try {
      if (goalId) {
        await updateDoc(doc(db, "goals", goalId), { title, date });
        showToast("Goal updated successfully.", "success");
      } else {
        goalData.createdAt = serverTimestamp();
        await addDoc(collection(db, "goals"), goalData);
        showToast("Daily Goal set successfully! 🎯", "success");
      }
      closeGoalModal();
      await fetchGoals();
    } catch (err) {
      showToast("Error saving goal: " + err.message, "error");
    }
  } else {
    if (goalId) {
      const idx = goalsList.findIndex(g => g.id === goalId);
      if (idx !== -1) goalsList[idx] = { ...goalsList[idx], title, date };
      showToast("Goal updated (Demo).", "success");
    } else {
      goalData.id = Date.now().toString();
      goalsList.unshift(goalData);
      showToast("Daily Goal set (Demo).", "success");
    }
    closeGoalModal();
    fetchGoals();
  }
}

async function toggleGoalStatus(goalId) {
  const goal = goalsList.find(g => g.id === goalId);
  if (!goal) return;

  const newCompleted = !goal.completed;

  if (isConfigured) {
    try {
      await updateDoc(doc(db, "goals", goalId), { completed: newCompleted });
      showToast(newCompleted ? "Goal completed! 🎉" : "Goal marked incomplete.", "success");
      await fetchGoals();
    } catch (err) {
      showToast("Error updating goal status: " + err.message, "error");
    }
  } else {
    goal.completed = newCompleted;
    showToast(newCompleted ? "Goal completed! (Demo)" : "Goal marked incomplete (Demo).", "success");
    fetchGoals();
  }
}

function confirmDeleteGoal(goalId) {
  showConfirmModal(
    "Delete Goal",
    "Are you sure you want to delete this goal?",
    async () => {
      if (isConfigured) {
        try {
          await deleteDoc(doc(db, "goals", goalId));
          showToast("Goal deleted successfully.", "success");
          await fetchGoals();
        } catch (err) {
          showToast("Error deleting goal: " + err.message, "error");
        }
      } else {
        goalsList = goalsList.filter(g => g.id !== goalId);
        showToast("Goal deleted successfully.", "success");
        fetchGoals();
      }
    }
  );
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
