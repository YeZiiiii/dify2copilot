# Dify Microsoft 365 Copilot Agent

A professional integration solution that brings Dify AI capabilities to Microsoft 365 Copilot using the Microsoft 365 Agents SDK.

## Features

- Seamless integration with Dify API
- Streaming response support
- Conversation context management
- Professional error handling
- Production-ready deployment configuration

## Quick Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Update `env/.env.local` with your Dify API key:
   ```bash
   DIFY_API_KEY=your-dify-api-key
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Deploy to Teams**
   ```bash
   npm run dev:teamsfx
   ```

## Project Structure

```
src/
├── agent.js          # Main agent implementation
├── difyClient.js     # Dify API client
├── config.js         # Configuration management
├── adapter.js        # Teams adapter
└── index.js          # Application entry point

env/                  # Environment configurations
appPackage/          # Teams app manifest
infra/               # Azure infrastructure
```

## Configuration

Set the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DIFY_API_KEY` | Your Dify API key | Yes |
| `DIFY_BASE_URL` | Dify API endpoint | No |
| `REQUEST_TIMEOUT` | Request timeout (ms) | No |

## Documentation

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed integration instructions and best practices.

## Deployment

This project supports deployment to Azure App Service through Teams Toolkit. Configure your Azure resources in the `infra/` directory and deploy using:


## License

MIT
