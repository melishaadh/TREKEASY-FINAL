import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TreksController } from './treks.controller';
import { TreksService } from './treks.service';
import { PersonalizationService } from './personalization.service';
import { Trek, TrekSchema } from '@/schemas/trek.schema';
import { ItineraryModule } from '@/modules/itinerary/itinerary.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trek.name, schema: TrekSchema }]),
    forwardRef(() => ItineraryModule),
  ],
  controllers: [TreksController],
  providers: [TreksService, PersonalizationService],
  exports: [TreksService, PersonalizationService],
})
export class TreksModule {}
