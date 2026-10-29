import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../src-tauri/src/checkout_sign_in.js', import.meta.url), 'utf8');
function fixture({ origin = 'https://idmsa.apple.com.cn', accountValue = 'test@example.test', passwordVisible = true, verification = false, error = false } = {}) {
  let clicks = 0;
  class Input { set value(v) { this.saved = v; } get value() { return this.saved ?? ''; } dispatchEvent() {} getClientRects() { return [1]; } }
  const account = new Input(); account.value = accountValue;
  const password = new Input(); password.getClientRects = () => passwordVisible ? [1] : [];
  const submit = { disabled: false, getClientRects: () => [1], click() { clicks++; } };
  const document = {
    getElementById: id => ({ account_name_text_field: account, password_text_field: password, 'sign-in': submit })[id],
    querySelector: () => verification ? { getClientRects: () => [1] } : null,
    querySelectorAll: () => error ? [{ getClientRects: () => [1], innerText: 'error' }] : [],
  };
  const run = action => vm.runInNewContext(`(${source})(expected, action)`, {
    document, location: { origin }, HTMLInputElement: Input, Event: class {},
    expected: { account: 'test@example.test', password: 'synthetic-test-secret' }, action,
  });
  return { run, account, password, clicks: () => clicks };
}

test('检查登录页不填写密码；明确操作才填充并点击登录', () => {
  const f = fixture();
  assert.equal(f.run('inspect'), 'password');
  assert.equal(f.password.value, '');
  assert.equal(f.clicks(), 0);
  assert.equal(f.run('password'), 'passwordSubmitted');
  assert.equal(f.password.value, 'synthetic-test-secret');
  assert.equal(f.clicks(), 1);
});
test('两步账户登录先提交账户，不能提前填写密码', () => {
  const f = fixture({ accountValue: '', passwordVisible: false });
  assert.equal(f.run('inspect'), 'account');
  assert.equal(f.run('account'), 'accountSubmitted');
  assert.equal(f.account.value, 'test@example.test');
  assert.equal(f.password.value, '');
  assert.equal(f.clicks(), 1);
});
test('其他域名、账号不一致、验证和密码错误都不能填写或提交', () => {
  for (const [options, expected] of [
    [{ origin: 'https://idmsa.apple.com.cn.example.test' }, 'untrusted'],
    [{ accountValue: 'someone-else@example.test' }, 'accountMismatch'],
    [{ verification: true }, 'verification'], [{ error: true }, 'error'],
  ]) {
    const f = fixture(options);
    assert.equal(f.run('password'), expected);
    assert.equal(f.password.value, '');
    assert.equal(f.clicks(), 0);
  }
});
