import { GoogleGenAI, Type } from "@google/genai";
import { Book, GeminiBookResponse } from '../types';

const bookSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
        type: Type.STRING,
        description: "The full title of the book."
    },
    author: { 
        type: Type.STRING,
        description: "The full name of the author."
    },
    publicationYear: {
      type: Type.STRING,
      description: "The year the book was first published."
    },
    genre: { 
        type: Type.STRING,
        description: "The primary literary genre of the book."
    },
    description: { 
        type: Type.STRING,
        description: "A concise, one-sentence description of the book's content or plot."
    }
  },
  required: ['title', 'author', 'publicationYear', 'genre', 'description']
};

export const identifyBooksFromImage = async (apiKey: string, base64Image: string, mimeType: string): Promise<Book[]> => {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please add it in the settings.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-2.5-flash';
  
  const textPart = {
    text: `
      Analyze the provided image of books. For each distinct book visible, identify its details according to the provided JSON schema. 
      If any piece of information cannot be determined from the image, use the string "Unknown".
    `
  };

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: bookSchema
        }
      }
    });

    const jsonText = response.text.trim();
    const parsedResponse = JSON.parse(jsonText) as GeminiBookResponse[];

    const books: Book[] = parsedResponse.map(book => ({
      title: book.title,
      author: book.author,
      publicationYear: book.publicationYear,
      genre: book.genre,
      description: book.description
    }));
    
    return books;

  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Failed to get a valid response from the AI model. Please check if your Gemini API key is correct and has been entered in the settings.");
  }
};
