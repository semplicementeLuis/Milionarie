
import React, { useState, useCallback } from 'react';
import { GameStatus, QuizQuestion, AnswerState } from './types';
import { PRIZE_AMOUNTS, SAFE_LEVELS } from './constants';
import { fetchPhysicsQuestions } from './services/geminiService';
import Spinner from './components/Spinner';

const FiftyFiftyIcon: React.FC<{ used: boolean; onClick: () => void }> = ({ used, onClick }) => (
  <button onClick={onClick} disabled={used} className={`relative font-bold text-white text-lg border-2 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center transition-all duration-300 ${used ? 'bg-red-800 border-red-500 opacity-50 cursor-not-allowed' : 'bg-blue-900 border-blue-500 hover:bg-blue-700 hover:border-blue-300'}`}>
    50:50
    {used && <div className="absolute inset-0 flex items-center justify-center text-red-400 text-5xl font-black">X</div>}
  </button>
);

const PrizeLadder: React.FC<{ currentLevel: number }> = ({ currentLevel }) => (
  <div className="w-full lg:w-64 xl:w-80 bg-black bg-opacity-50 p-4 rounded-lg border-2 border-blue-900">
    <ul className="flex flex-col-reverse text-center">
      {PRIZE_AMOUNTS.map((amount, index) => {
        const isCurrent = index === currentLevel;
        const isSafe = SAFE_LEVELS.includes(PRIZE_AMOUNTS.length - 1 - index);
        const isAchieved = index < currentLevel;

        let levelClass = "text-gray-400";
        if (isCurrent) levelClass = "bg-yellow-600 text-white font-bold scale-110";
        else if (isSafe) levelClass = "text-white font-semibold";
        if (isAchieved) levelClass = "text-green-400 opacity-70";


        return (
          <li
            key={amount}
            className={`p-2 my-1 rounded-md transition-all duration-300 ${levelClass}`}
          >
            <span className="mr-2 text-yellow-400">{PRIZE_AMOUNTS.length - index}</span> {amount}
          </li>
        );
      })}
    </ul>
  </div>
);

const AnswerButton: React.FC<{ answer: string; state: AnswerState; onClick: () => void }> = ({ answer, state, onClick }) => {
    const baseClasses = "w-full text-left p-4 rounded-lg border-2 text-lg md:text-xl transition-all duration-500 transform font-semibold flex items-center";
    const stateClasses = {
      [AnswerState.Default]: "bg-blue-900 border-blue-500 hover:bg-blue-700 text-white cursor-pointer",
      [AnswerState.Selected]: "bg-yellow-600 border-yellow-400 text-white animate-pulse cursor-wait",
      [AnswerState.Correct]: "bg-green-700 border-green-400 text-white scale-105",
      [AnswerState.Incorrect]: "bg-red-800 border-red-500 text-white",
      [AnswerState.Hidden]: "opacity-0 pointer-events-none",
    };

    const prefixes = ['A:', 'B:', 'C:', 'D:'];
    const answerIndex = parseInt(answer.split(':')[0], 10);
    const answerText = answer.substring(answer.indexOf(':') + 1);

    return (
        <button onClick={onClick} disabled={state !== AnswerState.Default} className={`${baseClasses} ${stateClasses[state]}`}>
           <span className="text-yellow-400 mr-4">{prefixes[answerIndex]}</span> {answerText}
        </button>
    );
};

export default function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Welcome);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [hiddenAnswers, setHiddenAnswers] = useState<string[]>([]);

  const prizeLevel = PRIZE_AMOUNTS.length - 1 - currentQuestionIndex;

  const handleStartGame = useCallback(async () => {
    setGameStatus(GameStatus.Loading);
    const fetchedQuestions = await fetchPhysicsQuestions();
    setQuestions(fetchedQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setFiftyFiftyUsed(false);
    setHiddenAnswers([]);
    setGameStatus(GameStatus.Playing);
  }, []);
  
  const handleAnswerSelect = (answer: string) => {
      if (gameStatus !== GameStatus.Playing) return;

      setGameStatus(GameStatus.AnswerSelected);
      setSelectedAnswer(answer);

      setTimeout(() => {
          const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
          if (isCorrect) {
              if (currentQuestionIndex === questions.length - 1) {
                  setGameStatus(GameStatus.GameOver);
              } else {
                  setTimeout(() => {
                      setCurrentQuestionIndex(prev => prev + 1);
                      setSelectedAnswer(null);
                      setHiddenAnswers([]);
                      setGameStatus(GameStatus.Playing);
                  }, 2000);
              }
          } else {
              setGameStatus(GameStatus.GameOver);
          }
      }, 3000);
  };

  const useFiftyFifty = () => {
    if (fiftyFiftyUsed || gameStatus !== GameStatus.Playing) return;

    setFiftyFiftyUsed(true);
    const currentQ = questions[currentQuestionIndex];
    const incorrectAnswers = currentQ.answers.filter(a => a !== currentQ.correctAnswer);
    
    // Randomly select two incorrect answers to hide
    const toHide = [];
    while (toHide.length < 2) {
        const randomIndex = Math.floor(Math.random() * incorrectAnswers.length);
        const randomAnswer = incorrectAnswers[randomIndex];
        if (!toHide.includes(randomAnswer)) {
            toHide.push(randomAnswer);
        }
    }
    setHiddenAnswers(toHide);
  };
  
  const getAnswerState = (answer: string): AnswerState => {
      if (hiddenAnswers.includes(answer)) return AnswerState.Hidden;
      if (gameStatus === GameStatus.AnswerSelected || gameStatus === GameStatus.GameOver) {
          if (answer === questions[currentQuestionIndex].correctAnswer) return AnswerState.Correct;
          if (answer === selectedAnswer) return AnswerState.Incorrect;
      }
      if (selectedAnswer === answer) return AnswerState.Selected;
      return AnswerState.Default;
  };

  const getFinalPrize = (): string => {
    if (selectedAnswer === questions[currentQuestionIndex]?.correctAnswer && currentQuestionIndex === questions.length - 1) {
        return PRIZE_AMOUNTS[PRIZE_AMOUNTS.length - 1];
    }
    
    let prizeWonIndex = -1;
    for(const safeLevelIndex of SAFE_LEVELS.map(l => PRIZE_AMOUNTS.length - 1 - l).sort((a,b) => a - b)) {
        if(currentQuestionIndex > safeLevelIndex){
            prizeWonIndex = safeLevelIndex;
        }
    }

    return prizeWonIndex !== -1 ? PRIZE_AMOUNTS[prizeWonIndex] : '€0';
  };

  const renderContent = () => {
    switch (gameStatus) {
      case GameStatus.Welcome:
        return (
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">Physics Millionaire</h1>
            <p className="text-xl md:text-2xl text-blue-300 mb-8">Sei pronto a testare la tua conoscenza della fisica?</p>
            <button
              onClick={handleStartGame}
              className="bg-yellow-500 text-blue-900 font-bold py-4 px-10 rounded-full text-2xl hover:bg-yellow-400 transition transform hover:scale-105"
            >
              Inizia la Partita
            </button>
          </div>
        );
      case GameStatus.Loading:
        return (
          <div className="text-center">
            <Spinner />
            <p className="text-white text-2xl mt-4">Sto generando le domande di fisica...</p>
          </div>
        );
      case GameStatus.GameOver:
        return (
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">Partita Terminata!</h1>
            <p className="text-3xl text-yellow-400 mb-8">Hai vinto: {getFinalPrize()}</p>
            <button
              onClick={handleStartGame}
              className="bg-yellow-500 text-blue-900 font-bold py-4 px-10 rounded-full text-2xl hover:bg-yellow-400 transition transform hover:scale-105"
            >
              Gioca Ancora
            </button>
          </div>
        );
      case GameStatus.Playing:
      case GameStatus.AnswerSelected:
        const currentQuestion = questions[currentQuestionIndex];
        return (
          <div className="w-full flex flex-col lg:flex-row gap-8 items-center lg:items-start">
            <div className="w-full lg:flex-grow flex flex-col items-center gap-8">
                <div className="w-full bg-black bg-opacity-50 p-6 rounded-lg border-2 border-blue-900 text-center text-2xl md:text-3xl font-semibold text-white">
                    {currentQuestion.question}
                </div>
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.answers.map((answer, index) => (
                        <AnswerButton 
                            key={index} 
                            answer={`${index}:${answer}`}
                            state={getAnswerState(answer)}
                            onClick={() => handleAnswerSelect(answer)} 
                        />
                    ))}
                </div>
                <div className="mt-8 flex gap-8">
                    <FiftyFiftyIcon used={fiftyFiftyUsed} onClick={useFiftyFifty}/>
                </div>
            </div>
            <div className="w-full md:w-auto flex-shrink-0">
                <PrizeLadder currentLevel={prizeLevel} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0a24] to-[#04040c] text-white flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
}
