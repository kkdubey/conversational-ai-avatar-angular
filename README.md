# Azure AI Avatar - Angular Application

An interactive AI tutor application built with Angular that integrates Azure AI Avatar, Azure Speech Services, and Azure OpenAI to create a conversational AI experience with a realistic avatar interface.

## 🎯 Features

- **Interactive AI Avatar**: Real-time talking avatar powered by Azure AI Avatar service
- **Speech Recognition**: Convert speech to text using Azure Speech Services
- **Text-to-Speech**: Natural voice synthesis with customizable voices
- **AI Conversation**: Intelligent responses powered by Azure OpenAI (GPT-4)
- **Responsive Design**: Bootstrap-based UI that works on desktop and mobile
- **Real-time Communication**: WebRTC for low-latency audio/video streaming
- **Cognitive Search Integration**: Optional "On Your Data" functionality
- **Microphone Testing**: Built-in audio diagnostics and testing tools

## 🏗️ Architecture

The application consists of two main components:
- **Configuration Component**: Setup and manage Azure service configurations
- **Session Component**: Interactive avatar conversation interface

### Key Services
- `AzureAiAvatarService`: Manages avatar synthesis, WebRTC connections, and speech recognition
- `ConfigurationService`: Handles application settings and Azure service configurations

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 18 or higher)
- **Angular CLI** (version 18.2.4 or higher)
- **Azure Subscriptions** with the following services:
  - Azure Speech Services (in a region that supports AI Avatar)
  - Azure OpenAI Service
  - Azure Cognitive Search (optional, for "On Your Data" features)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd conversational-ai-avatar-angular
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to `http://localhost:4200`

## ⚙️ Configuration

### Required Azure Services Setup

#### 1. Azure Speech Service
- Create an Azure Speech Service resource
- **Important**: Choose a region that supports Azure AI Avatar:
  - **West US 2** (Recommended)
  - **West Europe** 
  - **Southeast Asia**
- Copy the API Key and Region

#### 2. Azure OpenAI Service
- Create an Azure OpenAI resource
- Deploy a GPT-4 model (e.g., `gpt-4o`)
- Copy the Endpoint URL, API Key, and Deployment Name

#### 3. Azure Cognitive Search (Optional)
- Required only if using "On Your Data" functionality
- Create a Cognitive Search service
- Create and populate a search index
- Copy the Endpoint URL, API Key, and Index Name

### Application Configuration

1. **Launch the application** and you'll see the Configuration page
2. **Fill in the required fields**:
   - Azure Speech Service region and API key
   - Azure OpenAI endpoint, API key, and deployment name
   - Avatar character and style preferences
   - Speech-to-Text and Text-to-Speech settings
3. **Test your setup**:
   - Use "🎤 Test Mic" to verify microphone access
   - Use "🔊 Test Audio" to check audio output
   - Use "🔍 Diagnostics" to run comprehensive checks
4. **Start the session** by clicking "🚀 Start Session"

### Configuration Options

| Field | Description | Example |
|-------|-------------|---------|
| **Region** | Azure Speech Service region | `westus2` |
| **API Key** | Azure Speech Service key | `your-speech-api-key` |
| **OpenAI Endpoint** | Azure OpenAI resource URL | `https://your-resource.openai.azure.com` |
| **OpenAI API Key** | Azure OpenAI service key | `your-openai-api-key` |
| **Deployment Name** | OpenAI model deployment | `model-deployment-name` |
| **System Prompt** | AI assistant instructions | `You are a helpful AI tutor...` |
| **STT Locales** | Speech recognition languages | `en-US,es-ES,fr-FR` |
| **TTS Voice** | Text-to-speech voice | `en-US-AvaMultilingualNeural` |
| **Avatar Character** | Avatar appearance | `meg` |
| **Avatar Style** | Avatar presentation style | `formal` |

## 🎮 Usage

### Starting a Conversation
1. Complete the configuration form
2. Click "🚀 Start Session"
3. Allow microphone permissions when prompted
4. Wait for the avatar to load and initialize
5. Start speaking when you see the microphone is active

### Conversation Features
- **Voice Interaction**: Speak naturally to the AI avatar
- **Text Input**: Type messages using the text input box
- **Continuous Mode**: Enable for ongoing conversations without button presses
- **Auto-start Microphone**: Automatically begin listening when session starts

### Controls
- **🎤 Microphone Toggle**: Enable/disable voice input
- **📝 Text Input**: Send typed messages
- **⏹️ Stop Session**: End the current avatar session
- **🔄 Debug**: View detailed session information

## 🛠️ Development

### Project Structure
```
src/
├── app/
│   ├── configuration/          # Configuration component
│   ├── session/               # Avatar session component
│   ├── services/              # Angular services
│   │   ├── azure-ai-avatar.service.ts
│   │   └── configuration.service.ts
│   ├── app.component.*        # Main app component
│   └── app.config.ts          # App configuration
├── assets/                    # Static assets
└── index.html                 # Main HTML file
```

### Development Server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Building for Production
```bash
ng build
```
The build artifacts will be stored in the `dist/` directory.

### Running Tests
```bash
ng test      # Unit tests
ng e2e       # End-to-end tests (requires additional setup)
```

## 🔧 Troubleshooting

### Common Issues

#### Avatar Connection 404 Error
- **Cause**: Region doesn't support Azure AI Avatar or invalid endpoint
- **Solution**: 
  - Verify your region supports AI Avatar (use West US 2)
  - Check your Speech Service API key is correct
  - Ensure proper network connectivity

#### Microphone Not Working
- **Cause**: Browser permissions or device access issues
- **Solution**:
  - Allow microphone permissions in your browser
  - Check if other applications are using the microphone
  - Use the built-in microphone test feature

#### OpenAI API Errors
- **Cause**: Invalid credentials or model deployment issues
- **Solution**:
  - Verify your Azure OpenAI endpoint and API key
  - Ensure your deployment name matches exactly
  - Check your API key has proper permissions

#### Audio/Video Issues
- **Cause**: WebRTC connection problems or codec issues
- **Solution**:
  - Check browser compatibility (Chrome/Edge recommended)
  - Ensure proper network configuration
  - Try refreshing the browser

### Debug Tools
- Use the **🔍 Diagnostics** button to run comprehensive system checks
- Check browser developer console for detailed error messages
- Use the **🔄 Debug** button in session view for real-time status

## 🔒 Security Considerations

**⚠️ Important**: This is a development/demo application. For production use:

- **API Key Security**: Implement server-side API key management
- **Authentication**: Add proper user authentication
- **HTTPS**: Always use HTTPS in production
- **Rate Limiting**: Implement API rate limiting
- **Input Validation**: Sanitize all user inputs
- **CORS Configuration**: Properly configure CORS policies

## 📦 Dependencies

### Main Dependencies
- **Angular 18.2.x**: Frontend framework
- **RxJS**: Reactive programming
- **Bootstrap 5.3.x**: UI framework (via CDN)

### Azure SDKs
- Uses REST APIs and WebRTC for Azure service integration
- No additional Azure SDKs required

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For additional help:
- Check the [CONFIGURATION.md](./CONFIGURATION.md) file for detailed setup instructions
- Review the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) file for common issues
- Open an issue on the repository for bugs or feature requests
- Consult the [Angular CLI Documentation](https://angular.dev/tools/cli) for Angular-specific questions

## 🌟 Acknowledgments

- Built with [Angular CLI](https://github.com/angular/angular-cli)
- Powered by Azure AI services
- UI components from Bootstrap
- Icons from Unicode emoji set
