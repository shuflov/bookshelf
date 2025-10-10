
import { FileObject as SupabaseFileObject } from '@supabase/storage-js';

export interface Book {
  title: string;
  author: string;
  publicationYear: number | string;
  genre: string;
  description: string;
}

export interface GeminiBookResponse {
    title: string;
    author: string;
    publicationYear: number | string;
    genre: string;
    description: string;
}

export enum UploadState {
  IDLE,
  TAKING_PICTURE,
  PROCESSING,
  RESULTS,
  ERROR,
}

export interface AppSettings {
  apiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export type AppView = 'settings' | 'upload' | 'library';

export type LibraryFile = Pick<SupabaseFileObject, 'id' | 'name'>;
