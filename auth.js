// ==========================================================================
// LifeLens - Authentication Logic (Login, Register, Password Reset)
// ==========================================================================

import { 
  auth, 
  db, 
  isConfigured, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "./firebase-config.js";
import { showToast, checkFirebaseSetup } from "./common.js";

document.addEventListener("DOMContentLoaded", () => {
  checkFirebaseSetup();

  // Password Toggle Buttons
  const togglePassBtns = document.querySelectorAll(".password-toggle-btn");
  togglePassBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === "password") {
          input.type = "text";
          btn.textContent = "👁️";
        } else {
          input.type = "password";
          btn.textContent = "👁️‍🗨️";
        }
      }
    });
  });

  // Login Form Submission
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      const alertBox = document.getElementById("auth-alert");
      const submitBtn = loginForm.querySelector("button[type='submit']");

      if (!email || !password) {
        showAuthError("Please fill in all fields.", alertBox);
        return;
      }

      if (!isConfigured) {
        showToast("Firebase placeholders active. Redirecting to demo dashboard...", "info");
        setTimeout(() => window.location.href = "dashboard.html", 1000);
        return;
      }

      setButtonLoading(submitBtn, true, "Logging in...");
      hideAuthAlert(alertBox);

      try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Login successful! Welcome back.", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } catch (err) {
        console.error("Login error:", err);
        showAuthError(getFirebaseErrorMessage(err.code || err.message), alertBox);
      } finally {
        setButtonLoading(submitBtn, false, "Login");
      }
    });
  }

  // Registration Form Submission
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("register-name").value.trim();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;
      const confirmPassword = document.getElementById("register-confirm-password").value;
      const alertBox = document.getElementById("auth-alert");
      const submitBtn = registerForm.querySelector("button[type='submit']");

      if (!fullName || !email || !password || !confirmPassword) {
        showAuthError("All fields are required.", alertBox);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAuthError("Please enter a valid email address.", alertBox);
        return;
      }

      if (password.length < 6) {
        showAuthError("Password must be at least 6 characters long.", alertBox);
        return;
      }

      if (password !== confirmPassword) {
        showAuthError("Passwords do not match.", alertBox);
        return;
      }

      if (!isConfigured) {
        showToast("Firebase placeholders active. Redirecting to demo dashboard...", "info");
        setTimeout(() => window.location.href = "dashboard.html", 1000);
        return;
      }

      setButtonLoading(submitBtn, true, "Creating Account...");
      hideAuthAlert(alertBox);

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store User Profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          userId: user.uid,
          name: fullName,
          email: email,
          createdAt: serverTimestamp()
        });

        showToast("Registration successful! Welcome to LifeLens.", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } catch (err) {
        console.error("Registration error:", err);
        showAuthError(getFirebaseErrorMessage(err.code || err.message), alertBox);
      } finally {
        setButtonLoading(submitBtn, false, "Register Account");
      }
    });
  }

  // Forgot Password Modal / Trigger
  const forgotPassBtn = document.getElementById("forgot-password-link");
  if (forgotPassBtn) {
    forgotPassBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email") ? document.getElementById("login-email").value.trim() : "";
      
      const userEmail = prompt("Enter your email address to reset password:", email);
      if (!userEmail) return;

      if (!isConfigured) {
        showToast("Firebase not configured. Please set your credentials in js/firebase-config.js.", "info");
        return;
      }

      try {
        await sendPasswordResetEmail(auth, userEmail);
        showToast("Password reset email sent! Check your inbox.", "success");
      } catch (err) {
        showToast(getFirebaseErrorMessage(err.code || err.message), "error");
      }
    });
  }
});

// UI Helper Functions
function showAuthError(msg, alertBox) {
  if (alertBox) {
    alertBox.textContent = msg;
    alertBox.className = "auth-alert auth-alert-danger show";
  } else {
    showToast(msg, "error");
  }
}

function hideAuthAlert(alertBox) {
  if (alertBox) {
    alertBox.className = "auth-alert";
  }
}

function setButtonLoading(btn, isLoading, defaultText) {
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> ${defaultText}`;
  } else {
    btn.disabled = false;
    btn.textContent = defaultText;
  }
}

function getFirebaseErrorMessage(code) {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address format.";
    case "auth/user-disabled":
      return "This user account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists.";
    case "auth/weak-password":
      return "Password is too weak. Please use a stronger password.";
    default:
      return code.replace("auth/", "").replace(/-/g, " ") || "An authentication error occurred.";
  }
}
