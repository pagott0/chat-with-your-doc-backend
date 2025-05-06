import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hash } from 'bcryptjs';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(
    email: string,
    password: string,
    name?: string,
  ): Promise<User> {
    const hashedPassword = await hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
