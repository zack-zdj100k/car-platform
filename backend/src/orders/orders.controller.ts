import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { SetMeetingPlaceDto } from './dto/set-meeting-place.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /**
   * Optional auth: the service decides whether a signed-in account is required,
   * based on the `orders.requireAuth` setting (docs/DECISIONS.md D-1.2).
   */
  /**
   * Anti-spam, per IP address.
   *
   * Five an hour was too tight for honest use: someone comparing several
   * vehicles may well enquire about three or four, and a household or office
   * shares one address. Ten still stops bulk submission, and each order also
   * costs the sender a real email address and phone number.
   */
  @OptionalAuth()
  @Post()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Submit an order request for a vehicle' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser | undefined) {
    return this.orders.create(dto, user);
  }

  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in customer’s own orders' })
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryOrdersDto) {
    return this.orders.findMine(user.id, query);
  }

  @Get('mine/for-car/:carId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Which colours of one vehicle this customer already has an appointment for',
  })
  mineForCar(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.orders.mineForCar(user.id, carId);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List every order with search and status filters (admin)' })
  findAllForAdmin(@Query() query: QueryOrdersDto) {
    return this.orders.findAllForAdmin(query);
  }

  @Get('reference/:reference')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Look up an order by its reference' })
  findByReference(@Param('reference') reference: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.findByReference(reference, user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Order detail. Customers may only read their own orders' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.findOne(id, user);
  }

  @Get(':id/transitions')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statuses this order may move to (admin)' })
  async transitions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const order = await this.orders.findOne(id, user);
    return { status: order.status, allowed: this.orders.allowedTransitions(order.status) };
  }

  /**
   * The customer's own withdrawal. Not the admin route with a looser guard:
   * that one can move an order to any status, and this may only cancel.
   */
  @Patch(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel your own appointment' })
  cancelMine(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.cancelMine(id, user);
  }

  /**
   * Where a confirmed customer should come. Administration only, and separate
   * from the status: the two are decided at different moments.
   */
  /**
   * Removes an appointment. The service decides who may: an administrator any
   * of them, a customer only their own and only once it is cancelled.
   */
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an appointment' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.remove(id, user);
  }

  @Patch(':id/meeting')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set the meeting place for an appointment (admin)' })
  setMeetingPlace(@Param('id') id: string, @Body() dto: SetMeetingPlaceDto) {
    return this.orders.setMeetingPlace(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an order status (admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.updateStatus(id, dto, user.id);
  }
}
