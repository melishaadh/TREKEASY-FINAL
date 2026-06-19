import { Injectable } from '@nestjs/common';
import { HotelsService } from '@/modules/hotels/hotels.service';
import { GroupsService } from '@/modules/groups/groups.service';

export interface DashboardStats {
  totalHotels: number;
  activeGroups: number;
  totalMembers: number;
  totalBookings: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly hotelsService: HotelsService,
    private readonly groupsService: GroupsService,
  ) {}

  async getStats(): Promise<DashboardStats> {
    const [totalHotels, activeGroups, totalMembers, totalBookings] = await Promise.all([
      this.hotelsService.count(),
      this.groupsService.countActive(),
      this.groupsService.sumMembers(),
      this.groupsService.countBooked(),
    ]);

    return { totalHotels, activeGroups, totalMembers, totalBookings };
  }

  async getRecentData(limit: number = 4) {
    const hotels = await this.hotelsService.getAll();
    const groups = await this.groupsService.getAll();

    return {
      recentHotels: hotels.slice(0, limit),
      recentGroups: groups.slice(0, limit),
    };
  }
}
