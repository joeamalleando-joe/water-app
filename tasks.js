// ==========================================================================
// LifeLens - Task Management Module (Full Firestore CRUD + Search & Filter)
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
import { initAuthGuard, setupLayout, showToast, showConfirmModal } from "./common.js";

let allTasks = [];
let currentUserId = null;
let activeFilter = "all";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
  initAuthGuard(async (userProfile) => {
    currentUserId = userProfile.uid;
    setupLayout("tasks", userProfile);

    initTaskEventListeners();
    await fetchTasks();
  });
});

async function fetchTasks() {
  const container = document.getElementById("tasks-container");
  if (!container) return;

  if (isConfigured) {
    try {
      container.innerHTML = `<div class="page-loader"><div class="loading-spinner"></div><p>Loading your tasks...</p></div>`;
      const q = query(collection(db, "tasks"), where("userId", "==", currentUserId));
      const querySnapshot = await getDocs(q);
      
      allTasks = [];
      querySnapshot.forEach((docSnap) => {
        allTasks.push({ id: docSnap.id, ...docSnap.data() });
      });

    } catch (err) {
      console.error("Error fetching tasks:", err);
      showToast("Failed to load tasks from Firestore.", "error");
    }
  } else {
    // Demo seed tasks if Firebase credentials not set yet
    if (allTasks.length === 0) {
      allTasks = [
        { id: "1", userId: currentUserId, title: "Complete MCA Web Architecture Assignment", description: "Design a complete responsive dashboard application using HTML5 and Vanilla JS.", category: "Study", priority: "High", dueDate: "2026-10-15", status: "Pending" },
        { id: "2", userId: currentUserId, title: "Database Systems Lab Practice", description: "Practice SQL queries and Firestore security rule write-ups.", category: "Project", priority: "Medium", dueDate: "2026-10-12", status: "Completed" },
        { id: "3", userId: currentUserId, title: "Morning Run & Hydration Check", description: "Drink 8 glasses of water and do 30 mins cardio.", category: "Personal", priority: "Low", dueDate: "2026-10-08", status: "Pending" }
      ];
    }
  }

  renderTasks();
}

function renderTasks() {
  const container = document.getElementById("tasks-container");
  if (!container) return;

  let filtered = allTasks.filter(task => {
    // Filter condition
    let matchesFilter = true;
    if (activeFilter === "pending") matchesFilter = task.status === "Pending";
    else if (activeFilter === "completed") matchesFilter = task.status === "Completed";
    else if (activeFilter === "high") matchesFilter = task.priority === "High";
    else if (activeFilter === "medium") matchesFilter = task.priority === "Medium";
    else if (activeFilter === "low") matchesFilter = task.priority === "Low";

    // Search condition
    let matchesSearch = searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.category && task.category.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-state-icon">📝</div>
        <h4>No tasks found</h4>
        <p>No tasks match your current filter or search criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(task => `
    <div class="task-card ${task.status === 'Completed' ? 'completed' : ''}" data-id="${task.id}">
      <div class="task-header">
        <span class="badge badge-${task.priority.toLowerCase()}">${task.priority} Priority</span>
        <span class="badge ${task.status === 'Completed' ? 'badge-completed' : 'badge-pending'}">${task.status}</span>
      </div>
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
      
      <div class="task-meta">
        <span>📁 ${escapeHtml(task.category || 'General')}</span>
        <span>📅 ${task.dueDate || 'No due date'}</span>
      </div>

      <div class="task-actions">
        <button class="btn btn-secondary btn-sm toggle-status-btn" data-id="${task.id}">
          ${task.status === 'Completed' ? 'Undo' : '✓ Mark Complete'}
        </button>
        <div class="task-action-btns">
          <button class="btn btn-secondary btn-icon edit-task-btn" data-id="${task.id}" title="Edit Task">✏️</button>
          <button class="btn btn-secondary btn-icon delete-task-btn" data-id="${task.id}" title="Delete Task">🗑️</button>
        </div>
      </div>
    </div>
  `).join("");

  // Attach action listeners
  container.querySelectorAll(".toggle-status-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleTaskStatus(btn.dataset.id));
  });

  container.querySelectorAll(".edit-task-btn").forEach(btn => {
    btn.addEventListener("click", () => openTaskModal(btn.dataset.id));
  });

  container.querySelectorAll(".delete-task-btn").forEach(btn => {
    btn.addEventListener("click", () => confirmDeleteTask(btn.dataset.id));
  });
}

function initTaskEventListeners() {
  // Add Task Button
  const addTaskBtn = document.getElementById("add-task-btn");
  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", () => openTaskModal(null));
  }

  // Task Modal Form Submit
  const taskForm = document.getElementById("task-form");
  if (taskForm) {
    taskForm.addEventListener("submit", handleTaskFormSubmit);
  }

  // Search Input
  const searchInput = document.getElementById("task-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderTasks();
    });
  }

  // Filter Buttons
  const filterBtns = document.querySelectorAll(".task-filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Modal Close Buttons
  const modalClose = document.getElementById("task-modal-close");
  const modalCancel = document.getElementById("task-modal-cancel");
  if (modalClose) modalClose.onclick = closeTaskModal;
  if (modalCancel) modalCancel.onclick = closeTaskModal;
}

function openTaskModal(taskId = null) {
  const modal = document.getElementById("task-modal-backdrop");
  const titleEl = document.getElementById("task-modal-title");
  const form = document.getElementById("task-form");

  if (!modal || !form) return;

  form.reset();
  document.getElementById("task-id").value = taskId || "";

  if (taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      titleEl.textContent = "Edit Task";
      document.getElementById("task-title-input").value = task.title || "";
      document.getElementById("task-desc-input").value = task.description || "";
      document.getElementById("task-category-select").value = task.category || "Study";
      document.getElementById("task-priority-select").value = task.priority || "Medium";
      document.getElementById("task-date-input").value = task.dueDate || "";
      document.getElementById("task-status-select").value = task.status || "Pending";
    }
  } else {
    titleEl.textContent = "Create New Task";
    document.getElementById("task-status-select").value = "Pending";
  }

  modal.classList.add("active");
}

function closeTaskModal() {
  const modal = document.getElementById("task-modal-backdrop");
  if (modal) modal.classList.remove("active");
}

async function handleTaskFormSubmit(e) {
  e.preventDefault();

  const taskId = document.getElementById("task-id").value;
  const title = document.getElementById("task-title-input").value.trim();
  const description = document.getElementById("task-desc-input").value.trim();
  const category = document.getElementById("task-category-select").value;
  const priority = document.getElementById("task-priority-select").value;
  const dueDate = document.getElementById("task-date-input").value;
  const status = document.getElementById("task-status-select").value;

  if (!title) {
    showToast("Please enter a task title.", "error");
    return;
  }

  const taskData = {
    userId: currentUserId,
    title,
    description,
    category,
    priority,
    dueDate,
    status
  };

  if (isConfigured) {
    try {
      if (taskId) {
        await updateDoc(doc(db, "tasks", taskId), taskData);
        showToast("Task updated successfully.", "success");
      } else {
        taskData.createdAt = serverTimestamp();
        await addDoc(collection(db, "tasks"), taskData);
        showToast("Task created successfully.", "success");
      }
      closeTaskModal();
      await fetchTasks();
    } catch (err) {
      console.error("Task save error:", err);
      showToast("Error saving task: " + err.message, "error");
    }
  } else {
    if (taskId) {
      const idx = allTasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        allTasks[idx] = { ...allTasks[idx], ...taskData };
      }
      showToast("Task updated successfully (Demo).", "success");
    } else {
      taskData.id = Date.now().toString();
      allTasks.unshift(taskData);
      showToast("Task created successfully (Demo).", "success");
    }
    closeTaskModal();
    renderTasks();
  }
}

async function toggleTaskStatus(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  const newStatus = task.status === "Completed" ? "Pending" : "Completed";

  if (isConfigured) {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
      showToast(`Task marked as ${newStatus}.`, "success");
      await fetchTasks();
    } catch (err) {
      showToast("Failed to update status: " + err.message, "error");
    }
  } else {
    task.status = newStatus;
    showToast(`Task marked as ${newStatus} (Demo).`, "success");
    renderTasks();
  }
}

function confirmDeleteTask(taskId) {
  showConfirmModal(
    "Delete Task",
    "Are you sure you want to delete this task? This action cannot be undone.",
    async () => {
      if (isConfigured) {
        try {
          await deleteDoc(doc(db, "tasks", taskId));
          showToast("Task deleted successfully.", "success");
          await fetchTasks();
        } catch (err) {
          showToast("Failed to delete task: " + err.message, "error");
        }
      } else {
        allTasks = allTasks.filter(t => t.id !== taskId);
        showToast("Task deleted successfully.", "success");
        renderTasks();
      }
    }
  );
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
