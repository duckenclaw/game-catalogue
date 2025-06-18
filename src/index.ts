import { TokenManager } from './auth/token-manager';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🎮 Game Catalogue Generator');
  console.log('============================\n');

  try {
    // Initialize token manager
    const tokenManager = new TokenManager();
    
    // Get or refresh access token
    console.log('🔑 Managing Twitch API access token...');
    const accessToken = await tokenManager.getValidToken();
    
    console.log('✅ Successfully obtained access token');
    console.log(`Token preview: ${accessToken.substring(0, 20)}...\n`);
    
    // TODO: Implement IGDB API integration
    console.log('🚧 Next steps:');
    console.log('- Implement IGDB API client');
    console.log('- Create template engine for markdown generation');
    console.log('- Add game data fetching and processing');
    
  } catch (error) {
    console.error('💥 Application failed:', error);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
} 