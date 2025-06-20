import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { ConfigurationService, AzureConfig } from './configuration.service';

declare var SpeechSDK: any;

@Injectable({
  providedIn: 'root'
})
export class AzureAiAvatarService {
  private speechRecognizer: any;
  private avatarSynthesizer: any;
  private peerConnection: RTCPeerConnection | null = null;
  private messages: any[] = [];
  private dataSources: any[] = [];
  private isSpeaking = false;
  private sessionActive = false;
  private speakingText = '';
  private spokenTextQueue: string[] = [];
  private lastSpeakTime: Date | null = null;

  // Observables for component communication
  private sessionStatusSubject = new BehaviorSubject<boolean>(false);
  public sessionStatus$ = this.sessionStatusSubject.asObservable();

  private chatHistorySubject = new Subject<string>();
  public chatHistory$ = this.chatHistorySubject.asObservable();

  private subtitlesSubject = new Subject<string>();
  public subtitles$ = this.subtitlesSubject.asObservable();

  private microphoneStatusSubject = new BehaviorSubject<boolean>(false);
  public microphoneStatus$ = this.microphoneStatusSubject.asObservable();

  private speakingStatusSubject = new BehaviorSubject<boolean>(false);
  public speakingStatus$ = this.speakingStatusSubject.asObservable();

  constructor(
    private configService: ConfigurationService,
    private http: HttpClient
  ) {}
  async startSession(): Promise<void> {
    try {
      // Check if SpeechSDK is available
      if (typeof SpeechSDK === 'undefined') {
        throw new Error('Azure Speech SDK not loaded. Please check your internet connection and try again.');
      }
      
      const config = this.configService.getCurrentConfig();
      const validationErrors = this.configService.validateConfig();
      
      if (validationErrors.length > 0) {
        throw new Error('Configuration validation failed: ' + validationErrors.join(', '));
      }

      console.log('Starting avatar connection with config:', {
        region: config.speechService.region,
        hasApiKey: !!config.speechService.apiKey,
        hasOpenAIEndpoint: !!config.openAI.endpoint,
        hasOpenAIKey: !!config.openAI.apiKey
      });
      
      await this.connectAvatar(config);
      this.sessionStatusSubject.next(true);
      this.sessionActive = true;
      console.log('Session started successfully');
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  async stopSession(): Promise<void> {
    try {
      await this.disconnectAvatar();
      this.sessionStatusSubject.next(false);
      this.sessionActive = false;
      this.microphoneStatusSubject.next(false);
      this.speakingStatusSubject.next(false);
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  }

  private async connectAvatar(config: AzureConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Speech synthesis config
        let speechSynthesisConfig;
        if (config.options.enablePrivateEndpoint && config.speechService.privateEndpoint) {
          speechSynthesisConfig = SpeechSDK.SpeechConfig.fromEndpoint(
            new URL(config.speechService.privateEndpoint),
            config.speechService.apiKey
          );
        } else {
          speechSynthesisConfig = SpeechSDK.SpeechConfig.fromSubscription(
            config.speechService.apiKey,
            config.speechService.region
          );
        }

        speechSynthesisConfig.speechSynthesisVoiceName = config.speech.ttsVoice;

        // Avatar config
        const avatarConfig = new SpeechSDK.AvatarConfig(
          config.avatar.character,
          config.avatar.style
        );
        avatarConfig.customized = false;

        // Create avatar synthesizer
        this.avatarSynthesizer = new SpeechSDK.AvatarSynthesizer(
          speechSynthesisConfig,
          avatarConfig
        );        // Speech recognition config
        let speechRecognitionConfig;
        if (config.options.enablePrivateEndpoint && config.speechService.privateEndpoint) {
          speechRecognitionConfig = SpeechSDK.SpeechConfig.fromEndpoint(
            new URL(config.speechService.privateEndpoint),
            config.speechService.apiKey
          );
        } else {
          speechRecognitionConfig = SpeechSDK.SpeechConfig.fromSubscription(
            config.speechService.apiKey,
            config.speechService.region
          );
        }

        // Set speech recognition language to English for simplicity (like original JS)
        speechRecognitionConfig.speechRecognitionLanguage = 'en-US';
        console.log('Speech recognition config created successfully');

        // Create speech recognizer with default microphone input (simplified like original)
        this.speechRecognizer = new SpeechSDK.SpeechRecognizer(
          speechRecognitionConfig,
          SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
        );
        console.log('Speech recognizer created successfully');

        // Setup data sources if enabled
        if (config.options.enableOyd) {
          this.setDataSources(config);
        }

        this.initMessages(config);

        // Get ICE server token
        this.getIceServerToken(config, resolve, reject);
      } catch (error) {
        console.error('Error in connectAvatar:', error);
        reject(error);
      }
    });
  }  private async getIceServerToken(config: AzureConfig, resolve: Function, reject: Function): Promise<void> {
    try {
      const endpoint = config.options.enablePrivateEndpoint && config.speechService.privateEndpoint
        ? `${config.speechService.privateEndpoint}/tts/cognitiveservices/avatar/relay/token/v1`
        : `https://${config.speechService.region}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`;

      console.log('Making ICE server token request to:', endpoint);
      console.log('Using region:', config.speechService.region);

      const headers = new HttpHeaders({
        'Ocp-Apim-Subscription-Key': config.speechService.apiKey
      });

      const response = await this.http.get<any>(endpoint, { headers }).toPromise();
      console.log('ICE server token response parsed:', response);
      this.setupWebRTC(response.Urls[0], response.Username, response.Password, resolve, reject);
    } catch (error: any) {
      const errorMessage = `Failed to get ICE server token: ${error.status || 'Unknown'} ${error.statusText || error.message}`;
      console.error(errorMessage);
      console.error('Full error:', error);
      reject(new Error(errorMessage));
    }
  }

  private setupWebRTC(iceServerUrl: string, iceServerUsername: string, iceServerCredential: string, resolve: Function, reject: Function): void {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{
          urls: [iceServerUrl],
          username: iceServerUsername,
          credential: iceServerCredential
        }]
      });      this.peerConnection.ontrack = (event) => {
        console.log('Remote track received:', event);
        console.log('Track kind:', event.track.kind);
        console.log('Track streams:', event.streams);
        
        if (event.track.kind === 'audio') {
          console.log('🔊 Audio track received - setting up audio element');
          const audioElement = document.createElement('audio');
          audioElement.id = 'audioPlayer';
          audioElement.srcObject = event.streams[0];
          audioElement.autoplay = true;
          audioElement.onplaying = () => console.log('🔊 WebRTC audio connected.');

          const remoteDiv = document.getElementById('remoteVideo');
          if (remoteDiv) {
            // Remove any existing audio elements
            const existingAudio = remoteDiv.querySelectorAll('audio');
            existingAudio.forEach(audio => remoteDiv.removeChild(audio));
            remoteDiv.appendChild(audioElement);
          }
        } else if (event.track.kind === 'video') {
          console.log('📹 Video track received - setting up video element');
          const videoElement = document.getElementById('remoteVideo') as HTMLVideoElement;
          if (videoElement) {
            console.log('Setting video stream to existing video element');
            videoElement.srcObject = event.streams[0];
            videoElement.autoplay = true;
            videoElement.muted = false; // Ensure audio is not muted
            videoElement.playsInline = true;
            
            videoElement.onplaying = () => {
              console.log('📹 WebRTC video connected and playing');
              // Mark session as truly active after video starts
              setTimeout(() => { 
                this.sessionActive = true;
                console.log('Session marked as fully active');
              }, 2000);
            };
            
            // Add event listeners for debugging
            videoElement.addEventListener('loadedmetadata', () => {
              console.log('Video metadata loaded, duration:', videoElement.duration);
            });
            
            videoElement.addEventListener('loadeddata', () => {
              console.log('Video data loaded');
            });
            
            videoElement.addEventListener('canplay', () => {
              console.log('Video can play');
              videoElement.play().catch(e => console.error('Error playing video:', e));
            });
            
            videoElement.addEventListener('error', (e) => {
              console.error('Video error:', e);
            });
          } else {
            console.error('❌ Video element not found!');
          }
        }
      };

      this.peerConnection.addEventListener('datachannel', event => {
        console.log('Data channel received:', event);
        const channel = event.channel;
        channel.addEventListener('message', this.onDataChannelMessage.bind(this));
      });

      this.peerConnection.createDataChannel('eventChannel');

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
      };

      this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
      this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });

      this.avatarSynthesizer.startAvatarAsync(this.peerConnection)
        .then((result: any) => {
          console.log('Avatar started successfully:', result);
          this.setupSpeechRecognition();
          resolve(result);
        })
        .catch((error: any) => {
          console.error('Failed to start avatar:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error setting up WebRTC:', error);
      reject(error);
    }
  }

  private onDataChannelMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      console.log('Data channel message:', message);
    } catch (error) {
      console.error('Error parsing data channel message:', error);
    }
  }  private setupSpeechRecognition(): void {
    if (!this.speechRecognizer) {
      console.error('Speech recognizer not available for setup');
      return;
    }

    console.log('Setting up speech recognition event handlers...');

    // Don't set up handlers here - set them up in startMicrophone to ensure they're fresh
    console.log('Speech recognition event handlers will be configured when microphone starts');
  }  async startMicrophone(): Promise<void> {
    try {
      // Check if microphone is already active
      if (this.microphoneStatusSubject.value) {
        console.log('Microphone is already active');
        return;
      }

      // Check if speech recognizer exists
      if (!this.speechRecognizer) {
        console.log('Speech recognizer not ready yet, waiting...');
        setTimeout(() => this.startMicrophone(), 1000);
        return;
      }

      // Check microphone permissions first
      const hasPermission = await this.checkMicrophonePermissions();
      if (!hasPermission) {
        return;
      }

      console.log('🎤 Starting microphone...');

      // Setup event handlers right before starting (like in original JS)
      this.speechRecognizer.recognizing = (s: any, e: any) => {
        console.log('🎤 RECOGNIZING: ' + e.result.text);
        this.subtitlesSubject.next(e.result.text);
      };

      this.speechRecognizer.recognized = (s: any, e: any) => {
        console.log('✅ RECOGNITION RESULT:', e.result.reason);
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const userQuery = e.result.text.trim();
          console.log('🗣️ RECOGNIZED SPEECH: "' + userQuery + '"');
          this.subtitlesSubject.next('');
          if (userQuery) {
            const config = this.configService.getCurrentConfig();
            if (config.options.continuousConversation) {
              console.log('🔄 Continuous mode: Keeping microphone active');
              this.handleUserQuery(userQuery);
            } else {
              // In single mode, stop recognition after getting a result
              console.log('🎯 Single mode: Stopping microphone after recognition');
              this.speechRecognizer.stopContinuousRecognitionAsync(
                () => {
                  this.microphoneStatusSubject.next(false);
                  console.log('Microphone stopped, processing query');
                  this.handleUserQuery(userQuery);
                },
                (err: any) => {
                  console.error('Error stopping recognition after speech:', err);
                  this.microphoneStatusSubject.next(false);
                }
              );
            }
          }
        } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
          console.log('❌ NO MATCH: Speech could not be recognized');
        } else {
          console.log('⚠️ RECOGNITION FAILED with reason:', e.result.reason);
        }
      };

      this.speechRecognizer.canceled = (s: any, e: any) => {
        console.log('🚫 SPEECH RECOGNITION CANCELED:', e.reason);
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          console.log('❌ ERROR CODE:', e.errorCode);
          console.log('❌ ERROR DETAILS:', e.errorDetails);
        }
        this.microphoneStatusSubject.next(false);
      };

      this.speechRecognizer.sessionStopped = (s: any, e: any) => {
        console.log('🛑 SPEECH RECOGNITION SESSION STOPPED');
        this.microphoneStatusSubject.next(false);
      };

      // Start continuous recognition
      this.speechRecognizer.startContinuousRecognitionAsync(
        () => {
          console.log('🎤 MICROPHONE STARTED - Listening for speech...');
          const config = this.configService.getCurrentConfig();
          if (config.options.continuousConversation) {
            console.log('🔄 Continuous conversation mode enabled');
          }
          this.microphoneStatusSubject.next(true);
        },
        (error: any) => {
          console.error('❌ FAILED TO START MICROPHONE:', error);
          this.microphoneStatusSubject.next(false);
          throw new Error(`Failed to start microphone: ${error}`);
        }
      );
    } catch (error) {
      console.error('Error starting microphone:', error);
      this.microphoneStatusSubject.next(false);
      throw error;
    }
  }

  private async checkMicrophonePermissions(): Promise<boolean> {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      // Stop the stream since we're just checking permissions
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('❌ Microphone permission denied or unavailable:', err);
      throw new Error('Microphone access is required for speech recognition. Please allow microphone access and try again.');
    }
  }
  async stopMicrophone(): Promise<void> {
    try {
      if (!this.speechRecognizer || !this.microphoneStatusSubject.value) {
        console.log('Microphone is not active or speech recognizer not available');
        return;
      }

      console.log('Stopping continuous recognition...');
      this.speechRecognizer.stopContinuousRecognitionAsync(
        () => {
          console.log('Speech recognition stopped successfully');
          this.microphoneStatusSubject.next(false);
        },
        (error: any) => {
          console.error('Error stopping speech recognition:', error);
          this.microphoneStatusSubject.next(false);
        }
      );
    } catch (error) {
      console.error('Error stopping microphone:', error);
      this.microphoneStatusSubject.next(false);
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      this.spokenTextQueue = [];
      if (this.avatarSynthesizer && this.isSpeaking) {
        this.avatarSynthesizer.stopSpeakingAsync();
        this.isSpeaking = false;
        this.speakingStatusSubject.next(false);
      }
    } catch (error) {
      console.error('Error stopping speaking:', error);
    }
  }

  private async handleUserQuery(userQuery: string): Promise<void> {
    try {
      this.messages.push({ role: 'user', content: userQuery });
      this.chatHistorySubject.next(`User: ${userQuery}\n\n`);

      if (this.isSpeaking) {
        await this.stopSpeaking();
      }

      // Call Azure OpenAI
      const config = this.configService.getCurrentConfig();
      const response = await this.callAzureOpenAI(userQuery, config);
      
      if (response) {
        this.messages.push({ role: 'assistant', content: response });
        this.chatHistorySubject.next(`Assistant: ${response}\n\n`);
        await this.speak(response);
      }
    } catch (error) {
      console.error('Error handling user query:', error);
    }
  }

  private async callAzureOpenAI(userQuery: string, config: AzureConfig): Promise<string> {
    try {
      const requestBody = {
        messages: this.messages,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false
      };

      if (this.dataSources.length > 0) {
        (requestBody as any).data_sources = this.dataSources;
      }      const url = `${config.openAI.endpoint}/openai/deployments/${config.openAI.deploymentName}/chat/completions?api-version=2024-02-15-preview`;
      
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'api-key': config.openAI.apiKey
      });

      const response = await this.http.post<any>(url, requestBody, { headers }).toPromise();
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error calling Azure OpenAI:', error);
      throw error;
    }
  }

  private async speak(text: string, endingSilenceMs: number = 0): Promise<void> {
    if (this.isSpeaking) {
      this.spokenTextQueue.push(text);
      return;
    }

    try {
      this.isSpeaking = true;
      this.speakingText = text;
      this.speakingStatusSubject.next(true);

      const config = this.configService.getCurrentConfig();
      let ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'
                       xmlns:mstts='http://www.w3.org/2001/mstts'
                       xml:lang='en-US'>
                    <voice name='${config.speech.ttsVoice}'>
                      <mstts:ttsembedding>
                        <mstts:leadingsilence-exact value='0'/>
                        ${this.htmlEncode(text)}
                      </mstts:ttsembedding>
                    </voice>
                  </speak>`;

      if (endingSilenceMs > 0) {
        ssml = ssml.replace('</speak>', `<break time='${endingSilenceMs}ms'/></speak>`);
      }

      this.lastSpeakTime = new Date();

      await new Promise((resolve, reject) => {
        this.avatarSynthesizer.speakSsmlAsync(ssml)
          .then(() => {
            this.isSpeaking = false;
            this.speakingStatusSubject.next(false);
            
            // Process queued speech
            if (this.spokenTextQueue.length > 0) {
              const nextText = this.spokenTextQueue.shift();
              this.speak(nextText!);
            }
            resolve(void 0);
          })
          .catch((error: any) => {
            console.error('Error speaking:', error);
            this.isSpeaking = false;
            this.speakingStatusSubject.next(false);
            reject(error);
          });
      });
    } catch (error) {
      console.error('Error in speak function:', error);
      this.isSpeaking = false;
      this.speakingStatusSubject.next(false);
    }
  }

  private htmlEncode(text: string): string {
    const entityMap: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };
    return String(text).replace(/[&<>"'\/]/g, (m) => entityMap[m]);
  }

  private setDataSources(config: AzureConfig): void {
    if (config.cognitiveSearch.endpoint && config.cognitiveSearch.apiKey && config.cognitiveSearch.indexName) {
      this.dataSources.push({
        type: 'AzureCognitiveSearch',
        parameters: {
          endpoint: config.cognitiveSearch.endpoint,
          key: config.cognitiveSearch.apiKey,
          indexName: config.cognitiveSearch.indexName,
          semanticConfiguration: '',
          queryType: 'simple',
          fieldsMapping: {
            contentFieldsSeparator: '\n',
            contentFields: ['content'],
            filepathField: null,
            titleField: 'title',
            urlField: null
          },
          inScope: true,
          roleInformation: config.openAI.systemPrompt
        }
      });
    }
  }

  private initMessages(config: AzureConfig): void {
    this.messages = [];
    if (this.dataSources.length === 0) {
      this.messages.push({
        role: 'system',
        content: config.openAI.systemPrompt
      });
    }
  }

  private async disconnectAvatar(): Promise<void> {
    try {
      if (this.avatarSynthesizer) {
        await this.avatarSynthesizer.close();
        this.avatarSynthesizer = null;
      }
      
      if (this.speechRecognizer) {
        await this.speechRecognizer.close();
        this.speechRecognizer = null;
      }
      
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      this.sessionActive = false;
      this.isSpeaking = false;
    } catch (error) {
      console.error('Error disconnecting avatar:', error);
    }
  }

  clearChatHistory(): void {
    this.messages = [];
    const config = this.configService.getCurrentConfig();
    this.initMessages(config);
    this.chatHistorySubject.next('');
  }

  // Add chat message to history
  addChatMessage(role: 'user' | 'assistant', message: string): void {
    this.messages.push({ role, content: message });
    const formattedMessage = `${role === 'user' ? 'User' : 'Assistant'}: ${message}\n\n`;
    this.chatHistorySubject.next(formattedMessage);
  }

  // Send message to avatar
  async sendMessage(message: string): Promise<void> {
    await this.handleUserQuery(message);
  }

  // Microphone testing functions
  async testMicrophone(): Promise<string> {
    try {
      console.log('🧪 Testing microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
      
      const config = this.configService.getCurrentConfig();
      if (!config.speechService.apiKey) {
        throw new Error('Please enter your Azure Speech API key first');
      }
      
      const testConfig = SpeechSDK.SpeechConfig.fromSubscription(
        config.speechService.apiKey,
        config.speechService.region
      );
      testConfig.speechRecognitionLanguage = 'en-US';
      
      const testRecognizer = new SpeechSDK.SpeechRecognizer(
        testConfig,
        SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
      );
      
      return new Promise((resolve, reject) => {
        testRecognizer.recognized = (s: any, e: any) => {
          if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            console.log('✅ TEST RECOGNITION SUCCESS:', e.result.text);
            resolve(`🎉 Microphone test successful! Recognized: "${e.result.text}"`);
          } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
            console.log('❌ TEST NO MATCH: Speech could not be recognized');
            resolve('❌ No speech recognized. Try speaking louder or closer to the microphone.');
          }
          testRecognizer.close();
        };
        
        testRecognizer.canceled = (s: any, e: any) => {
          console.log('🚫 TEST RECOGNITION CANCELED:', e.reason, e.errorDetails);
          if (e.reason === SpeechSDK.CancellationReason.Error) {
            reject(new Error('❌ Test failed: ' + e.errorDetails));
          }
          testRecognizer.close();
        };
        
        console.log('🎬 Starting test recognition... Please speak now!');
        testRecognizer.recognizeOnceAsync();
      });
      
    } catch (error) {
      console.error('❌ Microphone test failed:', error);
      throw new Error('❌ Microphone test failed: ' + (error as Error).message);
    }
  }

  async testAudioLevels(): Promise<string> {
    try {
      console.log('🎵 Testing audio levels...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      microphone.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let maxLevel = 0;
      const testDuration = 3000; // 3 seconds
      
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          maxLevel = Math.max(maxLevel, average);
          
          if (average > 10) {
            console.log('🔊 Audio detected! Level:', Math.round(average));
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(interval);
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          
          console.log('📊 Audio test complete. Max level:', Math.round(maxLevel));
          if (maxLevel > 20) {
            resolve('✅ Audio test PASSED! Max level: ' + Math.round(maxLevel) + '. Your microphone is working.');
          } else {
            resolve('❌ Audio test FAILED! Max level: ' + Math.round(maxLevel) + '. Check your microphone settings.');
          }
        }, testDuration);
      });
      
    } catch (error) {
      console.error('❌ Audio level test failed:', error);
      throw new Error('❌ Audio level test failed: ' + (error as Error).message);
    }
  }
}
