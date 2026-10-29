() => {
  const nodes = [...document.querySelectorAll('[role="alert"], .rs-form-error, .form-message-wrapper, .rs-error-message')];
  const texts = nodes
    .filter((e) => e.getClientRects().length > 0
      && !e.closest('[hidden], [aria-hidden="true"]')
      && getComputedStyle(e).visibility !== 'hidden')
    .map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return [...new Set(texts)].slice(0, 3);
}
