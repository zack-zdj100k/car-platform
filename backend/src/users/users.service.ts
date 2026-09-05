import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { paginate } from '../common/dto/paginated-result';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { QueryUsersDto } from './dto/query-users.dto';
import type { UpdateUserAdminDto } from './dto/update-user-admin.dto';

/** Never selects `password` — the hash must not leave the database layer. */
const profileSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  profileImage: true,
  locale: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly uploads: UploadsService,
  ) {}

  /** Spec §44 — profile page. */
  async findProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...profileSelect,
        _count: { select: { favorites: true, recentlyViewed: true, comparisons: true, orders: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Account not found');
    }

    const { _count, ...profile } = user;
    return {
      ...profile,
      counts: {
        favorites: _count.favorites,
        recentlyViewed: _count.recentlyViewed,
        comparisons: _count.comparisons,
        orders: _count.orders,
      },
      /** Google-only accounts have no password to change yet. */
      hasPassword: Boolean(await this.hasPassword(userId)),
    };
  }

  private async hasPassword(userId: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    return Boolean(row?.password);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.profileImage !== undefined ? { profileImage: dto.profileImage } : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
      },
      select: profileSelect,
    });
  }

  /**
   * The customer's own photograph, uploaded rather than typed.
   *
   * The profile had a text field for a path, which asked a customer to know
   * where a file lives on a server they have never seen — so nobody ever set
   * one. The bytes go through the same store as everything else, and the
   * previous picture is deleted once the new one is saved: an account should
   * cost one photograph, not one for every time somebody changed their mind.
   *
   * Deletion comes after the save, and its failure is swallowed. A file left
   * behind is untidy; a profile pointing at a file that has been deleted is
   * broken.
   */
  async setProfileImage(userId: string, file: Express.Multer.File) {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileImage: true },
    });

    const stored = await this.uploads.store(file);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage: stored.url },
      select: profileSelect,
    });

    const previous = before?.profileImage;
    // Only ours: a bundled placeholder under /images/ is not this account's.
    if (previous && previous !== stored.url && !previous.startsWith('/images/')) {
      try {
        await this.uploads.remove(previous);
      } catch (error) {
        this.logger.warn(`Could not remove the previous profile picture: ${String(error)}`);
      }
    }

    return user;
  }

  /**
   * Takes the photograph off the account, and off the disk.
   *
   * The avatar falls back to the customer's initials, which is what an account
   * without a picture has always shown.
   */
  async clearProfileImage(userId: string) {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileImage: true },
    });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage: null },
      select: profileSelect,
    });

    const previous = before?.profileImage;
    if (previous && !previous.startsWith('/images/')) {
      try {
        await this.uploads.remove(previous);
      } catch (error) {
        this.logger.warn(`Could not remove the profile picture: ${String(error)}`);
      }
    }

    return user;
  }

  /** Spec §44 — change password. Every other session is ended afterwards. */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new NotFoundException('Account not found');
    }

    if (!user.password) {
      throw new BadRequestException(
        'This account signs in with Google. Use the password reset flow to set a password.',
      );
    }

    const valid = await this.passwords.verify(user.password, dto.currentPassword);
    if (!valid) {
      throw new BadRequestException('Your current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('The new password must differ from the current one');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await this.passwords.hash(dto.newPassword) },
    });

    await this.tokens.revokeAllForUser(userId);
    this.logger.log(`Password changed for user ${userId}; all sessions revoked`);

    return { message: 'Password updated. Please sign in again.' };
  }

  /** Spec §48 — admin user list. */
  async findAllForAdmin(query: QueryUsersDto) {
    const and: Prisma.UserWhereInput[] = [];

    if (query.search) {
      and.push({
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.role) and.push({ role: query.role });
    if (query.status) and.push({ status: query.status });

    const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          ...profileSelect,
          _count: { select: { favorites: true, orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(rows, total, query.page, query.pageSize);
  }

  async findOneForAdmin(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...profileSelect,
        _count: { select: { favorites: true, recentlyViewed: true, comparisons: true, orders: true } },
        orders: {
          select: { id: true, reference: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /** Spec §48 — role and account status. Guarded against self-lockout. */
  /**
   * Removes an account, and everything of theirs that is only theirs.
   *
   * Their appointments go with them, which is the point: a customer asked for
   * their account to be gone, and leaving a row with their name, telephone
   * number and address in the orders table is not "gone". The vehicles they
   * enquired about, the photographs, the catalogue — none of that is theirs and
   * none of it moves.
   *
   * The same two protections as a demotion: an administrator cannot delete
   * themselves, and the last active administrator cannot be deleted at all.
   * Locking everybody out of the administration is not a thing to do by
   * accident.
   */
  async removeForAdmin(id: string, actingAdminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, status: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (id === actingAdminId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    if (user.role === Role.ADMIN) {
      const others = await this.prisma.user.count({
        where: { role: Role.ADMIN, status: UserStatus.ACTIVE, id: { not: id } },
      });
      if (others === 0) {
        throw new ForbiddenException('At least one active administrator must remain');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({ where: { userId: id }, select: { id: true } });
      const orderIds = orders.map((order) => order.id);

      // Order history and email logs point at the orders, so they go first.
      await tx.orderStatusHistory.deleteMany({
        where: { OR: [{ orderId: { in: orderIds } }, { changedById: id }] },
      });
      await tx.emailLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });

      await tx.favorite.deleteMany({ where: { userId: id } });
      await tx.recentlyViewed.deleteMany({ where: { userId: id } });
      await tx.comparison.deleteMany({ where: { userId: id } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: id } });
      await tx.carView.deleteMany({ where: { userId: id } });

      await tx.user.delete({ where: { id } });
    });

    this.logger.log(`Account ${user.email} deleted by admin ${actingAdminId}`);
    return { deleted: true };
  }

  async updateForAdmin(id: string, dto: UpdateUserAdminDto, actingAdminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (id === actingAdminId) {
      if (dto.role && dto.role !== Role.ADMIN) {
        throw new ForbiddenException('You cannot remove your own administrator role');
      }
      if (dto.status && dto.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('You cannot suspend your own account');
      }
    }

    // Never allow the platform to be left without an administrator.
    if (user.role === Role.ADMIN && (dto.role === Role.CUSTOMER || dto.status === UserStatus.SUSPENDED)) {
      const activeAdmins = await this.prisma.user.count({
        where: { role: Role.ADMIN, status: UserStatus.ACTIVE, id: { not: id } },
      });
      if (activeAdmins === 0) {
        throw new ForbiddenException('At least one active administrator must remain');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      select: profileSelect,
    });

    // A suspension or demotion must take effect immediately.
    if (dto.status === UserStatus.SUSPENDED || dto.role !== undefined) {
      await this.tokens.revokeAllForUser(id);
    }

    this.logger.log(`User ${id} updated by admin ${actingAdminId}`);
    return updated;
  }
}
