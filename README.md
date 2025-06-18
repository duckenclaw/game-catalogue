# Game Catalogue Generator

A TypeScript project that integrates with IGDB (Internet Game Database) and Twitch APIs to generate markdown files from templates based on game data.

## Features

- 🔑 Automatic Twitch API token management
- 🎮 IGDB API integration for game data
- 📝 Template-based markdown generation
- 🔄 Token caching with automatic refresh

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
│   │   └── token-manager.ts    # Twitch API token management
│   ├── types/
│   │   └── igdb.ts            # IGDB API type definitions
│   └── index.ts               # Main application entry point
├── templates/                 # Markdown templates
├── dist/                      # Compiled JavaScript output
└── .token.json               # Cached access token (auto-generated)
```

## API Integration

This project integrates with:

- **Twitch API**: For authentication and access tokens
- **IGDB API**: For game data retrieval

The IGDB API requires Twitch API credentials since it's owned by Twitch.

## License

See LICENSE file for details.