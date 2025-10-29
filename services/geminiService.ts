
import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from '../types';

export async function fetchPhysicsQuestions(): Promise<QuizQuestion[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const prompt = `Generate 15 multiple-choice quiz questions in Italian, styled like the game 'Who Wants to Be a Millionaire?'. The questions must be about university-level physics, targeting a 20-year-old student audience. Each question must have exactly four possible answers, and only one must be correct. The difficulty should increase progressively. The format must be a JSON array of objects.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: 'The quiz question in Italian.'
              },
              answers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'An array of exactly four possible answers in Italian.'
              },
              correctAnswer: {
                type: Type.STRING,
                description: 'The correct answer from the answers array.'
              }
            },
            required: ['question', 'answers', 'correctAnswer']
          }
        }
      }
    });

    const jsonString = response.text;
    const questions = JSON.parse(jsonString) as QuizQuestion[];

    // Validate that each question has 4 answers
    return questions.filter(q => q.answers && q.answers.length === 4);

  } catch (error) {
    console.error("Error fetching questions from Gemini API:", error);
    // Fallback to a single dummy question on error
    return [
        {
            "question": "Quale principio afferma che un corpo immerso in un fluido riceve una spinta verso l'alto pari al peso del fluido spostato?",
            "answers": [
                "Principio di Pascal",
                "Principio di Archimede",
                "Legge di Stevino",
                "Teorema di Bernoulli"
            ],
            "correctAnswer": "Principio di Archimede"
        }
    ];
  }
}
