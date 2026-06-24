import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { GroupsModule } from './modules/groups/groups.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TreksModule } from './modules/treks/treks.module';
import { ItineraryModule } from './modules/itinerary/itinerary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
  isGlobal: true,
  load: [databaseConfig, jwtConfig],
  // Use the exact, hardcoded path for your machine
  envFilePath: 'C:/Users/adhik/TREKEASY-FINAL/.env', 
}),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
        connectionFactory: (connection: any) => {
          connection.on('connected', () => console.log('MongoDB connected successfully'));
          connection.on('error', (err: Error) => console.error('MongoDB connection error:', err));
          return connection;
        },
      }),
    }),
    AuthModule,
    UsersModule,
    HotelsModule,
    GroupsModule,
    DashboardModule,
    TreksModule,
    ItineraryModule,
  ],
})
export class AppModule {}
