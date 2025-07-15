import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';

export interface GameCSVEntry {
  name: string;
  status: string;
  platform: string;
  notes?: string;
}

export interface UnprocessedGame {
  name: string;
  status: string;
  platform: string;
  notes?: string;
  reason: string;
}

export class CSVParser {
  /**
   * Parses the games.csv file and returns an array of game entries
   */
  static async parseGamesCSV(filePath: string = 'games.csv'): Promise<GameCSVEntry[]> {
    try {
      const csvContent = await fs.readFile(filePath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      // Skip the header line
      const dataLines = lines.slice(1);
      
      const games: GameCSVEntry[] = [];
      
      for (const line of dataLines) {
        const parsed = this.parseCSVLine(line);
        if (parsed && parsed.name.trim() !== '') {
          games.push(parsed);
        }
      }
      
      return games;
    } catch (error) {
      logger.error('Failed to parse games.csv:', error);
      throw error;
    }
  }

  /**
   * Saves unprocessed games to a CSV file
   */
  static async saveUnprocessedGames(unprocessedGames: UnprocessedGame[], filePath: string = 'unprocessed-games.csv'): Promise<void> {
    if (unprocessedGames.length === 0) {
      return;
    }

    try {
      const header = 'name,status,platform,notes,reason\n';
      const csvLines = unprocessedGames.map(game => {
        const escapeCsvField = (field: string) => {
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        };

        return [
          escapeCsvField(game.name),
          escapeCsvField(game.status),
          escapeCsvField(game.platform),
          escapeCsvField(game.notes || ''),
          escapeCsvField(game.reason)
        ].join(',');
      });

      const csvContent = header + csvLines.join('\n');
      await fs.writeFile(filePath, csvContent);
      logger.info(`Saved ${unprocessedGames.length} unprocessed games to ${filePath}`);
    } catch (error) {
      logger.error('Failed to save unprocessed games CSV:', error);
      throw error;
    }
  }

  /**
   * Parses a single CSV line, handling commas within quoted fields
   */
  private static parseCSVLine(line: string): GameCSVEntry | null {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    fields.push(currentField.trim());
    
    // Ensure we have at least 3 fields (name, status, platform)
    if (fields.length < 3) {
      return null;
    }
    
    return {
      name: fields[0].replace(/"/g, '').trim(),
      status: fields[1].replace(/"/g, '').trim(),
      platform: fields[2].replace(/"/g, '').trim(),
      notes: fields[3] ? fields[3].replace(/"/g, '').trim() : undefined
    };
  }

  /**
   * Finds a game entry by name (case-insensitive, fuzzy matching)
   */
  static findGameByName(games: GameCSVEntry[], searchName: string): GameCSVEntry | null {
    const searchLower = searchName.toLowerCase().trim();
    
    // First try exact match
    let match = games.find(game => 
      game.name.toLowerCase().trim() === searchLower
    );
    
    if (match) return match;
    
    // Try partial match
    match = games.find(game => 
      game.name.toLowerCase().includes(searchLower) ||
      searchLower.includes(game.name.toLowerCase())
    );
    
    if (match) return match;
    
    // Try with removed special characters and extra words
    const cleanSearchName = searchLower
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    match = games.find(game => {
      const cleanGameName = game.name.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      return cleanGameName.includes(cleanSearchName) ||
             cleanSearchName.includes(cleanGameName);
    });
    
    return match || null;
  }

  /**
   * Normalizes platform names for consistency
   */
  static normalizePlatform(platform: string): string {
    const platformMap: { [key: string]: string } = {
      'pc': 'PC',
      'ps5': 'PlayStation 5',
      'ps4': 'PlayStation 4',
      'ps3': 'PlayStation 3',
      'psp': 'PlayStation Portable',
      'xbox 360': 'Xbox 360',
      'xbok 360': 'Xbox 360', // Typo in CSV
      'nintendo switch': 'Nintendo Switch',
      'vr': 'VR',
      'tabletop': 'Tabletop',
      'mobile': 'Mobile'
    };
    
    const lowerPlatform = platform.toLowerCase().trim();
    return platformMap[lowerPlatform] || platform;
  }
} 