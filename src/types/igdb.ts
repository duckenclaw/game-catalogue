// Basic IGDB API response interfaces

export interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  rating?: number;
  rating_count?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  first_release_date?: number;
  genres?: number[];
  platforms?: number[];
  cover?: number;
  screenshots?: number[];
  videos?: number[];
  websites?: number[];
  involved_companies?: number[];
  game_modes?: number[];
  themes?: number[];
  player_perspectives?: number[];
  url?: string;
  slug?: string;
}

export interface IGDBGenre {
  id: number;
  name: string;
  slug?: string;
  url?: string;
}

export interface IGDBPlatform {
  id: number;
  name: string;
  abbreviation?: string;
  slug?: string;
  url?: string;
  platform_logo?: number;
  platform_family?: number;
}

export interface IGDBCover {
  id: number;
  game: number;
  height: number;
  width: number;
  url: string;
  image_id: string;
}

export interface IGDBScreenshot {
  id: number;
  game: number;
  height: number;
  width: number;
  url: string;
  image_id: string;
}

export interface IGDBCompany {
  id: number;
  name: string;
  slug?: string;
  url?: string;
  description?: string;
  country?: number;
  logo?: number;
}

export interface IGDBInvolvedCompany {
  id: number;
  company: number;
  game: number;
  developer: boolean;
  publisher: boolean;
  porting: boolean;
  supporting: boolean;
}

export interface IGDBWebsite {
  id: number;
  game: number;
  category: number;
  trusted: boolean;
  url: string;
}

// Expanded game data with resolved references
export interface ExpandedGameData {
  game: IGDBGame;
  genres?: IGDBGenre[];
  platforms?: IGDBPlatform[];
  cover?: IGDBCover;
  screenshots?: IGDBScreenshot[];
  companies?: IGDBCompany[];
  involvedCompanies?: IGDBInvolvedCompany[];
  websites?: IGDBWebsite[];
}

// Template context for markdown generation
export interface GameTemplateContext {
  title: string;
  summary?: string;
  storyline?: string;
  rating?: number;
  releaseDate?: string;
  genres: string[];
  platforms: string[];
  coverImage?: string;
  screenshots: string[];
  developers: string[];
  publishers: string[];
  websites: { name: string; url: string }[];
  slug: string;
} 