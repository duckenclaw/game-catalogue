import { TokenManager } from './auth/token-manager';
import { TemplateGenerator } from './services/template-generator';
import { logger } from './utils/logger';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  logger.info('Game Catalogue Generator');
  logger.info('============================');

  try {
    // Initialize token manager
    const tokenManager = new TokenManager();
    
    // Get or refresh access token
    logger.info('Managing Twitch API access token');
    const accessToken = await tokenManager.getValidToken();
    
    logger.success('Successfully obtained access token');
    logger.debug(`Token preview: ${accessToken.substring(0, 20)}...`);
    
    // Initialize template generator
    const templateGenerator = new TemplateGenerator();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      // Check if --save flag is present
      const saveToFile = args.includes('--save') || args.includes('-s');
      const gameNameArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
      const gameName = gameNameArgs.join(' ');
      
      logger.info(`Generating template for single game: "${gameName}"`);
      
      if (saveToFile) {
        logger.info('Saving to games/ folder...');
        const success = await templateGenerator.generateAndSaveSingleGame(gameName);
        if (!success) {
          logger.error(`Could not generate template for "${gameName}"`);
        }
      } else {
        const markdown = await templateGenerator.generateSingleGameTemplate(gameName);
        if (markdown) {
          logger.info('Generated markdown:');
          console.log('='.repeat(50));
          console.log(markdown);
          console.log('='.repeat(50));
          logger.info('Use --save flag to save this to the games/ folder');
        } else {
          logger.error(`Could not generate template for "${gameName}"`);
        }
      }
    } else {
      logger.info('Starting batch generation for all games');
      await templateGenerator.generateAllGameTemplates();
    }
    
  } catch (error) {
    logger.error('Application failed:', error);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
} 