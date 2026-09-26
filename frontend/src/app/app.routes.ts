import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { ChatPageComponent } from './pages/chat-page/chat-page.component';

export const routes: Routes = [
  { path: '', component: LandingComponent, title: 'DocBord — Understand Medicine, Not Memorize It' },
  { path: 'chat', component: ChatPageComponent, title: 'DocBord — Medical Study Chat' },
  { path: '**', redirectTo: '' }
];
