
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { LiveUpdate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchGroundedResponse(prompt: string): Promise<GenerateContentResponse> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    return response;
  } catch (error) {
    console.error("Error fetching grounded response from Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching data from the Gemini API.");
  }
}

export async function fetchLiveUpdates(): Promise<LiveUpdate[]> {
    try {
        const prompt = "Provide a list of the 3 most recent news updates or significant developments related to AIPAC. For each update, provide a concise title and a one-sentence summary. Ensure the output is a valid JSON array of objects, where each object has 'title' and 'summary' keys.";

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: {
                                type: Type.STRING,
                                description: "The title of the news update."
                            },
                            summary: {
                                type: Type.STRING,
                                description: "A one-sentence summary of the update."
                            }
                        },
                        required: ["title", "summary"]
                    }
                }
            }
        });

        const jsonString = response.text;
        const cleanedJsonString = jsonString.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(cleanedJsonString);

    } catch (error) {
        console.error("Error fetching live updates from Gemini:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while fetching live updates from the Gemini API.");
    }
}
