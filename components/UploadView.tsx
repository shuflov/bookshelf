
import React, { useState, useCallback } from 'react';
import { Book, UploadState, AppSettings } from '../types';
import { identifyBooksFromImage } from '../services/geminiService';
import { parseCSV } from '../utils/csvHelper';
import FileUploader from './FileUploader';
import ResultsDisplay from './ResultsDisplay';
import Spinner from './Spinner';
import ErrorDisplay from './ErrorDisplay';
import CameraCapture from './CameraCapture';

interface UploadViewProps {
    settings: AppSettings;
}

const UploadView: React.FC<UploadViewProps> = ({ settings }) => {
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.IDLE);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedCollection, setLastSavedCollection] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!settings.apiKey) {
      setError("Gemini API Key is not configured. Please add it in the Settings page.");
      setUploadState(UploadState.ERROR);
      return;
    }
    
    setUploadState(UploadState.PROCESSING);
    setError(null);
    setBooks([]);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = (reader.result as string).split(',')[1];
      setUploadedImage(reader.result as string);

      try {
        const identifiedBooks = await identifyBooksFromImage(base64Image, file.type, settings.apiKey!);
        if (identifiedBooks && identifiedBooks.length > 0) {
          setBooks(identifiedBooks);
          setUploadState(UploadState.RESULTS);
        } else {
          setError("No books could be identified in the image. Please try another one.");
          setUploadState(UploadState.ERROR);
        }
      } catch (err) {
        console.error("Error identifying books:", err);
        setError(err instanceof Error ? err.message : "An error occurred while analyzing the image. Please try again.");
        setUploadState(UploadState.ERROR);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the uploaded image file.");
      setUploadState(UploadState.ERROR);
    };
  }, [settings.apiKey]);
  
  const handleTextFileUpload = useCallback(async (file: File) => {
    setUploadState(UploadState.PROCESSING);
    setError(null);
    setBooks([]);
    setUploadedImage(null);

    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
        try {
            const content = reader.result as string;
            const parsedBooks = parseCSV(content);
             if (parsedBooks && parsedBooks.length > 0) {
                setBooks(parsedBooks);
                setUploadState(UploadState.RESULTS);
            } else {
                setError("Could not parse any books from the file. Please check the format.");
                setUploadState(UploadState.ERROR);
            }
        } catch (err) {
            console.error("Error parsing file:", err);
            setError("An error occurred while parsing the file.");
            setUploadState(UploadState.ERROR);
        }
    };
    reader.onerror = () => {
      setError("Failed to read the uploaded text file.");
      setUploadState(UploadState.ERROR);
    };
  }, []);

  const handleFileUpload = (file: File) => {
    const fileType = file.type;
    if (fileType.startsWith('image/')) {
        handleImageUpload(file);
    } else if (fileType === 'text/csv' || fileType === 'text/plain' || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        handleTextFileUpload(file);
    } else {
        setError(`Unsupported file type: ${fileType}. Please upload an image, CSV, or TXT file.`);
        setUploadState(UploadState.ERROR);
    }
  };

  const handleReset = () => {
    setUploadState(UploadState.IDLE);
    setUploadedImage(null);
    setBooks([]);
    setError(null);
  };

  const handleTakePhotoClick = () => {
    setUploadState(UploadState.TAKING_PICTURE);
  };

  switch (uploadState) {
    case UploadState.IDLE:
      return <FileUploader onFileUpload={handleFileUpload} onTakePhotoClick={handleTakePhotoClick} />;
    case UploadState.TAKING_PICTURE:
      return <CameraCapture onCapture={handleImageUpload} onCancel={handleReset} />;
    case UploadState.PROCESSING:
      return <Spinner message="Processing your file..." />;
    case UploadState.RESULTS:
      return <ResultsDisplay
                imageSrc={uploadedImage}
                books={books}
                onReset={handleReset}
                settings={settings}
                lastSavedCollection={lastSavedCollection}
                onSaveSuccess={setLastSavedCollection}
             />;
    case UploadState.ERROR:
      return <ErrorDisplay message={error || "An unknown error occurred."} onReset={handleReset} />;
    default:
      return null;
  }
};

export default UploadView;
