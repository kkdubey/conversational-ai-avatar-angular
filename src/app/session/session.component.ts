import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AzureAiAvatarService } from '../services/azure-ai-avatar.service';
import { ConfigurationService } from '../services/configuration.service';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session.component.html',
  styleUrls: ['./session.component.css']
})
export class SessionComponent implements OnInit, OnDestroy, AfterViewInit {  @Output() backToConfiguration = new EventEmitter<void>();
  @ViewChild('remoteVideo', { static: false }) remoteVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('chatHistoryContainer', { static: false }) chatHistoryContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('userMessageInput', { static: false }) userMessageInput!: ElementRef<HTMLInputElement>;

  // UI State
  sessionActive = false;
  microphoneActive = false;
  isSpeaking = false;
  showChatHistory = true;
  showSubtitles = true;
  showTypeMessage = false;
  
  // Data
  chatHistory = '';
  subtitles = '';
  userMessage = '';
  
  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private avatarService: AzureAiAvatarService,
    private configService: ConfigurationService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.startAvatarSession();
  }

  ngAfterViewInit(): void {
    // Setup video element when available
    if (this.remoteVideoRef) {
      this.setupVideoElement();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.sessionActive) {
      this.stopSession();
    }
  }

  private setupSubscriptions(): void {
    // Session status
    const sessionSub = this.avatarService.sessionStatus$.subscribe(active => {
      this.sessionActive = active;
      if (active) {
        this.onSessionStarted();
      }
    });
    this.subscriptions.push(sessionSub);

    // Microphone status
    const micSub = this.avatarService.microphoneStatus$.subscribe(active => {
      this.microphoneActive = active;
    });
    this.subscriptions.push(micSub);

    // Speaking status
    const speakingSub = this.avatarService.speakingStatus$.subscribe(speaking => {
      this.isSpeaking = speaking;
    });
    this.subscriptions.push(speakingSub);

    // Chat history
    const chatSub = this.avatarService.chatHistory$.subscribe(newText => {
      if (newText) {
        this.chatHistory += newText;
        this.scrollChatToBottom();
      } else {
        this.chatHistory = ''; // Clear history
      }
    });
    this.subscriptions.push(chatSub);

    // Subtitles
    const subtitlesSub = this.avatarService.subtitles$.subscribe(subtitles => {
      this.subtitles = subtitles;
    });
    this.subscriptions.push(subtitlesSub);
  }

  private async startAvatarSession(): Promise<void> {
    try {
      await this.avatarService.startSession();
    } catch (error) {
      console.error('Failed to start avatar session:', error);
      alert(`Failed to start session: ${(error as Error).message}`);
      this.backToConfiguration.emit();
    }
  }  private onSessionStarted(): void {
    console.log('Session started, setting up auto-start microphone...');
    const config = this.configService.getCurrentConfig();
    console.log('Auto-start microphone enabled:', config.options.autoStartMicrophone);
    
    if (config.options.autoStartMicrophone) {
      console.log('Auto-starting microphone in 5 seconds to ensure avatar is ready...');
      setTimeout(() => {
        console.log('🎤 Auto-starting microphone after avatar session established...');
        this.toggleMicrophone();
      }, 5000); // Match the 5 second delay from original JavaScript
    }
  }
  private setupVideoElement(): void {
    const videoElement = this.remoteVideoRef.nativeElement;
    if (videoElement) {
      videoElement.autoplay = true;
      videoElement.muted = false; // We want to hear the avatar
      videoElement.playsInline = true;
      
      // Add event listeners for debugging
      videoElement.addEventListener('loadstart', () => console.log('Video load started'));
      videoElement.addEventListener('loadeddata', () => console.log('Video data loaded'));
      videoElement.addEventListener('canplay', () => console.log('Video can play'));
      videoElement.addEventListener('play', () => console.log('Video started playing'));
      videoElement.addEventListener('error', (e) => console.error('Video error:', e));
      
      console.log('Video element configured:', videoElement);
    }
  }
  async toggleMicrophone(): Promise<void> {
    try {
      console.log('Toggle microphone clicked. Current state:', this.microphoneActive);
      
      if (this.microphoneActive) {
        console.log('Stopping microphone...');
        await this.avatarService.stopMicrophone();
        console.log('Microphone stopped');
      } else {
        console.log('Starting microphone...');
        await this.avatarService.startMicrophone();
        console.log('Microphone started');
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      alert(`Microphone error: ${(error as Error).message}`);
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await this.avatarService.stopSpeaking();
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  clearChatHistory(): void {
    this.avatarService.clearChatHistory();
  }

  async stopSession(): Promise<void> {
    try {
      await this.avatarService.stopSession();
      this.backToConfiguration.emit();
    } catch (error) {
      console.error('Error stopping session:', error);
      this.backToConfiguration.emit();
    }
  }

  toggleChatHistory(): void {
    this.showChatHistory = !this.showChatHistory;
  }

  toggleSubtitles(): void {
    this.showSubtitles = !this.showSubtitles;
  }
  toggleTypeMessage(): void {
    this.showTypeMessage = !this.showTypeMessage;
    if (this.showTypeMessage && this.userMessageInput) {
      setTimeout(() => {
        this.userMessageInput.nativeElement.focus();
      }, 100);
    }
  }

  async sendTypedMessage(): Promise<void> {
    if (!this.userMessage.trim()) {
      return;
    }

    try {
      const message = this.userMessage.trim();
      this.userMessage = ''; // Clear the input
      
      // Add user message to chat history
      this.avatarService.addChatMessage('user', message);
      
      // Send message to avatar service
      await this.avatarService.sendMessage(message);
    } catch (error) {
      console.error('Error sending typed message:', error);
      alert(`Error sending message: ${(error as Error).message}`);
    }  
  }
  onUserMessageKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendTypedMessage();
    }
  }

  onVideoClick(): void {
    // Ensure video plays with audio (browser autoplay policies)
    const videoElement = this.remoteVideoRef?.nativeElement;
    if (videoElement) {
      console.log('Video clicked - attempting to play with audio');
      videoElement.muted = false;
      videoElement.play().catch(e => console.log('Video play failed:', e));
    }
  }

  private scrollChatToBottom(): void {
    if (this.chatHistoryContainer) {
      setTimeout(() => {
        const element = this.chatHistoryContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 50);
    }
  }

  // Utility methods for UI
  getMicrophoneButtonText(): string {
    return this.microphoneActive ? 'Stop Microphone' : 'Start Microphone';
  }

  getMicrophoneButtonClass(): string {
    return this.microphoneActive ? 'btn-danger' : 'btn-success';
  }

  getSessionStatusText(): string {
    return this.sessionActive ? 'Connected' : 'Connecting...';
  }
  getSessionStatusClass(): string {
    return this.sessionActive ? 'status-connected' : 'status-connecting';
  }

  debugSession(): void {
    console.log('🐛 SESSION DEBUG INFO:');
    console.log('Session Active:', this.sessionActive);
    console.log('Microphone Active:', this.microphoneActive);
    console.log('Is Speaking:', this.isSpeaking);
    console.log('Configuration:', this.configService.getCurrentConfig());
    
    // Check video element
    const videoElement = document.getElementById('remoteVideo') as HTMLVideoElement;
    console.log('Video Element:', videoElement);
    if (videoElement) {
      console.log('Video srcObject:', videoElement.srcObject);
      console.log('Video muted:', videoElement.muted);
      console.log('Video autoplay:', videoElement.autoplay);
      console.log('Video paused:', videoElement.paused);
    }
    
    // Check audio elements
    const audioElements = document.querySelectorAll('audio');
    console.log('Audio Elements found:', audioElements.length);
    audioElements.forEach((audio, index) => {
      console.log(`Audio ${index}:`, audio, 'muted:', audio.muted, 'paused:', audio.paused);
    });
    
    // Check Speech SDK
    console.log('SpeechSDK available:', typeof (window as any).SpeechSDK !== 'undefined');
    
    alert('Debug info logged to console. Press F12 to view.');
  }
}
