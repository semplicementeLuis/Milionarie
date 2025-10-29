import React from 'react';

interface TimerProps {
  secondsLeft: number;
  isActive: boolean;
}

const Timer: React.FC<TimerProps> = ({ secondsLeft, isActive }) => {
  const isUrgent = secondsLeft <= 10;
  
  const timerColor = isUrgent ? 'text-red-500' : 'text-yellow-400';
  // Only apply the pulsing animation if the timer is active.
  const animationClass = isUrgent && isActive ? 'pulsing-timer' : '';

  return (
    <div className="w-24 h-24 bg-black bg-opacity-50 border-4 border-blue-800 rounded-full flex items-center justify-center">
      <span className={`text-4xl font-bold ${timerColor} ${animationClass}`}>
        {secondsLeft}
      </span>
    </div>
  );
};

export default Timer;
