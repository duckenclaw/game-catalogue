import { TokenManager } from './auth/token-manager';
import { TemplateGenerator } from './services/template-generator';
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
    
    // Initialize template generator
    const templateGenerator = new TemplateGenerator();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      const gameName = args.join(' ');
      console.log(`🎯 Generating template for single game: "${gameName}"`);
      
      const markdown = await templateGenerator.generateSingleGameTemplate(gameName);
      if (markdown) {
        console.log('\n📝 Generated markdown:');
        console.log('='.repeat(50));
        console.log(markdown);
        console.log('='.repeat(50));
      } else {
        console.log(`❌ Could not generate template for "${gameName}"`);
      }
    } else {
      console.log('🚀 Starting batch generation for all games...');
      await templateGenerator.generateAllGameTemplates();
    }
    
  } catch (error) {
    console.error('💥 Application failed:', error);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
} 