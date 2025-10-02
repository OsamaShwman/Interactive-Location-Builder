import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Location } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const stripHtml = (html: string | null): string => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

interface SortableLocationItemProps {
    id: string;
    location: Location;
    onSelectLocation: (location: Location) => void;
    onDeleteLocation: (id: string) => void;
    onStartEdit: (location: Location) => void;
    isSortingDisabled: boolean;
}

export const SortableLocationItem: React.FC<SortableLocationItemProps> = ({ id, location, onSelectLocation, onDeleteLocation, onStartEdit, isSortingDisabled }) => {
    const { t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({id: id, disabled: isSortingDisabled});

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);
    
    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(prev => !prev);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartEdit(location);
        setIsMenuOpen(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteLocation(id);
        setIsMenuOpen(false);
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        // Use a faster, custom transition when sorting to make the UI feel more responsive.
        // The `transition` prop from useSortable is null for the actively dragged item,
        // preventing it from having a laggy animation.
        transition: transition ? 'transform 150ms ease-out' : undefined,
        zIndex: isDragging ? 10 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <li 
            ref={setNodeRef} 
            style={style} 
            className="flex items-center p-3 rounded-lg bg-white hover:bg-sky-50/70 border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200"
        >
            {!isSortingDisabled && (
                <button 
                    {...attributes} 
                    {...listeners} 
                    className="drag-handle flex-shrink-0 ltr:mr-2 rtl:ml-2 p-1 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-sky-500 rounded"
                    aria-label={t('dragAriaLabel')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            )}
            <div 
                className="flex-1 flex items-center space-x-4 rtl:space-x-reverse cursor-pointer min-w-0"
                onClick={() => onSelectLocation(location)}
                role="button"
                aria-label={t('viewAriaLabel', { title: location.title })}
            >
                <img 
                    src={location.image || 'https://images.unsplash.com/photo-1517011631245-1b0a33feb3bf?q=80&w=2574&auto=format&fit=crop'} 
                    alt={location.title}
                    className="w-16 h-16 rounded-md object-cover bg-slate-200 flex-shrink-0"
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1517011631245-1b0a33feb3bf?q=80&w=2574&auto=format&fit=crop'; }}
                />
                <div className="min-w-0">
                    <p className="text-md font-semibold text-slate-800 truncate">{location.title}, {location.country}</p>
                    <p className="text-sm text-slate-500 truncate">{stripHtml(location.description)}</p>
                </div>
            </div>
            <div className="relative flex-shrink-0 ltr:ml-2 rtl:mr-2">
                <button
                    type="button"
                    onClick={handleMenuToggle}
                    aria-label={t('moreOptionsAriaLabel', { title: location.title })}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
                {isMenuOpen && (
                    <div
                        ref={menuRef}
                        className="absolute top-full rtl:left-0 ltr:right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                        role="menu"
                        aria-orientation="vertical"
                        tabIndex={-1}
                    >
                        <ul role="none">
                            <li role="none">
                                <button
                                    onClick={handleEdit}
                                    className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                    role="menuitem"
                                    tabIndex={-1}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ltr:mr-3 rtl:ml-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                    </svg>
                                    <span>{t('editMenuItem')}</span>
                                </button>
                            </li>
                            <li role="none">
                                <button
                                    onClick={handleDelete}
                                    className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                                    role="menuitem"
                                    tabIndex={-1}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ltr:mr-3 rtl:ml-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                    </svg>
                                    <span>{t('deleteMenuItem')}</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </li>
    );
};