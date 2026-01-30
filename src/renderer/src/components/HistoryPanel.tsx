import React from 'react';
import { VideoHistoryItem } from '../types';

interface HistoryPanelProps {
  videoHistory: VideoHistoryItem[];
  handleDownload: (video: VideoHistoryItem) => void;
  handleView: (video: VideoHistoryItem) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  videoHistory,
  handleDownload,
  handleView
}) => {
  return (
    <div className="h-full bg-[#0f1420] flex flex-col">
      {/* Header - Fixed */}
      <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Historial</h3>
          <span className="ml-auto text-sm px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">{videoHistory.length}</span>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {videoHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-slate-500 text-sm">No hay videos generados aún</p>
            <p className="text-slate-600 text-xs mt-1">Crea tu primer video para comenzar</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {videoHistory.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 rounded-lg p-4 transition-all cursor-pointer group"
                onClick={() => handleView(item)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                      {item.theme}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item.time}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(item);
                    }}
                    className="flex-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(item);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Ubicación
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default HistoryPanel;
