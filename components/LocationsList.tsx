import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Location } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableLocationItem } from './SortableLocationItem';


interface LocationsListProps {
  locations: Location[];
  onSelectLocation: (location: Location) => void;
  onDeleteLocation: (id: string) => void;
  onStartEdit: (location: Location) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
}

const LocationsList: React.FC<LocationsListProps> = ({ locations, onSelectLocation, onDeleteLocation, onStartEdit, onReorder }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const { t } = useLanguage();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchVisible) {
      searchInputRef.current?.focus();
    }
  }, [isSearchVisible]);

  const toggleSearch = () => {
    if (isSearchVisible) {
      setSearchQuery('');
    }
    setIsSearchVisible(!isSearchVisible);
  };

  const filteredLocations = useMemo(() => {
    if (!searchQuery) {
      return locations;
    }
    return locations.filter(location =>
      location.country.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);
  
  const isSortingDisabled = !!searchQuery;
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      const oldIndex = locations.findIndex(loc => loc.id === active.id);
      const newIndex = locations.findIndex(loc => loc.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900">{t('createdLocationsTitle')}</h2>
        {locations.length > 0 && (
          <button
            onClick={toggleSearch}
            className="p-2 rounded-full text-slate-500 hover:bg-sky-100 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            title={t('toggleSearchTooltip')}
            aria-label={t('toggleSearchTooltip')}
            aria-expanded={isSearchVisible}
          >
            {isSearchVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      {isSearchVisible && locations.length > 0 && (
        <div className="relative mb-4">
          <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 ltr:pl-3 rtl:pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full ltr:pl-10 rtl:pr-10 ltr:pr-3 rtl:pl-3 py-2 border border-slate-300 rounded-md leading-5 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            aria-label={t('searchLocationsAriaLabel')}
          />
        </div>
      )}

      {locations.length === 0 ? (
        <div className="flex items-center space-x-4 rtl:space-x-reverse p-6 border-2 border-dashed border-sky-300 rounded-lg">
          <div className="flex-shrink-0">
             <svg className="h-12 w-12 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-sky-900">{t('noLocationsTitle')}</h3>
            <p className="mt-1 text-sm text-sky-700">{t('noLocationsSubtitle')}</p>
          </div>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="flex items-center space-x-4 rtl:space-x-reverse p-6 border-2 border-dashed border-slate-300 rounded-lg">
          <div className="flex-shrink-0">
            <svg className="h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-800">{t('noMatchTitle')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('noMatchSubtitle')}</p>
          </div>
        </div>
      ) : (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={locations.map(l => l.id)} strategy={verticalListSortingStrategy} disabled={isSortingDisabled}>
                <ul className="space-y-3">
                {filteredLocations.map((loc) => (
                    <SortableLocationItem 
                        key={loc.id} 
                        id={loc.id} 
                        location={loc}
                        onSelectLocation={onSelectLocation}
                        onStartEdit={onStartEdit}
                        onDeleteLocation={onDeleteLocation}
                        isSortingDisabled={isSortingDisabled}
                    />
                ))}
                </ul>
            </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default LocationsList;