
export interface QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: string;
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
