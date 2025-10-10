
import React from 'react';
import { AppView } from '../types';

interface NavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const NavButton: React.FC<{
  label: string;
  view: AppView;
  isActive: boolean;
  isDisabled?: boolean;
  onClick: (view: AppView) => void;
}> = ({ label, view, isActive, isDisabled = false, onClick }) => {
  const baseClasses = "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";
  
  return (
    <button
      onClick={() => onClick(view)}
      disabled={isDisabled}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </button>
  );
};


const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
       <div className="text-center sm:text-left">
         <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
           Book Identifier AI
         </h1>
       </div>
       <nav className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 p-1.5 rounded-lg">
          <NavButton 
            label="1. Settings" 
            view="settings" 
            isActive={currentView === 'settings'} 
            onClick={onNavigate} 
          />
          <NavButton 
            label="2. Add Books" 
            view="upload" 
            isActive={currentView === 'upload'} 
            onClick={onNavigate} 
          />
          <NavButton 
            label="3. My Library" 
            view="library" 
            isActive={currentView === 'library'} 
            onClick={onNavigate}
          />
       </nav>
    </header>
  );
};

export default Navigation;
