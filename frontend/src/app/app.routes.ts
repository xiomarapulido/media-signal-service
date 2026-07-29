import { Routes } from '@angular/router';

import { Analytics } from './pages/analytics/analytics';
import { Search } from './pages/search/search';

export const routes: Routes = [
  {
    path: '',
    component: Search
  },
  {
    path: 'analytics',
    component: Analytics
  },
  {
    path: '**',
    redirectTo: ''
  }
];