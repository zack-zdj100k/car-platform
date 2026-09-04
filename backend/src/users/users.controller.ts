import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Own profile with activity counts' })
  findProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.users.findProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change own password' })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.id, dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List users with search and filters (admin)' })
  findAll(@Query() query: QueryUsersDto) {
    return this.users.findAllForAdmin(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'User detail with recent orders (admin)' })
  findOne(@Param('id') id: string) {
    return this.users.findOneForAdmin(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an account and everything belonging to it (admin)' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.removeForAdmin(id, actor.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user’s role or account status (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserAdminDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.updateForAdmin(id, dto, actor.id);
  }
}
