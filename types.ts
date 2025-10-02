import type { LatLngTuple } from 'leaflet';

export type QuestionType = 'short_answer' | 'true_false' | 'multiple_choice';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  answer: string;
}

export interface Location {
  id:string;
  title: string;
  country: string;
  description: string;
  image: string;
  video: string | null;
  audio: string | null;
  coordinates: LatLngTuple;
  questions?: Question[];
  block_navigation?: boolean;
}

export interface Place {
  place_id: number;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
  display_name: string;
}