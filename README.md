# Book Identifier AI 📖✨

**Your personal AI-powered librarian.**

This application helps you quickly and easily digitize your physical book collection. Just show it your books, and it will create a neat, organized list for you.

---

### What Does This App Do?

This tool is designed to be a simple, three-step solution for cataloging your books:

1.  **Identify Your Books with AI:** Take a picture of your bookshelf or a stack of books, and the app's AI will identify each book, pulling out details like the title, author, publication year, and genre.
2.  **Upload Existing Lists:** If you already have your books in a spreadsheet (`.csv`) or a text file (`.txt`), you can upload it directly to add it to your digital library.
3.  **Manage Your Digital Library:** Save your book collections and view them anytime. The app saves to your browser by default, or you can connect it to the cloud for backup and multi-device access.

---

### How It Works: A Simple Guide

The app is organized into three simple steps, which you can access from the main navigation menu.

#### Step 1: Get Set Up (Settings)

This is the first and most important step. You need to configure the application before you can use its features.

*   **Gemini API Key (Required):** The app uses the Google Gemini AI to identify books from images. You must provide your own Gemini API key to enable this functionality. You can get a key from Google AI Studio.
*   **Supabase Keys (Optional):** If you want to save your book collections to the cloud for backup or access across multiple devices, you can provide keys to a service called Supabase.
    *   **If you don't provide these keys, the app works perfectly!** It will automatically save your library to your browser's local storage. Just be aware that clearing your browser's data will also clear your library.

#### Step 2: Add Your Books

This is where the magic happens. You have a few options to add books:

*   **Use Your Camera:** Click the "Use Your Camera" button to take a live photo of your books.
*   **Upload a Photo:** Use a picture you already have saved on your device.
*   **Upload a File:** Directly upload a `.csv` or `.txt` file containing a list of your books.

Once you've uploaded something, the app will process it and show you a clean table of the results. From there, you can download the list or save it to your library.

#### Step 3: See Your Library

This is where you can view all your saved collections, whether they are stored locally in your browser or in the cloud with Supabase.

*   **Browse Collections:** See a list of all the individual files you've saved. Click on any file to see its contents, make edits, or add/remove books.
*   **View All Books:** Click the "View All" button to combine every book from all your files into a single, master list. This is perfect for getting a complete overview of your entire collection.
*   **Manage:** You can easily delete old collections you no longer need.

---

### Technical Deep Dive for Developers

This section outlines the technical architecture, data flow, and key implementation details of the application.

#### **1. Core Technologies**

*   **Frontend Framework:** [React](https://reactjs.org/) (using functional components and hooks)
*   **Language:** [TypeScript](https://www.typescriptlang.org/) for type safety
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (loaded via CDN for simplicity)
*   **AI Model:** Google Gemini (`gemini-2.5-flash`) via the `@google/genai` SDK
*   **Local Storage:** Browser `localStorage` API for default, offline-first data persistence.
*   **Cloud Storage (Optional):** [Supabase Storage](https://supabase.com/storage) via the `@supabase/supabase-js` SDK

#### **2. Application Architecture**

The application is a client-side Single Page Application (SPA) built around a component-based architecture.

*   **`App.tsx`**: The root component. It manages the global application state, including the current view (`AppView`) and the user's settings (`AppSettings`). It reads settings from `localStorage` on startup and passes them down to child components via props. It acts as a simple router, rendering the correct view (`Settings`, `UploadView`, or `LibraryViewer`) based on the current state.

*   **`types.ts`**: A central file that defines all major data structures (`Book`, `AppSettings`) and enums (`UploadState`), ensuring type consistency across the application.

*   **State Management**: State is managed locally within components using `useState`, `useEffect`, and `useCallback` hooks. There is no global state manager like Redux or Zustand; state is passed down through props or managed in the component where it's most relevant.

#### **3. Key Components & Logic**

*   **`/components`**:
    *   **`Settings.tsx`**: A controlled form for capturing the user's Gemini API key and optional Supabase credentials. On save, it updates `localStorage`, which triggers a state update in the root `App.tsx` component.
    *   **`UploadView.tsx`**: Acts as a state machine for the entire book addition workflow. It manages the `UploadState` enum (`IDLE`, `TAKING_PICTURE`, `PROCESSING`, `RESULTS`, `ERROR`) and renders the appropriate child component for each state.
    *   **`FileUploader.tsx`**: Provides the UI for file input, including drag-and-drop functionality and a button to activate the camera view.
    *   **`CameraCapture.tsx`**: Interfaces with the browser's MediaDevices API (`navigator.mediaDevices.getUserMedia`) to stream video. It captures a frame onto a `<canvas>` element, converts it to a JPEG data URL, and then transforms it into a `File` object for processing.
    *   **`ResultsDisplay.tsx`**: Renders the identified `Book[]` array in a table. It handles the logic for downloading the data as a CSV and orchestrates the UI for saving the collection to either the local library or Supabase, depending on the user's settings.
    *   **`LibraryViewer.tsx`**: Manages all interactions with the user's library. It intelligently determines whether to use the local storage service or the Supabase service based on the provided settings. It handles fetching, displaying, deleting, and editing collections from either data source.

*   **`/services`**:
    *   **`geminiService.ts`**: This is the heart of the AI functionality. The `identifyBooksFromImage` function enforces a structured JSON output from the Gemini API by providing a strict `responseSchema`. This ensures a predictable JSON array of book objects, eliminating fragile text parsing on the client side.
    *   **`supabaseService.ts`**: This module abstracts all interactions with Supabase Storage. It provides CRUD operations for files within the `library` bucket for users who opt-in to cloud storage.
    *   **`localLibraryService.ts`**: This module encapsulates all CRUD operations for the book library using the browser's `localStorage`. It provides an interface (`save`, `list`, `download`, `delete`) that mirrors the `supabaseService`, allowing components to interact with it seamlessly.

*   **`/utils`**:
    *   **`csvHelper.ts`**: Contains pure functions for data manipulation, including robust CSV parsing (`parseCSV`), conversion to a CSV string (`convertToCSV`), and de-duplication logic (`mergeBooks`).

#### **4. Data Flow Example: Image to Library**

1.  **Capture**: User uploads an image via `FileUploader.tsx`. The `File` object is passed to `UploadView.tsx`.
2.  **Processing**: `UploadView` sets its state to `PROCESSING`, reads the `File` as a base64 string.
3.  **AI Interaction**: The base64 string and API key are sent to `geminiService.identifyBooksFromImage`.
4.  **Structured Response**: The service gets a structured JSON response from the Gemini API.
5.  **State Update**: The JSON is parsed into a `Book[]` array and returned to `UploadView`, which transitions to the `RESULTS` state.
6.  **Display**: `ResultsDisplay.tsx` receives the `Book[]` array and renders the data table.
7.  **Save to Library**: User clicks "Save to Library".
    a. `ResultsDisplay` shows the save UI.
    b. On confirmation, it calls `convertToCSV` to serialize the `Book[]` data.
    c. The resulting CSV string is passed to either `localLibraryService.saveCollectionToLocal` or `supabaseService.uploadCsvToSupabase`, depending on the user's configuration.
    d. The service saves the file in the browser's `localStorage` or uploads it to the Supabase Storage bucket.
