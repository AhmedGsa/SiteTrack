import { NestFactory } from "@nestjs/core";
import { SeederModule } from "./seeder/seeder.module";
import { SeederService } from "./seeder/seeder.service";
import { Logger } from "@nestjs/common";


async function bootstrap() {
    NestFactory.createApplicationContext(SeederModule)
      .then(appContext => {
        const seeder = appContext.get(SeederService);
        seeder
          .seed()
          .then(() => {
            const logger = new Logger();
            logger.debug('Seeding complete!');
            return appContext.close();
          })
          .then(() => process.exit(0))
          .catch(error => {
            const logger = new Logger()
            logger.error('Seeding failed!');
            console.error(error);
            process.exit(1);
          });
      })
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  }
  bootstrap();
