(values) => {
  const field = (name) => document.querySelector('input[data-autom="form-field-' + name + '"]');
  const failed = [];
  for (const [name, value] of Object.entries(values)) {
    const input = field(name);
    // 登录状态下结账时 Apple 直接用账号邮箱，表单里没有这一栏；页面上没有的栏目不填也不算失败。
    if (!input) continue;
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
    if (input.value !== value) failed.push(name);
  }
  const labels = { lastName: '姓氏', firstName: '名字', emailAddress: '电子邮件地址', fullDaytimePhone: '手机号码' };
  // 只核对页面上实际出现的栏目，出现了就必须有值。
  const missing = Object.keys(labels).filter((name) => { const e = field(name); return !!e && !e.value.trim(); }).map((name) => labels[name]);
  return { ready: !!field('lastName'), missing, needsId: !!field('nationalIdSelf'), failed };
}
