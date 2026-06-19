import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { HotelsModule } from '@/modules/hotels/hotels.module';
import { GroupsModule } from '@/modules/groups/groups.module';

@Module({
  imports: [HotelsModule, GroupsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
