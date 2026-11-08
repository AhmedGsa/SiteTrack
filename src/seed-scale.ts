import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeederModule } from './seeder/seeder.module';
import { ScaleSeederService } from './seeder/scale-seeder.service';

async function bootstrap() {
  NestFactory.createApplicationContext(SeederModule)
    .then((appContext) => {
      const seeder = appContext.get(ScaleSeederService);
      seeder
        .seed()
        .then(() => {
          new Logger().debug('Scale seeding complete');
          return appContext.close();
        })
        .then(() => process.exit(0))
        .catch((error) => {
          new Logger().error('Scale seeding failed');
          console.error(error);
          process.exit(1);
        });
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
bootstrap();
