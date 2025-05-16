# Aptos Stablecoin Supply API
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple API service and frontend that provides real-time information about stablecoin supplies on the Aptos blockchain.

## Overview

This API fetches the current circulating supply of major stablecoins on Aptos using the Aptos Indexer GraphQL API. It handles both token standards (legacy coin standard and newer Fungible-Asset standard) in a unified way.

![Aptos Stablecoins Dashboard](/public/page.png)

You can view detailed information about each stablecoin by clicking on its card:

![Detailed stablecoin information dialog](/public/dialog.png)

## Supported Stablecoins

- **USDt**: Tether USD (USDT)
- **USDC**: Circle USD Coin (USDC)
- **USDe**: Ethena's USDe
- **sUSDe**: Staked USDe

## API Endpoint

### GET `/api/supply`

Returns the current supply of each stablecoin and the total supply across all supported stablecoins.

#### Example Response

```json
{
  "supplies": [
    {
      "symbol": "USDt",
      "supply": "1130000000600000"
    },
    {
      "symbol": "USDC",
      "supply": "284452249983816"
    },
    {
      "symbol": "USDe",
      "supply": "183411687"
    },
    {
      "symbol": "sUSDe",
      "supply": "65235918477665"
    }
  ],
  "total": "1479688352473168"
}
```

## Technical Details

- Uses the Aptos Indexer GraphQL API to fetch supply data
- Supplies are returned as strings to preserve precision with large numbers
- The server runs on port 3001 by default

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env to add your CoinMarketCap API key (required)

# Start the development server
npm run dev

# Build for production
npm run build

# Start the production server
npm run start
```

## Environment Variables

- `CMC_API_KEY` (Required): A CoinMarketCap API key for accessing token price data. You must obtain a key from [CoinMarketCap's API Portal](https://coinmarketcap.com/api/).

## Testing

To test the API, start the server and run:

```bash
curl http://localhost:3001/api/supply | jq
```

## Contributing

Contributions are welcome- please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

### Adding Support for New Stablecoins

To add support for a new stablecoin:
1. Add the token information to the `TOKENS` object in `app/api/supply/route.ts`
2. Add metadata for the UI in `app/page.tsx` in the `TOKEN_METADATA` object
3. Add an icon in the `public/icons` directory
