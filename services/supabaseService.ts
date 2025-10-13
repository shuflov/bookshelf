
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Module-level cache for the Supabase client
let supabaseInstance: SupabaseClient | null = null;
let lastSupabaseUrl: string | null = null;
let lastSupabaseKey: string | null = null;

/**
 * Gets a Supabase client instance.
 * It creates a new instance if the URL or key has changed, otherwise returns the cached instance.
 * This function includes a "warm-up" call to ensure the client is properly connected before use.
 */
const getSupabaseClient = async (supabaseUrl: string, supabaseKey: string): Promise<SupabaseClient> => {
  // Return cached instance if credentials match
  if (supabaseInstance && lastSupabaseUrl === supabaseUrl && lastSupabaseKey === supabaseKey) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key not provided.");
  }

  // Credentials have changed or client doesn't exist, create a new one.
  const newInstance = createClient(supabaseUrl, supabaseKey);

  // "Warm-up" the client by trying to list files from the 'library' bucket.
  // This is a more relevant test than listBuckets() and is more likely to succeed with an anon key.
  const { error } = await newInstance.storage.from('library').list('', { limit: 1 });

  if (error) {
    // If the warm-up call fails, the credentials are likely wrong or the bucket is misconfigured.
    // Clear the cache variables so we try to re-initialize next time.
    lastSupabaseUrl = null;
    lastSupabaseKey = null;
    supabaseInstance = null;
    if (error.message.includes("Bucket not found")) {
        throw new Error(`Supabase connection failed: Storage bucket "library" not found. Please ensure it exists.`);
    }
    throw new Error(`Supabase connection failed: ${error.message}. Please check your Supabase URL and Key in Settings.`);
  }

  // Connection is good, cache the instance for subsequent calls.
  lastSupabaseUrl = supabaseUrl;
  lastSupabaseKey = supabaseKey;
  supabaseInstance = newInstance;
  return supabaseInstance;
};

/**
 * A dedicated function to test the Supabase connection from the Settings UI.
 * Returns a user-friendly status object.
 */
export const testSupabaseConnection = async (supabaseUrl: string, supabaseKey: string): Promise<{ success: boolean; message: string; }> => {
    if (!supabaseUrl || !supabaseKey) {
        return { success: false, message: "Please provide both Supabase URL and Anon Key." };
    }
    try {
        const testClient = createClient(supabaseUrl, supabaseKey);
        // Attempt to list files in the required bucket to verify credentials and bucket existence.
        const { error } = await testClient.storage.from('library').list('', { limit: 1 });

        if (error) {
            if (error.message.includes("Bucket not found")) {
                throw new Error(`The storage bucket "library" was not found in your Supabase project. Please ensure it exists.`);
            }
            throw new Error(error.message);
        }
        return { success: true, message: "Connection successful! Your cloud library is ready." };
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown connection error occurred.";
        return { success: false, message: `Connection failed: ${message}` };
    }
};


export const uploadCsvToSupabase = async (csvData: string, fileName: string, supabaseUrl: string, supabaseKey: string): Promise<void> => {
  const supabase = await getSupabaseClient(supabaseUrl, supabaseKey);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const bucketName = 'library';

  // Use upsert to create the file if it doesn't exist, or overwrite it if it does.
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, blob, {
        upsert: true,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    if (error.message.includes("Bucket not found")) {
        throw new Error(`Storage bucket "${bucketName}" not found in your Supabase project.`);
    }
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  console.log("Supabase upload successful:", data);
};


export const listFilesFromLibrary = async (supabaseUrl: string, supabaseKey: string) => {
    const supabase = await getSupabaseClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.storage.from('library').list('', {
        sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
        console.error("Error listing files:", error);
        throw new Error(`Could not list files from Supabase: ${error.message}`);
    }
    return data;
};

export const downloadFileContent = async (fileName: string, supabaseUrl: string, supabaseKey: string) => {
    const supabase = await getSupabaseClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.storage.from('library').download(fileName);
    if (error) {
        console.error("Error downloading file:", error);
        throw new Error(`Could not download file: ${error.message}`);
    }
    return data.text();
};


export const deleteFileFromLibrary = async (fileName: string, supabaseUrl: string, supabaseKey: string) => {
    const supabase = await getSupabaseClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.storage.from('library').remove([fileName]);
    if (error) {
        console.error("Error deleting file:", error);
        throw new Error(`Could not delete file: ${error.message}`);
    }
};
