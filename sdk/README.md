# @forgestudio/sdk

Official TypeScript / JavaScript SDK for ForgeStudio Developer API v1.

## Installation

```bash
npm install @forgestudio/sdk
```

## Quick Start

```typescript
import { ForgeStudioClient } from "@forgestudio/sdk";

const client = new ForgeStudioClient({
  baseUrl: "https://api.forgestudio.io/api/v1", // or http://localhost:5000/api/v1
  apiKey: "fs_live_YOUR_SECRET_KEY",
});

// List websites
const websites = await client.websites.list({ limit: 10 });

// Iterate with async generator
for await (const site of client.websites.iterate()) {
  console.log(site.name, site.id);
}

// Get pages
const pages = await client.pages.get("website_id");

// Trigger deployment
const deployment = await client.publishing.publish("website_id", {
  environment: "PRODUCTION",
  destinationType: "INTERNAL",
});
```

## Features

- Complete TypeScript type definitions
- Automatic rate-limit retry with exponential backoff on safe idempotent requests (429 handling)
- Request timeout and AbortSignal support
- Micro-retry prevention on state-mutating requests (POST, PUT, DELETE)
- Scoped API key and session token support
