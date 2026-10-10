// ==========================================================================
// LifeLens - User Profile Module
// ==========================================================================

import { auth, db, isConfigured, doc, updateDoc, updateProfile } from "./firebase-config.js";
import { initAuthGuard, setupLayout, showToast } from "./common.js";

let currentProfile = null;

document.addEventListener("DOMContentLoaded", () => {
  initAuthGuard((userProfile) => {
    currentProfile = userProfile;
    setupLayout("profile", userProfile);

    renderProfileData();
    initProfileForm();
  });
});

function renderProfileData() {
  if (!currentProfile) return;

  const nameEl = document.getElementById("profile-display-name");
  const emailEl = document.getElementById("profile-display-email");
  const avatarEl = document.getElementById("profile-avatar-large");
  const joinedEl = document.getElementById("profile-joined-date");

  const inputName = document.getElementById("profile-name-input");
  const inputEmail = document.getElementById("profile-email-input");

  const fullName = currentProfile.name || currentProfile.displayName || "User";

  if (nameEl) nameEl.textContent = fullName;
  if (emailEl) emailEl.textContent = currentProfile.email || "No email";
  if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();

  if (inputName) inputName.value = fullName;
  if (inputEmail) inputEmail.value = currentProfile.email || "";

  if (joinedEl) {
    if (currentProfile.createdAt && currentProfile.createdAt.seconds) {
      const date = new Date(currentProfile.createdAt.seconds * 1000);
      joinedEl.textContent = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } else {
      joinedEl.textContent = "Recently Joined";
    }
  }
}

function initProfileForm() {
  const form = document.getElementById("profile-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newName = document.getElementById("profile-name-input").value.trim();
    const submitBtn = form.querySelector("button[type='submit']");

    if (!newName) {
      showToast("Full name cannot be empty.", "error");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Updating...";
    }

    if (isConfigured && auth.currentUser) {
      try {
        // 1. Update Firebase Auth Profile
        await updateProfile(auth.currentUser, { displayName: newName });

        // 2. Update Firestore Doc
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, { name: newName });

        currentProfile.name = newName;
        currentProfile.displayName = newName;

        showToast("Profile updated successfully! ✨", "success");
        renderProfileData();
        setupLayout("profile", currentProfile);
      } catch (err) {
        console.error("Error updating profile:", err);
        showToast("Error updating profile: " + err.message, "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Changes";
        }
      }
    } else {
      currentProfile.name = newName;
      showToast("Profile name updated (Demo).", "success");
      renderProfileData();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Changes";
      }
    }
  });
}
