import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwt-access-token.guard';
import { GetCurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':id/accept')
  accept(@GetCurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.invitationsService.accept(user.userId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':id/reject')
  reject(@GetCurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.invitationsService.reject(user.userId, id);
  }
}
