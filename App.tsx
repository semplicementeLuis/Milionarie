import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameStatus, QuizQuestion, AnswerState } from './types';
import { PRIZE_AMOUNTS, SAFE_LEVELS, TIMER_DURATIONS } from './constants';
import { getSessionQuestions } from './services/geminiService';
import { allQuestions as initialQuestions } from './data/questions';
import { getQuestionBank, addQuestionsToBank } from './services/questionBankService';
import Spinner from './components/Spinner';
import Timer from './components/Timer';
import TrophyIcon from './components/TrophyIcon';

const WIN_COUNT_STORAGE_KEY = 'millionaireWinCount';

const FiftyFiftyIcon: React.FC<{ used: boolean; onClick: () => void }> = ({ used, onClick }) => (
  <button onClick={onClick} disabled={used} className={`relative font-bold text-white text-lg border-2 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center transition-all duration-300 ${used ? 'bg-red-800 border-red-500 opacity-50 cursor-not-allowed' : 'bg-blue-900 border-blue-500 hover:bg-blue-700 hover:border-blue-300'}`}>
    50:50
    {used && <div className="absolute inset-0 flex items-center justify-center text-red-400 text-5xl font-black">X</div>}
  </button>
);

const PhoneFriendIcon: React.FC<{ used: boolean; onClick: () => void }> = ({ used, onClick }) => (
    <button onClick={onClick} disabled={used} className={`relative font-bold text-white text-lg border-2 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center transition-all duration-300 ${used ? 'bg-red-800 border-red-500 opacity-50 cursor-not-allowed' : 'bg-blue-900 border-blue-500 hover:bg-blue-700 hover:border-blue-300'}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      {used && <div className="absolute inset-0 flex items-center justify-center text-red-400 text-5xl font-black">X</div>}
    </button>
);

const SwitchQuestionIcon: React.FC<{ used: boolean; onClick: () => void }> = ({ used, onClick }) => (
    <button onClick={onClick} disabled={used} className={`relative font-bold text-white text-lg border-2 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center transition-all duration-300 ${used ? 'bg-red-800 border-red-500 opacity-50 cursor-not-allowed' : 'bg-blue-900 border-blue-500 hover:bg-blue-700 hover:border-blue-300'}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      {used && <div className="absolute inset-0 flex items-center justify-center text-red-400 text-5xl font-black">X</div>}
    </button>
);


const PrizeLadder: React.FC<{ currentLevel: number }> = ({ currentLevel }) => (
  <div className="w-full lg:w-64 xl:w-80 bg-black bg-opacity-50 p-4 rounded-lg border-2 border-blue-900">
    <ul className="flex flex-col-reverse text-center">
      {PRIZE_AMOUNTS.map((amount, index) => {
        const isCurrent = index === currentLevel;
        const isSafe = SAFE_LEVELS.includes(index);
        const isAchieved = index < currentLevel;

        let levelClass = "text-gray-400";
        if (isAchieved) {
            levelClass = "text-green-400 opacity-70";
        }
        // Safe levels have a distinct style
        if (isSafe) {
            levelClass = "text-yellow-300 font-semibold";
        }
        // Achieved safe levels keep their distinct style
        if (isAchieved && isSafe) {
            levelClass = "text-yellow-300 font-semibold opacity-80";
        }
        // The current level is the most prominent
        if (isCurrent) {
            levelClass = "bg-yellow-600 text-white font-bold scale-110 text-2xl p-4";
        }


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

const AnswerButton: React.FC<{ answer: string; state: AnswerState; isSuggested: boolean; onClick: () => void }> = ({ answer, state, isSuggested, onClick }) => {
    const baseClasses = "w-full text-left p-4 rounded-lg border-2 text-lg md:text-xl transition-all duration-500 transform font-semibold flex items-center";
    const stateClasses = {
      [AnswerState.Default]: "bg-blue-900 border-blue-500 hover:bg-blue-700 text-white cursor-pointer",
      [AnswerState.Selected]: "bg-yellow-600 border-yellow-400 text-white gentle-pulse-animation cursor-wait",
      [AnswerState.Correct]: "bg-green-700 border-green-400 text-white scale-105",
      [AnswerState.Incorrect]: "bg-red-800 border-red-500 text-white",
      [AnswerState.Hidden]: "opacity-0 pointer-events-none",
    };

    const suggestionClass = isSuggested && state === AnswerState.Default ? 'ring-2 ring-offset-2 ring-offset-[#0c0a24] ring-green-500' : '';

    const prefixes = ['A:', 'B:', 'C:', 'D:'];
    const answerIndex = parseInt(answer.split(':')[0], 10);
    const answerText = answer.substring(answer.indexOf(':') + 1);

    return (
        <button onClick={onClick} disabled={state !== AnswerState.Default} className={`${baseClasses} ${stateClasses[state]} ${suggestionClass}`}>
           <span className="text-yellow-400 mr-4">{prefixes[answerIndex]}</span> {answerText}
        </button>
    );
};

export default function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Welcome);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [phoneFriendUsed, setPhoneFriendUsed] = useState(false);
  const [switchQuestionUsed, setSwitchQuestionUsed] = useState(false);
  const [phoneFriendSuggestion, setPhoneFriendSuggestion] = useState<string | null>(null);
  const [hiddenAnswers, setHiddenAnswers] = useState<string[]>([]);
  const [winCount, setWinCount] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSuspensePhase, setIsSuspensePhase] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  
  const [questionOpacity, setQuestionOpacity] = useState(1);
  const [questionTransform, setQuestionTransform] = useState('translateY(0)');

  const revealTimeoutRef = useRef<number | null>(null);
  const nextQuestionTimeoutRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const resetConfirmTimeoutRef = useRef<number | null>(null);
  const isAnswerProcessing = useRef(false);

  const prizeLevel = PRIZE_AMOUNTS.length - 1 - currentQuestionIndex;

  useEffect(() => {
    try {
      const storedWins = localStorage.getItem(WIN_COUNT_STORAGE_KEY);
      if (storedWins) {
        setWinCount(parseInt(storedWins, 10) || 0);
      }
      let bank = getQuestionBank();
      if (bank.questions.length === 0) {
        addQuestionsToBank(initialQuestions);
        bank = getQuestionBank();
      }
      setAllQuestions(bank.questions);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  }, []);

  const clearAllTimeouts = useCallback(() => {
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    if (nextQuestionTimeoutRef.current) clearTimeout(nextQuestionTimeoutRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  const handleStartGame = useCallback(async () => {
    setGameStatus(GameStatus.Loading);
    clearAllTimeouts();
    isAnswerProcessing.current = false;
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setFiftyFiftyUsed(false);
    setPhoneFriendUsed(false);
    setSwitchQuestionUsed(false);
    setPhoneFriendSuggestion(null);
    setHiddenAnswers([]);
    setShuffledAnswers([]);
    
    const allSessionQuestions = await getSessionQuestions(allQuestions);
    setQuestions(allSessionQuestions);
    setGameStatus(GameStatus.Playing);
  }, [clearAllTimeouts, allQuestions]);

  const goToNextQuestion = useCallback(() => {
    clearAllTimeouts();
    if (currentQuestionIndex < questions.length - 1) {
        setQuestionOpacity(0);
        setQuestionTransform('translateY(-20px)'); // Move up on exit
        
        nextQuestionTimeoutRef.current = window.setTimeout(() => {
            isAnswerProcessing.current = false;
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setHiddenAnswers([]);
            setPhoneFriendSuggestion(null);
            setIsSuspensePhase(false);
            setGameStatus(GameStatus.Playing);
        }, 400); // Animation duration
    } else {
        setGameStatus(GameStatus.GameOver);
    }
  }, [currentQuestionIndex, questions.length, clearAllTimeouts]);
  
  useEffect(() => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion?.answers) {
        setQuestionTransform('translateY(20px)'); // Prepare for entry: move down
        
        requestAnimationFrame(() => {
            setQuestionOpacity(1); // Fade in
            setQuestionTransform('translateY(0)'); // Move to final position
        });

        const shuffled = [...currentQuestion.answers].sort(() => Math.random() - 0.5);
        setShuffledAnswers(shuffled);
    }
  }, [currentQuestionIndex, questions]);

  const revealAnswer = useCallback(() => {
    clearAllTimeouts();
    setIsSuspensePhase(false); // This triggers rendering of correct/incorrect states

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return; // Safety check

    const isCorrect = selectedAnswer === currentQ.correctAnswer;

    if (isCorrect) {
      if (currentQuestionIndex >= questions.length - 1) {
        // Correctly answered the last question - WINNER!
        setWinCount(prevWins => {
            const newWinCount = prevWins + 1;
            try {
                localStorage.setItem(WIN_COUNT_STORAGE_KEY, newWinCount.toString());
            } catch (error) {
                console.error("Failed to save win count:", error);
            }
            return newWinCount;
        });
        
        // Show the correct answer for 3s, then go to the GameOver screen.
        nextQuestionTimeoutRef.current = window.setTimeout(() => {
            setGameStatus(GameStatus.GameOver);
        }, 3000);
      } else {
        // Correct answer, move to next.
        // Show correct answer for 2s, then load next question.
        nextQuestionTimeoutRef.current = window.setTimeout(goToNextQuestion, 2000);
      }
    } else {
      // Incorrect answer.
      // Show the incorrect and correct answers for 3s, then go to GameOver screen.
      nextQuestionTimeoutRef.current = window.setTimeout(() => {
        setGameStatus(GameStatus.GameOver);
      }, 3000);
    }
  }, [selectedAnswer, questions, currentQuestionIndex, goToNextQuestion, clearAllTimeouts]);


  const handleAnswerSelect = useCallback((answer: string) => {
    if (gameStatus !== GameStatus.Playing || isAnswerProcessing.current) return;
    
    isAnswerProcessing.current = true;
    clearAllTimeouts();
    setGameStatus(GameStatus.AnswerSelected);
    setSelectedAnswer(answer);
    setIsSuspensePhase(true);
  }, [gameStatus, clearAllTimeouts]);

  // Effect to automatically reveal the answer after a delay
  useEffect(() => {
    if (gameStatus === GameStatus.AnswerSelected && isSuspensePhase) {
        revealTimeoutRef.current = window.setTimeout(revealAnswer, 1500); // Shortened from 3000ms

        return () => {
            if (revealTimeoutRef.current) {
                clearTimeout(revealTimeoutRef.current);
            }
        };
    }
  }, [gameStatus, isSuspensePhase, revealAnswer]);

  // Effect to manage the timer interval
  useEffect(() => {
    // The timer should only run when the status is Playing and the feature is enabled.
    if (gameStatus !== GameStatus.Playing || !isTimerEnabled) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      
      // If the timer is simply disabled (not just paused), hide it completely.
      if (!isTimerEnabled) {
          setTimeLeft(null);
      }
      return;
    }

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    
    const duration = TIMER_DURATIONS[currentQ.difficulty];
    setTimeLeft(duration);

    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameStatus, currentQuestionIndex, isTimerEnabled, questions]);

  // Effect to handle timer expiration
  useEffect(() => {
    if (timeLeft === 0 && gameStatus === GameStatus.Playing && !isAnswerProcessing.current) {
      handleAnswerSelect("TIMER_EXPIRED");
    }
  }, [timeLeft, gameStatus, handleAnswerSelect]);
  
  useEffect(() => {
      // Cleanup on unmount
      return () => {
        clearAllTimeouts();
        if (resetConfirmTimeoutRef.current) clearTimeout(resetConfirmTimeoutRef.current);
      };
  }, [clearAllTimeouts]);

  const handleScreenClick = () => {
    if (isSuspensePhase) {
      revealAnswer();
      return;
    }

    if (gameStatus === GameStatus.AnswerSelected && !isSuspensePhase) {
      const isCorrect = selectedAnswer === questions[currentQuestionIndex]?.correctAnswer;
      if (isCorrect && currentQuestionIndex < questions.length - 1) {
        goToNextQuestion();
      }
    }
  };

  const useFiftyFifty = () => {
    if (fiftyFiftyUsed || gameStatus !== GameStatus.Playing) return;
    setFiftyFiftyUsed(true);
    const currentQ = questions[currentQuestionIndex];
    const incorrectAnswers = currentQ.answers.filter(a => a !== currentQ.correctAnswer);
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

  const usePhoneFriend = () => {
      if (phoneFriendUsed || gameStatus !== GameStatus.Playing) return;
      setPhoneFriendUsed(true);
      const currentQ = questions[currentQuestionIndex];
      const { correctAnswer, answers } = currentQ;

      const isCorrectSuggestion = Math.random() < 0.85; // 85% chance of being correct
      if (isCorrectSuggestion) {
          setPhoneFriendSuggestion(correctAnswer);
      } else {
          const incorrectAnswers = answers.filter(a => a !== correctAnswer && !hiddenAnswers.includes(a));
          const randomIncorrect = incorrectAnswers[Math.floor(Math.random() * incorrectAnswers.length)];
          setPhoneFriendSuggestion(randomIncorrect);
      }
  };

  const useSwitchQuestion = () => {
      if (switchQuestionUsed || gameStatus !== GameStatus.Playing) return;
      setSwitchQuestionUsed(true);

      const currentQ = questions[currentQuestionIndex];
      const currentQuestionStrings = questions.map(q => q.question);

      const replacementOptions = allQuestions.filter(q =>
          q.difficulty === currentQ.difficulty &&
          !currentQuestionStrings.includes(q.question)
      );

      if (replacementOptions.length > 0) {
          const newQuestion = replacementOptions[Math.floor(Math.random() * replacementOptions.length)];
          const newQuestions = [...questions];
          newQuestions[currentQuestionIndex] = newQuestion;
          setQuestions(newQuestions);
          setHiddenAnswers([]);
          setPhoneFriendSuggestion(null); 
      } else {
          // This can be replaced with a user-facing message if desired
          console.warn("No replacement questions available for this difficulty.");
      }
  };

  const handleInitiateReset = () => {
    setIsResetConfirming(true);
    resetConfirmTimeoutRef.current = window.setTimeout(() => {
      setIsResetConfirming(false);
    }, 4000); // 4 seconds to confirm
  };

  const handleConfirmReset = () => {
    if (resetConfirmTimeoutRef.current) {
      clearTimeout(resetConfirmTimeoutRef.current);
    }
    try {
      localStorage.removeItem(WIN_COUNT_STORAGE_KEY);
      setWinCount(0);
    } catch (error) {
      console.error("Failed to remove win count from localStorage:", error);
    }
    setIsResetConfirming(false);
    setIsSettingsOpen(false);
  };

  const handleDevModeAdvance = () => {
    if (!isDeveloperMode || gameStatus !== GameStatus.Playing || isAnswerProcessing.current) return;
    const currentQ = questions[currentQuestionIndex];
    if (currentQ) {
        handleAnswerSelect(currentQ.correctAnswer);
    }
  };

  const getAnswerState = (answer: string): AnswerState => {
    if (hiddenAnswers.includes(answer)) return AnswerState.Hidden;
    if (gameStatus === GameStatus.AnswerSelected || gameStatus === GameStatus.GameOver) {
      if (!isSuspensePhase) {
        if (answer === questions[currentQuestionIndex]?.correctAnswer) return AnswerState.Correct;
        if (answer === selectedAnswer) return AnswerState.Incorrect;
      }
    }
    if (selectedAnswer === answer) return AnswerState.Selected;
    return AnswerState.Default;
  };
  
 const getFinalPrize = (): string => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return '€0';

    const isCorrect = selectedAnswer === currentQ.correctAnswer;

    // Case 1: Won the whole game
    if (isCorrect && currentQuestionIndex >= questions.length - 1) {
        return PRIZE_AMOUNTS[0]; // €1.000.000
    }
    
    // Case 2: Answered correctly (but not the last question, handled by game flow)
    if (isCorrect) {
        return PRIZE_AMOUNTS[prizeLevel];
    }
    
    // Case 3: Answered incorrectly
    const lastCorrectQuestionIndex = currentQuestionIndex - 1;

    // If they got the very first question wrong
    if (lastCorrectQuestionIndex < 0) {
        return '€0';
    }
    
    // prizeLevel index of the last correctly answered question
    const lastWonPrizeLevel = PRIZE_AMOUNTS.length - 1 - lastCorrectQuestionIndex;

    // Find the highest safe point reached. A lower index means a higher prize.
    const highestSafeLevelReached = SAFE_LEVELS.find(safeIdx => lastWonPrizeLevel <= safeIdx);

    if (highestSafeLevelReached !== undefined) {
      return PRIZE_AMOUNTS[highestSafeLevelReached];
    }
    
    return '€0';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0a24] to-[#04040c] text-white flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto relative">
        {gameStatus === GameStatus.Welcome && (
          <>
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">Chi vuole essere Multimilionario?</h1>
              <p className="text-xl md:text-2xl text-blue-300 mb-8">Sei pronto a testare la tua cultura generale?</p>
              <button
                onClick={handleStartGame}
                className="bg-yellow-500 text-blue-900 font-bold py-4 px-10 rounded-full text-2xl hover:bg-yellow-400 transition transform hover:scale-105"
              >
                Inizia la Partita
              </button>
              <div className="flex items-center justify-center gap-4 mt-8">
                <span className="text-gray-300 font-semibold">Abilita Timer Risposte</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isTimerEnabled} onChange={() => setIsTimerEnabled(prev => !prev)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
              <p className="text-sm text-gray-400 mt-8">
                Totale domande disponibili: {allQuestions.length}
              </p>
              <div className="mt-8 flex items-center justify-center gap-3 text-yellow-400">
                  <TrophyIcon className="h-10 w-10" />
                  <span className="font-bold text-3xl tracking-wider">{winCount}</span>
              </div>
            </div>
            <div className="fixed bottom-8 right-8">
              <button onClick={() => setIsSettingsOpen(true)} className="text-gray-500 hover:text-white transition-colors duration-300" aria-label="Impostazioni">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </>
        )}

        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-20 animate-fade-in">
              <div className="bg-[#0c0a24] border-2 border-blue-800 rounded-lg p-8 w-full max-w-md relative mx-4">
                  <h2 className="text-3xl font-bold mb-6 text-center text-yellow-400">Impostazioni</h2>
                  
                  <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white" aria-label="Chiudi impostazioni">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
                  
                  <div className="space-y-6">
                      <div className="flex items-center justify-between p-3 bg-blue-900/50 rounded-lg">
                          <span className="text-lg font-medium">Modalità Sviluppatore</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={isDeveloperMode} onChange={() => setIsDeveloperMode(prev => !prev)} className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                          </label>
                      </div>
                      
                      <button
                        onClick={isResetConfirming ? handleConfirmReset : handleInitiateReset}
                        className={`w-full font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                          isResetConfirming
                            ? 'bg-yellow-600 text-blue-900 hover:bg-yellow-500 animate-pulse'
                            : 'bg-red-800 text-white hover:bg-red-700'
                        }`}
                      >
                        {isResetConfirming ? 'Sei sicuro? Clicca per confermare' : 'Azzera Vittorie'}
                      </button>
                  </div>
              </div>
          </div>
        )}

        {gameStatus === GameStatus.Loading && (
          <div className="text-center">
            <Spinner />
            <p className="text-white text-2xl mt-4">Sto preparando il quiz...</p>
          </div>
        )}

        {(gameStatus === GameStatus.Playing || gameStatus === GameStatus.AnswerSelected || gameStatus === GameStatus.GameOver) && (() => {
          const currentQuestion = questions[currentQuestionIndex];
          if (!currentQuestion) {
              return (
                  <div className="text-center">
                      <Spinner />
                      <p className="text-white text-2xl mt-4">Sto caricando le prossime domande...</p>
                  </div>
              );
          }
          return (
            <div className="w-full" onClick={handleScreenClick}>
              <div className="w-full flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                <div 
                    className="w-full lg:flex-grow flex flex-col items-center gap-8"
                    style={{
                        opacity: questionOpacity,
                        transform: questionTransform,
                        transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                    }}
                >
                    <div className="w-full bg-black bg-opacity-50 p-6 rounded-lg border-2 border-blue-900 text-center text-2xl md:text-3xl font-semibold text-white">
                        {currentQuestion.question}
                    </div>
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shuffledAnswers.map((answer, index) => (
                            <AnswerButton 
                                key={answer} 
                                answer={`${index}:${answer}`}
                                state={getAnswerState(answer)}
                                isSuggested={phoneFriendSuggestion === answer}
                                onClick={() => handleAnswerSelect(answer)} 
                            />
                        ))}
                    </div>
                    <div className="w-full flex flex-col items-center gap-4">
                      <div className="flex flex-wrap justify-center gap-4 items-center">
                          {isTimerEnabled && timeLeft !== null && <Timer secondsLeft={timeLeft} isActive={gameStatus === GameStatus.Playing} />}
                          <FiftyFiftyIcon used={fiftyFiftyUsed} onClick={useFiftyFifty}/>
                          <div className="relative">
                              <PhoneFriendIcon used={phoneFriendUsed} onClick={usePhoneFriend}/>
                              {phoneFriendSuggestion && (
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-max max-w-xs text-center animate-fade-in z-10">
                                      <div className="inline-block bg-blue-900/80 backdrop-blur-sm border-2 border-blue-400 shadow-lg shadow-blue-500/30 rounded-lg p-4 relative">
                                          <p className="text-lg text-yellow-300">
                                              Gemini suggerisce: <span className="font-bold text-white">{phoneFriendSuggestion}</span>
                                          </p>
                                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-[-2px] w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-blue-400"></div>
                                      </div>
                                  </div>
                              )}
                          </div>
                          <SwitchQuestionIcon used={switchQuestionUsed} onClick={useSwitchQuestion}/>
                          {isDeveloperMode && (gameStatus === GameStatus.Playing || gameStatus === GameStatus.AnswerSelected) && (
                            <button
                                onClick={handleDevModeAdvance}
                                disabled={isAnswerProcessing.current}
                                className="font-bold text-white text-lg border-2 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center transition-all duration-300 bg-purple-900 border-purple-500 hover:bg-purple-700 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Developer Mode: Seleziona la risposta corretta"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </button>
                          )}
                      </div>
                    </div>
                </div>
                <div className="w-full md:w-auto flex-shrink-0">
                    <PrizeLadder currentLevel={prizeLevel} />
                </div>
              </div>
            </div>
          );
        })()}

        {gameStatus === GameStatus.GameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-10 p-4 animate-fade-in">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Partita Terminata!</h1>
              <p className="text-2xl md:text-3xl text-yellow-400 mb-8">Hai vinto: {getFinalPrize()}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={handleStartGame}
                  className="bg-yellow-500 text-blue-900 font-bold py-3 px-8 md:py-4 md:px-10 rounded-full text-xl md:text-2xl hover:bg-yellow-400 transition transform hover:scale-105"
                >
                  Gioca Ancora
                </button>
                 <button
                  onClick={() => setGameStatus(GameStatus.Welcome)}
                  className="bg-gray-700 text-white w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center hover:bg-gray-600 transition transform hover:scale-105"
                  aria-label="Torna alla schermata iniziale"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}