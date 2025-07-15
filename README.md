# Game Catalogue Generator

A TypeScript project that integrates with IGDB (Internet Game Database) and Twitch APIs to generate markdown files from templates based on game data.

## Features

- 🔑 Automatic Twitch API token management
- 🎮 IGDB API integration for game data
- 📝 Template-based markdown generation
- 🔄 Token caching with automatic refresh
- ⏰ Random delays (5-30 seconds) between API requests to avoid rate limits
- 📋 Automatic tracking of unprocessed games in CSV format

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and fill in your Twitch API credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your actual values:
   ```
   TWITCH_CLIENT_ID=your_twitch_client_id_here
   TWITCH_CLIENT_SECRET=your_twitch_client_secret_here
   TWITCH_GRANT_TYPE=client_credentials
   ```

3. **Get Twitch API credentials:**
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console)
   - Create a new application
   - Copy the Client ID and Client Secret

## Usage

### Template Generation

Generate markdown files for all games in your CSV (saves to `games/` folder):
```bash
npm run generate
```

Generate and preview a template for a single game:
```bash
npm run generate:single "Game Name"
```

Generate and save a template for a single game to `games/` folder:
```bash
npm run generate:single -- "Game Name" --save
```

Examples:
```bash
# Preview only
npm run generate:single "Persona 5"

# Save to games/ folder
npm run generate:single -- "Persona 5" --save
npm run generate:single -- "The Witcher 3: Wild Hunt" --save
```

### Token Management

Test the token manager directly:
```bash
npm run token
```

Force refresh a token:
```bash
npm run token -- --refresh
```

### Development

Run the development server:
```bash
npm run dev
```

Build the project:
```bash
npm run build
```

Run the built project:
```bash
npm start
```

## Project Structure

```
├── src/
│   ├── auth/
│   │   └── token-manager.ts      # Twitch API token management
│   ├── services/
│   │   ├── igdb-client.ts        # IGDB API client
│   │   └── template-generator.ts # Markdown template generator
│   ├── types/
│   │   └── igdb.ts              # IGDB API type definitions
│   ├── utils/
│   │   └── csv-parser.ts        # CSV parsing utilities
│   └── index.ts                 # Main application entry point
├── templates/                   # Markdown templates
├── games/                       # Generated markdown files (auto-created)
├── games.csv                    # Your game collection data
├── unprocessed-games.csv        # Games that couldn't be processed (auto-generated)
├── dist/                        # Compiled JavaScript output
└── .token.json                 # Cached access token (auto-generated)
```

## API Integration

This project integrates with:

- **Twitch API**: For authentication and access tokens
- **IGDB API**: For game data retrieval

The IGDB API requires Twitch API credentials since it's owned by Twitch.

## Unprocessed Games

When running batch generation, games that cannot be processed are automatically saved to `unprocessed-games.csv` with the following reasons:

- **No IGDB data found**: The game name couldn't be matched in the IGDB database
- **Error: [description]**: Technical errors during processing (API failures, network issues, etc.)

The unprocessed games CSV contains:
- Game name, status, platform, and notes from your original CSV
- Reason for why it couldn't be processed

You can manually review this file and either:
- Update game names in your main CSV for better matching
- Research alternative names for games not found in IGDB
- Retry processing after fixing any technical issues

## Rate Limiting

The system includes random delays between API requests (5-30 seconds) to respect IGDB's rate limits and avoid getting blocked. This means batch processing will take some time, but ensures reliable operation.

## License

See LICENSE file for details.