import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EnvConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { SeederModule } from './seeder/seeder.module';
import { AccessModule } from './access/access.module';
import { ProjectsModule } from './projects/projects.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    EnvConfigModule,
    DatabaseModule,
    SeederModule,
    AccessModule,
    ProjectsModule,
    ThrottlerModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  }],
})
export class AppModule {}
