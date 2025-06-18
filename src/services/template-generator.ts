import { promises as fs } from 'fs';
import path from 'path';
import { IGDBClient } from './igdb-client';
import { CSVParser, GameCSVEntry } from '../utils/csv-parser';
import { ExpandedGameData, IGDBGame } from '../types/igdb';

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
   * Generates markdown files for all games in the CSV
   */
  async generateAllGameTemplates(csvPath: string = 'games.csv', outputDir: string = 'generated-games'): Promise<void> {
    console.log('📖 Reading games from CSV...');
    const games = await CSVParser.parseGamesCSV(csvPath);
    
    console.log(`Found ${games.length} games in CSV`);
    
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
    
    let processedCount = 0;
    const failedGames: { name: string; error: string }[] = [];
    
    for (const game of games) {
      try {
        console.log(`\n🎮 Processing: ${game.name}`);
        
        const templateData = await this.generateTemplateData(game);
        if (templateData) {
          const markdown = await this.generateMarkdown(templateData);
          const filename = this.sanitizeFilename(game.name) + '.md';
          const filePath = path.join(outputDir, filename);
          
          await fs.writeFile(filePath, markdown);
          console.log(`✅ Generated: ${filename}`);
          processedCount++;
        } else {
          console.log(`❌ No IGDB data found for: ${game.name}`);
          failedGames.push({ name: game.name, error: 'No IGDB data found' });
        }
        
        // Add a small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Failed to process ${game.name}:`, error);
        failedGames.push({ 
          name: game.name, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Successfully processed: ${processedCount} games`);
    console.log(`- Failed: ${failedGames.length} games`);
    
    if (failedGames.length > 0) {
      console.log('\n❌ Failed games:');
      failedGames.forEach(game => {
        console.log(`  - ${game.name}: ${game.error}`);
      });
    }
  }

  /**
   * Generates template data for a single game
   */
  async generateTemplateData(csvGame: GameCSVEntry): Promise<TemplateData | null> {
    try {
      // Search for the game in IGDB
      const searchResults = await this.igdbClient.searchGames(csvGame.name, 5);
      
      if (searchResults.length === 0) {
        return null;
      }
      
      // Find the best match
      const bestMatch = this.findBestGameMatch(csvGame.name, searchResults);
      if (!bestMatch) {
        return null;
      }
      
      // Get expanded data
      const expandedData = await this.igdbClient.getExpandedGameData(bestMatch.id);
      if (!expandedData) {
        return null;
      }
      
      return this.mapToTemplateData(csvGame, expandedData);
    } catch (error) {
      console.error(`Error generating template data for ${csvGame.name}:`, error);
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
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .toLowerCase()
      .trim();
  }

  /**
   * Generates a single game template
   */
  async generateSingleGameTemplate(gameName: string, csvPath: string = 'games.csv'): Promise<string | null> {
    const games = await CSVParser.parseGamesCSV(csvPath);
    const csvGame = CSVParser.findGameByName(games, gameName);
    
    if (!csvGame) {
      console.log(`Game "${gameName}" not found in CSV`);
      return null;
    }
    
    const templateData = await this.generateTemplateData(csvGame);
    if (!templateData) {
      console.log(`No IGDB data found for "${gameName}"`);
      return null;
    }
    
    return await this.generateMarkdown(templateData);
  }
} 