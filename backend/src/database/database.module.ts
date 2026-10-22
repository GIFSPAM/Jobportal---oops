import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/** Database persistence module. Configures TypeORM for MariaDB. */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mariadb' as const,
        connectorPackage: 'mysql2',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        // Flip DB_SYNCHRONIZE=true only when bootstrapping a throw-away database.
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
        charset: 'utf8mb4',
        timezone: 'Z',
        logging: process.env.DB_LOGGING === 'true' ? ['error', 'warn', 'query'] : false,
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
