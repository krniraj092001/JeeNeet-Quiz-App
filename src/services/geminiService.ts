import { GoogleGenAI } from "@google/genai";
import { Question, QUIZ_SCHEMA, Language, ExamType } from "../types";
import { jsonrepair } from "jsonrepair";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const BATCH_SIZE = 15;

async function generateBatch(
  subject: string, 
  language: Language,
  examType: ExamType,
  count: number, 
  filesData?: { data: string, mimeType: string }[],
  retryCount: number = 0
): Promise<Question[]> {
  let prompt = `Generate EXACTLY ${count} high-quality multiple choice questions for ${subject} in ${language} language. 
  The exam level is ${examType}. 
  ${examType === 'JEE' ? 'Follow the JEE Main/Advanced pattern from 2019 to 2025.' : ''}
  ${examType === 'NEET' ? 'Follow the NEET pattern based on previous year questions.' : ''}
  ${examType === 'Combined' ? 'Follow the 12th Board Exam pattern based on NCERT textbooks and previous year questions.' : ''}
  ${examType === 'JEE_BOOKS' ? 'Generate questions based on standard JEE reference books like HC Verma, Irodov, or Cengage.' : ''}
  ${examType === 'NEET_BOOKS' ? 'Generate questions based on NCERT textbooks and standard NEET reference materials.' : ''}
  ${examType === 'MS_CHOUHAN' ? `Generate questions specifically in the style and difficulty of M.S. Chouhan's "Advanced Problems in Organic Chemistry for JEE". 
  Focus on Level 1 and Level 2 type problems. 
  Topics should include: General Organic Chemistry (GOC), Isomerism, Grignard Reagent, Hydrocarbons, Alkyl Halides, Alcohols, Ethers, Epoxides, Aldehydes, Ketones, Carboxylic Acids, Amines, and Aromatic Compounds.
  The questions should involve complex reaction mechanisms, stereochemical outcomes (R/S, cis/trans, meso), and multi-step synthesis.
  Ensure the difficulty is "Hard" or "Advanced".` : ''}
  ${examType === 'BLACK_BOOK' ? `Generate questions specifically in the style and difficulty of Vikas Gupta and Pankaj Joshi's "Advanced Problems in Mathematics for JEE" (commonly known as the Black Book). 
  Topics should include: Calculus, Algebra, Coordinate Geometry, Trigonometry, and Vectors/3D.
  The questions should challenging, multi-concept, and require deep logical reasoning.
  Ensure the difficulty is "Hard" or "Advanced".` : ''}
  ${examType === 'NARENDRA_AVASTHI' ? `Generate questions specifically in the style and difficulty of Narendra Avasthi's "Problems in Physical Chemistry for JEE". 
  Focus on Level 1, Level 2, and Level 3 type problems. 
  Topics should include: Stoichiometry, Atomic Structure, Gaseous State, Thermodynamics, Chemical Equilibrium, Ionic Equilibrium, Chemical Kinetics, Electrochemistry, Dilute Solution, Solid State, and Surface Chemistry.
  The questions should involve complex numerical calculations, conceptual depth, and multiple concepts.
  Ensure the difficulty is "Hard" or "Advanced".` : ''}
  
  ${examType === 'JEE_MAIN_MOCK' ? `Generate a high-quality set of questions for a JEE Main Mock Test. 
  CRITICAL: You MUST generate EXACTLY ${count} questions in total.
  
  Follow the 2020-2025 Trend Analysis for chapter weightage.
  Ensure a mix of Physics, Chemistry, and Mathematics if applicable to the subject ${subject}.
  
  For EACH subject section:
  - Questions should be Multiple Choice (MCQ) with 4 options or Numerical Value Type (NUMERICAL).
  
  Follow the 2026 JEE Main pattern (+4 for correct, -1 for wrong). 
  Ensure a mix of Easy, Moderate, and Hard difficulty.` : ''}

  ${examType === 'NEET_MOCK' ? `Generate a high-quality set of questions for a NEET Mock Test. 
  CRITICAL: You MUST generate EXACTLY ${count} questions for the subject: ${subject}.
  
  Follow the 2013-2025 Trend Analysis for ${subject} weightage.
  All questions MUST be Multiple Choice (MCQ) with 4 options.
  Follow the NEET pattern (+4 for correct, -1 for wrong).
  
  CRITICAL DIFFICULTY & STYLE GUIDELINES (Based on 2025 trends):
  - Overall Difficulty: 28% Hard, 38% Moderate, 33% Easy.
  - Shift away from direct memorization towards conceptual and application-based questions.
  - PHYSICS: Focus on analytical and numerical-heavy problems.
  - CHEMISTRY: Blend theoretical knowledge with tricky, application-based questions.
  - BIOLOGY: NCERT-based but highly conceptual.` : ''}
  
  IMPORTANT: 
  1. Use LaTeX for ALL mathematical formulas, chemical equations, and symbols. 
  2. Wrap inline LaTeX in single dollar signs like $E=mc^2$ and block LaTeX in double dollar signs like $$\\int x dx$$.
  3. Ensure the questions are challenging and include detailed step-by-step explanations in ${language}.
  4. Categorize each question as either 'Class 11' or 'Class 12' based on the standard NCERT curriculum.
  5. The difficulty should be a mix of Easy, Moderate, and Hard (unless specified otherwise).`;

  if (filesData && filesData.length > 0) {
    prompt = `I have provided ${filesData.length} document(s). 
    CRITICAL REQUIREMENT: You MUST generate ${count} high-quality multiple choice questions based EXCLUSIVELY on the content of the provided documents. 
    The questions should be in ${language} for the subject ${subject} at ${examType} level.
    
    Guidelines for Document-Based Generation:
    1. You MUST generate EXACTLY ${count} questions.
    2. Every question must be directly derived from the uploaded files.
    3. Use LaTeX for all formulas, equations, and symbols.
    4. Include detailed step-by-step explanations in ${language}.`;
  }

  try {
    const contents: any = { parts: [{ text: prompt }] };
    if (filesData && filesData.length > 0) {
      filesData.forEach(file => {
        contents.parts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType
          }
        });
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: "You are an expert exam paper setter. You must ALWAYS return a complete, valid JSON array of objects. Never truncate the response. If you run out of space, ensure the JSON is still valid by closing all open brackets and braces.",
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: 16384, 
      },
    });

    let text = response.text || "[]";
    
    try {
      // Clean up potential markdown artifacts
      if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0];
      } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0];
      }
      text = text.trim();

      // Use jsonrepair to handle truncation or minor syntax errors
      const repairedJson = jsonrepair(text);
      const rawQuestions = JSON.parse(repairedJson);
      
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error("Empty or invalid response from AI");
      }

      return rawQuestions.map((q: any) => ({
        ...q,
        subject,
        language,
        examType
      }));
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      throw new Error("The AI response was invalid. Please try again.");
    }
  } catch (error: any) {
    console.error("Error generating batch:", error);
    
    const isClientError = error?.status === "INVALID_ARGUMENT" || error?.message?.includes("400");
    const isRpcError = error?.message?.includes("Rpc failed") || error?.message?.includes("xhr error") || error?.status === "UNKNOWN";
    const isRateLimit = error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("429") || error?.message?.includes("quota");
    
    if (retryCount < 3 && (!isClientError || isRpcError || isRateLimit)) {
      const baseDelay = isRateLimit ? 5000 : 1000;
      const delay = Math.pow(2, retryCount) * baseDelay + Math.random() * 1000; 
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateBatch(subject, language, examType, count, filesData, retryCount + 1);
    }
    
    throw error;
  }
}

export async function generateQuestions(
  subject: string, 
  language: Language,
  examType: ExamType,
  count: number = 15, 
  filesData?: { data: string, mimeType: string }[]
): Promise<Question[]> {
  if (count <= BATCH_SIZE) {
    const questions = await generateBatch(subject, language, examType, count, filesData);
    return questions.map((q, index) => ({
      ...q,
      id: `${subject}-${Date.now()}-${index}`
    }));
  }

  const numBatches = Math.ceil(count / BATCH_SIZE);
  const batchPromises = [];

  for (let i = 0; i < numBatches; i++) {
    const currentBatchCount = Math.min(BATCH_SIZE, count - (i * BATCH_SIZE));
    batchPromises.push(generateBatch(subject, language, examType, currentBatchCount, filesData));
  }

  try {
    const results = await Promise.all(batchPromises);
    const allQuestions = results.flat();

    return allQuestions.map((q, index) => ({
      ...q,
      id: `${subject}-${Date.now()}-${index}`
    }));
  } catch (error) {
    console.error("Error in parallel generation:", error);
    throw error;
  }
}
