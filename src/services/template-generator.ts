import { promises as fs } from 'fs';
import path from 'path';
import { IGDBClient } from './igdb-client';
import { CSVParser, GameCSVEntry, UnprocessedGame } from '../utils/csv-parser';
import { ExpandedGameData, IGDBGame } from '../types/igdb';
import { logger } from '../utils/logger';

export interface TemplateData {
  title: string;
  status: string;
  platform: string;
  genres: string[];
  gameModes: string[];
  themes: string[];
  playerPerspectives: string[];
  gameEngines: string[];
  developers: string[];
  publishers: string[];
  releaseDate?: string;
  summary?: string;
  storyline?: string;
  notes?: string;
}

export class TemplateGenerator {
  private igdbClient: IGDBClient;

  constructor() {
    this.igdbClient = new IGDBClient();
  }

  /**
   * Generates a random delay between min and max milliseconds
   */
  private async randomDelay(minSeconds: number = 5, maxSeconds: number = 30): Promise<void> {
    const minMs = minSeconds * 1000;
    const maxMs = maxSeconds * 1000;
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    logger.info(`Rate limit delay: waiting ${Math.round(delay / 1000)} seconds before next request`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generates markdown files for all games in the CSV
   */
  async generateAllGameTemplates(csvPath: string = 'games.csv', outputDir: string = 'games'): Promise<void> {
    logger.info('Starting batch game template generation');
    logger.info(`Reading games from CSV: ${csvPath}`);
    const games = await CSVParser.parseGamesCSV(csvPath);
    
    logger.info(`Found ${games.length} games in CSV file`);
    
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
    logger.info(`Output directory: ${outputDir}`);
    
    let processedCount = 0;
    const failedGames: { name: string; error: string }[] = [];
    const unprocessedGames: UnprocessedGame[] = [];
    
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      
      try {
        logger.info(`Processing game ${i + 1}/${games.length}: "${game.name}"`);
        logger.debug(`Game details: ${game.status} on ${game.platform}`);
        
        const templateData = await this.generateTemplateData(game);
        if (templateData) {
          const markdown = await this.generateMarkdown(templateData);
          const filename = this.sanitizeFilename(game.name) + '.md';
          const filePath = path.join(outputDir, filename);
          
          await fs.writeFile(filePath, markdown);
          logger.success(`Generated markdown file: ${filename}`);
          processedCount++;
        } else {
          logger.warn(`No IGDB data found for: ${game.name}`);
          unprocessedGames.push({
            name: game.name,
            status: game.status,
            platform: game.platform,
            notes: game.notes,
            reason: 'No IGDB data found'
          });
        }
        
        // Add random delay between requests (except for the last game)
        if (i < games.length - 1) {
          await this.randomDelay(5, 30);
        }
        
      } catch (error) {
        logger.error(`Failed to process ${game.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedGames.push({ name: game.name, error: errorMessage });
        
        unprocessedGames.push({
          name: game.name,
          status: game.status,
          platform: game.platform,
          notes: game.notes,
          reason: `Error: ${errorMessage}`
        });
      }
    }
    
    // Save unprocessed games to CSV
    if (unprocessedGames.length > 0) {
      await CSVParser.saveUnprocessedGames(unprocessedGames);
    }
    
    logger.info('Batch processing complete');
    logger.info(`Successfully processed: ${processedCount} games`);
    logger.info(`Unprocessed (no IGDB data): ${unprocessedGames.filter(g => g.reason === 'No IGDB data found').length} games`);
    logger.info(`Failed (other errors): ${unprocessedGames.filter(g => g.reason.startsWith('Error:')).length} games`);
    
    if (unprocessedGames.length > 0) {
      logger.info('Unprocessed games saved to: unprocessed-games.csv');
    }
  }

  /**
   * Generates template data for a single game
   */
  async generateTemplateData(csvGame: GameCSVEntry): Promise<TemplateData | null> {
    try {
      logger.debug(`Generating template data for: ${csvGame.name}`);
      
      // Search for the game in IGDB
      const searchResults = await this.igdbClient.searchGames(csvGame.name, 5);
      
      if (searchResults.length === 0) {
        logger.debug(`No search results found for: ${csvGame.name}`);
        return null;
      }
      
      // Find the best match
      const bestMatch = this.findBestGameMatch(csvGame.name, searchResults);
      if (!bestMatch) {
        logger.debug(`No suitable match found for: ${csvGame.name}`);
        return null;
      }
      
      logger.debug(`Best match for "${csvGame.name}": "${bestMatch.name}" (ID: ${bestMatch.id})`);
      
      // Get expanded data
      const expandedData = await this.igdbClient.getExpandedGameData(bestMatch.id);
      if (!expandedData) {
        logger.debug(`No expanded data available for: ${bestMatch.name}`);
        return null;
      }
      
      return this.mapToTemplateData(csvGame, expandedData);
    } catch (error) {
      logger.error(`Error generating template data for ${csvGame.name}:`, error);
      return null;
    }
  }

  /**
   * Maps expanded IGDB data to template data structure
   */
  private mapToTemplateData(csvGame: GameCSVEntry, expandedData: ExpandedGameData): TemplateData {
    const game = expandedData.game;
    
    // Extract developers and publishers from involved companies
    const developers: string[] = [];
    const publishers: string[] = [];
    
    if (expandedData.involvedCompanies && expandedData.companies) {
      for (const involvedCompany of expandedData.involvedCompanies) {
        const company = expandedData.companies.find(c => c.id === involvedCompany.company);
        if (company) {
          if (involvedCompany.developer) {
            developers.push(company.name);
          }
          if (involvedCompany.publisher) {
            publishers.push(company.name);
          }
        }
      }
    }
    
    // Format release date
    let releaseDate: string | undefined;
    if (game.first_release_date) {
      const date = new Date(game.first_release_date * 1000);
      releaseDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    return {
      title: game.name,
      status: csvGame.status,
      platform: CSVParser.normalizePlatform(csvGame.platform),
      genres: expandedData.genres?.map(g => g.name) || [],
      gameModes: expandedData.gameModes?.map(gm => gm.name) || [],
      themes: expandedData.themes?.map(t => t.name) || [],
      playerPerspectives: expandedData.playerPerspectives?.map(pp => pp.name) || [],
      gameEngines: expandedData.gameEngines?.map(ge => ge.name) || [],
      developers,
      publishers,
      releaseDate,
      summary: game.summary,
      storyline: game.storyline,
      notes: csvGame.notes
    };
  }

  /**
   * Finds the best matching game from search results
   */
  private findBestGameMatch(searchName: string, games: IGDBGame[]): IGDBGame | null {
    const searchLower = searchName.toLowerCase().trim();
    
    // Exact match
    let match = games.find(game => 
      game.name.toLowerCase().trim() === searchLower
    );
    if (match) return match;
    
    // Partial match with highest score (if available)
    const scoredMatches = games.map(game => ({
      game,
      score: this.calculateNameSimilarity(searchName, game.name)
    })).sort((a, b) => b.score - a.score);
    
    // Return the best match if score is reasonable
    if (scoredMatches.length > 0 && scoredMatches[0].score > 0.6) {
      return scoredMatches[0].game;
    }
    
    // Default to first result
    return games[0] || null;
  }

  /**
   * Calculates similarity between two strings (simple implementation)
   */
  private calculateNameSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Simple word-based similarity
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const allWords = new Set([...words1, ...words2]);
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length / allWords.size;
  }

  /**
   * Generates markdown content from template data
   */
  async generateMarkdown(data: TemplateData): Promise<string> {
    const formatArray = (arr: string[], prefix: string = ''): string => {
      if (arr.length === 0) return '';
      return arr.map(item => `${prefix}- "${item}"`).join('\n');
    };

    const formatSingleItems = (arr: string[]): string => {
      if (arr.length === 0) return '';
      return arr.map(item => `"${item}"`).join(', ');
    };

    let markdown = `---
class: game
status: ${data.status}`;

    if (data.genres.length > 0) {
      markdown += `\ngame-genre:\n${formatArray(data.genres, '  ')}`;
    } else {
      markdown += `\ngame-genre:`;
    }

    if (data.gameModes.length > 0) {
      markdown += `\ngame-modes:\n${formatArray(data.gameModes, '  ')}`;
    } else {
      markdown += `\ngame-modes:`;
    }

    if (data.themes.length > 0) {
      markdown += `\ngame-genre-tags:\n${formatArray(data.themes, '  ')}`;
    } else {
      markdown += `\ngame-genre-tags:`;
    }

    if (data.playerPerspectives.length > 0) {
      markdown += `\nplayer-perspective:\n${formatArray(data.playerPerspectives, '  ')}`;
    } else {
      markdown += `\nplayer-perspective:`;
    }

    markdown += `\nplatform: ${data.platform}`;

    if (data.gameEngines.length > 0) {
      markdown += `\nengine: ${formatSingleItems(data.gameEngines)}`;
    } else {
      markdown += `\nengine:`;
    }

    if (data.developers.length > 0) {
      markdown += `\ndeveloper:\n${formatArray(data.developers.map(dev => `[[${dev}]]`), '  ')}`;
    } else {
      markdown += `\ndeveloper:`;
    }

    if (data.publishers.length > 0) {
      markdown += `\npublisher:\n${formatArray(data.publishers.map(pub => `[[${pub}]]`), '  ')}`;
    } else {
      markdown += `\npublisher:`;
    }

    markdown += `\ndirector:\nrelease: ${data.releaseDate || 'YYYY-MM-DD'}
---
# Gameplay
${data.summary || 'A description of the gameplay and its mechanics'}

# Synopsis
${data.storyline || 'A short synopsis of the story or the world of the game'}

# Review
Leave empty

## Notes`;

    if (data.notes) {
      markdown += `\n- ${data.notes}`;
    } else {
      markdown += `\n- (Notes about the gameplay as a bullet list)`;
    }

    return markdown;
  }

  /**
   * Sanitizes filename to be filesystem-safe
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove filesystem-unsafe characters
      .replace(/[^\w\s\-_.]/g, '') // Keep only alphanumeric, spaces, hyphens, underscores, dots
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim();
  }

  /**
   * Generates a single game template and optionally saves it to file
   */
  async generateSingleGameTemplate(gameName: string, csvPath: string = 'games.csv', saveToFile: boolean = false): Promise<string | null> {
    const games = await CSVParser.parseGamesCSV(csvPath);
    const csvGame = CSVParser.findGameByName(games, gameName);
    
    if (!csvGame) {
      logger.warn(`Game "${gameName}" not found in CSV`);
      return null;
    }
    
    const templateData = await this.generateTemplateData(csvGame);
    if (!templateData) {
      logger.warn(`No IGDB data found for "${gameName}"`);
      return null;
    }
    
    const markdown = await this.generateMarkdown(templateData);
    
    if (saveToFile) {
      const outputDir = 'games';
      await fs.mkdir(outputDir, { recursive: true });
      
      const filename = this.sanitizeFilename(csvGame.name) + '.md';
      const filePath = path.join(outputDir, filename);
      
      await fs.writeFile(filePath, markdown);
      logger.success(`Saved markdown file: ${filePath}`);
    }
    
    return markdown;
  }

  /**
   * Generates and saves a single game template to file
   */
  async generateAndSaveSingleGame(gameName: string, csvPath: string = 'games.csv'): Promise<boolean> {
    const markdown = await this.generateSingleGameTemplate(gameName, csvPath, true);
    return markdown !== null;
  }
} 