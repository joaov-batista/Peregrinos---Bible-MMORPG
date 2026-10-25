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

// Versão nova publicada: o jogo aberto continua com a versão antiga até recarregar (no celular quase nunca recarrega).
// Confere ao abrir, a cada 5 minutos e ao voltar para o jogo; se mudou, mostra um botão para atualizar.
const minhaVersao = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src');
async function checarVersao() {
  if (!minhaVersao || document.getElementById('novaVersao')) return;
  try {
    const html = await (await fetch('/index.html', { cache: 'no-store' })).text();
    const nova = html.match(/\/assets\/index-[^"']+\.js/)?.[0];
    if (!nova || minhaVersao.includes(nova)) return;
    const b = document.createElement('button');
    b.id = 'novaVersao'; b.textContent = '🔄 Nova versão do Peregrinos! Toque para atualizar';
    b.onclick = async () => { b.disabled = true; try { await window.__game?.save(); } catch { /* salva o que der */ } location.reload(); };
    document.body.append(b);
  } catch { /* sem internet */ }
}
if (import.meta.env.PROD) {
  setTimeout(checarVersao, 8000); setInterval(checarVersao, 5 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checarVersao(); });
}
