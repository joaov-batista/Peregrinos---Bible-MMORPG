// App instalável (PWA): service worker + botão "Instalar app".
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach(f => f());

export const pwa = {
  get installed() { return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  get canPrompt() { return !!deferred; },
  get ios() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  // mostra o botão quando o navegador oferece instalação ou no iPhone (instrução manual)
  get available() { return !this.installed && (this.canPrompt || this.ios); },
  onChange(f) { listeners.add(f); return () => listeners.delete(f); },
  async install(toast) {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice.catch(() => ({}));
      deferred = null; notify();
      if (outcome === 'accepted') toast?.('Peregrinos instalado! Abra pelo ícone na tela inicial.');
      return;
    }
    if (this.ios) toast?.('No iPhone: toque em Compartilhar (□↑) e depois em "Adicionar à Tela de Início".', 7000);
    else toast?.('No menu do navegador (⋮), escolha "Instalar app" ou "Adicionar à tela inicial".', 6000);
  }
};

addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; notify(); });
addEventListener('appinstalled', () => { deferred = null; notify(); });

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
