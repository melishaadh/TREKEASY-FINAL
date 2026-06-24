import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { Itinerary, ItinerarySchema } from '@/schemas/itinerary.schema';
import { User, UserSchema } from '@/schemas/user.schema';
import { Trek, TrekSchema } from '@/schemas/trek.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Itinerary.name, schema: ItinerarySchema },
      { name: User.name, schema: UserSchema },
      { name: Trek.name, schema: TrekSchema },
    ]),
  ],
  controllers: [ItineraryController],
  providers: [ItineraryService],
  exports: [ItineraryService],
})
export class ItineraryModule {}
