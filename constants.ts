import { QuizQuestion } from './types';

export const PRIZE_AMOUNTS: string[] = [
  "€1.000.000",
  "€500.000",
  "€250.000",
  "€125.000",
  "€64.000",
  "€32.000", // Safe point
  "€16.000",
  "€8.000",
  "€4.000",
  "€2.000",
  "€1.000", // Safe point
  "€500",
  "€300",
  "€200",
  "€100",
];

// These are the indices in the PRIZE_AMOUNTS array.
// Index 5 = €32.000, Index 10 = €1.000
export const SAFE_LEVELS: number[] = [5, 10]; 

export const MAX_QUESTIONS = 150;

export const TIMER_DURATIONS: { [key in QuizQuestion['difficulty']]: number } = {
  'easy': 30,
  'medium-hard': 45,
  'very-difficult': 60,
  'expert': 75,
};