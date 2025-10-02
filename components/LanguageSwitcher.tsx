import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
    const { toggleLanguage, t } = useLanguage();

    return (
        <button
            onClick={toggleLanguage}
            className="p-2 rounded-full text-slate-500 hover:bg-sky-100 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            title={t('toggleLanguageTooltip')}
            aria-label={t('toggleLanguageTooltip')}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 12h16.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3a17 17 0 000 18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 3a17 17 0 010 18" />
            </svg>
        </button>
    );
};

export default LanguageSwitcher;