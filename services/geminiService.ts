import { QuizQuestion } from '../types';

// Shuffles an array without modifying the original
const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export async function getSessionQuestions(allQuestions: QuizQuestion[]): Promise<QuizQuestion[]> {
  // Filter all questions by difficulty
  const easyQuestions = allQuestions.filter(q => q.difficulty === 'easy');
  const mediumHard = allQuestions.filter(q => q.difficulty === 'medium-hard');
  const veryDifficult = allQuestions.filter(q => q.difficulty === 'very-difficult');
  const expert = allQuestions.filter(q => q.difficulty === 'expert');

  // Shuffle each difficulty pool once to randomize selection from the full bank
  const shuffledEasy = shuffle(easyQuestions);
  const shuffledMedium = shuffle(mediumHard);
  const shuffledVeryDifficult = shuffle(veryDifficult);
  const shuffledExpert = shuffle(expert);

  // Tier 1: Questions 1-5 (3 Easy, 2 Medium-Hard)
  const tier1Questions = [
    ...shuffledEasy.slice(0, 3),
    ...shuffledMedium.slice(0, 2),
  ];

  // Tier 2: Questions 6-10 (3 Medium-Hard, 2 Very-Difficult)
  const tier2Questions = [
    ...shuffledMedium.slice(2, 5), // Use different medium questions
    ...shuffledVeryDifficult.slice(0, 2),
  ];

  // Tier 3: Questions 11-15 (3 Very-Difficult, 2 Expert)
  const tier3Questions = [
    ...shuffledVeryDifficult.slice(2, 5), // Use different very-difficult questions
    ...shuffledExpert.slice(0, 2),
  ];

  // Combine the tiers in order. Shuffle within each tier to mix difficulties.
  const sessionQuestions = [
    ...shuffle(tier1Questions),
    ...shuffle(tier2Questions),
    ...shuffle(tier3Questions),
  ];

  return sessionQuestions;
}