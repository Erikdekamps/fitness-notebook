/** Start-up and moving between the screens: notebook, settings, statistics, machine chart. */
import { STORAGE_KEY } from './config.js';
import { byId, onNextFrame, scrollToBottom } from './dom.js';
import { save, reload } from './state.js';
import { navigation } from './navigation.js';
import { Sheet } from './ui/sheet.js';
import { NotebookView } from './views/notebook-view.js';
import { SettingsView } from './views/settings-view.js';
import { StatsView } from './views/stats-view.js';

export const App = (() => {
  const views = {
    notebook: byId('notebook'),
    settings: byId('settings'),
    stats: byId('stats'),
    machineStats: byId('machineStats'),
  };
  const topButtons = [byId('cogBtn'), byId('statsBtn')];
  let current = { view: 'notebook' };
  let notebookScrollY = 0;

  /** Shows the view a current describes: { view, machineId }. */
  function show(next) {
    const target = next && views[next.view] ? next : { view: 'notebook' };
    Sheet.cancel();
    if (current.view === 'notebook' && target.view !== 'notebook') notebookScrollY = window.scrollY;
    current = target;
    for (const name of Object.keys(views)) views[name].hidden = name !== current.view;
    topButtons.forEach((button) => { button.hidden = current.view !== 'notebook'; });
    render();
    window.scrollTo(0, current.view === 'notebook' ? notebookScrollY : 0);
    NotebookView.updateTodayButton();
  }

  function render() {
    if (current.view === 'settings') SettingsView.render();
    else if (current.view === 'stats') StatsView.renderMonth();
    else if (current.view === 'machineStats') StatsView.renderMachine(current.machineId);
    else NotebookView.render();
  }

  function open(next) {
    try {
      history.pushState(next, '');
    } catch (_) {
      /* history not available (sandboxed frame): the back arrows still work */
    }
    show(next);
  }

  function back(fallbackView) {
    const pushed = history.state && history.state.view === current.view && current.view !== 'notebook';
    if (pushed) history.back(); // popstate shows the view underneath
    else show({ view: fallbackView });
  }

  byId('cogBtn').addEventListener('click', () => open({ view: 'settings' }));
  byId('statsBtn').addEventListener('click', () => open({ view: 'stats' }));
  document.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => back(button.dataset.back));
  });
  window.addEventListener('popstate', (e) => show(e.state));

  function start() {
    try {
      history.scrollRestoration = 'manual';
      history.replaceState({ view: 'notebook' }, '');
    } catch (_) {
      /* not available: fine */
    }
    save();
    NotebookView.render();
    scrollToBottom(false);
    if (document.fonts && document.fonts.ready) {
      const y = window.scrollY;
      document.fonts.ready.then(() => { if (current.view === 'notebook' && window.scrollY === y) scrollToBottom(false); });
    }

    const refreshTodayButton = onNextFrame(NotebookView.updateTodayButton);
    window.addEventListener('scroll', refreshTodayButton, { passive: true });
    window.addEventListener('resize', () => {
      refreshTodayButton();
      if (current.view === 'machineStats') render(); // the chart follows the page width
    });

    // Another tab changed the notebook: show the new version.
    window.addEventListener('storage', (e) => {
      const typing = document.activeElement && document.activeElement.classList.contains('line-input');
      if (e.key !== STORAGE_KEY || Sheet.isOpen() || typing) return;
      reload();
      render();
    });
  }

  navigation.open = open;
  navigation.refresh = render;

  return { start };
})();

App.start();
