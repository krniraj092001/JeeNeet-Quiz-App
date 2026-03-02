import { GoogleGenAI, Modality } from "@google/genai";
import { Question, QUIZ_SCHEMA, Language, ExamType, DoubtResponse } from "../types";
import { jsonrepair } from "jsonrepair";

const getApiKey = () => {
  // Try to get from process.env (injected by Vite define) or import.meta.env
  const key = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  return key?.trim() || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Helper to retry API calls on transient errors
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = error?.message || "";
      const status = error?.status || "";
      
      const isRpcError = msg.includes("Rpc failed") || msg.includes("xhr error") || status === "UNKNOWN";
      const isRateLimit = status === "RESOURCE_EXHAUSTED" || msg.includes("429") || msg.includes("quota");
      const isServerError = status === "INTERNAL" || msg.includes("500") || msg.includes("503");

      if (i < maxRetries && (isRpcError || isRateLimit || isServerError)) {
        const delay = Math.pow(2, i) * (isRateLimit ? 5000 : baseDelay) + Math.random() * 1000;
        console.warn(`Retrying API call (${i + 1}/${maxRetries}) after ${Math.round(delay)}ms due to: ${msg}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Generate high-quality speech from text using Gemini TTS
 */
export async function generateSpeech(text: string): Promise<string | undefined> {
  if (!text) return undefined;
  if (!getApiKey()) throw new Error("API_KEY_MISSING");

  try {
    // Clean text: remove LaTeX, markdown, and limit length to avoid 500 errors
    const cleanText = text
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 divided by $2') // Basic LaTeX fraction handling
      .replace(/\\sqrt\{([^}]*)\}/g, 'square root of $1') // Basic LaTeX sqrt handling
      .replace(/[\$\#\*`\\_]/g, ' ') // Remove markdown and LaTeX symbols
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 1000); // Limit length to 1000 chars for stability

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return pcmToWav(base64Audio);
    }
  } catch (error) {
    console.error("Error generating speech:", error);
  }
  return undefined;
}

/**
 * Wraps raw PCM data into a WAV container for browser playback
 */
function pcmToWav(pcmBase64: string, sampleRate: number = 24000): string {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // File length
  view.setUint32(4, 36 + len, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // Format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // Channel count (mono = 1)
  view.setUint16(22, 1, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // Bits per sample
  view.setUint16(34, 16, true);
  // Data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // Data chunk length
  view.setUint32(40, len, true);

  const wavBytes = new Uint8Array(44 + len);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(bytes, 44);

  // Convert back to base64 safely
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < wavBytes.length; i += chunkSize) {
    const chunk = wavBytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

async function generateDiagram(prompt: string): Promise<string | undefined> {
  if (!prompt) return undefined;
  
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: `Create a professional, textbook-quality educational diagram for a JEE/NEET physics or math problem.
            
            STYLE REQUIREMENTS:
            - Background: Pure white.
            - Format: Clean, high-resolution vector-style illustration.
            - Lines: Sharp, consistent thickness. Use arrows for axes (X, Y, Z) and vectors.
            - Labels: Use clear, legible sans-serif font. Labels should be upright and placed precisely near the corresponding elements (points, angles, vectors).
            - Color: Use a professional academic palette (e.g., deep blue or black for primary lines, vibrant purple or red for curves/vectors).
            
            MATHEMATICAL ACCURACY (CRITICAL):
            - All curves (sine, cosine, parabolas, hyperbolas, etc.) MUST be mathematically precise.
            - For trigonometric graphs like y = sin(x):
                * The curve MUST pass through the origin (0,0).
                * It MUST have a periodic wave shape with a constant amplitude.
                * Peaks must be at π/2, 5π/2 and troughs at 3π/2, 7π/2.
                * The x-axis MUST be labeled with standard values: 0, π/2, π, 3π/2, 2π.
                * The y-axis MUST show 1 and -1 as the maximum and minimum values.
            - For physics diagrams: Ensure vectors are correctly oriented and forces are labeled according to standard conventions (e.g., 'mg' for gravity, 'N' for normal force).
            - Ensure geometric shapes are perfect (circles are round, squares have 90-degree angles).
            
            DESCRIPTION TO ILLUSTRATE:
            ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    }));

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating diagram:", error);
  }
  return undefined;
}

const BATCH_SIZE = 25; // Increased batch size for faster generation

async function generateBatch(
  subject: string, 
  language: Language,
  examType: ExamType,
  count: number, 
  filesData?: { data: string, mimeType: string }[],
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD',
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
  1. Use LaTeX for ALL mathematical formulas, chemical equations, and technical symbols. 
  2. CRITICAL: ALL LaTeX MUST be wrapped in dollar signs. Use single dollar signs for inline math (e.g., $E=mc^2$) and double dollar signs for block math (e.g., $$\\int x dx$$).
  3. For chemical formulas, use proper LaTeX notation (e.g., $H_2O$, $SO_4^{2-}$, $C_6H_{12}O_6$). Never use plain text like "H2O" or "ch3".
  4. Ensure the output is clean. Do not include raw LaTeX commands in the text unless they are wrapped in dollar signs for rendering.
  5. CRITICAL JSON FORMATTING: You are returning JSON. All backslashes in LaTeX MUST be escaped with another backslash (e.g., write "\\\\frac" instead of "\\frac").
  6. Include detailed step-by-step explanations in ${language}, using block LaTeX for derivations.
  7. Categorize each question as either 'Class 11' or 'Class 12' based on the standard NCERT curriculum.
  8. The difficulty should be ${difficulty ? difficulty : 'a mix of Easy, Moderate, and Hard (unless specified otherwise)'}.`;

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

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview", // Changed to flash to avoid quota limits
      contents: contents,
      config: {
        systemInstruction: `You are an expert exam paper setter and tutor. 
        CRITICAL: You MUST return a valid JSON array of objects.
        
        Follow these strict guidelines for every question and solution:
        1. CLARITY & ANSWERABILITY: Every question must be unambiguous, answerable with given info, and have a clear, definite correct answer.
        2. QUESTION TYPES: 
           - MCQ: Standard 4-option question.
           - NUMERICAL: Integer or decimal answer.
           - STATEMENT: Two statements (I and II) followed by 4 standard options (e.g., Both correct, Both incorrect, I correct II incorrect, etc.).
           - MATCH: Two lists (List I and List II) that need to be matched. Provide 4 multiple choice options that are possible matching combinations (e.g., 'A-I, B-II, C-III, D-IV'). Set 'correctAnswer' to the index of the correct option (0-3).
        3. NATURAL LANGUAGE: Avoid "Synthetic Signatures" like "Answer the following:" or "Consider this problem:". Write naturally.
        4. NO PROOFS: Questions must not be proof-based.
        5. NO LARGE CALCULATIONS: Avoid large number calculations that require a calculator.
        6. EXPLANATION FORMAT: Every explanation MUST follow this exact structure:
           - Start with a brief introductory sentence.
           - Use numbered steps: "### Step 1: [Heading]" followed immediately by "---" on the next line.
           - Keep the text inside each step extremely concise and to the point. Do NOT write long paragraphs.
           - Add a blank line between the text and any block LaTeX equations for good spacing.
           - End with the final answer in a block LaTeX box: "$$ \\boxed{[answer]} $$"
           - Use LaTeX for all math, wrapped in $...$ or $$...$$.
        8. GTFA (Ground Truth Final Answer): The 'correctAnswer' must be in its simplest form (Number, Interval, Equation, Boolean, Set, or Vector). No full sentences.
        9. LATEX: Use proper LaTeX for all formulas, wrapped in $...$ or $$...$$. Escape backslashes for JSON (\\\\frac).
        10. DIAGRAM PROMPT: ONLY provide a 'diagramPrompt' if the original source question explicitly includes a diagram or figure. CRITICAL: You MUST use Google Search to verify the accuracy of any diagram, graph, figure, or molecular structure. If it cannot be verified by a Google search, DO NOT include it. Do NOT invent diagrams.
        11. EXPLANATION DIAGRAM: You MAY provide an 'explanationDiagramPrompt' if a visual aid would help. CRITICAL: You MUST use Google Search to verify the accuracy of any graph, figure, or molecular structure. If it cannot be verified by a Google search, DO NOT include it.
        12. FORMAT: Return a valid JSON array. Never truncate.`,
        responseMimeType: "application/json",
        responseSchema: QUIZ_SCHEMA,
        tools: [{ googleSearch: {} }], // Added search grounding for accuracy
        temperature: 0.2, 
        maxOutputTokens: 16384, 
      },
    }));

    let text = response.text?.trim() || "[]";
    
    try {
      // If the response is wrapped in markdown code blocks, extract the content
      if (text.includes("```")) {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          text = jsonMatch[1].trim();
        }
      }
      
      // Find the first [ and last ] to isolate the array
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        text = text.substring(firstBracket, lastBracket + 1);
      }

      // Use jsonrepair to handle truncation or minor syntax errors
      let repairedJson = text;
      try {
        repairedJson = jsonrepair(text);
      } catch (e) {
        console.warn("jsonrepair failed, attempting to parse raw text", e);
      }

      let rawQuestions = JSON.parse(repairedJson);
      
      // If the model returned a single object instead of an array, wrap it
      if (rawQuestions && typeof rawQuestions === 'object' && !Array.isArray(rawQuestions)) {
        rawQuestions = [rawQuestions];
      }

      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error("Empty or invalid response from JonyBhai");
      }

      return rawQuestions.map((q: any) => ({
        ...q,
        subject,
        language,
        examType
      }));
    } catch (parseError: any) {
      console.error("Failed to parse JonyBhai response as JSON:", parseError);
      
      // Retry on parsing errors
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateBatch(subject, language, examType, count, filesData, difficulty, retryCount + 1);
      }
      
      throw new Error("The JonyBhai response was invalid after multiple attempts. Please try again.");
    }
  } catch (error: any) {
    console.error("Error generating batch:", error);
    throw error;
  }
}

export async function generateQuestions(
  subject: string, 
  language: Language,
  examType: ExamType,
  count: number = 15, 
  filesData?: { data: string, mimeType: string }[],
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
): Promise<Question[]> {
  const allQuestions: Question[] = [];
  const numBatches = Math.ceil(count / BATCH_SIZE);

  for (let i = 0; i < numBatches; i++) {
    const currentBatchCount = Math.min(BATCH_SIZE, count - (i * BATCH_SIZE));
    
    // Add a significant delay between batches to strictly follow 15 RPM limit
    // 15 RPM = 1 request every 4 seconds. We use 4.5s to be safe.
    if (i > 0) {
      const delay = 4500; 
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (!getApiKey()) {
      throw new Error("API_KEY_MISSING");
    }

    try {
      const batchQuestions = await generateBatch(subject, language, examType, currentBatchCount, filesData, difficulty);
      
      // Generate diagrams for questions and explanations
      const questionsWithDiagrams = await Promise.all(batchQuestions.map(async (q) => {
        let diagramUrl = q.diagramUrl;
        let explanationDiagramUrl = q.explanationDiagramUrl;

        if (q.diagramPrompt) {
          diagramUrl = await generateDiagram(q.diagramPrompt);
        }
        
        if (q.explanationDiagramPrompt) {
          explanationDiagramUrl = await generateDiagram(q.explanationDiagramPrompt);
        }

        return { ...q, diagramUrl, explanationDiagramUrl };
      }));
      
      allQuestions.push(...questionsWithDiagrams);
    } catch (error) {
      console.error(`Error in batch ${i + 1}:`, error);
      throw error; // Re-throw to be handled by the UI
    }
  }

  return allQuestions.map((q, index) => ({
    ...q,
    id: `${subject}-${Date.now()}-${index}`
  }));
}

export async function solveDoubt(
  questionText: string,
  image?: { data: string, mimeType: string },
  language: Language = 'English'
): Promise<DoubtResponse> {
  if (!getApiKey()) {
    throw new Error("API_KEY_MISSING");
  }

  const prompt = `You are an expert JEE and NEET tutor. Solve the following doubt in ${language}.
  
  DOUBT:
  ${questionText}
  
  INSTRUCTIONS:
  1. EXPLANATION FORMAT: Every explanation MUST follow this exact structure:
     - Start with a brief introductory sentence.
     - Use numbered steps: "### Step 1: [Heading]" followed immediately by "---" on the next line.
     - Keep the text inside each step extremely concise and to the point. Do NOT write long paragraphs.
     - Add a blank line between the text and any block LaTeX equations for good spacing.
     - End with the final answer in a block LaTeX box: "$$ \\boxed{[answer]} $$"
     - Use LaTeX for all math, wrapped in $...$ or $$...$$.
  2. Use LaTeX for all mathematical formulas, chemical equations, and symbols.
  3. Wrap ALL LaTeX in dollar signs ($...$ for inline, $$...$$ for block).
  4. If a diagram would help clarify the solution, provide a detailed 'diagramPrompt' to recreate it. CRITICAL: You MUST use Google Search to verify the accuracy of any graph, figure, or molecular structure. If it cannot be verified by a Google search, DO NOT include it.
  6. Identify the 'subject' and 'topic' of the question.
  7. Return the response as a JSON object.`;

  try {
    const contents: any = { parts: [{ text: prompt }] };
    if (image) {
      contents.parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType
        }
      });
    }

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview", // Changed to flash to avoid quota limits
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            explanation: { type: "STRING" },
            diagramPrompt: { type: "STRING" },
            subject: { type: "STRING" },
            topic: { type: "STRING" }
          },
          required: ["explanation", "subject", "topic"]
        },
        tools: [{ googleSearch: {} }], // Grounding for up-to-date syllabus accuracy
        temperature: 0.2,
      },
    }));

    const result = JSON.parse(response.text || "{}");
    
    // Extract grounding sources if available
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
      title: chunk.web?.title,
      uri: chunk.web?.uri
    })).filter(s => s.title && s.uri);

    let diagramUrl = undefined;
    if (result.diagramPrompt) {
      diagramUrl = await generateDiagram(result.diagramPrompt);
    }

    return {
      explanation: result.explanation,
      diagramUrl,
      subject: result.subject,
      topic: result.topic,
      sources: sources?.length ? sources : undefined
    };
  } catch (error) {
    console.error("Error solving doubt:", error);
    throw error;
  }
}

export async function chatDuringLoading(
  messages: { role: 'user' | 'assistant', content: string }[]
): Promise<string> {
  if (!getApiKey()) {
    throw new Error("API_KEY_MISSING");
  }

  const prompt = `You are a friendly, helpful AI assistant. The user is currently waiting for a quiz to be generated. Keep them engaged, answer their questions concisely, and maintain a positive tone.`;

  try {
    const historyString = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${prompt}\n\nConversation History:\n${historyString}\n\nAssistant:`,
    }));

    return response.text || "I'm here! Still working on your quiz.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "I'm having a bit of trouble connecting right now, but your quiz is still generating!";
  }
}
