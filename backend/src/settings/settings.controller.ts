import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { SettingsService } from './settings.service';
import { UpdateSettingDto, UpdateSettingsDto } from './dto/update-setting.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public site settings, grouped — social links, marketing copy' })
  findPublic() {
    return this.settings.findPublic();
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'All settings (admin)' })
  findAll() {
    return this.settings.findAllForAdmin();
  }

  @Get(':key')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'One setting (admin)' })
  findOne(@Param('key') key: string) {
    return this.settings.findOne(key);
  }

  @Put()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update several settings in one transaction (admin)' })
  updateMany(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateMany(dto, user.id);
  }

  @Patch(':key')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update one setting (admin)' })
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.update(key, dto, user.id);
  }
}
