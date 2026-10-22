import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenError, UnauthorizedError } from '../../common/exceptions/domain.exceptions';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { User } from '../../database/entities';

/** Turns a bearer token into a trusted identity. */
@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async resolve(token: string): Promise<AuthenticatedUser> {
    let payload: { user_id?: number };
    try {
      payload = await this.jwtService.verifyAsync<{ user_id?: number }>(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired token.');
    }

    if (typeof payload?.user_id !== 'number') {
      throw new UnauthorizedError('Invalid or expired token.');
    }

    const user = await this.users.findOne({ where: { userId: payload.user_id } });
    if (!user) {
      throw new UnauthorizedError('User not found for token.');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is deactivated.');
    }

    return { userId: user.userId, role: user.role, email: user.email };
  }
}
