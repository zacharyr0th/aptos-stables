# Contributing to Aptos Stablecoin Supply API

Thank you for considering contributing to the Aptos Stablecoin Supply API! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

1. A clear title and description
2. Steps to reproduce the bug
3. Expected behavior
4. Actual behavior
5. Any relevant logs or screenshots

### Suggesting Enhancements

For feature requests or enhancements:

1. Create an issue with a clear title and detailed description
2. Explain why this enhancement would be useful
3. Suggest an implementation approach if possible

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Run tests and linting locally (`npm run lint`)
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature-name`)
7. Open a Pull Request

## Development Setup

1. Clone your fork of the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`

## Adding New Stablecoins

To add support for a new stablecoin:

1. Add the token information to the `TOKENS` object in `app/api/supply/route.ts`:
   ```typescript
   const TOKENS: Record<string, string> = {
     // Existing tokens...
     'NEW_TOKEN': '0xasset_type_address_here',
   };
   ```

2. Add metadata for the UI in `app/page.tsx` in the `TOKEN_METADATA` object:
   ```typescript
   const TOKEN_METADATA: Record<string, TokenMetadata> = {
     // Existing tokens...
     'NEW_TOKEN': {
       name: 'Full Token Name',
       symbol: 'NEW_TOKEN',
       thumbnail: '/icons/new_token.png',
       type: 'Token type description',
       issuer: 'Issuer name',
       assetAddress: '0xasset_type_address_here',
       decimals: 6,
       explorerLink: 'https://explorer.aptoslabs.com/fungible_asset/0xasset_type_address_here?network=mainnet',
       website: 'https://token-website.com',
       auditLink: 'https://token-audit-url.com',
       tags: ['relevant', 'tags']
     }
   };
   ```

3. Add an icon in the `public/icons` directory (ideally a 32x32 or 64x64 PNG with transparency)

## Coding Standards

- Use TypeScript for all new code
- Follow existing code style and patterns
- Add comments for complex logic
- Ensure proper error handling

## Testing

- Test API endpoints with proper error cases
- Check performance with high volumes of requests
- Verify rate limiting works correctly

## Review Process

1. All PRs require at least one review
2. CI checks must pass
3. All comments must be addressed before merging

Thank you for contributing! 