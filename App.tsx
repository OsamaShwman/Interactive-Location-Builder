import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { LatLngTuple, LatLngBoundsExpression } from 'leaflet';
import MapComponent from './components/MapComponent';
import LocationForm from './components/LocationForm';
import LocationsList from './components/LocationsList';
import MapSearchControl from './components/MapSearchControl';
import LanguageSwitcher from './components/LanguageSwitcher';
import TourGuide from './components/TourGuide';
import { useLanguage } from './contexts/LanguageContext';
import type { Location, Question, Place } from './types';

const validateLocationsData = (data: any): Location[] | null => {
  if (!Array.isArray(data)) {
    return null;
  }
  const validLocations = data.filter(
    (loc: any): loc is Location =>
      loc &&
      typeof loc.id === 'string' &&
      typeof loc.title === 'string' &&
      typeof loc.country === 'string' &&
      typeof loc.description === 'string' &&
      typeof loc.image === 'string' &&
      (loc.video === null || typeof loc.video === 'string') &&
      (loc.audio === null || typeof loc.audio === 'string') &&
      Array.isArray(loc.coordinates) &&
      loc.coordinates.length === 2 &&
      typeof loc.coordinates[0] === 'number' &&
      typeof loc.coordinates[1] === 'number' &&
      (loc.questions === undefined || (
        Array.isArray(loc.questions) &&
        loc.questions.every((q: any) => 
          q &&
          typeof q.id === 'string' &&
          typeof q.text === 'string' &&
          ['short_answer', 'true_false', 'multiple_choice'].includes(q.type) &&
          typeof q.answer === 'string' &&
          (q.options === undefined || (Array.isArray(q.options) && q.options.every((opt: any) => typeof opt === 'string')))
        )
      )) &&
      (loc.block_navigation === undefined || typeof loc.block_navigation === 'boolean')
  );

  // Ensure all items in the original array were valid by comparing lengths
  if (validLocations.length !== data.length) {
    return null;
  }

  return validLocations;
};


const App: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const { t, language } = useLanguage();
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  useEffect(() => {
    try {
      const storedLocations = localStorage.getItem('locations');
      if (storedLocations) {
        const parsedData = JSON.parse(storedLocations);
        const validatedLocations = validateLocationsData(parsedData);
        if (validatedLocations) {
          setLocations(validatedLocations);
        } else {
          console.warn('Invalid location data in localStorage, clearing it.');
          localStorage.removeItem('locations');
        }
      }
    } catch (e) {
      console.error('Failed to parse locations from localStorage', e);
    }
  }, []);

  useEffect(() => {
    const tourViewed = localStorage.getItem('tourViewed');
    if (!tourViewed) {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateStoredLocations = (updatedLocations: Location[]) => {
    localStorage.setItem('locations', JSON.stringify(updatedLocations));
  };

  const insert = useCallback(async (newLocation: Location) => {
    setLocations(prevLocations => {
      const updatedLocations = [...prevLocations, newLocation];
      updateStoredLocations(updatedLocations);
      return updatedLocations;
    });
  }, []);
  
  const [selectedCoords, setSelectedCoords] = useState<LatLngTuple | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [viewCoords, setViewCoords] = useState<LatLngTuple>([31.963158, 35.930359]); // Amman, Jordan
  const [viewZoom, setViewZoom] = useState<number>(8);
  const [boundsToFit, setBoundsToFit] = useState<LatLngBoundsExpression | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const formRef = useRef<HTMLDivElement>(null);


  const handleMapClick = useCallback(async (coords: LatLngTuple) => {
    setIsGeocoding(true);
    setSelectedCoords(coords);
    setSelectedCountry(null); // Reset while fetching
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords[0]}&lon=${coords[1]}`, {
        headers: {
          'Accept-Language': language,
        }
      });
      const data = await response.json();
      if (data && data.address && data.address.country) {
        setSelectedCountry(data.address.country);
      } else {
        alert(t('alert_noCountry'));
        if (!editingLocation) {
          setSelectedCoords(null); // Deselect only if not editing
        }
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      alert(t('alert_countryError'));
      if (!editingLocation) {
        setSelectedCoords(null);
      }
    } finally {
      setIsGeocoding(false);
    }
  }, [editingLocation, language, t]);

  const handleSaveLocation = async (formData: {
    title: string;
    description: string;
    image: string;
    video: string;
    audio: string;
    questions: Question[];
    block_navigation: boolean;
  }) => {
    if (!selectedCoords || !selectedCountry) {
      alert(t('formAlert'));
      return;
    }
      
    if (editingLocation) {
      // Update
      const updatedLocation: Location = {
        ...editingLocation,
        title: formData.title,
        description: formData.description,
        image: formData.image,
        video: formData.video || null,
        audio: formData.audio || null,
        coordinates: selectedCoords,
        country: selectedCountry,
        questions: formData.questions,
        block_navigation: formData.block_navigation,
      };
      setLocations(prev => {
        const updated = prev.map(loc => loc.id === editingLocation.id ? updatedLocation : loc);
        updateStoredLocations(updated);
        return updated;
      });
    } else {
      // Create
      const newLocation: Location = {
        id: new Date().toISOString(),
        title: formData.title,
        country: selectedCountry,
        description: formData.description,
        image: formData.image,
        video: formData.video || null,
        audio: formData.audio || null,
        coordinates: selectedCoords,
        questions: formData.questions,
        block_navigation: formData.block_navigation,
      };
      await insert(newLocation);
    }
    
    setSelectedCoords(null);
    setSelectedCountry(null);
    setEditingLocation(null);
  };

  const handleDeleteLocation = (id: string) => {
    if (editingLocation && editingLocation.id === id) {
      handleCancelEdit();
    }
    setLocations(prevLocations => {
      const updatedLocations = prevLocations.filter(loc => loc.id !== id);
      updateStoredLocations(updatedLocations);
      return updatedLocations;
    });
  };

  const handleSelectLocation = (location: Location) => {
    setViewCoords(location.coordinates);
    setViewZoom(13);
  };

  const handleStartEdit = (location: Location) => {
    setEditingLocation(location);
    setSelectedCoords(location.coordinates);
    setSelectedCountry(location.country);
    setViewCoords(location.coordinates);
    setViewZoom(13);
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    }
    setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300) // wait for sidebar animation
  };
  
  const handleCancelEdit = () => {
    setEditingLocation(null);
    setSelectedCoords(null);
    setSelectedCountry(null);
  };
  
  const handleBoundsFitted = useCallback(() => {
    setBoundsToFit(null);
  }, []);

  const handleExport = () => {
    if (locations.length === 0) {
      alert(t('alert_noExport'));
      return;
    }

    const dataStr = JSON.stringify(locations, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "locations.json";
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          alert(t('importError_file'));
          return;
        }

        if (!window.confirm(t('importConfirmation'))) {
          return;
        }

        try {
          const jsonData = JSON.parse(text);
          const validatedLocations = validateLocationsData(jsonData);

          if (validatedLocations) {
            setLocations(validatedLocations);
            updateStoredLocations(validatedLocations);
            alert(t('importSuccess'));
          } else {
            alert(t('importError_validation'));
          }
        } catch (error) {
          console.error("Import failed:", error);
          alert(t('importError_json'));
        }
      };
      reader.onerror = () => {
        alert(t('importError_file'));
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const zoomToPlace = (place: Place) => {
    const { lat, lon, boundingbox } = place;
    if (boundingbox) {
      const southWest: LatLngTuple = [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])];
      const northEast: LatLngTuple = [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])];
      setBoundsToFit([southWest, northEast]);
    } else {
      setViewCoords([parseFloat(lat), parseFloat(lon)]);
      setViewZoom(10);
    }
  }

  const handlePlaceSelect = (place: Place) => {
    zoomToPlace(place);
  };
  
  const handleSearch = async (query: string) => {
    if (!query) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
        headers: {
          'Accept-Language': language,
        }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        zoomToPlace(data[0]);
      } else {
        alert(t('alert_searchNotFound'));
      }
    } catch (error) {
      console.error("Failed to fetch search data:", error);
      alert(t('alert_searchError'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleReorderLocations = (oldIndex: number, newIndex: number) => {
    setLocations((prevLocations: Location[]) => {
        const items = Array.from(prevLocations);
        const [reorderedItem] = items.splice(oldIndex, 1);
        items.splice(newIndex, 0, reorderedItem);
        updateStoredLocations(items);
        return items;
    });
  };
  
  const handleTourClose = () => {
    setIsTourOpen(false);
    localStorage.setItem('tourViewed', 'true');
  };

  const handleClearAllLocations = () => {
    if (window.confirm(t('clearAllConfirmation'))) {
      setLocations([]);
      updateStoredLocations([]);
    }
  };

  const tourSteps = [
    {
      selector: '#map-search-input',
      content: t('tourStep1Content'),
    },
    {
      selector: '#map-container',
      content: t('tourStep2Content'),
    },
    {
      selector: '#location-form-wrapper',
      content: t('tourStep3Content'),
    },
    {
      selector: '#media-urls-fieldset',
      content: t('tourStep4Content'),
    },
    {
      selector: '#locations-list-container',
      content: t('tourStep5Content'),
    },
  ];

  return (
    <div className="flex h-screen w-screen font-sans bg-sky-50 text-slate-800 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* --- Left Control Panel --- */}
      <aside className={`w-[450px] max-w-[90vw] md:max-w-[35%] h-full flex flex-col bg-white shadow-lg z-20 transform transition-transform duration-300 ease-in-out ${language === 'ar' ? 'order-1 border-r-0 border-l border-slate-200' : 'border-r border-slate-200'} ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')}`}>
        <header className="p-6 border-b border-slate-200 flex-shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('headerTitle')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('headerSubtitle')}</p>
          </div>
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <button 
              onClick={() => setIsTourOpen(true)}
              className="p-2 rounded-full text-slate-500 hover:bg-sky-100 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
              title={t('startTourTooltip')}
              aria-label={t('startTourTooltip')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <LanguageSwitcher />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-sky-50">
          <div ref={formRef} className="scroll-mt-4" id="location-form-wrapper">
            <LocationForm
              selectedCoords={selectedCoords}
              selectedCountry={selectedCountry}
              isGeocoding={isGeocoding}
              onSave={handleSaveLocation}
              editingLocation={editingLocation}
              onCancelEdit={handleCancelEdit}
            />
          </div>
          <div id="locations-list-container">
            <LocationsList 
              locations={locations}
              onDeleteLocation={handleDeleteLocation}
              onSelectLocation={handleSelectLocation}
              onStartEdit={handleStartEdit}
              onReorder={handleReorderLocations}
            />
          </div>
        </div>
        
        <footer className="p-6 border-t border-slate-200 flex-shrink-0 bg-white">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
             <button
              onClick={handleImport}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-sky-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ltr:mr-2 rtl:ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              {t('importButton')}
            </button>
            <button
              onClick={handleExport}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-sky-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
              disabled={locations.length === 0}
              aria-disabled={locations.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ltr:mr-2 rtl:ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {t('exportButton')}
            </button>
            <button
              onClick={handleClearAllLocations}
              className="flex-initial inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-red-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
              disabled={locations.length === 0}
              aria-disabled={locations.length === 0}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ltr:mr-2 rtl:ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
              {t('clearAllButton')}
            </button>
          </div>
        </footer>
      </aside>
      
      {/* --- Right Map View --- */}
      <main id="map-container" className="flex-1 h-full z-10 relative">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 z-[1000] bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg text-slate-700 hover:bg-white hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-200"
          style={language === 'ar' ? { right: '1rem' } : { left: '1rem' }}
          title={t('toggleSidebarTooltip')}
          aria-label={t('toggleSidebarTooltip')}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? (
            language === 'ar' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            )
          ) : (
             language === 'ar' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            )
          )}
        </button>
        <MapSearchControl 
          onSearch={handleSearch} 
          onPlaceSelect={handlePlaceSelect} 
          isSearching={isSearching} 
        />
        <MapComponent
          locations={locations}
          selectedCoords={selectedCoords}
          onMapClick={handleMapClick}
          viewCoords={viewCoords}
          viewZoom={viewZoom}
          boundsToFit={boundsToFit}
          onBoundsFitted={handleBoundsFitted}
          editingLocation={editingLocation}
          isSidebarOpen={isSidebarOpen}
        />
      </main>

      {isTourOpen && (
        <TourGuide
          steps={tourSteps}
          isOpen={isTourOpen}
          onClose={handleTourClose} />
      )}
    </div>
  );
};

export default App;