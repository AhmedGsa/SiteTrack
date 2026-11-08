import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SeederService } from './seeder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

@Module({
    imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([User]),
    ],
    providers: [SeederService],
})
export class SeederModule {}
