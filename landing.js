document.getElementById('capture-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const note = document.getElementById('capture-note');
  const email = document.getElementById('capture-email');
  note.style.color = '';
  note.textContent = 'Saving…';
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, source: 'landing' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    note.textContent = 'You\'re in. Weekly scheme drop arrives Sunday.';
    email.value = '';
    window.posthog && posthog.capture && posthog.capture('email_captured', { source: 'landing' });
  } catch (err) {
    note.style.color = 'var(--c-error)';
    note.textContent = 'Could not save. Try again in a moment.';
  }
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
