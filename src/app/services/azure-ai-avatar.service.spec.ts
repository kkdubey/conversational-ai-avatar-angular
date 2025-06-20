import { TestBed } from '@angular/core/testing';

import { AzureAiAvatarService } from './azure-ai-avatar.service';

describe('AzureAiAvatarService', () => {
  let service: AzureAiAvatarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AzureAiAvatarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
