(expected, action = 'ready') => {
  if (location.protocol !== 'https:' || location.hostname !== 'www.apple.com.cn' || location.pathname !== '/shop/bag') return false;
  if (!expected.removeId || !['ready', 'remove'].includes(action)) return false;
  const normalize = s => (s || '').replace(/\s+/g, '').toLowerCase();
  const rows = [...document.querySelectorAll('[data-autom^="bag-item-"]')].filter(e => /^bag-item-\d+$/.test(e.getAttribute('data-autom')));
  const matches = rows.filter(row => row.querySelector('button[data-autom="bag-item-remove-button"]')?.id === expected.removeId);
  if (matches.length !== 1) return false;
  const row = matches[0];
  const title = row.querySelector('[data-autom="bag-item-name"], h2, h3');
  const link = row.querySelector('a[data-autom="bag-item-name"]');
  const part = link && (link.getAttribute('href') || '').match(/\/shop\/product\/([^/?#]+\/[^/?#]+)/i);
  const actualPart = part ? decodeURIComponent(part[1]).toUpperCase() : '';
  const select = row.querySelector('select[data-autom="item-quantity-dropdown"]');
  const counted = (row.innerText || '').replace(/\s+/g, ' ').match(/数量\s*(\d+)/);
  const quantity = select ? select.value : counted ? counted[1] : '';
  const remove = row.querySelector('button[data-autom="bag-item-remove-button"]');
  if (!title || actualPart !== expected.partNumber.toUpperCase() ||
      normalize(title.innerText) !== normalize(expected.productName) || quantity !== expected.quantity ||
      !remove || remove.disabled) return false;
  if (action === 'ready') return true;
  remove.click();
  return true;
}
