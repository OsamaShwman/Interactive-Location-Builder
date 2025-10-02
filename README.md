# Map Admin: Interactive Location Builder

**Map Admin** is an intuitive, client-side web application for creating and managing interactive, media-rich map locations. Ideal for building custom tours, educational guides, or personal travel logs, this tool allows you to visually pinpoint locations, enrich them with content and quizzes, and export your work—all from within your browser.

<!-- It's a good practice to add a screenshot of the app here -->

---

## ✨ Features

- **📍 Interactive Map Interface:** Click anywhere on the world map to add a new location pin.
- **📝 Rich Content Creation:** Add titles, rich-text descriptions (using Quill.js), and URLs for images, videos, and audio.
- **🤖 AI-Powered Content:** Instantly generate captivating location descriptions using the Google Gemini API.
- **❓ Engaging Quizzes:** Attach multiple-choice, true/false, or short-answer questions to any location to create interactive experiences.
- **↔️ Drag & Drop Reordering:** Easily organize your list of locations by dragging and dropping them into your desired order.
- **💾 Data Portability:** Export your entire collection of locations to a JSON file for backup or sharing, and import them back anytime.
- **🌐 Multilingual Support:** The interface is available in both English and Arabic, with a seamless language switcher.
- **🚀 Guided Tour:** A step-by-step interactive tour to get new users acquainted with the features quickly.
- **🔒 Client-Side Storage:** All your data is securely stored locally in your browser's `localStorage`. No server required.

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript
- **Mapping:** Leaflet.js & React-Leaflet
- **Styling:** Tailwind CSS
- **Rich Text Editor:** Quill.js
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Drag & Drop:** `@dnd-kit`

---

## 🚀 Getting Started

This application is designed to run entirely in the browser.

### Prerequisites

You need a Google Gemini API key to use the "Generate Description" feature.

### Running the App

1.  **Set up the API Key:**
    The application expects the Google Gemini API key to be available as an environment variable (`process.env.API_KEY`). When deploying or running in a development environment that supports it, make sure this variable is set.

2.  **Serve the files:**
    Since the app uses ES modules, you need to serve the files from a local web server. You cannot open `index.html` directly from the file system. A simple way to do this is using `npx`:

    ```bash
    # Navigate to the project's root directory in your terminal
    npx serve
    ```
    This will start a local server, and you can access the application by navigating to the provided URL (e.g., `http://localhost:3000`).

---

## 🗺️ How It Works

1.  **Search & Navigate:** Use the search bar to find a place or manually pan/zoom the map.
2.  **Select a Point:** Click on the map where you want to add a location. The coordinates and country will be automatically detected.
3.  **Add Details:** Fill in the form on the left. Give your location a title, a description (or generate one with AI!), and links to media.
4.  **Create a Quiz:** Optionally, add questions to make the location more interactive.
5.  **Save Location:** Click "Add Location to Map". Your new pin will appear on the map and in the "Created Locations" list.
6.  **Manage:**
    - Click a location in the list to view it on the map.
    - Drag locations to reorder the path.
    - Use the options menu on a location to **Edit** or **Delete** it.
7.  **Import/Export:** Use the buttons at the bottom to save your work to a JSON file or to load a previously saved file.
