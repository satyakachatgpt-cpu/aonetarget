# Agent Context: Aone Target (part30)

This file contains a high-level overview of the **Aone Target** project to assist in navigating and modifying the codebase.

## 🚀 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Zustand (State), Vanilla CSS |
| **Backend** | Node.js, Express, MongoDB (Mongoose) |
| **API** | RESTful, JWT-based Authentication |
| **Media** | YouTube Embedded, Zoom/Meeting Links, PDF Viewer |

---

## 📂 Key Directory Structure

### 💻 Client (`/client/src`)
- **`components/`**: 
  - `admin/`: Management UI like `CourseContentManager.tsx`, `LiveSessions.tsx`.
  - `student/`: Student-facing components like `LiveClassesCalendar.tsx`.
  - `shared/`: Generic UI elements.
- **`screens/`**: Principal routes like `Home.tsx`, `LiveClasses.tsx`, `CourseDetails.tsx`.
- **`store/`**: Zustand stores (`authStore.ts`, `uiStore.ts`).
- **`services/`**: API interaction layer (`apiClient.ts`).
- **`lib/` & `utils/`**: Helper functions (e.g., `getEmbedUrl`).

### ⚙️ Server (`/server`)
- **`server.js`**: Main entry point containing core route handling and middleware (Note: Very large file).
- **`routes/`**: API path definitions (admin-specific routes in `routes/admin/`).
- **`controllers/`**: Logic for handling API requests.
- **`models/`**: Mongoose schemas (`Course.js`, `Student.js`, `Video.js`, etc.).
- **`utils/`**: Shared backend helpers.

---

## 🛠️ Data Model & Classification

### Content Types
- **Videos**: Standard recorded videos.
- **Live Streams**: `contentType: 'live_stream'` or `type: 'live'`.
- **Notes/PDFs**: Supporting documents.
- **Tests**: Mock exams and quizzes.

### Status Decoupling
- **Visibility (`status`)**: `active` (Enabled) or `inactive` (Disabled). Controls if students see the item.
- **Lifecycle (`streamStatus`)**: `upcoming` -> `live` -> `ended`. Controls stream state.

---

## ⚠️ Important Implementation Notes
1. **Manual Start Enforcement**: Live streams do **not** auto-promote based on time. Admin must explicitly trigger the "Start Live Stream" action.
2. **Batch Content**: Live streams stored in the `videos` collection must have their `contentType` correctly set to avoid falling back to generic video rendering.
3. **UI Aesthetics**: The project prioritizes premium, rich visuals with modern CSS gradients and glassmorphism.
