import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async login(identifier: string, pass: string) {
    if (!identifier || !pass) {
      throw new BadRequestException('Vui lòng nhập tài khoản/email và mật khẩu.');
    }

    const trimmed = identifier.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}$`, 'i');

    const user = await this.userModel
      .findOne({
        $or: [{ username: regex }, { email: regex }],
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng.');
    }

    const isValid = bcrypt.compareSync(pass, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng.');
    }

    const token = randomBytes(32).toString('hex');

    return {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.fullName,
        username: user.username,
        studentId: user.studentId || user.username,
        email: user.email,
        role: user.role,
        department: user.department,
      },
      accessToken: token,
    };
  }
}
