# Book Identifier AI 📖✨

**Your personal AI-powered librarian.**

This application helps you quickly and easily digitize your physical book collection. Just show it your books, and it will create a neat, organized list for you, stored right in your browser or synced to the cloud.

---

### What Does This App Do?

This tool is designed to be a simple, three-step solution for cataloging your books:

1.  **Identify Your Books with AI:** Take a picture of your bookshelf or a stack of books, and the app's AI will identify each book, pulling out details like the title, author, publication year, and genre.
2.  **Upload Existing Lists:** If you already have your books in a spreadsheet (`.csv`) or a text file (`.txt`), you can upload it directly to add it to your digital library.
3.  **Manage Your Digital Library:** Save your book collections to your browser's local storage (default) or sync them to a Supabase project for cloud access. You can browse individual collections, see all books in one list, and edit your entries.

---

### How It Works: A Simple Guide

The app is organized into three simple steps, which you can access from the main navigation menu.

#### Step 1: Get Set Up (Settings)

This is the first and most important step. You need to configure the application before you can use its features.

*   **Gemini API Key (Required):** The app uses the Google Gemini AI to identify books from images. You must provide your own Gemini API key to enable this functionality. You can get a key from Google AI Studio. Your key is stored securely in your browser's local storage.

*   **Supabase for Cloud Storage (Optional):** If you want to store your library in the cloud and access it from multiple devices, you can enter your Supabase project credentials.
    *   **How it works:** If you provide a Supabase URL and Key, the app will automatically use Supabase Storage for your library. If you leave these fields blank, it will default to using your browser's secure local storage.
    *   **Setup:** You'll need a Supabase project with a storage bucket named `library`.

#### Step 2: Add Your Books

This is where the magic happens. You have a few options to add books:

*   **Use Your Camera:** Click the "Use Your Camera" button to take a live photo of your books.
*   **Upload a Photo:** Use a picture you already have saved on your device.
*   **Upload a File:** Directly upload a `.csv` or `.txt` file containing a list of your books.

Once you've uploaded something, the app will process it and show you a clean table of the results. From there, you can save it to your library (either local or cloud, depending on your settings).

#### Step 3: See Your Library

This is where you can view all your saved collections. The app will clearly indicate whether you're viewing your **Local** or **Cloud (Supabase)** library.

*   **Browse Collections:** See a list of all the individual collections you've saved. Click on any collection to see its contents.
*   **View All Books:** Click the "View All" button to combine every book from all your collections into a single, master list.
*   **Manage:** You can easily edit book details, add new books manually, or delete old collections you no longer need.

---

### Technical Deep Dive for Developers

This section outlines the technical architecture, data flow, and key implementation details of the application.

#### **1. Core Technologies**

*   **Frontend Framework:** [React](https://reactjs.org/) (using functional components and hooks)
*   **Language:** [TypeScript](https://www.typescriptlang.org/) for type safety
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (loaded via CDN for simplicity)
*   **AI Model:** Google Gemini (`gemini-2.5-flash`) via the `@google/genai` SDK
*   **Data Storage (Dual Mode):**
    *   **Local Storage:** Browser's `localStorage` API for default, client-side persistence.
    *   **Cloud Storage (Optional):** [Supabase](https://supabase.io/) Storage for cloud-based persistence of book collections as CSV files.

#### **2. Application Architecture**

The application is a client-side Single Page Application (SPA) that conditionally routes data operations based on user configuration.

*   **`App.tsx`**: The root component. It manages the global application state, including the current view (`AppView`) and the user's settings (`AppSettings`). It reads all settings (including optional Supabase keys) from `localStorage` on startup and passes them down to child components.

*   **Conditional Logic**: The core of the dual-storage system lies within the `ResultsDisplay.tsx` and `LibraryViewer.tsx` components. They both receive the `settings` object as a prop and use a simple check (`const useSupabase = !!(settings?.supabaseUrl && settings?.supabaseKey);`) to determine which service to use for all data operations (CRUD).

#### **3. Key Components & Logic**

*   **`/components`**:
    *   **`Settings.tsx`**: A controlled form for capturing the required Gemini API key and the optional Supabase URL and Key.
    *   **`UploadView.tsx`**: A state machine that orchestrates the book addition workflow, passing the `settings` prop down to the `ResultsDisplay`.
    *   **`ResultsDisplay.tsx`**: Renders identified books. It contains the conditional logic to either save collections to `localLibraryService` or convert the data to CSV and upload it via `supabaseService`.
    *   **`LibraryViewer.tsx`**: Manages all library interactions. On mount and during operations, it checks for Supabase settings and calls the appropriate service (`localLibraryService` or `supabaseService`) for fetching, displaying, editing, and deleting collections.

*   **`/services`**:
    *   **`geminiService.ts`**: Handles all interactions with the Google Gemini API, enforcing a structured JSON output via a `responseSchema`.
    *   **`localLibraryService.ts`**: An abstraction layer over the browser's `localStorage`. It provides a simple API to manage book collections as JSON objects.
    *   **`supabaseService.ts`**: Manages all interactions with the Supabase Storage API. It handles uploading/downloading CSV files, listing files (collections), and deleting them. It uses a module-level cache for the Supabase client to avoid unnecessary re-initializations.

*   **`/utils`**:
    *   **`csvHelper.ts`**: Contains pure functions for data manipulation, including a robust `parseCSV` function and a `convertToCSV` function, which are essential for the Supabase storage mechanism.

#### **4. Data Flow Example: Save to Supabase**

1.  **Capture & Identify**: Same as the local storage flow, `geminiService` returns a `Book[]` array to `ResultsDisplay`.
2.  **Save Action**: User clicks "Save to Library". `ResultsDisplay`'s logic detects that Supabase credentials are provided in the `settings` prop.
3.  **Check for Existing (if applicable)**: If adding to an existing collection, it first calls `supabaseService.downloadFileContent` to get the current CSV. It then uses `csvHelper.parseCSV` to turn it into a `Book[]` array, `csvHelper.mergeBooks` to de-duplicate, and proceeds to the next step.
4.  **Convert to CSV**: The final `Book[]` array is passed to `csvHelper.convertToCSV` to generate a CSV string.
5.  **Upload**: `ResultsDisplay` calls `supabaseService.uploadCsvToSupabase` with the CSV string and the desired filename (e.g., `My-Sci-Fi-Books.csv`).
6.  **Upsert**: The service uses Supabase's `upsert: true` option to create the file if it's new or overwrite it if it exists.
