import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface TourStep {
  selector: string;
  title?: string;
  content: string;
}

interface TourGuideProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

const TourGuide: React.FC<TourGuideProps> = ({ steps, isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const currentStep = steps[currentStepIndex];

  const updateTargetRect = () => {
    const element = document.querySelector(currentStep.selector);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateTargetRect();
      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect, true); // Use capture phase for scroll
      return () => {
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect, true);
      };
    }
  }, [isOpen, currentStepIndex, currentStep.selector]);

  // Scroll to the element if it's not in view
  useEffect(() => {
    if(isOpen) {
      const element = document.querySelector(currentStep.selector);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [currentStepIndex, isOpen, currentStep.selector]);


  if (!isOpen || !targetRect) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${targetRect.top - 4}px`,
    left: `${targetRect.left - 4}px`,
    width: `${targetRect.width + 8}px`,
    height: `${targetRect.height + 8}px`,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
    borderRadius: '8px',
    transition: 'all 0.3s ease-in-out',
    pointerEvents: 'none',
    zIndex: 10000,
  };

  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${targetRect.top + targetRect.height / 2}px`,
    zIndex: 10001,
    transition: 'all 0.3s ease-in-out',
  };

  // Heuristic to decide popover placement:
  // If the target element's center is in the left half of the screen,
  // place the popover to its right. Otherwise, place it to the left.
  // This prevents the popover from appearing off-screen.
  const targetCenter = targetRect.left + targetRect.width / 2;
  const screenCenter = window.innerWidth / 2;

  if (targetCenter < screenCenter) {
    // Target is on the left, show popover on the right.
    // The highlight has a 4px outset, so right + 4px + 12px gap = right + 16px.
    popoverStyle.left = `${targetRect.right + 16}px`;
    popoverStyle.transform = 'translateY(-50%)';
  } else {
    // Target is on the right, show popover on the left.
    // The highlight has a 4px outset, so left - 4px - 12px gap = left - 16px.
    popoverStyle.left = `${targetRect.left - 16}px`;
    popoverStyle.transform = 'translate(-100%, -50%)';
  }


  return (
    <>
      <div style={highlightStyle} />
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-80 max-w-[calc(100vw-16px)] bg-white rounded-lg shadow-2xl p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        {currentStep.title && (
            <h3 id="tour-title" className="text-lg font-bold text-slate-900 mb-2">{currentStep.title}</h3>
        )}
        <p id="tour-content" className="text-sm text-slate-600 mb-4">{currentStep.content}</p>
        <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            >
              {t('tourSkipButton')}
            </button>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="text-sm text-slate-500">
              {currentStepIndex + 1} / {steps.length}
            </div>
            {currentStepIndex > 0 && (
              <button
                onClick={handleBack}
                className="py-1.5 px-3 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
              >
                {t('tourBackButton')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="py-1.5 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              {currentStepIndex === steps.length - 1 ? t('tourFinishButton') : t('tourNextButton')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TourGuide;