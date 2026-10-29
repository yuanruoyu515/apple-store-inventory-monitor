(errors) => {
  const rows = [...document.querySelectorAll('[data-autom^="bag-item-"]')].filter((e) => /^bag-item-\d+$/.test(e.getAttribute('data-autom')));
  const items = rows.map((row) => {
    const title = row.querySelector('[data-autom="bag-item-name"], h2, h3');
    const select = row.querySelector('select[data-autom="item-quantity-dropdown"]');
    const text = (row.innerText || '').replace(/\s+/g, ' ');
    const counted = text.match(/数量\s*(\d+)/);
    const link = row.querySelector('a[data-autom="bag-item-name"]');
    const part = link && (link.getAttribute('href') || '').match(/\/shop\/product\/([^/?#]+\/[^/?#]+)/i);
    const remove = row.querySelector('button[data-autom="bag-item-remove-button"]');
    // AppleCare+ 是商品行里的子项，移除按钮的 data-autom 带上了服务计划的名称。
    const appleCare = [...row.querySelectorAll('button[data-autom^="bag-item-remove-button-"]')]
      .some((e) => /AppleCare/i.test(e.getAttribute('data-autom')));
    return {
      name: (title ? title.innerText : '').replace(/\s+/g, ' ').trim(),
      quantity: select ? select.value : counted ? counted[1] : '',
      partNumber: part ? decodeURIComponent(part[1]).toUpperCase() : '',
      removeId: remove ? remove.id : '',
      appleCare,
    };
  });
  const total = document.querySelector('[data-autom="bagtotalvalue"]');
  const checkout = document.querySelector('button[data-autom="checkout"]');
  const placeOrder = document.querySelector('button[data-autom="continue-button-placeOrder"]');
  return {
    items,
    total: total ? total.innerText.replace(/\s+/g, ' ').trim() : '',
    canCheckout: !!checkout && !checkout.disabled,
    canPlaceOrder: !!placeOrder && !placeOrder.disabled,
    // 没有商品行不代表空袋：导航加载中也没有商品行，必须等 Apple 的空袋提示。
    bagReady: location.pathname === '/shop/bag' && (!!document.querySelector('[data-autom="bag-header"]') || !!document.querySelector('[data-autom="bag-empty-continueshopping-button"]')),
    bagEmpty: !!document.querySelector('[data-autom="bag-empty-continueshopping-button"]') && items.length === 0,
    errors,
  };
}
