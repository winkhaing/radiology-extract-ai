
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "./types";

// Fix: Strictly follow initialization guidelines for the GoogleGenAI client using the environment API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractRadiologyData(text: string): Promise<ExtractionResult> {
  const model = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are a world-class radiology information extraction assistant. 
    Your task is to parse complex, unstructured free-text radiology reports and extract structured data.
    
    CRITICAL RULES:
    1. NEGATION AWARENESS: Distinguish between presence and absence. 
       - If the report says "No pleural effusion," then 'present' is FALSE and 'is_abnormal' is FALSE.
       - If the report says "Pleural effusion is identified," then 'present' is TRUE and 'is_abnormal' is TRUE.
       - "Normal heart size" means 'present' is TRUE (the heart is there), but 'is_abnormal' is FALSE.
    2. ORGAN-BY-ORGAN: Group findings by specific organs (e.g., Lungs, Heart, Liver, Gallbladder, Spleen, Bones, Vessels).
    3. FINDING LABEL: Use concise labels like "Consolidation", "Mass", "Nodule", "Ascites", "Atherosclerosis".
    4. ACCURACY: Read line by line. Do not hallucinate findings that aren't there.
    5. ABNORMALITY: Any finding that indicates pathology, disease, or deviation from expected healthy state should be marked 'is_abnormal: true'.
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
          patient_summary: { type: Type.STRING, description: "A very brief clinical summary of the patient's state based on the report." },
          impression: { type: Type.STRING, description: "The final diagnosis or conclusion from the report." },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                organ: { type: Type.STRING, description: "The organ or anatomical region." },
                finding_label: { type: Type.STRING, description: "Common medical name for the finding." },
                finding_description: { type: Type.STRING, description: "The literal text or summarized finding from the report." },
                present: { type: Type.BOOLEAN, description: "True if the finding (e.g. mass, fluid) exists. False if it is explicitly negated." },
                is_abnormal: { type: Type.BOOLEAN, description: "True if this is an abnormal medical finding." },
                details: { type: Type.STRING, description: "Extra context like location, size, or severity." }
              },
              required: ["organ", "finding_label", "finding_description", "present", "is_abnormal"]
            }
          }
        },
        required: ["findings"]
      }
    }
  });

  const textOutput = response.text;
  if (!textOutput) {
    throw new Error("No response from AI model.");
  }
  
  return JSON.parse(textOutput) as ExtractionResult;
}
