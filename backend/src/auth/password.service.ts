import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Password hashing (spec §49, §67).
 *
 * Argon2id with parameters at or above the OWASP recommendation. Plaintext
 * passwords never leave this service and are never logged or stored.
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  };

  async hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, this.options);
  }

  async verify(hash: string, plaintext: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plaintext);
    } catch {
      // A malformed stored hash must read as "wrong password", never as a crash.
      return false;
    }
  }

  /**
   * Constant-ish-time dummy verification.
   *
   * Called when an email does not exist so that login timing does not reveal
   * whether an account is registered (user-enumeration defence).
   */
  async fakeVerify(): Promise<void> {
    await argon2.hash('timing-equalisation-placeholder', this.options);
  }
}
