import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigurationComponent } from './configuration/configuration.component';
import { SessionComponent } from './session/session.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ConfigurationComponent, SessionComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Azure AI Avatar';
  showSession = false;

  onSessionStart(): void {
    this.showSession = true;
  }

  onBackToConfiguration(): void {
    this.showSession = false;
  }
}
