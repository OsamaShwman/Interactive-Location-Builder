import React, { useState, useEffect, FormEvent, useRef } from 'react';
import type { LatLngTuple } from 'leaflet';
import type { Location, Question, QuestionType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI } from '@google/genai';

// Quill is loaded from a script tag in index.html
declare const Quill: any;

interface LocationFormProps {
  selectedCoords: LatLngTuple | null;
  selectedCountry: string | null;
  isGeocoding: boolean;
  onSave: (formData: {
    title: string;
    description: string;
    image: string;
    video: string;
    audio: string;
    questions: Question[];
    block_navigation: boolean;
  }) => Promise<void>;
  editingLocation: Location | null;
  onCancelEdit: () => void;
}

const LocationForm: React.FC<LocationFormProps> = ({ selectedCoords, selectedCountry, isGeocoding, onSave, editingLocation, onCancelEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [blockNavigation, setBlockNavigation] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const { t, language } = useLanguage();

  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<any>(null); // To hold the Quill instance

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !description || !selectedCoords || !selectedCountry) {
      alert(t('formAlert'));
      return;
    }
    await onSave({ title, description, image: imageUrl, video: videoUrl, audio: audioUrl, questions, block_navigation: blockNavigation });
  };
  
  // Initialize Quill editor
  useEffect(() => {
    if (quillRef.current && !quillInstance.current) {
      const editor = new Quill(quillRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link'],
            ['clean'],
          ],
        },
        placeholder: t('descriptionPlaceholder'),
      });

      quillInstance.current = editor;

      // Listen for changes and update state
      editor.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
        if (source === 'user') {
          let html = editor.root.innerHTML;

          if (editor.getText().trim().length === 0) {
            html = '';
          } else {
            try {
              const doc = new DOMParser().parseFromString(html, 'text/html');
              const firstChild = doc.body.firstChild;

              // If the body's only child is a paragraph, unwrap it. This is a common
              // case for single-line descriptions from Quill and prevents the <p> tag
              // from being displayed as raw text in some consumer applications.
              if (doc.body.childNodes.length === 1 && firstChild?.nodeName === 'P') {
                html = (firstChild as HTMLElement).innerHTML;
              } else {
                // For more complex content (multiple paragraphs, lists, etc.),
                // use the full, cleaned HTML from the body.
                html = doc.body.innerHTML;
              }
            } catch (e) {
              console.error('Could not process HTML from editor', e);
              // Fallback to raw innerHTML if parser fails to prevent data loss
            }
          }
          
          // After unwrapping, we might be left with just a break tag for an empty line.
          if (html === '<br>') {
            html = '';
          }
          setDescription(html);
        }
      });
    }

    if (quillInstance.current) {
      quillInstance.current.root.dataset.placeholder = t('descriptionPlaceholder');
    }
  }, [t]);

  // Sync component state with editor for editing/clearing
  useEffect(() => {
    const quill = quillInstance.current;
    if (quill) {
        if (editingLocation) {
            setTitle(editingLocation.title);
            setImageUrl(editingLocation.image || '');
            setVideoUrl(editingLocation.video || '');
            setAudioUrl(editingLocation.audio || '');
            setQuestions(editingLocation.questions || []);
            setBlockNavigation(editingLocation.block_navigation || false);
            if (quill.root.innerHTML !== editingLocation.description) {
                quill.root.innerHTML = editingLocation.description;
                setDescription(editingLocation.description);
            }
        } else if (!selectedCoords) {
            // Clear form
            setTitle('');
            setImageUrl('');
            setVideoUrl('');
            setAudioUrl('');
            setQuestions([]);
            setBlockNavigation(false);
            if (quill.root.innerHTML !== '') {
                quill.root.innerHTML = '';
                setDescription('');
            }
        }
    }
  }, [editingLocation, selectedCoords]);
  
  const isFormDisabled = !selectedCoords;

  // Enable/disable editor
  useEffect(() => {
    const quill = quillInstance.current;
    if (quill) {
        quill.enable(!isFormDisabled);
    }
  }, [isFormDisabled]);

  const handleGenerateDescription = async () => {
    if (!selectedCoords) return;

    setIsGeneratingDescription(true);
    const quill = quillInstance.current;
    if (!quill) {
      setIsGeneratingDescription(false);
      return;
    }
    
    quill.setText('');
    setDescription('');

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const langName = language === 'ar' ? 'Arabic' : 'English';
      const prompt = `Generate a captivating, single-paragraph description for a tourist location at latitude ${selectedCoords[0]}, longitude ${selectedCoords[1]}. Include any interesting landmarks or facts. The location is in ${selectedCountry || 'an unknown country'}. The description should be suitable for a travel guide app. Respond in ${langName}.`;

      const stream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: prompt,
      });
      
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          // 'api' source prevents triggering 'text-change' handler during stream
          quill.insertText(quill.getLength(), chunkText, 'api');
        }
      }
      
      // Manually trigger the state update logic after stream ends to clean up HTML
      let finalHtml = quill.root.innerHTML;
      if (quill.getText().trim().length === 0) {
        finalHtml = '';
      }
      // Unwrapping logic to avoid unnecessary <p> tags for simple text
      else if (!finalHtml.includes('</p><p>') && finalHtml.startsWith('<p>') && finalHtml.endsWith('</p>')) {
        finalHtml = finalHtml.substring(3, finalHtml.length - 4);
      }
      if (finalHtml === '<br>') finalHtml = '';
      setDescription(finalHtml);

    } catch (error) {
      console.error("AI description generation failed:", error);
      alert(t('alert_aiError'));
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions(prev => [...prev, {
      id: `q_${Date.now()}`,
      text: '',
      type: 'short_answer',
      answer: ''
    }]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    const question = { ...newQuestions[index], [field]: value };

    // Reset dependent fields when type changes
    if (field === 'type') {
        question.answer = '';
        if (value === 'multiple_choice') {
            question.options = ['', ''];
        } else {
            delete question.options;
        }
        if (value === 'true_false') {
            question.answer = 'true';
        }
    }
    
    newQuestions[index] = question;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
      const newQuestions = [...questions];
      const question = newQuestions[qIndex];
      if (question.options) {
        // If the updated option was the correct answer, update the answer value as well
        if (question.answer === question.options[oIndex]) {
            question.answer = text;
        }
        question.options[oIndex] = text;
        setQuestions(newQuestions);
      }
  };

  const handleAddOption = (qIndex: number) => {
      const newQuestions = [...questions];
      const question = newQuestions[qIndex];
      if (question.options) {
          question.options.push('');
          setQuestions(newQuestions);
      }
  };
  
  const handleRemoveOption = (qIndex: number, oIndex: number) => {
      const newQuestions = [...questions];
      const question = newQuestions[qIndex];
      if (question.options && question.options.length > 1) {
          // If the removed option was the correct answer, clear the answer
          if (question.answer === question.options[oIndex]) {
              question.answer = '';
          }
          question.options.splice(oIndex, 1);
          setQuestions(newQuestions);
      }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-sky-100 border border-sky-200">
        <h2 className="text-lg font-semibold text-slate-800">
          {editingLocation 
            ? t('editingTitle', { title: editingLocation.title })
            : selectedCoords 
              ? t('step2Title') 
              : t('step1Title')}
        </h2>
        <div className="text-sm text-slate-600 mt-1 min-h-[40px] flex flex-col justify-center">
            {!selectedCoords && !editingLocation && <p>{t('step1Instruction')}</p>}
            {selectedCoords && (
                <>
                    <p>{t('coordinatesLabel')}: {selectedCoords[0].toFixed(4)}, {selectedCoords[1].toFixed(4)}</p>
                    {isGeocoding && (
                        <div className="flex items-center font-medium">
                            <svg className="animate-spin ltr:mr-2 rtl:ml-2 h-4 w-4 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{t('detectingCountry')}</span>
                        </div>
                    )}
                    {!isGeocoding && selectedCountry && (
                        <p className="font-medium">{t('countryLabel')}: <span className="text-sky-800 font-bold">{selectedCountry}</span></p>
                    )}
                </>
            )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">{t('titleLabel')}</label>
          <input type="text" name="title" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isFormDisabled} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed" />
        </div>
        
        <div>
           <div className="flex justify-between items-center">
             <label htmlFor="description" className="block text-sm font-medium text-slate-700">{t('descriptionLabel')}</label>
             <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={isFormDisabled || isGeneratingDescription}
              className="inline-flex items-center gap-x-1.5 rounded-md bg-sky-50 px-2 py-1 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              title={t('generateDescriptionTooltip')}
             >
              {isGeneratingDescription ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 01.867.5l.434 1.29a1 1 0 00.95.69h1.383a1 1 0 01.98.804l.245 1.414a1 1 0 00.418.815l1.135.81a1 1 0 010 1.664l-1.135.81a1 1 0 00-.418.815l-.245 1.414a1 1 0 01-.98.804h-1.383a1 1 0 00-.95.69l-.434 1.29a1 1 0 01-1.734 0l-.434-1.29a1 1 0 00-.95-.69H5.02a1 1 0 01-.98-.804l-.245-1.414a1 1 0 00-.418-.815L2.242 10.5a1 1 0 010-1.664l1.135-.81a1 1 0 00.418-.815l.245-1.414A1 1 0 015.02 5h1.383a1 1 0 00.95-.69l.434-1.29A1 1 0 0110 3zM6 14a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2zm-4-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                  </svg>
              )}
              <span>{isGeneratingDescription ? t('generatingDescription') : t('generateDescriptionButton')}</span>
             </button>
           </div>
           <div className={`mt-1 location-form-quill-wrapper ${isFormDisabled ? 'quill-disabled' : ''}`}>
              <div ref={quillRef} />
           </div>
        </div>

        <fieldset id="media-urls-fieldset" className="space-y-4" disabled={isFormDisabled}>
          <legend className="text-sm font-medium text-slate-700">{t('mediaUrlsLegend')}</legend>
          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-slate-700">{t('imageUrlLabel')}</label>
            <input type="url" name="imageUrl" id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={isFormDisabled} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed" />
          </div>
          <div>
            <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-700">{t('videoUrlLabel')}</label>
            <input type="url" name="videoUrl" id="videoUrl" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={isFormDisabled} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed" />
          </div>
          <div>
            <label htmlFor="audioUrl" className="block text-sm font-medium text-slate-700">{t('audioUrlLabel')}</label>
            <input type="url" name="audioUrl" id="audioUrl" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} disabled={isFormDisabled} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed" />
          </div>
        </fieldset>

        <fieldset className="space-y-4" disabled={isFormDisabled}>
            <legend className="text-sm font-medium text-slate-700">{t('questionsLegend')}</legend>
            <p className="text-xs text-slate-500">{t('questionsSubtitle')}</p>

            {questions.length > 0 ? (
                <div className="space-y-6">
                    {questions.map((q, qIndex) => (
                        <div key={q.id} className="p-4 border border-slate-200 rounded-lg bg-white space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <label htmlFor={`q-text-${q.id}`} className="block text-sm font-medium text-slate-600">{t('questionTextLabel')} #{qIndex + 1}</label>
                                    <input
                                        type="text"
                                        id={`q-text-${q.id}`}
                                        value={q.text}
                                        onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                                        placeholder={t('questionTextPlaceholder')}
                                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                    />
                                </div>
                                <button type="button" onClick={() => handleRemoveQuestion(qIndex)} className="ltr:ml-3 rtl:mr-3 mt-7 p-1.5 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500" title={t('removeQuestionButton')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                </button>
                            </div>

                            <div>
                                <label htmlFor={`q-type-${q.id}`} className="block text-sm font-medium text-slate-600">{t('questionTypeLabel')}</label>
                                <select id={`q-type-${q.id}`} value={q.type} onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value as QuestionType)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white text-slate-900 text-base border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md">
                                    <option value="short_answer">{t('questionTypeShortAnswer')}</option>
                                    <option value="true_false">{t('questionTypeTrueFalse')}</option>
                                    <option value="multiple_choice">{t('questionTypeMultipleChoice')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600">{t('answerLabel')}</label>
                                {q.type === 'short_answer' && <input type="text" value={q.answer} onChange={(e) => handleQuestionChange(qIndex, 'answer', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />}
                                {q.type === 'true_false' && (
                                    <div className="mt-2 flex items-center space-x-4 rtl:space-x-reverse">
                                        <label className="flex items-center"><input type="radio" name={`q-answer-${q.id}`} value="true" checked={q.answer === 'true'} onChange={(e) => handleQuestionChange(qIndex, 'answer', e.target.value)} className="focus:ring-sky-500 h-4 w-4 text-sky-600 border-slate-300" /> <span className="ltr:ml-2 rtl:mr-2 text-sm">{t('quizTrue')}</span></label>
                                        <label className="flex items-center"><input type="radio" name={`q-answer-${q.id}`} value="false" checked={q.answer === 'false'} onChange={(e) => handleQuestionChange(qIndex, 'answer', e.target.value)} className="focus:ring-sky-500 h-4 w-4 text-sky-600 border-slate-300" /> <span className="ltr:ml-2 rtl:mr-2 text-sm">{t('quizFalse')}</span></label>
                                    </div>
                                )}
                                {q.type === 'multiple_choice' && (
                                    <div className="mt-2 space-y-2">
                                        <p className="text-xs text-slate-500">{t('optionsLabel')}</p>
                                        {q.options?.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center space-x-2 rtl:space-x-reverse">
                                                <button type="button" onClick={() => handleQuestionChange(qIndex, 'answer', opt)} title={t('markAsCorrectAriaLabel')} className={`p-1 rounded-full ${q.answer === opt ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                </button>
                                                <input type="text" value={opt} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} className="block w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
                                                <button type="button" onClick={() => handleRemoveOption(qIndex, oIndex)} title={t('removeOptionAriaLabel')} className="p-1.5 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600" disabled={q.options && q.options.length <= 1}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => handleAddOption(qIndex)} className="text-sm font-medium text-sky-600 hover:text-sky-800">+ {t('addOptionButton')}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 border-2 border-dashed border-slate-300 rounded-lg">
                    <p className="text-sm text-slate-600">{t('noQuestionsTitle')}</p>
                </div>
            )}
            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ltr:mr-2 rtl:ml-2 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                {questions.length > 0 ? t('addAnotherQuestionButton') : t('addQuestionButton')}
            </button>
        </fieldset>

         <div>
          <label className="relative flex justify-between items-center text-sm font-medium text-slate-700 select-none">
            <span>
              {t('blockNavigationLabel')}
              <p className="text-xs text-slate-500 font-normal max-w-xs">{t('blockNavigationDescription')}</p>
            </span>
            <input
              type="checkbox"
              checked={blockNavigation}
              onChange={(e) => setBlockNavigation(e.target.checked)}
              disabled={isFormDisabled || questions.length === 0}
              className="w-10 h-5 bg-slate-200 checked:bg-none checked:bg-sky-600 rounded-full transition-all duration-300 before:content-[''] before:absolute before:w-5 before:h-5 before:bg-white checked:before:translate-x-5 before:shadow-md before:rounded-full before:transition-all before:duration-300 appearance-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>

        <div className="flex space-x-4 rtl:space-x-reverse pt-4 border-t border-slate-200">
          <button type="submit" disabled={isFormDisabled || !title || !description || isGeneratingDescription} className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed">
            {editingLocation ? t('saveChangesButton') : t('addLocationButton')}
          </button>
          {editingLocation && (
            <button type="button" onClick={onCancelEdit} className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
                {t('cancelButton')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default LocationForm;