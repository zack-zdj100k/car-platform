import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('produces an argon2id hash, never the plaintext', async () => {
    const hash = await service.hash('CorrectHorse1');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('CorrectHorse1');
  });

  it('salts, so the same password hashes differently each time', async () => {
    const [first, second] = await Promise.all([service.hash('CorrectHorse1'), service.hash('CorrectHorse1')]);
    expect(first).not.toBe(second);
  });

  it('verifies a correct password', async () => {
    const hash = await service.hash('CorrectHorse1');
    await expect(service.verify(hash, 'CorrectHorse1')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('CorrectHorse1');
    await expect(service.verify(hash, 'WrongHorse1')).resolves.toBe(false);
  });

  it('treats a malformed stored hash as a wrong password rather than crashing', async () => {
    await expect(service.verify('not-a-hash', 'anything')).resolves.toBe(false);
  });
});
