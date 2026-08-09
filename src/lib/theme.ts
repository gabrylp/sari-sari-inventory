// Fires before React hydrates so there's no theme flash. Called as a plain
// inline script inside <head>. Default theme is dark.
export function themeInitScript() {
  return `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;
}

export function applyTheme(theme: 'dark' | 'light') {
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // private mode etc.; session-only toggle still applies below
  }
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function getStoredTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}