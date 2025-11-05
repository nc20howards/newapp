// This service handles all external AI API communications.
import { GoogleGenAI, Type } from "@google/genai";
import { Place, ExtractedIdData } from '../types';

// --- Client Instances ---
// FIX: Initialize Google GenAI client directly with API key from environment variables as per guidelines.
// The API key is now sourced exclusively from process.env.API_KEY.
const genAIClient = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Converts a Blob to a Base64 encoded string.
 * @param blob The Blob to convert.
 * @returns A promise that resolves to the Base64 string.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // The result includes the data URL prefix, so we need to remove it
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read blob as Base64 string."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Transcribes an audio file using the Google GenAI API (a model like Gemini can handle this).
 * @param audioFile The audio file (as a Blob) to transcribe.
 * @returns A promise that resolves to the transcribed text.
 */
export const transcribeAudioWithGoogle = async (audioBlob: Blob): Promise<string> => {
    // FIX: Removed check for genAIClient as it is now initialized at module scope.
    try {
        const base64Audio = await blobToBase64(audioBlob);
        const audioPart = {
            inlineData: {
                mimeType: audioBlob.type || 'audio/webm',
                data: base64Audio,
            },
        };
        const textPart = {
            text: "Transcribe this audio recording.",
        };
        
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash', // Gemini models can handle multimodal input
            contents: { parts: [audioPart, textPart] },
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Error transcribing audio with Google GenAI:", error);
        // FIX: Re-throw original error to provide more specific feedback to the caller.
        throw error;
    }
};

/**
 * Gets a streaming AI response from Google GenAI.
 * @param userQuery The user's query.
 * @param systemInstruction The system instruction for the AI.
 * @param onChunk Callback function to handle each chunk of the response.
 * @returns A promise that resolves to the full, concatenated AI response.
 */
export const getAIResponse = async (
    userQuery: string,
    systemInstruction: string,
    onChunk: (chunk: string) => void
): Promise<string> => {
    try {
        const responseStream = await genAIClient.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: userQuery }] },
            config: {
                systemInstruction: systemInstruction,
            },
        });

        let fullResponse = "";
        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullResponse += chunkText;
                onChunk(chunkText);
            }
        }
        return fullResponse.trim();
    } catch (error) {
        console.error("Error getting AI response from Google GenAI:", error);
        throw error;
    }
};

/**
 * Extracts structured text from an image of a UNEB pass slip using Google GenAI.
 * @param base64Image The Base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to a structured object with the extracted data.
 */
export const extractTextFromImageWithGoogle = async (base64Image: string, mimeType: string) => {
    try {
        const imagePart = {
            inlineData: {
                mimeType,
                data: base64Image,
            },
        };

        const textPart = {
            text: `
                Analyze the provided image of a Ugandan UNEB examination pass slip (either U.C.E or U.A.C.E).
                Extract the following information precisely as it appears on the slip:
                1.  yearAndLevel: The year and level of the exam (e.g., "2017 U.C.E").
                2.  studentName: The student's full name.
                3.  indexNumber: The student's full index number (e.g., UXXXX/XXX).
                4.  schoolName: The name of the school or center.
                5.  schoolAddress: The address of the school.
                6.  entryCode: The student's entry code.
                7.  dateOfBirth: The student's date of birth.
                8.  subjects: A list of all subjects and their corresponding grades.
                9.  aggregate: The total aggregate score.
                10. result: The final result summary (e.g., "FIRST GRADE").

                Return this information ONLY as a JSON object matching the specified schema. Do not include any extra text, markdown, or explanations.
            `,
        };
        
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        yearAndLevel: { type: Type.STRING },
                        studentName: { type: Type.STRING },
                        indexNumber: { type: Type.STRING },
                        schoolName: { type: Type.STRING },
                        schoolAddress: { type: Type.STRING },
                        entryCode: { type: Type.STRING },
                        dateOfBirth: { type: Type.STRING },
                        subjects: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    grade: { type: Type.STRING },
                                },
                                required: ['name', 'grade']
                            },
                        },
                        aggregate: { type: Type.STRING },
                        result: { type: Type.STRING },
                    },
                     required: [
                        'yearAndLevel',
                        'studentName',
                        'indexNumber',
                        'schoolName',
                        'schoolAddress',
                        'entryCode',
                        'dateOfBirth',
                        'subjects',
                        'aggregate',
                        'result'
                    ]
                },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error extracting text from image with Google GenAI:", error);
        throw error;
    }
};

/**
 * Translates text to a target language using Google GenAI.
 * @param text The text to translate.
 * @param targetLanguage The language to translate to (e.g., "English", "French").
 * @returns A promise that resolves to the translated text.
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    try {
        // FIX: Switched to the simpler string format for the `contents` property for single-text prompts,
        // which is the recommended approach in the SDK guidelines. This resolves a 500 error from the API.
        const prompt = `Translate the following text to ${targetLanguage}. Return only the translated text, without any additional explanations or context: "${text}"`;
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Error translating text with Google GenAI:", error);
        throw error;
    }
};

/**
 * Finds and decodes any type of barcode from an image using Google GenAI.
 * @param base64Image The Base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the barcode's raw text content, or null if not found.
 */
export const decodeBarcodeWithGoogle = async (base64Image: string, mimeType: string): Promise<string | null> => {
    try {
        const imagePart = {
            inlineData: {
                mimeType,
                data: base64Image,
            },
        };

        const textPart = {
            text: `
                Analyze the provided image for any type of scannable code (including QR codes and 1D barcodes like Code 128).
                If a code is found, decode it and return its raw, unmodified, un-summarized string content.
                
                Return a single JSON object with one key: 'content'.
                - 'content': The raw string from the code.
                
                If no code is found, return ONLY the JSON object: {"content": null}.
            `,
        };
        
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        content: { 
                            type: Type.STRING, 
                            description: "The decoded text content of the barcode or QR code. This will be null if no code is found.",
                            nullable: true 
                        },
                    },
                     required: ['content']
                },
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        const jsonText = response.text.trim();
        const result = jsonText ? JSON.parse(jsonText) : { content: null };

        if (result && typeof result.content !== 'undefined') {
            return result.content; // This will be the string content or null
        }

        throw new Error("No scannable code found in the frame.");

    } catch (error) {
        if (!(error instanceof Error && error.message.includes("No scannable code"))) {
             console.error("Error decoding barcode with Google GenAI:", error);
        }
        // Re-throw to be handled by the caller, which can decide whether to show an error or just retry.
        throw error;
    }
};

/**
 * Gets a contextual explanation for a part of a 3D model.
 * @param modelName The name of the overall model (e.g., "Human Heart").
 * @param partName The name of the clicked part (e.g., "Aorta").
 * @param studentLevel The grade/level of the student for tailored explanations.
 * @returns A promise that resolves to the AI-generated explanation.
 */
export const getAIExplanationForModelPart = async (
    modelName: string,
    partName: string,
    studentLevel: string = "10th grade"
): Promise<string> => {
    try {
        const prompt = `You are an expert tutor for a ${studentLevel} student. The user is exploring a 3D model of a "${modelName}". They have just clicked on the part named "${partName}". 
        
        Explain what the "${partName}" is, its primary function, and one interesting fact about it. 
        
        Keep the explanation concise, engaging, and easy to understand. Return only the explanation text.`;
        
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error getting AI explanation:", error);
        throw new Error("Sorry, I couldn't get an explanation for that part right now.");
    }
};

/**
 * Fetches and summarizes the latest news for a given category using Google Search grounding.
 * @param category The news category (e.g., "Technology", "World News").
 * @returns A promise that resolves to an array of news story objects.
 */
export const getNewsFromAI = async (category: string): Promise<{ title: string; summary: string; url: string; imageUrl: string; }[]> => {
    try {
        const prompt = `
            Using Google Search, find up to 10 of the most recent and significant news stories in the "${category}" category.
            Include a mix of both prominent international news sources and local Ugandan media sources where relevant to the category.

            For each story, provide the following:
            1. title: The original, full headline of the news article.
            2. summary: A concise, 2-sentence summary of the key points of the story.
            3. url: The direct URL to the original news article.
            4. imageUrl: A direct URL to a prominent, high-quality image found within the news article itself, such as its main banner or feature image. This must be a direct link to an image file (e.g., .jpg, .png, .webp), not a generic webpage.

            Return ONLY a JSON array of these objects. Do not include any extra text, markdown, or explanations.
        `;
        
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const rawText = (response.text || '').trim();
        
        if (!rawText) {
            throw new Error("AI returned an empty response. This may be due to content filters or an inability to find relevant news.");
        }
        
        // Robustly find the JSON array within the response text, ignoring any conversational text or markdown.
        const jsonMatch = rawText.match(/(\[[\s\S]*\])/);
        if (!jsonMatch || !jsonMatch[0]) {
             throw new Error(`AI returned a non-JSON response: ${rawText}`);
        }

        const cleanedJsonText = jsonMatch[0];

        try {
            const result = JSON.parse(cleanedJsonText);
            
            // Basic validation of the parsed result
            if (Array.isArray(result) && result.every(item => 'title' in item && 'summary' in item && 'url' in item && 'imageUrl' in item)) {
                return result;
            } else {
                throw new Error("AI returned data in an unexpected format.");
            }
        } catch (parseError) {
             console.error("Failed to parse JSON from AI response:", cleanedJsonText);
             throw new Error(`AI returned malformed JSON data. Details: ${(parseError as Error).message}`);
        }

    } catch (error) {
        console.error(`Error fetching news for category "${category}" from Google GenAI:`, error);
        // The error from the try block is re-thrown, and this catch block adds context and a user-friendly message.
        throw new Error("Sorry, I couldn't fetch the latest news right now. Please try again in a moment.");
    }
};

/**
 * Fetches place suggestions from Google Maps using grounding.
 * @param query The user's search query for a place.
 * @param location The user's current latitude and longitude.
 * @returns A promise that resolves to an array of place suggestions.
 */
export const getPlaceSuggestionsFromAI = async (
    query: string,
    location: { latitude: number; longitude: number }
): Promise<Place[]> => {
    if (!query) return [];
    try {
        const prompt = `
            You are a location search assistant. Given the user's query and their approximate location, find relevant places using Google Search.
            User's query: "${query}"
            User's approximate location: latitude ${location.latitude}, longitude ${location.longitude}.

            Return ONLY a JSON array of place objects. Each object must have two keys:
            1.  "title": The name of the place.
            2.  "uri": A valid Google Maps URL for the place.

            Do not include any extra text, markdown, or explanations outside of the JSON array.
            Example response: [{"title": "Cafe Central", "uri": "https://www.google.com/maps/search/?api=1&query=Cafe+Central"}]
        `;

        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const rawText = (response.text || '').trim();
        if (!rawText) {
            return [];
        }

        // Robustly find the JSON array within the response text
        const jsonMatch = rawText.match(/(\[[\s\S]*\])/);
        if (!jsonMatch || !jsonMatch[0]) {
             console.warn(`AI returned a non-JSON response for place search: ${rawText}`);
             return [];
        }

        const cleanedJsonText = jsonMatch[0];
        try {
            const result: Place[] = JSON.parse(cleanedJsonText);
            if (Array.isArray(result) && result.every(item => 'title' in item && 'uri' in item)) {
                // Deduplicate results based on URI
                return result.filter((place, index, self) => 
                    index === self.findIndex((p) => p.uri === place.uri)
                );
            }
            return [];
        } catch (parseError) {
             console.error("Failed to parse JSON from AI place search response:", cleanedJsonText);
             return [];
        }
    } catch (error) {
        console.error("Error getting place suggestions from Google GenAI:", error);
        throw new Error("Could not fetch place suggestions at this time.");
    }
};

/**
 * Auto-categorizes a marketplace listing using Google GenAI.
 * @param title The title of the listing.
 * @param description The description of the listing.
 * @returns A promise that resolves to a category name.
 */
export const categorizeListing = async (title: string, description: string): Promise<string> => {
    const categories = ['Electronics', 'Clothing', 'Books', 'Furniture', 'Services', 'Other'];
    try {
        const prompt = `
            Analyze the following product listing and categorize it into ONE of the following categories:
            ${categories.join(', ')}.

            Title: "${title}"
            Description: "${description}"

            Respond with ONLY the category name. For example: "Electronics".
            If no category fits well, respond with "Other".
        `;

        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const category = response.text.trim();
        // Validate if the AI response is one of the allowed categories
        if (categories.map(c => c.toLowerCase()).includes(category.toLowerCase())) {
            // Return the original casing
            return categories.find(c => c.toLowerCase() === category.toLowerCase())!;
        }
        return 'Other'; // Fallback if AI hallucinates a category
    } catch (error) {
        console.error("Error categorizing listing with Google GenAI:", error);
        throw new Error("Could not auto-categorize the listing.");
    }
};

// FIX: Add missing 'findSchoolByNameWithAI' function.
/**
 * Finds the best matching school name from a list based on a user's spoken query.
 * @param spokenName The transcribed voice input from the user.
 * @param schoolList A list of available school names.
 * @returns A promise that resolves to the best matching school name, or null if no good match is found.
 */
export const findSchoolByNameWithAI = async (spokenName: string, schoolList: string[]): Promise<string | null> => {
    try {
        const prompt = `
            From the following list of school names, find the one that best matches the user's spoken input.
            User input: "${spokenName}"

            List of school names:
            - ${schoolList.join('\n- ')}

            Return ONLY the single best matching school name from the list.
            If there is no clear match, return the string "null".
            Do not add any explanation or surrounding text.
        `;

        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const matchedName = response.text.trim();

        // Check if the returned name is actually in the list to prevent hallucinations
        const exactMatch = schoolList.find(school => school.toLowerCase() === matchedName.toLowerCase());

        if (matchedName.toLowerCase() === 'null' || !exactMatch) {
            return null;
        }

        return exactMatch; // Return the name with correct casing from the original list
    } catch (error) {
        console.error("Error finding school by name with Google GenAI:", error);
        throw error;
    }
};

// FIX: Add missing 'isAffirmative' function.
/**
 * Determines if a user's spoken response is affirmative (e.g., "yes", "sure", "okay").
 * @param text The transcribed text from the user.
 * @returns A promise that resolves to true if the response is affirmative, false otherwise.
 */
export const isAffirmative = async (text: string): Promise<boolean> => {
    try {
        const prompt = `
            Analyze the following text and determine if it is an affirmative response (e.g., "yes", "sure", "okay", "yeah", "yep", "do it").
            User's response: "${text}"

            Return ONLY a single JSON object with one key: 'isAffirmative'.
            - 'isAffirmative': A boolean value (true or false).
            
            Do not include any extra text, markdown, or explanations.
            Example for "yes please": {"isAffirmative": true}
            Example for "no thanks": {"isAffirmative": false}
        `;

        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isAffirmative: { type: Type.BOOLEAN },
                    },
                    required: ['isAffirmative']
                },
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        return result.isAffirmative === true;

    } catch (error) {
        console.error("Error in isAffirmative check with Google GenAI:", error);
        // In case of error, it's safer to assume a non-affirmative response
        // to prevent unintended actions.
        return false;
    }
};

/**
 * Extracts structured details from an ID card image using Google GenAI.
 * @param frontImageBase64 The Base64 encoded front image data.
 * @param backImageBase64 Optional Base64 encoded back image data.
 * @returns A promise that resolves to a structured object with the extracted data.
 */
export const extractDetailsFromIdCard = async (frontImageBase64: string, backImageBase64?: string): Promise<ExtractedIdData> => {
    try {
        const parts: any[] = [
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: frontImageBase64,
                },
            },
        ];

        if (backImageBase64) {
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: backImageBase64,
                },
            });
        }
        
        const textPrompt = `
            Analyze the provided image(s) of a personal identification card (e.g., National ID, Driver's License, Passport).
            You may be given one or two images representing the front and back of the card.
            Extract the following information:
            1.  fullName: The full name of the person.
            2.  idNumber: The main identification number.
            3.  idType: The type of document (e.g., "National ID Card", "Driver's Licence").
            4.  dateOfBirth: The person's date of birth.
            5.  dateOfExpiry: The card's expiry date, if present.
            6.  nationality: The person's nationality, if present.

            Return this information ONLY as a JSON object. If a field is not present, return null for that key. Do not include any extra text, markdown, or explanations.
        `;

        parts.push({ text: textPrompt });
        
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        fullName: { type: Type.STRING, nullable: true },
                        idNumber: { type: Type.STRING, nullable: true },
                        idType: { type: Type.STRING, nullable: true },
                        dateOfBirth: { type: Type.STRING, nullable: true },
                        dateOfExpiry: { type: Type.STRING, nullable: true },
                        nationality: { type: Type.STRING, nullable: true },
                    },
                     required: ['fullName', 'idNumber', 'idType', 'dateOfBirth', 'dateOfExpiry', 'nationality']
                },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error extracting details from ID card with Google GenAI:", error);
        throw error;
    }
};