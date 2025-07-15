import axios, { AxiosInstance } from 'axios';
import { TokenManager } from '../auth/token-manager';
import { logger } from '../utils/logger';
import {
  IGDBGame,
  IGDBGenre,
  IGDBPlatform,
  IGDBCover,
  IGDBCompany,
  IGDBInvolvedCompany,
  ExpandedGameData,
  IGDBGameMode,
  IGDBTheme,
  IGDBPlayerPerspective,
  IGDBGameEngine
} from '../types/igdb';

export class IGDBClient {
  private client: AxiosInstance;
  private tokenManager: TokenManager;

  constructor() {
    this.tokenManager = new TokenManager();
    this.client = axios.create({
      baseURL: 'https://api.igdb.com/v4',
      headers: {
        'Accept': 'application/json',
      }
    });
  }

  /**
   * Sets up the client with a valid access token
   */
  private async setupClient(): Promise<void> {
    const token = await this.tokenManager.getValidToken();
    const clientId = process.env.TWITCH_CLIENT_ID;
    
    if (!clientId) {
      throw new Error('TWITCH_CLIENT_ID must be set in environment variables');
    }

    this.client.defaults.headers['Authorization'] = `Bearer ${token}`;
    this.client.defaults.headers['Client-ID'] = clientId;
  }

  /**
   * Searches for games by name
   */
  async searchGames(query: string, limit: number = 10): Promise<IGDBGame[]> {
    await this.setupClient();
    
    const searchQuery = `
      fields id,name,summary,storyline,rating,rating_count,aggregated_rating,aggregated_rating_count,
             first_release_date,genres,platforms,cover,screenshots,websites,involved_companies,
             game_modes,themes,player_perspectives,game_engines,url,slug;
      search "${query}";
      limit ${limit};
    `;

    try {
      logger.request(`POST ${this.client.defaults.baseURL}/games`);
      logger.info(`Searching IGDB for game: "${query}" (limit: ${limit})`);
      logger.debug(`Query: ${searchQuery.trim().replace(/\s+/g, ' ')}`);
      
      const response = await this.client.post('/games', searchQuery);
      logger.success(`Found ${response.data.length} games matching "${query}"`);
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to search games for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Gets detailed information for specific game IDs
   */
  async getGames(gameIds: number[]): Promise<IGDBGame[]> {
    await this.setupClient();
    
    const gameQuery = `
      fields id,name,summary,storyline,rating,rating_count,aggregated_rating,aggregated_rating_count,
             first_release_date,genres,platforms,cover,screenshots,websites,involved_companies,
             game_modes,themes,player_perspectives,game_engines,url,slug;
      where id = (${gameIds.join(',')});
    `;

    const response = await this.client.post('/games', gameQuery);
    return response.data;
  }

  /**
   * Gets genre information
   */
  async getGenres(genreIds: number[]): Promise<IGDBGenre[]> {
    if (genreIds.length === 0) return [];
    
    await this.setupClient();
    
    const genreQuery = `
      fields id,name,slug,url;
      where id = (${genreIds.join(',')});
    `;

    const response = await this.client.post('/genres', genreQuery);
    return response.data;
  }

  /**
   * Gets platform information
   */
  async getPlatforms(platformIds: number[]): Promise<IGDBPlatform[]> {
    if (platformIds.length === 0) return [];
    
    await this.setupClient();
    
    const platformQuery = `
      fields id,name,abbreviation,slug,url;
      where id = (${platformIds.join(',')});
    `;

    const response = await this.client.post('/platforms', platformQuery);
    return response.data;
  }

  /**
   * Gets game mode information
   */
  async getGameModes(gameModeIds: number[]): Promise<IGDBGameMode[]> {
    if (gameModeIds.length === 0) return [];
    
    await this.setupClient();
    
    const gameModeQuery = `
      fields id,name,slug;
      where id = (${gameModeIds.join(',')});
    `;

    const response = await this.client.post('/game_modes', gameModeQuery);
    return response.data;
  }

  /**
   * Gets theme information
   */
  async getThemes(themeIds: number[]): Promise<IGDBTheme[]> {
    if (themeIds.length === 0) return [];
    
    await this.setupClient();
    
    const themeQuery = `
      fields id,name,slug;
      where id = (${themeIds.join(',')});
    `;

    const response = await this.client.post('/themes', themeQuery);
    return response.data;
  }

  /**
   * Gets player perspective information
   */
  async getPlayerPerspectives(perspectiveIds: number[]): Promise<IGDBPlayerPerspective[]> {
    if (perspectiveIds.length === 0) return [];
    
    await this.setupClient();
    
    const perspectiveQuery = `
      fields id,name,slug;
      where id = (${perspectiveIds.join(',')});
    `;

    const response = await this.client.post('/player_perspectives', perspectiveQuery);
    return response.data;
  }

  /**
   * Gets game engine information
   */
  async getGameEngines(engineIds: number[]): Promise<IGDBGameEngine[]> {
    if (engineIds.length === 0) return [];
    
    await this.setupClient();
    
    const engineQuery = `
      fields id,name,slug;
      where id = (${engineIds.join(',')});
    `;

    const response = await this.client.post('/game_engines', engineQuery);
    return response.data;
  }

  /**
   * Gets company information
   */
  async getCompanies(companyIds: number[]): Promise<IGDBCompany[]> {
    if (companyIds.length === 0) return [];
    
    await this.setupClient();
    
    const companyQuery = `
      fields id,name,slug,url,description,country;
      where id = (${companyIds.join(',')});
    `;

    const response = await this.client.post('/companies', companyQuery);
    return response.data;
  }

  /**
   * Gets involved company information
   */
  async getInvolvedCompanies(involvedCompanyIds: number[]): Promise<IGDBInvolvedCompany[]> {
    if (involvedCompanyIds.length === 0) return [];
    
    await this.setupClient();
    
    const involvedCompanyQuery = `
      fields id,company,game,developer,publisher,porting,supporting;
      where id = (${involvedCompanyIds.join(',')});
    `;

    const response = await this.client.post('/involved_companies', involvedCompanyQuery);
    return response.data;
  }

  /**
   * Gets expanded game data with all related information
   */
  async getExpandedGameData(gameId: number): Promise<ExpandedGameData | null> {
    try {
      const [games] = await this.getGames([gameId]);
      if (!games) return null;

      const game = games;
      
      // Fetch all related data in parallel
      const [
        genres,
        platforms,
        gameModes,
        themes,
        playerPerspectives,
        gameEngines,
        involvedCompanies,
        companies
      ] = await Promise.all([
        this.getGenres(game.genres || []),
        this.getPlatforms(game.platforms || []),
        this.getGameModes(game.game_modes || []),
        this.getThemes(game.themes || []),
        this.getPlayerPerspectives(game.player_perspectives || []),
        this.getGameEngines(game.game_engines || []),
        this.getInvolvedCompanies(game.involved_companies || []),
        // Get companies for involved companies
        game.involved_companies ? 
          this.getInvolvedCompanies(game.involved_companies).then(async (involved) => {
            const companyIds = involved.map(ic => ic.company);
            return this.getCompanies(companyIds);
          }) : 
          Promise.resolve([])
      ]);

      return {
        game,
        genres,
        platforms,
        gameModes,
        themes,
        playerPerspectives,
        gameEngines,
        companies,
        involvedCompanies
      };
    } catch (error) {
      console.error(`Failed to get expanded game data for game ID ${gameId}:`, error);
      return null;
    }
  }
} 