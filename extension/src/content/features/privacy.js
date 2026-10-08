/* Modo privacidade: desfoca mensagens, lista de conversas e fotos (revela ao passar o mouse). */
(() => {
  const CMT = window.CMT;
  const { ui: UI, store: S } = CMT;
  const P = (CMT.privacy = {});

  P.apply = () => {
    const p = S.get('settings').privacy;
    const html = document.documentElement;
    html.classList.toggle('cmt-blur-msgs', !!p.messages);
    html.classList.toggle('cmt-blur-list', !!p.chatList);
    html.classList.toggle('cmt-blur-photos', !!p.photos);
    html.classList.toggle('cmt-reveal', p.revealOnHover !== false);
    UI.renderRail();
  };
  P.isOn = () => {
    const p = S.get('settings').privacy;
    return !!(p.messages || p.chatList || p.photos);
  };
  /** Liga tudo de uma vez ou desliga tudo. */
  P.toggleAll = async () => {
    const on = !P.isOn();
    await S.update('settings', (s) => void Object.assign(s.privacy, { messages: on, chatList: on, photos: on }));
    UI.toast(on ? 'Modo privacidade ativado.' : 'Modo privacidade desativado.', 'info', 1500);
  };

  UI.register({
    id: 'privacy',
    title: 'Modo privacidade',
    icon: () => (P.isOn() ? 'eyeOff' : 'eye'),
    order: 12,
    action: P.toggleAll,
  });

  CMT.features.privacy = {
    init() {
      P.apply();
      S.on('settings', P.apply);
      document.addEventListener('keydown', (e) => {
        if (e.altKey && e.shiftKey && e.code === 'KeyP') {
          e.preventDefault();
          P.toggleAll();
        }
      });
    },
  };
})();
