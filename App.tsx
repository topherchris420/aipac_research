import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GroundingChunk, LiveUpdate } from './types';
import { fetchGroundedResponse, fetchLiveUpdates } from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import SourceCard from './components/SourceCard';
import LiveUpdateCard from './components/LiveUpdateCard';
import { GenerateContentResponse } from '@google/genai';
import { analyzeKeywords, KeywordData } from './utils/textUtils';
import KeywordChart from './components/KeywordChart';

const suggestedQueries = [
  { 
    text: 'Politicians receiving funding from AIPAC', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    text: 'Donors of AIPAC', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v4m-2-2h4m6 10v4m-2-2h4M5 3a2 2 0 00-2 2v1m16-3a2 2 0 012 2v1m0 10a2 2 0 01-2 2h-1m-16-5a2 2 0 00-2 2v1m16-3a2 2 0 012 2v1" />
      </svg>
    )
  },
  { 
    text: 'Key takeaways from the last G7 summit',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.293l.707-.707a2 2 0 012.828 0l.707.707M7.707 4.293l-.707.707a2 2 0 000 2.828l.707.707m0-2.828l.707.707m2.121-2.121l.707-.707a2 2 0 012.828 0l.707.707m0-2.828l.707.707" />
      </svg>
    )
  },
];

type ActionButtonProps = {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled: boolean;
  children: React.ReactNode;
};
// Fix: Refactored ActionButton to use a const arrow function with React.FC.
// The previous function declaration might have caused a subtle type inference issue
// with the TypeScript compiler, leading to false positive errors about missing 'children' props.
// This more explicit and common pattern for defining components with TypeScript should resolve the issue.
const ActionButton: React.FC<ActionButtonProps> = ({ onClick, disabled, children }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center space-x-2 py-2 px-4 bg-black/10 dark:bg-white/5 text-black font-semibold rounded-lg hover:bg-black/20 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 backdrop-blur-sm border border-white/10"
    >
      {children}
    </button>
  );
}

const App: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [response, setResponse] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState('Share');
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState<boolean>(true);
  const [updatesError, setUpdatesError] = useState<string | null>(null);
  const [keywordData, setKeywordData] = useState<KeywordData[]>([]);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    return 'dark';
  });

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any | null>(null);
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    const getUpdates = async () => {
        setIsLoadingUpdates(true);
        setUpdatesError(null);
        try {
            const updates = await fetchLiveUpdates();
            setLiveUpdates(updates);
        } catch (e) {
            if (e instanceof Error) {
                setUpdatesError(e.message);
            } else {
                setUpdatesError('Failed to fetch live updates.');
            }
            console.error(e);
        } finally {
            setIsLoadingUpdates(false);
        }
    };
    getUpdates();
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.lang = 'en-US';
    recognitionInstance.interimResults = true;

    recognitionInstance.onstart = () => {
      setIsListening(true);
    };
    recognitionInstance.onend = () => {
      setIsListening(false);
    };
    recognitionInstance.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setError(`Voice recognition error: ${event.error}. Please check microphone permissions.`);
      setIsListening(false);
    };
    recognitionInstance.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setQuery(finalTranscript || interimTranscript);
    };
    
    recognitionRef.current = recognitionInstance;
  }, [SpeechRecognition]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setQuery('');
      recognitionRef.current.start();
    }
  };

  const handleResearch = useCallback(async (researchQuery: string) => {
    if (!researchQuery.trim()) {
      setError('Please enter a research query.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setSources([]);
    setKeywordData([]);
    setSubmittedQuery(researchQuery);

    try {
      const result: GenerateContentResponse = await fetchGroundedResponse(researchQuery);
      const textResponse = result.text;
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || [];
      
      setResponse(textResponse);
      setSources(groundingChunks);
      if (textResponse) {
        setKeywordData(analyzeKeywords(textResponse));
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleResearch(suggestion);
  };

  const handleFollowUp = useCallback(async (action: 'refine' | 'summarize') => {
    if (!response) return;

    const originalResponse = response;
    const originalSources = sources;
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setSources([]);
    setKeywordData([]);
    
    let followUpPrompt = '';
    if (action === 'refine') {
      followUpPrompt = `Based on the original query "${submittedQuery}", please provide a more detailed and refined version of the following response:\n\n${originalResponse}`;
    } else { // summarize
      followUpPrompt = `Please provide a concise summary of the following text:\n\n${originalResponse}`;
    }

    try {
      const result = await fetchGroundedResponse(followUpPrompt);
      const textResponse = result.text;
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || [];
      setResponse(textResponse);
       // Keep original sources on follow-up, or add new ones if any
      setSources(groundingChunks.length > 0 ? groundingChunks : originalSources);
      if (textResponse) {
        setKeywordData(analyzeKeywords(textResponse));
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unexpected error occurred during the follow-up action.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [response, submittedQuery, sources]);

  const handleShare = useCallback(async () => {
    if (!response) return;
    
    let sourcesText = '';
    if (sources.length > 0) {
      sourcesText = '\n\nSources:\n' + sources.map((s, i) => `${i+1}. ${s.web.title} - ${s.web.uri}`).join('\n');
    }

    const shareData = {
      title: 'AIPAC Research Assistant Response',
      text: `Query: ${submittedQuery}\n\nResponse:\n${response}${sourcesText}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n\nFrom: ${shareData.url}`);
        setShareFeedback('Copied!');
        setTimeout(() => setShareFeedback('Share'), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        setShareFeedback('Failed!');
         setTimeout(() => setShareFeedback('Share'), 2000);
      }
    }
  }, [response, submittedQuery, sources]);
  
  const renderResponse = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      paragraph = paragraph.trim();
      if (paragraph.startsWith('* ')) {
        return <li key={index} className="ml-6 list-disc">{paragraph.substring(2)}</li>;
      }
      if (paragraph.length > 0) {
        return <p key={index} className="mb-4 leading-relaxed">{paragraph}</p>;
      }
      return null;
    });
  };

  return (
    <div className="min-h-screen font-sans text-black">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-brand-dark transition-colors duration-300"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      </div>

      <main className="container mx-auto px-4 py-16 md:py-24">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-serif font-extrabold text-black mb-2">
            AIPAC Research Assistant
          </h1>
          <p className="mt-2 text-lg text-black max-w-2xl mx-auto">
            Leverage AI grounded in Google Search for current, factual, and sourced answers.
          </p>
        </header>

        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isListening ? 'Listening...' : 'track AIPAC...'}
              className="w-full p-4 pr-28 border-0 rounded-xl bg-black/10 dark:bg-white/5 focus:ring-2 focus:ring-brand-blue focus:outline-none transition duration-300 resize-none backdrop-blur-sm text-lg text-black dark:placeholder-gray-500"
              rows={2}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleResearch(query);
                }
              }}
            />
            {SpeechRecognition && (
              <button
                onClick={handleToggleListening}
                disabled={isLoading}
                className={`absolute top-1/2 right-16 -translate-y-1/2 p-2 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-brand-dark ${isListening ? 'text-red-500' : 'text-gray-500 hover:text-blue-500'}`}
                aria-label={isListening ? 'Stop listening' : 'Start voice search'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isListening ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => handleResearch(query)}
              disabled={isLoading || !query.trim()}
              className="absolute top-1/2 right-3 -translate-y-1/2 p-2 bg-brand-blue text-white rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
              aria-label="Submit research query"
            >
              {isLoading ? (
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-white/50 border-t-white"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-sm text-black opacity-80 mt-3">Press Enter to submit.</p>
        </div>

        {/* Suggested Queries */}
        {!isLoading && !response && sources.length === 0 && (
          <div className="max-w-4xl mx-auto mt-10 text-center">
            <p className="text-black mb-4">Not sure where to start? Try one of these:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {suggestedQueries.map(({ text, icon }) => (
                <button
                  key={text}
                  onClick={() => handleSuggestionClick(text)}
                  className="flex items-center space-x-3 py-2 px-4 bg-black/10 dark:bg-white/5 text-black font-medium rounded-lg hover:bg-black/20 dark:hover:bg-white/10 transition-all duration-300 backdrop-blur-sm border border-white/10"
                >
                  {icon}
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto mt-12 space-y-12">
          {/* Live Updates Section */}
          <div>
            <h2 className="text-2xl font-serif font-bold mb-4 text-black flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Live AIPAC Updates</span>
            </h2>
            {isLoadingUpdates && <LoadingSpinner />}
            {updatesError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm" role="alert">
                    <strong className="font-bold">Update Error: </strong>
                    <span className="block sm:inline">{updatesError}</span>
                </div>
            )}
            {!isLoadingUpdates && !updatesError && liveUpdates.length > 0 && (
                <div className="space-y-4">
                    {liveUpdates.map((update, index) => (
                        <LiveUpdateCard key={index} update={update} />
                    ))}
                </div>
            )}
          </div>
          
          {/* Main Search Results section */}
          {isLoading && <LoadingSpinner />}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {(!isLoading && (response || sources.length > 0)) && (
            <div className="space-y-12">
              {response && (
                <div>
                  <h2 className="text-3xl font-serif font-bold mb-4 text-black">Response</h2>
                  <div className="prose prose-lg max-w-none text-black">
                    {renderResponse(response)}
                  </div>
                  <div className="mt-8 flex flex-wrap items-center justify-start gap-3">
                    <ActionButton onClick={() => handleFollowUp('refine')} disabled={isLoading}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      <span>Refine</span>
                    </ActionButton>
                    <ActionButton onClick={() => handleFollowUp('summarize')} disabled={isLoading}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <span>Summarize</span>
                    </ActionButton>
                    <ActionButton onClick={handleShare} disabled={isLoading || shareFeedback !== 'Share'}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      <span>{shareFeedback}</span>
                    </ActionButton>
                  </div>
                </div>
              )}
              
              {keywordData.length > 0 && (
                <div>
                  <h2 className="text-3xl font-serif font-bold mb-6 text-black">Keyword Frequency</h2>
                  <KeywordChart data={keywordData} theme={theme as 'light' | 'dark'} />
                </div>
              )}

              {sources.length > 0 && (
                <div>
                  <h2 className="text-3xl font-serif font-bold mb-6 text-black">Sources</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources.map((source, index) => (
                      <SourceCard key={index} source={source} index={index} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;