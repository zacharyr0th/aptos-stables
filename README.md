# Aptos Stablecoin Supply API

A simple API service that provides real-time information about stablecoin supplies on the Aptos blockchain.

## Overview

This API fetches the current circulating supply of major stablecoins on Aptos using the Aptos Indexer GraphQL API. It handles both token standards (legacy coin standard and newer Fungible-Asset standard) in a unified way.

## Supported Stablecoins

- **USDt**: Tether USD (USDT)
- **USDC**: Circle USD Coin (USDC)
- **USDe**: Ethena USDe
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

# Start the development server
npm run dev

# Build for production
npm run build

# Start the production server
npm run start
```

## Testing

To test the API, start the server and run:

```bash
curl http://localhost:3001/api/supply | jq
```

## License

MIT
