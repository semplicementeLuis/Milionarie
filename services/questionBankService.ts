import { QuestionBank, QuizQuestion } from '../types';
import { MAX_QUESTIONS } from '../constants';

const STORAGE_KEY = 'millionaireQuestionBank';

export function getQuestionBank(): QuestionBank {
  try {
    const storedBank = localStorage.getItem(STORAGE_KEY);
    if (storedBank) {
      const parsedBank = JSON.parse(storedBank) as QuestionBank;
      // Basic validation
      if (parsedBank && Array.isArray(parsedBank.questions)) {
        return parsedBank;
      }
    }
  } catch (error) {
    console.error("Failed to read or parse question bank from localStorage:", error);
    localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
  }
  return { questions: [] };
}

export function saveQuestionBank(bank: QuestionBank): void {
  try {
    const bankString = JSON.stringify(bank);
    localStorage.setItem(STORAGE_KEY, bankString);
  } catch (error) {
    console.error("Failed to save question bank to localStorage:", error);
  }
}

export function addQuestionsToBank(newQuestions: QuizQuestion[]): void {
  const bank = getQuestionBank();
  
  // Filter out any potential duplicates before adding
  const uniqueNewQuestions = newQuestions.filter(
    (newQ) => !bank.questions.some((existingQ) => existingQ.question === newQ.question)
  );

  if (uniqueNewQuestions.length === 0) {
    return;
  }

  let updatedQuestions = [...bank.questions, ...uniqueNewQuestions];

  // If the bank exceeds the max size, keep only the most recent questions
  if (updatedQuestions.length > MAX_QUESTIONS) {
    updatedQuestions = updatedQuestions.slice(updatedQuestions.length - MAX_QUESTIONS);
  }

  saveQuestionBank({ questions: updatedQuestions });
}
