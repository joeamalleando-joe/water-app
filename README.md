# LifeLens – Smart Daily Life Dashboard
> **“Plan your day. Track your progress. Improve yourself.”**

---

## 1. Project Title
**LifeLens – Smart Daily Life Dashboard**  
An MCA Student Academic Project for Master of Computer Applications (MCA).

---

## 2. Abstract
**LifeLens** is a comprehensive student daily productivity management system designed to combine task management, main daily objectives, emotional mood tracking, hydration intake monitoring, Pomodoro-style focus timing, and real-time productivity analytics into a unified personal dashboard. Built using pure HTML5, CSS3, Vanilla JavaScript (ES6+), and powered by Firebase Authentication and Firebase Cloud Firestore as a serverless backend and database.

---

## 3. Problem Statement
Traditional productivity tools are often fragmented. Students are required to switch between separate applications for task management, habit tracking, timer countdowns, and daily logging. Generic To-Do list applications lack integrated metrics such as focus time, daily goal completion, and mood correlation, making it difficult for students to evaluate their overall daily progress.

---

## 4. Objectives
- Provide a single integrated platform for daily student management.
- Enforce user data isolation using Firebase Authentication UIDs.
- Implement full Firestore Database CRUD (Create, Read, Update, Delete) operations.
- Calculate dynamic composite progress scores based on tasks, goal completion, water intake, and focus sessions.
- Provide responsive design suitable for mobile, tablet, and desktop devices without requiring heavy modern frameworks like React or Angular.

---

## 5. Existing System vs Proposed System

| Feature | Existing System (Traditional To-Do Apps) | Proposed System (LifeLens) |
| :--- | :--- | :--- |
| **Scope** | Plain task check-off list | Combined Tasks + Goal + Mood + Water + Focus Timer + Analytics |
| **Authentication** | Local storage or basic sessions | Secure Firebase Authentication with UID isolation |
| **Database** | Static JSON / Local Storage | Cloud Firestore NoSQL Database with security rules |
| **Metrics** | Task count only | Composite daily completion percentage algorithm |
| **Analytics** | None or primitive | Visual bar charts and metric statistics |

---

## 6. Advantages of LifeLens
- **All-in-One Productivity**: Eliminates tool switching for students.
- **Serverless Backend**: Zero server maintenance required using Firebase backend-as-a-service.
- **Data Security**: Strict Firestore Security Rules ensuring users can only read/write their own records.
- **Pure Web Standards**: Built with pure HTML5, CSS3, and Vanilla JS ES6 modules—lightweight and fast.

---

## 7. Modules Overview
1. **Authentication Module**: Login, Registration, Password Toggle, Password Reset, Auth Guards.
2. **Dashboard Module**: Welcome greeting, Today's Goal, Task summary, Mood widget, Water intake widget, Focus timer status, Daily progress bar.
3. **Task Management Module**: Full Firestore CRUD with title, description, category, priority, due date, status, live search, and filters.
4. **Daily Goal Module**: Daily focus objective setup, completion toggle, and historical records.
5. **Mood Tracker Module**: Interactive daily mood selection journal with history log.
6. **Water Intake Tracker Module**: Hydration counter (+ / - / Reset) with visual fill animation and 8-glass daily target.
7. **Focus Timer Module**: Pomodoro timer with 25/45/60 min presets, circular SVG progress ring, Web Audio chime, and Firestore session logging.
8. **Productivity Analytics Module**: Statistical counters and CSS-based dynamic bar charts.
9. **User Profile Module**: Displays full name, email, join date, with Firestore profile updating.

---

## 8. Technologies Used
- **Frontend**: HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6 Modules).
- **Backend & Database**: Firebase JS SDK v10 (Firebase Authentication & Cloud Firestore).
- **Design & Typography**: Outfit & Plus Jakarta Sans Google Fonts, Glassmorphism UI, Responsive media queries.

---

## 9. System Architecture & Database Structure

```
                      +-----------------------------+
                      |       Client Browser        |
                      | (HTML5 + Vanilla JS ES6)    |
                      +--------------+--------------+
                                     |
                         Firebase JS SDK (v10)
                                     |
               +---------------------+---------------------+
               |                                           |
    +----------v----------+                     +----------v----------+
    | Firebase Auth       |                     | Cloud Firestore DB  |
    | (Email/Password)    |                     | (NoSQL Collections) |
    +---------------------+                     +---------------------+
```

### Firestore Collections Schema

```text
users/{userUID}
 ├── userId (string)
 ├── name (string)
 ├── email (string)
 └── createdAt (timestamp)

tasks/{taskID}
 ├── userId (string)
 ├── title (string)
 ├── description (string)
 ├── category (string: Study | Personal | Project | Work | Other)
 ├── priority (string: Low | Medium | High)
 ├── dueDate (string YYYY-MM-DD)
 ├── status (string: Pending | Completed)
 └── createdAt (timestamp)

goals/{goalID}
 ├── userId (string)
 ├── title (string)
 ├── completed (boolean)
 ├── date (string YYYY-MM-DD)
 └── createdAt (timestamp)

moods/{moodID}
 ├── userId (string)
 ├── mood (string)
 ├── date (string YYYY-MM-DD)
 └── createdAt (timestamp)

water/{waterID}
 ├── userId (string)
 ├── glasses (number)
 ├── target (number: default 8)
 ├── date (string YYYY-MM-DD)
 └── updatedAt (timestamp)

focusSessions/{sessionID}
 ├── userId (string)
 ├── duration (number)
 ├── date (string YYYY-MM-DD)
 └── completedAt (timestamp)
```

---

## 10. Step-by-Step Firebase Project Setup Instructions

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"** or **"Create a project"**.
3. Enter Project Name: `LifeLens-Project` and click **Continue**.
4. Disable Google Analytics (optional for this project) and click **Create Project**.

### Step 2: Register Web App
1. In your Firebase project dashboard, click the **Web icon (`</>`)** to add an app.
2. App nickname: `LifeLens Web App`.
3. Click **Register app**.

### Step 3: Copy Firebase Configuration
1. Copy the `firebaseConfig` object provided by Firebase:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "lifelens-app.firebaseapp.com",
     projectId: "lifelens-app",
     storageBucket: "lifelens-app.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```
2. Open `js/firebase-config.js` in your project folder.
3. Replace the placeholder string values with your actual config details.

### Step 4: Enable Email/Password Authentication
1. In the Firebase left menu, click **Build > Authentication**.
2. Click **Get Started**.
3. Under Sign-in method, select **Email/Password**.
4. Enable **Email/Password** and click **Save**.

### Step 5: Enable Cloud Firestore Database
1. In the left menu, click **Build > Firestore Database**.
2. Click **Create database**.
3. Select Database location (e.g. `nam5 (us-central)` or nearest region).
4. Select **Start in test mode** for setup (or production mode with security rules).

---

## 11. Cloud Firestore Security Rules

Navigate to **Firestore Database > Rules** tab and publish the following rules to restrict each user to access **only their own UID data**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profile document rule
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Tasks collection security rule
    match /tasks/{taskId} {
      allow read, write, update, delete: if request.auth != null && request.auth.uid == resource.data.userId || request.auth.uid == request.resource.data.userId;
    }

    // Goals collection security rule
    match /goals/{goalId} {
      allow read, write, update, delete: if request.auth != null && (resource == null || resource.data.userId == request.auth.uid) && request.resource.data.userId == request.auth.uid;
    }

    // Moods collection security rule
    match /moods/{moodId} {
      allow read, write, update: if request.auth != null && (resource == null || resource.data.userId == request.auth.uid) && request.resource.data.userId == request.auth.uid;
    }

    // Water collection security rule
    match /water/{waterId} {
      allow read, write, update: if request.auth != null && (resource == null || resource.data.userId == request.auth.uid) && request.resource.data.userId == request.auth.uid;
    }

    // Focus Sessions collection security rule
    match /focusSessions/{sessionId} {
      allow read, create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 12. How to Run the Application
Since LifeLens uses native ES6 JavaScript Modules (`import`/`export`), it should be served via a standard web server:

### Option A: VS Code Live Server (Recommended)
1. Open the `LifeLens` directory in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and choose **"Open with Live Server"**.

### Option B: Node.js `npx serve`
```bash
npx serve .
```
Then open `http://localhost:3000` in your web browser.

### Option C: Python HTTP Server
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.

---

## 13. Comprehensive MCA Viva Questions & Answers

### Q1: Why did you choose Firebase instead of a traditional Node.js/Express + MongoDB backend?
**Answer:** Firebase provides a serverless Backend-as-a-Service (BaaS) architecture. It offers built-in Authentication, Cloud Firestore real-time NoSQL database, and robust client-side security rules. This reduces backend boilerplate and allows us to focus on data model integrity, client performance, and security.

### Q2: How does user data security work in LifeLens?
**Answer:** Data security is enforced at two levels:
1. **Client-side Filter**: All Firestore queries filter collections by `where("userId", "==", currentUser.uid)`.
2. **Server-side Firestore Security Rules**: Cloud Firestore security rules validate `request.auth.uid == resource.data.userId`. Even if someone attempts to craft a raw API request, Firestore rejects unauthorized access.

### Q3: What is the purpose of ES6 Modules (`type="module"`) in this application?
**Answer:** ES6 modules allow modular, readable code without requiring bundlers like Webpack or Vite. Each module (e.g., `tasks.js`, `goals.js`, `water.js`) encapsulates its own state and imports shared instances from `firebase-config.js` and utilities from `common.js`.

### Q4: How is the Daily Progress percentage calculated on the Dashboard?
**Answer:** The daily progress is a weighted composite score:
`Overall Score = (Task Completion % * 40%) + (Goal Completion * 20%) + (Water Intake % * 20%) + (Focus Sessions % * 20%)`.

### Q5: How do CRUD operations work for tasks in Cloud Firestore?
**Answer:**
- **Create**: Uses `addDoc(collection(db, "tasks"), taskData)`.
- **Read**: Uses `getDocs(query(collection(db, "tasks"), where("userId", "==", uid)))`.
- **Update**: Uses `updateDoc(doc(db, "tasks", taskId), updatedFields)`.
- **Delete**: Uses `deleteDoc(doc(db, "tasks", taskId))`.

---

## 14. Conclusion
**LifeLens** successfully achieves its objective of providing students with an integrated, secure, professional, and full-featured daily productivity system. By combining tasks, goals, mood, water tracking, focus timer, and analytics under a unified Firebase-backed web application, it serves as an exemplary MCA academic project.
