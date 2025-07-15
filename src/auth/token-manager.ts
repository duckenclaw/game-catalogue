import axios from 'axios';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenData {
  access_token: string;
  expires_at: number;
  token_type: string;
}

class TokenManager {
  private readonly tokenFilePath: string;
  
  constructor() {
    this.tokenFilePath = path.join(__dirname, '../../.token.json');
  }

  /**
   * Requests a new access token from Twitch OAuth2 endpoint
   */
  async requestAccessToken(): Promise<TwitchTokenResponse> {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const grantType = process.env.TWITCH_GRANT_TYPE || 'client_credentials';

    if (!clientId || !clientSecret) {
      throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in .env file');
    }

    const url = 'https://id.twitch.tv/oauth2/token';
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: grantType
    });

    try {
      logger.request(`POST ${url}`);
      logger.info('Requesting new access token from Twitch API');
      logger.debug(`Request parameters: grant_type=${grantType}, client_id=${clientId.substring(0, 8)}...`);
      
      const response = await axios.post(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData: TwitchTokenResponse = response.data;
      logger.success(`Access token obtained successfully (expires in ${tokenData.expires_in} seconds)`);
      
      return tokenData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`Token request failed: ${error.response?.status} ${error.response?.statusText}`);
        logger.debug('Error details:', error.response?.data || error.message);
        throw new Error(`Token request failed: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Saves token data to file with expiration timestamp
   */
  async saveTokenToFile(tokenResponse: TwitchTokenResponse): Promise<void> {
    const tokenData: TokenData = {
      access_token: tokenResponse.access_token,
      expires_at: Date.now() + (tokenResponse.expires_in * 1000),
      token_type: tokenResponse.token_type
    };

    try {
      await fs.writeFile(this.tokenFilePath, JSON.stringify(tokenData, null, 2));
      logger.info(`Token saved to ${this.tokenFilePath}`);
    } catch (error) {
      logger.error('Failed to save token to file:', error);
      throw error;
    }
  }

  /**
   * Loads token from file and checks if it's still valid
   */
  async loadTokenFromFile(): Promise<TokenData | null> {
    try {
      const tokenContent = await fs.readFile(this.tokenFilePath, 'utf-8');
      const tokenData: TokenData = JSON.parse(tokenContent);
      
      // Check if token is still valid (with 5-minute buffer)
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      if (Date.now() < (tokenData.expires_at - bufferTime)) {
        const expiresIn = Math.round((tokenData.expires_at - Date.now()) / 1000 / 60);
        logger.info(`Valid token found in file (expires in ${expiresIn} minutes)`);
        return tokenData;
      } else {
        logger.warn('Token in file has expired');
        return null;
      }
    } catch (error) {
      logger.info('No valid token file found');
      return null;
    }
  }

  /**
   * Gets a valid access token, either from file or by requesting a new one
   */
  async getValidToken(): Promise<string> {
    // Try to load existing token
    const existingToken = await this.loadTokenFromFile();
    if (existingToken) {
      return existingToken.access_token;
    }

    // Request new token if none exists or expired
    const newToken = await this.requestAccessToken();
    await this.saveTokenToFile(newToken);
    return newToken.access_token;
  }

  /**
   * Forces a refresh of the access token
   */
  async refreshToken(): Promise<string> {
    logger.info('Forcing token refresh');
    const newToken = await this.requestAccessToken();
    await this.saveTokenToFile(newToken);
    return newToken.access_token;
  }
}

// CLI usage when run directly
async function main() {
  const tokenManager = new TokenManager();
  
  try {
    const args = process.argv.slice(2);
    const forceRefresh = args.includes('--refresh') || args.includes('-r');
    
    let token: string;
    if (forceRefresh) {
      token = await tokenManager.refreshToken();
    } else {
      token = await tokenManager.getValidToken();
    }
    
    logger.success('Access token ready');
    logger.info(`Token preview: ${token.substring(0, 20)}...`);
  } catch (error) {
    logger.error('Token management failed:', error);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main();
}

export { TokenManager };
export type { TwitchTokenResponse, TokenData }; 