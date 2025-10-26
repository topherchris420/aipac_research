
import React from 'react';
import { GroundingChunk } from '../types';

interface SourceCardProps {
  source: GroundingChunk;
  index: number;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  if (!source.web) return null;

  return (
    <a
      href={source.web.uri}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-black/10 dark:bg-white/5 rounded-xl shadow-lg hover:bg-black/20 dark:hover:bg-white/10 transition-all duration-300 backdrop-blur-sm border border-white/10"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-100 dark:bg-slate-700 rounded-full text-blue-600 dark:text-blue-300 font-semibold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-black truncate">
            {source.web.title || 'Untitled Source'}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400 truncate hover:underline">
            {source.web.uri}
          </p>
        </div>
      </div>
    </a>
  );
};

export default SourceCard;