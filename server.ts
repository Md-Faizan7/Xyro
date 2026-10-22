import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side initialization of GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const STUDY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questionSummary: {
      type: Type.STRING,
      description: 'A crisp 1-sentence distillation of what the user is asking.',
    },
    studyBuddyExplanation: {
      type: Type.OBJECT,
      properties: {
        buddyGreeting: {
          type: Type.STRING,
          description: 'A warm, encouraging persona-tailored greeting and reaction to the problem.',
        },
        coreIntent: {
          type: Type.STRING,
          description: 'Deconstruct what this question is really asking. Clarify tricky terms, assumptions, and remove confusion.',
        },
        prerequisites: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of foundational concepts, laws, or formulas needed before solving.',
        },
        intuitiveAnalogy: {
          type: Type.STRING,
          description: 'A vivid, relatable real-world metaphor or intuition that makes the concept click.',
        },
        thinkingRoadmap: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 to 5 logical checkpoints for how to think through and tackle this problem.',
        },
      },
      required: ['buddyGreeting', 'coreIntent', 'prerequisites', 'intuitiveAnalogy', 'thinkingRoadmap'],
    },
    geminiSolution: {
      type: Type.OBJECT,
      properties: {
        directAnswer: {
          type: Type.STRING,
          description: 'The clear, direct takeaway or numerical/conceptual final answer.',
        },
        stepByStep: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              explanation: { type: Type.STRING },
              formulaOrCode: { type: Type.STRING, description: 'Optional math formula, equation, or code snippet if relevant' },
              tip: { type: Type.STRING, description: 'Insightful hint or caution for this step' },
            },
            required: ['stepNumber', 'title', 'explanation'],
          },
          description: 'Detailed, step-by-step rigorous solution.',
        },
        keyTakeaway: {
          type: Type.STRING,
          description: 'The most important lesson, rule, or concept to remember for future tests.',
        },
        commonPitfalls: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '1 to 3 frequent mistakes students make with this problem.',
        },
        memoryTrick: {
          type: Type.STRING,
          description: 'A mnemonic, rhyme, or mental hook to never forget this concept.',
        },
      },
      required: ['directAnswer', 'stepByStep', 'keyTakeaway', 'commonPitfalls', 'memoryTrick'],
    },
    interactiveElements: {
      type: Type.OBJECT,
      properties: {
        practiceQuiz: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Exactly 4 multiple choice options',
            },
            correctIndex: { type: Type.INTEGER, description: '0-based index of correct option' },
            explanation: { type: Type.STRING, description: 'Explanation of why the correct option is right' },
          },
          required: ['question', 'options', 'correctIndex', 'explanation'],
        },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Question or concept on the front' },
              back: { type: Type.STRING, description: 'Clear concise answer or definition on the back' },
              hint: { type: Type.STRING, description: 'Quick recall hint' },
            },
            required: ['front', 'back', 'hint'],
          },
          description: '2 to 3 high-yield review flashcards for spaced repetition',
        },
        suggestedFollowUps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 relevant follow-up questions the student might want to ask next',
        },
      },
      required: ['practiceQuiz', 'flashcards', 'suggestedFollowUps'],
    },
  },
  required: ['questionSummary', 'studyBuddyExplanation', 'geminiSolution', 'interactiveElements'],
};

// Persona instructions
function getPersonaPrompt(persona: string): string {
  switch (persona) {
    case 'vision':
    case 'marcus':
      return 'You are Vision, a logical, precise, and first-principles academic architect. You break down questions using deep structural clarity and concise, high-signal bullet points.';
    case 'zyro':
    case 'maya':
      return 'You are Zyro, an intuitive, creative, and visual learning companion. You specialize in punchy analogies, mental diagrams, and crystal-clear bullet points.';
    case 'thala':
    case 'sam':
      return 'You are Thala, the calm, clutch exam strategist. You deliver high-yield insights, spot trick questions instantly, and provide sharp, bulleted shortcuts.';
    case 'jarvis':
    case 'alex':
    default:
      return 'You are Jarvis, an ultra-sharp, energetic, and efficient AI study companion. You explain concepts cleanly, concisely, and directly without fluff.';
  }
}

// POST /api/study/solve - Two-phase Zyro Question Breakdown + Gemini Solution
app.post('/api/study/solve', async (req, res) => {
  try {
    const { question, subject, level, persona, mode } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const personaGuide = getPersonaPrompt(persona || 'jarvis');

    const systemInstruction = `
${personaGuide}
You are operating the Zyro two-stage learning engine.
CRITICAL FORMATTING & LENGTH RULES:
1. STRICTLY BRIEF & INFORMATIVE: Avoid long, congested paragraphs or walls of text!
2. USE BULLET POINTS & POINT FORMAT: Present thoughts as clean, bite-sized bullet points.
3. Keep each explanation step under 2 to 3 concise sentences.
4. Highlight key terms and equations cleanly.

STRUCTURE:
1. FIRST STAGE (Stage 1: Question Breakdown):
   - buddyGreeting: 1 short, lively greeting (1 sentence).
   - coreIntent: Brief point-format explanation (1-2 bullet points or short sentences) of what the question is really asking.
   - prerequisites: 3-4 short bullet phrases (laws, formulas, concepts).
   - intuitiveAnalogy: 1-2 punchy sentences capturing the core intuition.
   - thinkingRoadmap: 3-4 short numbered steps (e.g., "1. Identify...", "2. Check...").

2. SECOND STAGE (Stage 2: Gemini Solution):
   - directAnswer: 1 crisp takeaway sentence giving the direct answer.
   - stepByStep: 2 to 3 concise steps maximum. Each step has a short explanation (1-2 bullet sentences), optional formula/code, and a 1-sentence tip.
   - keyTakeaway: 1 punchy golden rule.
   - commonPitfalls: 2 short bullet points of common mistakes.
   - memoryTrick: 1 catchy, brief mnemonic or memory hook.

Parameters:
- Target Subject: ${subject || 'General'}
- Academic Level: ${level || 'High School / College'}
- Study Mode: ${mode || 'Standard'}

Return strictly valid JSON adhering to the schema.
`;

    const userPrompt = `
Here is the student's question:
"${question.trim()}"

Please first have StudyBuddy explain the question and its underlying concept, and then have Gemini provide the comprehensive step-by-step answer and interactive study aids.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: STUDY_SCHEMA,
        temperature: 0.7,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('No response generated by model');
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/study/solve:', err);
    res.status(500).json({
      error: err.message || 'Failed to process question. Please try again.',
    });
  }
});

// POST /api/study/chat - Contextual follow-up Q&A on the current study session
app.post('/api/study/chat', async (req, res) => {
  try {
    const { question, originalContext, chatHistory, userMessage, persona } = req.body;

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const personaGuide = getPersonaPrompt(persona || 'alex');

    const systemInstruction = `
${personaGuide}
You are helping the student with follow-up questions about their study topic.
Original Question Studied: "${question || 'N/A'}"
Context of Previous Explanation:
${typeof originalContext === 'string' ? originalContext : JSON.stringify(originalContext || {})}

Keep your follow-up answers supportive, focused, and conversational. If they ask for another example, give a crisp, fresh one. If they ask to clarify a step, explain it from a different angle with a simpler analogy. Use markdown formatting with bolding and bullet points for readability.
`;

    // Construct contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        contents.push({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage.trim() }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error('Error in /api/study/chat:', err);
    res.status(500).json({
      error: err.message || 'Failed to answer follow-up question.',
    });
  }
});

// POST /api/study/hint - Socratic hint generator when student wants to try answering first
app.post('/api/study/hint', async (req, res) => {
  try {
    const { question, subject, level, hintNumber = 1 } = req.body;

    const systemInstruction = `
You are StudyBuddy in Socratic mode. The student wants to solve this question themselves and just wants Hint #${hintNumber}.
DO NOT give away the final numerical or conceptual answer!
Instead, point them toward the first step, a question to ask themselves, or the key equation to set up.
Keep it under 3-4 sentences, encouraging and thoughtful.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Question: "${question}" (Subject: ${subject}, Level: ${level})`,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ hint: response.text });
  } catch (err: any) {
    console.error('Error in /api/study/hint:', err);
    res.status(500).json({ error: err.message || 'Failed to generate hint.' });
  }
});

// Vite middleware in dev or static files in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StudyBuddy AI Server running on port ${PORT}`);
});
