import test from "node:test";
import assert from "node:assert/strict";
import {
  passwordHash,
  passwordMatches,
  newToken,
  hashToken,
} from "../lib/security.mjs";
test("senhas são verificadas sem armazenar texto puro", () => {
  const hash = passwordHash("Senha-forte-123");
  assert.notEqual(hash, "Senha-forte-123");
  assert.equal(passwordMatches("Senha-forte-123", hash), true);
  assert.equal(passwordMatches("Senha-errada", hash), false);
});
test("a mesma senha recebe sais diferentes", () =>
  assert.notEqual(passwordHash("Senha-123"), passwordHash("Senha-123")));
test("tokens de sessão são aleatórios e armazenados como hash", () => {
  const a = newToken(),
    b = newToken();
  assert.notEqual(a, b);
  assert.equal(a.length, 64);
  assert.equal(hashToken(a).length, 64);
  assert.notEqual(hashToken(a), a);
});
