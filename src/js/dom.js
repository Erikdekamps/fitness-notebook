/** Small helpers that touch the page. */

export const byId = (id) => document.getElementById(id);

/** Runs fn at most once per animation frame. */
export function onNextFrame(fn) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  };
}

/** Plays the "no" shake on an element. */
export function shake(el) {
  el.classList.remove('is-shaking');
  void el.offsetWidth; // restart the animation
  el.classList.add('is-shaking');
}

export function scrollToBottom(smooth) {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

/** Hands the browser a file to save. */
export function downloadFile(fileName, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
