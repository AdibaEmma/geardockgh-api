import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  async compare(plainText: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashed);
  }
}
