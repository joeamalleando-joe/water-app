// ==========================================================================
// LifeLens - Shared Utilities & Layout Helpers
// ==========================================================================

import { auth, db, isConfigured, onAuthStateChanged, signOut, doc, getDoc } from "./firebase-config.js";

// Display Config Warning if credentials aren't provided yet
export function checkFirebaseSetup() {
  if (!isConfigured) {
    const banner = document.createElement("div");
    banner.style.cssText = `
      background: #f59e0b;
      color: #0f172a;
      padding: 0.85rem 1.25rem;
      font-weight: 600;
      text-align: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 0.9rem;
    `;
    banner.innerHTML = `
      ⚠️ <strong>Firebase Credentials Required:</strong> Please replace placeholder values in <code>js/firebase-config.js</code> with your real Firebase Project details. See <code>README.md</code> for setup instructions.
    `;
    document.body.prepend(banner);
  }
}

// Authentication Guard for Protected Dashboard Pages
export function initAuthGuard(onUserAuthenticated) {
  checkFirebaseSetup();

  if (!isConfigured) {
    // If not configured, we still allow UI preview for testing demo fallback
    if (onUserAuthenticated) {
      onUserAuthenticated({ uid: "demo-user-id", displayName: "MCA Student Demo", email: "student@example.com" });
    }
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    const isAuthPage = window.location.pathname.endsWith("login.html") || 
                       window.location.pathname.endsWith("register.html") ||
                       window.location.pathname.endsWith("index.html");

    if (user) {
      if (isAuthPage && !window.location.pathname.endsWith("index.html")) {
        window.location.href = "dashboard.html";
        return;
      }
      
      // Fetch user profile from Firestore if needed
      let userProfile = { uid: user.uid, displayName: user.displayName || "User", email: user.email };
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          userProfile = { ...userProfile, ...userDoc.data() };
        }
      } catch (e) {
        console.warn("Could not fetch user profile details:", e);
      }

      if (onUserAuthenticated) {
        onUserAuthenticated(userProfile);
      }
    } else {
      if (!isAuthPage) {
        window.location.href = "login.html";
      }
    }
  });
}

// Toast Notification System
export function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  const iconMap = {
    success: "✅",
    error: "❌",
    info: "ℹ️"
  };

  toast.innerHTML = `
    <span>${iconMap[type] || "ℹ️"}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Sidebar Mobile Toggle & Shared Header Logic
export function setupLayout(activePageNavId, userProfile) {
  // Mobile Hamburger Menu Toggle
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const sidebar = document.getElementById("sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });

    // Close sidebar on click outside mobile
    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 1024 && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    });
  }

  // Active Nav Item Highlight
  if (activePageNavId) {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
      if (item.dataset.page === activePageNavId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  // User Profile Header Info Update
  if (userProfile) {
    const headerUserName = document.getElementById("header-user-name");
    const avatarCircle = document.getElementById("header-avatar");
    const nameStr = userProfile.name || userProfile.displayName || "User";

    if (headerUserName) {
      headerUserName.textContent = getGreeting() + `, ${nameStr} 👋`;
    }

    if (avatarCircle) {
      avatarCircle.textContent = nameStr.charAt(0).toUpperCase();
    }
  }

  // Header Current Date Badge
  const dateBadge = document.getElementById("header-current-date");
  if (dateBadge) {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    dateBadge.textContent = now.toLocaleDateString('en-US', options);
  }

  // Shared Logout Button Listener
  const logoutBtns = document.querySelectorAll(".btn-logout-trigger");
  logoutBtns.forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        if (isConfigured && auth) {
          await signOut(auth);
        }
        showToast("Logged out successfully.", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 500);
      } catch (err) {
        showToast("Error signing out: " + err.message, "error");
      }
    });
  });
}

// Time-based Greeting Helper
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// Confirmation Modal Dialog Helper
export function showConfirmModal(title, message, onConfirm) {
  let backdrop = document.getElementById("confirm-modal-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "confirm-modal-backdrop";
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3 id="confirm-modal-title">Confirm Action</h3>
          <button class="modal-close" id="confirm-modal-close">&times;</button>
        </div>
        <p id="confirm-modal-msg" style="color: var(--text-muted); margin-bottom: 1.5rem;"></p>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-modal-ok">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
  }

  const titleEl = backdrop.querySelector("#confirm-modal-title");
  const msgEl = backdrop.querySelector("#confirm-modal-msg");
  const cancelBtn = backdrop.querySelector("#confirm-modal-cancel");
  const closeBtn = backdrop.querySelector("#confirm-modal-close");
  const okBtn = backdrop.querySelector("#confirm-modal-ok");

  titleEl.textContent = title;
  msgEl.textContent = message;

  const hide = () => backdrop.classList.remove("active");

  cancelBtn.onclick = hide;
  closeBtn.onclick = hide;
  
  okBtn.onclick = () => {
    hide();
    if (onConfirm) onConfirm();
  };

  backdrop.classList.add("active");
}

// Today's Date String YYYY-MM-DD for Querying
export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
