import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";
import { Hash } from "src/auth/utils/hash";
import { Role } from "src/users/enum/role.enum";


@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async seed() {
    const users = [
      { email: 'superadmin@sitetrack.com', name: 'Super Admin', role: Role.SUPER_ADMIN },
      { email: 'storemanager@sitetrack.com', name: 'Store Manager', role: Role.COMPANY_STORE_MANAGER },
      { email: 'user@sitetrack.com', name: 'Site User', role: Role.USER },
    ];

    for (const userData of users) {
      let user = await this.userRepository.findOneBy({ email: userData.email });
      if (!user) {
        user = this.userRepository.create({
          ...userData,
          password: await Hash.hash('password123'),
        });
        await this.userRepository.save(user);
        console.log(`${userData.role} created`);
      }
    }

    console.log('Seeding completed successfully!');
  }
}
