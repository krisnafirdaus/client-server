import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { DbService } from '@app/db';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterInput, LoginInput, AuthResponse, User } from './auth.types';

@Injectable()
export class AuthServiceService {
  constructor(
    private db: DbService,
    private jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<User> {
    // Check existing
    const existing = await this.db.user.findUnique({
      where: { email: input.email },
    });
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(input.password, 10);
    return this.db.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
      },
    });
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.db.user.findUnique({
      where: { email: input.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { accessToken: token, user };
  }

  async validateToken(userId: string): Promise<User> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
