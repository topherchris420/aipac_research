
import React from 'react';
import { LiveUpdate } from '../types';

interface LiveUpdateCardProps {
  update: LiveUpdate;
}

const LiveUpdateCard: React.FC<LiveUpdateCardProps> = ({ update }) => {
  return (
    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-xl shadow-lg backdrop-blur-sm border border-white/10 space-y-2">
      <h3 className="font-semibold text-black">
        {update.title}
      </h3>
      <p className="text-sm text-black opacity-80">
        {update.summary}
      </p>
    </div>
  );
};

export default LiveUpdateCard;