(expected, action = 'prepare') => {
  const normalize = (text) => (text || '').replace(/\s+/g, '').toLowerCase();
  const summary = document.querySelector('[data-autom="summary-productName"]');
  const button = document.querySelector('button[data-autom="add-to-cart"]');
  const path = decodeURIComponent(location.pathname).toLowerCase();
  const part = expected.partNumber.toLowerCase();
  const pageMatches = location.hostname === 'www.apple.com.cn' &&
    (path.endsWith('/' + part) || new URLSearchParams(location.search).get('product')?.toLowerCase() === part);
  const nameMatches = !!summary && normalize(summary.innerText) === normalize(expected.productName);
  if (!pageMatches || !nameMatches) {
    // 页面初次绘制可能先显示默认规格，再按 URL 恢复指定型号。只在准备阶段等待，
    // 真正点击前仍必须重新核对，不能把默认型号加入购物袋。
    return { ready: false, clicked: false, error: action === 'add' ? '商品页型号与本次到货型号不一致' : '' };
  }
  const acp = document.querySelector('input[data-autom="acp"]');
  const noAppleCare = document.querySelector('input[data-autom="noapplecare"]');
  if (expected.appleCare && !acp && noAppleCare) {
    return { ready: false, clicked: false, error: '商品页没有 AppleCare+ 服务计划可选' };
  }
  const options = [
    document.querySelector('input[data-autom="choose-noTradeIn"]'),
    expected.appleCare ? acp : noAppleCare,
  ].filter(Boolean);
  if (action === 'prepare') {
    // 不带折抵；AppleCare+ 只按设置二选一，不猜测额外配置或其他付费服务。
    // 选 AppleCare+ 会先弹出说明浮层，点浮层里的「添加」后单选框才真正选中。
    const confirm = document.querySelector('button[data-autom="inlineapplecare_overlay_add"]');
    if (expected.appleCare && confirm && confirm.getBoundingClientRect().width > 0 && !confirm.disabled) {
      confirm.click();
      return { ready: false, clicked: false, error: '' };
    }
    const option = options.find((e) => !e.checked && !e.disabled);
    // 浮层有打开动画，刚点过 AppleCare+ 的几秒内不重复点击，免得把浮层关掉又打开。
    const recent = option === acp && Date.now() - (window.__apwAppleCareClicked || 0) < 3000;
    if (option && !recent) {
      if (option === acp) window.__apwAppleCareClicked = Date.now();
      option.click();
    }
    if (option) return { ready: false, clicked: false, error: '' };
  }
  // 单选框一点就显示选中，但表单里实际提交的 acpart 要过一两百毫秒才更新；
  // 在这之前点加购，提交的仍是旧的 AppleCare+ 选择。
  const acpart = button && button.form ? [...button.form.elements].find((e) => e.name === 'acpart') : null;
  const careSynced = !acpart || (expected.appleCare
    ? !!acpart.value && acpart.value !== 'none'
    : !acpart.value || acpart.value === 'none');
  const ready = !!button && !button.disabled && options.every((e) => e.checked) && careSynced;
  if (action === 'add' && ready) {
    // 加购使用浏览器真实鼠标事件，避免表单把脚本 click 当成原生回退提交。
    button.scrollIntoView({ block: 'center' });
    const rect = button.getBoundingClientRect();
    return { ready: true, point: rect.width > 0 && rect.height > 0 ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null, error: '' };
  }
  return { ready, clicked: false, error: '' };
}
