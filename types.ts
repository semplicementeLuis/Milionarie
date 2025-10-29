export interface QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium-hard' | 'very-difficult' | 'expert';
}

export interface QuestionBank {
  questions: QuizQuestion[];
}

export enum GameStatus {
  Welcome,
  Loading,
  Playing,
  AnswerSelected,
  GameOver,
}

export enum AnswerState {
  Default,
  Selected,
  Correct,
  Incorrect,
  Hidden,
}