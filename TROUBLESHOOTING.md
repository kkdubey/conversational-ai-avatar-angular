# Azure AI Avatar Troubleshooting Guide

## Common Issues and Solutions

### 🎤 Microphone Not Working / Not Listening

#### Quick Diagnostics
1. **Click "🔍 Run Diagnostics"** button in the configuration page
2. Check browser console (F12) for detailed error messages
3. Verify microphone permissions in browser

#### Step-by-Step Troubleshooting

1. **Check Microphone Permissions**
   - Browser should prompt for microphone access
   - In Chrome: Click the microphone icon in address bar
   - In Edge: Go to Settings > Site permissions > Microphone
   - Make sure microphone access is "Allow" for localhost

2. **Test Hardware**
   - Use "Test Audio Levels" button to verify microphone is detecting sound
   - Speak loudly and check if audio levels are detected
   - Try using a different microphone or headset

3. **Check Azure Speech Configuration**
   - Verify your Azure Speech API key is correct
   - Make sure region is set to "westus2" (recommended for Avatar)
   - Test with "Test Microphone" button

4. **Browser Compatibility**
   - Use Chrome or Edge (recommended)
   - Ensure browser is up to date
   - Clear browser cache and cookies

### 🔇 No Audio from Avatar

#### Quick Checks
1. **Video Element Audio**
   - Check browser console for video/audio errors
   - Verify video element is not muted
   - Check browser volume settings

2. **WebRTC Connection**
   - Look for "Remote track received" messages in console
   - Check ICE connection state logs
   - Verify avatar session starts successfully

#### Step-by-Step Solutions

1. **Browser Audio Policy**
   - Click on the video area to interact with the page
   - Some browsers require user interaction before playing audio
   - Check browser address bar for audio/video blocked icons

2. **Configuration Check**
   - Ensure TTS Voice is set correctly (default: en-US-AvaMultilingualNeural)
   - Verify Azure OpenAI configuration is complete
   - Check if avatar character and style are valid

### 🚫 Session Won't Start

#### Common Causes
1. **Missing Configuration**
   - Azure Speech API Key
   - Azure OpenAI Endpoint
   - Azure OpenAI API Key
   - Deployment Name

2. **Network Issues**
   - Check internet connection
   - Verify Azure service endpoints are accessible
   - Check for firewall/proxy blocking

3. **API Key Issues**
   - Keys might be invalid or expired
   - Wrong region for Speech service
   - OpenAI deployment doesn't exist

### 🔧 Advanced Debugging

#### Browser Console Commands
```javascript
// Check if Speech SDK is loaded
console.log('SpeechSDK available:', typeof SpeechSDK !== 'undefined');

// Check microphone access
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('Microphone access: SUCCESS');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('Microphone access: FAILED', err));

// Check video element
const video = document.getElementById('remoteVideo');
console.log('Video element:', video);
console.log('Video src:', video?.srcObject);
console.log('Video muted:', video?.muted);
```

#### Network Debugging
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Start a session and check for failed requests
4. Look for 401 (Unauthorized) or 403 (Forbidden) errors

### 📋 Configuration Checklist

- [ ] Azure Speech API Key entered
- [ ] Region set to "westus2"
- [ ] Azure OpenAI endpoint URL correct
- [ ] Azure OpenAI API key entered
- [ ] Deployment name matches your Azure setup
- [ ] Microphone permission granted in browser
- [ ] Internet connection stable
- [ ] Using Chrome or Edge browser

### 🆘 Still Having Issues?

1. **Check Browser Console**: Look for red error messages
2. **Use Diagnostics Tool**: Click "🔍 Run Diagnostics" button
3. **Test Components**: Use "Test Microphone" and "Test Audio Levels"
4. **Try Different Browser**: Switch to Chrome or Edge
5. **Restart Application**: Refresh the page and try again

### 📝 Expected Console Output (Successful Session)

```
Starting avatar connection with config: {region: "westus2", hasApiKey: true, ...}
Making ICE server token request to: https://westus2.tts.speech.microsoft.com/...
ICE server token response parsed: {Urls: [...], Username: "...", Password: "..."}
Avatar started successfully
Setting up speech recognition event handlers...
Speech recognition event handlers configured
Session started successfully
Auto-starting microphone in 2 seconds...
Starting continuous recognition...
Speech recognition started successfully
Remote track received: [MediaStreamTrackEvent]
Video metadata loaded
Video can play
```

If you don't see similar output, there's likely an issue with configuration or network connectivity.
