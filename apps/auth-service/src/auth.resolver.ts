import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { AuthServiceService } from './auth-service.service';
import { RegisterInput, LoginInput, AuthResponse, User } from './auth.types';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthServiceService) {}

  @Mutation(() => User)
  async register(@Args('registerInput') input: RegisterInput) {
    return this.authService.register(input);
  }

  @Mutation(() => AuthResponse)
  async login(@Args('loginInput') input: LoginInput) {
    return this.authService.login(input);
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  validateToken(@CurrentUser() user: User) {
    return user;
  }
}
