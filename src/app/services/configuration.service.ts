import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AzureConfig {
  speechService: {
    region: string;
    apiKey: string;
    privateEndpoint: string;
  };
  openAI: {
    endpoint: string;
    apiKey: string;
    deploymentName: string;
    systemPrompt: string;
  };
  cognitiveSearch: {
    endpoint: string;
    apiKey: string;
    indexName: string;
  };
  speech: {
    sttLocales: string;
    ttsVoice: string;
  };
  avatar: {
    character: string;
    style: string;
  };
  options: {
    enablePrivateEndpoint: boolean;
    enableOyd: boolean;
    continuousConversation: boolean;
    autoStartMicrophone: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {  private defaultConfig: AzureConfig = {
    speechService: {
      region: '<your-region>',
      apiKey: '<your-speech-api-key>',
      // Optional: If using a private endpoint, specify it here
      privateEndpoint: ''
    },
    openAI: {
      endpoint: 'https://<your-custom-endpoint>.openai.azure.com',
      apiKey: '<your-api-key>',
      deploymentName: '<your-deployment-name>',
      systemPrompt: 'You are an AI assistant that helps people find information.'
    },
    cognitiveSearch: {
      endpoint: '',
      apiKey: '',
      indexName: ''
    },
    speech: {
      // List of supported STT locales, adjust as needed
      // For example: 'en-US,de-DE,es-ES,fr-FR,it-IT,ja-JP,ko-KR,zh-CN'
      sttLocales: 'en-US,de-DE,es-ES,fr-FR,it-IT,ja-JP,ko-KR,zh-CN',
      ttsVoice: 'en-US-AvaMultilingualNeural'
    },
    avatar: {
      // Default character and style, can be customized
      character: 'meg',
      style: 'formal'
    },
    options: {
      // Default options, can be customized
      enablePrivateEndpoint: false,
      enableOyd: false,
      continuousConversation: true,
      autoStartMicrophone: true
    }
  };

  private configSubject = new BehaviorSubject<AzureConfig>(this.defaultConfig);
  public config$ = this.configSubject.asObservable();

  constructor() {
    this.loadConfigFromStorage();
  }

  updateConfig(config: AzureConfig): void {
    this.configSubject.next(config);
    this.saveConfigToStorage(config);
  }

  getCurrentConfig(): AzureConfig {
    return this.configSubject.value;
  }

  private loadConfigFromStorage(): void {
    try {
      const savedConfig = localStorage.getItem('azureAIAvatarConfig');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        const mergedConfig = { ...this.defaultConfig, ...parsedConfig };
        this.configSubject.next(mergedConfig);
      }
    } catch (error) {
      console.error('Error loading config from storage:', error);
    }
  }

  private saveConfigToStorage(config: AzureConfig): void {
    try {
      localStorage.setItem('azureAIAvatarConfig', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving config to storage:', error);
    }
  }

  resetToDefaults(): void {
    this.configSubject.next({ ...this.defaultConfig });
    localStorage.removeItem('azureAIAvatarConfig');
  }

  validateConfig(): string[] {
    const errors: string[] = [];
    const config = this.getCurrentConfig();

    if (!config.speechService.apiKey) {
      errors.push('Azure Speech API Key is required');
    }

    if (!config.openAI.endpoint) {
      errors.push('Azure OpenAI Endpoint is required');
    }

    if (!config.openAI.apiKey) {
      errors.push('Azure OpenAI API Key is required');
    }

    if (!config.openAI.deploymentName) {
      errors.push('Azure OpenAI Deployment Name is required');
    }

    return errors;
  }
}
