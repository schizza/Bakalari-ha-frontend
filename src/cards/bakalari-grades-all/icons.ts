import { svg } from 'lit';

export const EyeIcon = (cls = 'icon') => svg`
  <svg class=${cls} aria-hidden="true" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12c2.5-4 6.5-6 9-6s6.5 2 9 6c-2.5 4-6.5 6-9 6s-6.5-2-9-6z"></path>
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"></circle>
  </svg>
`;

export const EyeOffIcon = (cls = 'icon') => svg`
  <svg class=${cls} aria-hidden="true" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12c2.5-4 6.5-6 9-6s6.5 2 9 6c-2.5 4-6.5 6-9 6s-6.5-2-9-6z"></path>
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"></circle>
    <path d="M4 4L20 20"></path>
  </svg>
`;
