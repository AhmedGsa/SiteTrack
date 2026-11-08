import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwt-access-token.guard';
import { GetCurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get('unread-count')
  unreadCount(@GetCurrentUser() user: UserPayload) {
    return this.notificationsService.unreadCount(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get()
  findAll(@GetCurrentUser() user: UserPayload, @Query() paginationDto: PaginationDto) {
    return this.notificationsService.findAll(user.userId, paginationDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Patch(':id/read')
  markRead(@GetCurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user.userId, id);
  }
}
