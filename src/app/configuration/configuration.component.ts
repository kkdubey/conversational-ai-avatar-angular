import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigurationService, AzureConfig } from '../services/configuration.service';
import { AzureAiAvatarService } from '../services/azure-ai-avatar.service';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent implements OnInit {
  @Output() sessionStart = new EventEmitter<void>();
  
  configForm!: FormGroup;
  testingMicrophone = false;
  testingAudio = false;
  testResults = '';

  constructor(
    private fb: FormBuilder,
    private configService: ConfigurationService,
    private avatarService: AzureAiAvatarService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadConfiguration();
  }  private initializeForm(): void {
    this.configForm = this.fb.group({
      // Speech Service
      region: ['westus2', Validators.required],
      apiKey: ['', Validators.required],
      enablePrivateEndpoint: [false],
      privateEndpoint: [''],
      
      // Azure OpenAI
      azureOpenAIEndpoint: ['', Validators.required],
      azureOpenAIApiKey: ['', Validators.required],
      azureOpenAIDeploymentName: ['gpt-4o', Validators.required],
      systemPrompt: ['You are an AI assistant that helps people find information.', Validators.required],
      
      // Cognitive Search (On Your Data)
      enableOyd: [false],
      azureCogSearchEndpoint: [''],
      azureCogSearchApiKey: [''],
      azureCogSearchIndexName: [''],
      
      // Speech Configuration
      sttLocales: ['en-US,de-DE,es-ES,fr-FR,it-IT,ja-JP,ko-KR,zh-CN', Validators.required],
      ttsVoice: ['en-US-AvaMultilingualNeural', Validators.required],
      
      // Avatar Configuration
      talkingAvatarCharacter: ['meg', Validators.required],
      talkingAvatarStyle: ['formal', Validators.required],
      
      // Options
      continuousConversation: [true],
      autoStartMicrophone: [true]
    });

    // Watch for changes to update private endpoint visibility
    this.configForm.get('enablePrivateEndpoint')?.valueChanges.subscribe(enabled => {
      const privateEndpointControl = this.configForm.get('privateEndpoint');
      if (enabled) {
        privateEndpointControl?.setValidators([Validators.required]);
      } else {
        privateEndpointControl?.clearValidators();
      }
      privateEndpointControl?.updateValueAndValidity();
    });

    // Watch for changes to update cognitive search visibility
    this.configForm.get('enableOyd')?.valueChanges.subscribe(enabled => {
      const cogSearchControls = [
        'azureCogSearchEndpoint',
        'azureCogSearchApiKey',
        'azureCogSearchIndexName'
      ];
      
      cogSearchControls.forEach(controlName => {
        const control = this.configForm.get(controlName);
        if (enabled) {
          control?.setValidators([Validators.required]);
        } else {
          control?.clearValidators();
        }
        control?.updateValueAndValidity();
      });
    });
  }

  private loadConfiguration(): void {
    this.configService.config$.subscribe(config => {
      this.configForm.patchValue({
        region: config.speechService.region,
        apiKey: config.speechService.apiKey,
        enablePrivateEndpoint: config.options.enablePrivateEndpoint,
        privateEndpoint: config.speechService.privateEndpoint,
        
        azureOpenAIEndpoint: config.openAI.endpoint,
        azureOpenAIApiKey: config.openAI.apiKey,
        azureOpenAIDeploymentName: config.openAI.deploymentName,
        systemPrompt: config.openAI.systemPrompt,
        
        enableOyd: config.options.enableOyd,
        azureCogSearchEndpoint: config.cognitiveSearch.endpoint,
        azureCogSearchApiKey: config.cognitiveSearch.apiKey,
        azureCogSearchIndexName: config.cognitiveSearch.indexName,
        
        sttLocales: config.speech.sttLocales,
        ttsVoice: config.speech.ttsVoice,
        
        talkingAvatarCharacter: config.avatar.character,
        talkingAvatarStyle: config.avatar.style,
        
        continuousConversation: config.options.continuousConversation,
        autoStartMicrophone: config.options.autoStartMicrophone
      });
    });
  }

  onSubmit(): void {
    if (this.configForm.valid) {
      const formValue = this.configForm.value;
      const config: AzureConfig = {
        speechService: {
          region: formValue.region,
          apiKey: formValue.apiKey,
          privateEndpoint: formValue.privateEndpoint || ''
        },
        openAI: {
          endpoint: formValue.azureOpenAIEndpoint,
          apiKey: formValue.azureOpenAIApiKey,
          deploymentName: formValue.azureOpenAIDeploymentName,
          systemPrompt: formValue.systemPrompt
        },
        cognitiveSearch: {
          endpoint: formValue.azureCogSearchEndpoint || '',
          apiKey: formValue.azureCogSearchApiKey || '',
          indexName: formValue.azureCogSearchIndexName || ''
        },
        speech: {
          sttLocales: formValue.sttLocales,
          ttsVoice: formValue.ttsVoice
        },
        avatar: {
          character: formValue.talkingAvatarCharacter,
          style: formValue.talkingAvatarStyle
        },
        options: {
          enablePrivateEndpoint: formValue.enablePrivateEndpoint,
          enableOyd: formValue.enableOyd,
          continuousConversation: formValue.continuousConversation,
          autoStartMicrophone: formValue.autoStartMicrophone
        }
      };

      this.configService.updateConfig(config);
      this.sessionStart.emit();
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.configForm.controls).forEach(key => {
      const control = this.configForm.get(key);
      control?.markAsTouched();
    });
  }

  async testMicrophone(): Promise<void> {
    this.testingMicrophone = true;
    this.testResults = '';
    
    try {
      // First save current configuration
      this.saveCurrentConfig();
      
      const result = await this.avatarService.testMicrophone();
      this.testResults = result;
    } catch (error) {
      this.testResults = `❌ Microphone test failed: ${(error as Error).message}`;
    } finally {
      this.testingMicrophone = false;
    }
  }

  async testAudioLevels(): Promise<void> {
    this.testingAudio = true;
    this.testResults = '';
    
    try {
      const result = await this.avatarService.testAudioLevels();
      this.testResults = result;
    } catch (error) {
      this.testResults = `❌ Audio test failed: ${(error as Error).message}`;
    } finally {
      this.testingAudio = false;
    }
  }

  private saveCurrentConfig(): void {
    if (this.configForm.valid) {
      const formValue = this.configForm.value;
      const config: AzureConfig = {
        speechService: {
          region: formValue.region,
          apiKey: formValue.apiKey,
          privateEndpoint: formValue.privateEndpoint || ''
        },
        openAI: {
          endpoint: formValue.azureOpenAIEndpoint,
          apiKey: formValue.azureOpenAIApiKey,
          deploymentName: formValue.azureOpenAIDeploymentName,
          systemPrompt: formValue.systemPrompt
        },
        cognitiveSearch: {
          endpoint: formValue.azureCogSearchEndpoint || '',
          apiKey: formValue.azureCogSearchApiKey || '',
          indexName: formValue.azureCogSearchIndexName || ''
        },
        speech: {
          sttLocales: formValue.sttLocales,
          ttsVoice: formValue.ttsVoice
        },
        avatar: {
          character: formValue.talkingAvatarCharacter,
          style: formValue.talkingAvatarStyle
        },
        options: {
          enablePrivateEndpoint: formValue.enablePrivateEndpoint,
          enableOyd: formValue.enableOyd,
          continuousConversation: formValue.continuousConversation,
          autoStartMicrophone: formValue.autoStartMicrophone
        }
      };

      this.configService.updateConfig(config);
    }
  }
  resetToDefaults(): void {
    this.configService.resetToDefaults();
  }

  async runDiagnostics(): Promise<void> {
    console.log('🔍 Starting diagnostics...');
    this.testResults = '🔍 Running diagnostics...\n\n';
    
    try {
      // Check if Speech SDK is loaded
      if (typeof (window as any).SpeechSDK === 'undefined') {
        this.testResults += '❌ Azure Speech SDK not loaded\n';
        return;
      } else {
        this.testResults += '✅ Azure Speech SDK loaded\n';
      }
      
      // Check microphone permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.testResults += '✅ Microphone permission granted\n';
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        this.testResults += '❌ Microphone permission denied\n';
        return;
      }
      
      // Check configuration
      const config = this.configService.getCurrentConfig();
      if (!config.speechService.apiKey) {
        this.testResults += '❌ Azure Speech API key missing\n';
      } else {
        this.testResults += '✅ Azure Speech API key present\n';
      }
      
      if (!config.openAI.endpoint) {
        this.testResults += '❌ Azure OpenAI endpoint missing\n';
      } else {
        this.testResults += '✅ Azure OpenAI endpoint present\n';
      }
      
      if (!config.openAI.apiKey) {
        this.testResults += '❌ Azure OpenAI API key missing\n';
      } else {
        this.testResults += '✅ Azure OpenAI API key present\n';
      }
      
      this.testResults += '\n🎯 Diagnostics complete. Check the console for detailed logs.\n';
      
    } catch (error) {
      this.testResults += `❌ Diagnostics failed: ${(error as Error).message}\n`;
    }
  }
}
