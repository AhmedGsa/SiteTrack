import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Hash } from 'src/auth/utils/hash';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}
  async create(createUserDto: CreateUserDto) {
    const emailExists = await this.userRepository.findOneBy({
      email: createUserDto.email,
    });
    if (emailExists) {
      throw new BadRequestException('User with provided email already exists');
    }
    const user = this.userRepository.create({...createUserDto, password: await Hash.hash(createUserDto.password)});
    await this.userRepository.save(user);
    delete user.password;
    return user;
  }

  async findOneByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'name'],
    });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOneBy({id});
    if (!user) {
      throw new BadRequestException('User with provided id does not exist');
    }
    return user;
  }
}
