# Azure AI Avatar Angular Application - Configuration Guide

## Quick Start

1. **Start the application**:
   ```bash
   npm start
   ```

2. **Open your browser** and navigate to `http://localhost:4200`

3. **Configure your Azure services** in the Configuration form

## Required Azure Services

### 1. Azure Speech Service
- **Region**: Choose Region that is best Azure AI Avatar support
- **API Key**: Get from your Azure Speech Service resource
- **Important**: Not all regions support Azure AI Avatar.

### 2. Azure OpenAI Service
- **Endpoint**: Your Azure OpenAI endpoint URL
- **API Key**: Your Azure OpenAI API key
- **Deployment Name**: Name of your GPT-4 deployment

## Configuration Steps

1. Fill in all required fields in the Configuration form
2. Test your microphone using the "Test Microphone" button
3. Click "Open Session" to start the avatar session

## Troubleshooting

### 404 Error on Avatar Connection
- **Cause**: Region doesn't support Azure AI Avatar or invalid API endpoint
- **Solution**: 
  - Change region that support avatar
  - Verify your Speech Service API key is correct
  - Ensure your Speech Service resource is in a supported region

### Microphone Issues
- **Cause**: Browser permissions or microphone access
- **Solution**:
  - Allow microphone permissions in your browser
  - Use the "Test Microphone" button to verify functionality
  - Check if other applications are using the microphone

### OpenAI API Errors
- **Cause**: Invalid API key, endpoint, or deployment name
- **Solution**:
  - Verify your Azure OpenAI resource details
  - Check that your deployment name matches exactly
  - Ensure your API key has proper permissions

## Supported Regions for Azure AI Avatar

The following regions are known to support Azure AI Avatar services:
- **West US 2** (Recommended)
- **West Europe**
- **Southeast Asia**

## Security Note

This is a development/demo application. For production use:
- Implement server-side API key management
- Add proper authentication
- Use HTTPS
- Implement rate limiting
