
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "./types";

// Fix: Strictly follow initialization guidelines for the GoogleGenAI client using the environment API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractRadiologyData(text: string): Promise<ExtractionResult> {
  const model = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are a world-class radiology information extraction assistant. 
    Your task is to parse complex, unstructured free-text radiology reports and extract structured data.
    
    CRITICAL VALIDATION RULE:
    - First, determine if the provided text is a genuine radiology report (X-ray, CT, MRI, Ultrasound, etc.).
    - If the input is non-medical, conversational, gibberish, or unrelated to radiology, you MUST set "is_medical_report" to false.
    
    CRITICAL EXTRACTION RULES (if it is a medical report):
    1. NEGATION AWARENESS: Distinguish between presence and absence. 
       - If the report says "No pleural effusion," then 'present' is FALSE and 'is_abnormal' is FALSE.
       - If the report says "Pleural effusion is identified," then 'present' is TRUE and 'is_abnormal' is TRUE.
    2. ORGAN-BY-ORGAN: Group findings by specific organs.
    3. FINDING LABEL: Use concise labels.
    4. ACCURACY: Do not hallucinate.
    5. ABNORMALITY: Mark pathology as 'is_abnormal: true'.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text: `Extract data from this radiology report:\n\n${text}` }] }],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_medical_report: { type: Type.BOOLEAN, description: "Set to true if input is a valid radiology report, false otherwise." },
          patient_summary: { type: Type.STRING, description: "A very brief clinical summary of the patient's state." },
          impression: { type: Type.STRING, description: "The final diagnosis or conclusion." },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                organ: { type: Type.STRING },
                finding_label: { type: Type.STRING },
                finding_description: { type: Type.STRING },
                present: { type: Type.BOOLEAN },
                is_abnormal: { type: Type.BOOLEAN },
                details: { type: Type.STRING }
              },
              required: ["organ", "finding_label", "finding_description", "present", "is_abnormal"]
            }
          }
        },
        required: ["is_medical_report", "findings"]
      }
    }
  });

  const textOutput = response.text;
  if (!textOutput) {
    throw new Error("No response from AI model.");
  }
  
  return JSON.parse(textOutput) as ExtractionResult;
}
