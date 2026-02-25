# Software Requirements Specification (SRS) - BMI Tracker WebApp

## 1. Introduction
This document outlines the requirements for VitalTrack, a web application designed to track Body Mass Index (BMI) daily. The app provides users with precision BMI calculations, historical trend visualization, and a premium interactive experience.

## 2. General Description
### 2.1 Product Perspective
VitalTrack is a standalone web application featuring a modern React frontend and a robust SQLite-backed Node.js/Express server.

### 2.2 User Persona
The application is designed for health-conscious individuals who want a premium, easy-to-use tool for monitoring weight trends.
*   **Attributes:** Visual feedback, daily engagement, mobile-responsive design.
*   **Persona Profile:** Height (cm), Weight (kg), Age, Gender, Activity Level.

## 3. Product Features
### 3.1 Authentication
*   **Google Login:** Secure authentication using Google OAuth 2.0.
*   **Guest Mode:** Allows users to try the application immediately. Each guest session uses a unique generated ID and email to ensure data persistence without account creation conflicts.

### 3.2 Navigation & UI
*   **Universal Home Navigation:** A "Home" icon and clickable application logo are available on every page for quick dashboard access.
*   **Contextual Back Navigation:** Profile settings include a "Back" button to return to the dashboard without requiring a save.
*   **Premium Interactive Notifications:** Powered by `SweetAlert2`, providing themed error alerts, success toasts, and confirmation dialogs that match the application's clean aesthetic.

### 3.3 User Profile (Persona)
*   **Persona Setup:** Dynamic form to capture user metrics (Height, Age, Gender, Activity Level).
*   **Profile Management:** Capability to update persona details at any time with real-time BMI recalculation for historical logs.

### 3.4 Daily BMI Tracking
*   **Weight Logging:** Simple entry modal for recording daily weight in kilograms.
*   **Automated BMI Calculation:** `BMI = Weight(kg) / [Height(m)]²`.
*   **Log Management:** View, edit (via re-logging same date), and delete historical weight entries.

### 3.5 Trends & Visualization
*   **Trend Analysis Chart:** Area chart displaying BMI trends over the last 30 days.
*   **Interpretive Thresholds:** Visualization includes reference lines for:
    *   Underweight (< 18.5)
    *   Normal Weight (18.5 – 24.9)
    *   Overweight (25.0 – 29.9)
    *   Obesity (≥ 30.0)

## 4. Technical Stack
*   **Frontend:** React (Vite), Tailwind CSS, Motion (Framer), Recharts, Lucide Icons.
*   **Backend:** Node.js (Express), `tsx` for TypeScript execution.
*   **Database:** SQLite (`better-sqlite3`) for local, efficient data storage.
*   **Alerts:** SweetAlert2.
*   **Date Handling:** date-fns.

## 5. Non-Functional Requirements
*   **Aesthetics:** High-quality, minimalist design with smooth transitions and micro-animations.
*   **Reliability:** Robust guest session handling to prevent data collisions.
*   **Performance:** Fast page transitions and responsive chart rendering.
