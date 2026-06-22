import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import * as bcrypt from 'bcrypt';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  SchoolType,
  UserRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/cls/tenant-context.service';
import { paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';

const PLAN_MRR: Record<SubscriptionPlan, number> = {
  FREE: 0,
  STARTER: 1999,
  GROWTH: 4999,
  ENTERPRISE: 25000,
};

class OnboardSchoolDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ enum: SchoolType })
  @IsOptional()
  @IsEnum(SchoolType)
  schoolType?: SchoolType;

  @ApiProperty()
  @IsEmail()
  primaryEmail!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primaryPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pinCode?: string;

  @ApiProperty({ description: 'Initial school-admin email' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  adminPassword!: string;

  @ApiPropertyOptional({ enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;
}

class UpdateSchoolDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryPhone?: string;
}

class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}

class CreatePlatformUserDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() username!: string;
  @ApiProperty() @IsString() @MinLength(6) password!: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role!: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsString() schoolId?: string;
}

class UpdatePlatformUserDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() username?: string;
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
}

@Injectable()
class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private async writeAudit(
    action: string,
    entityType: string,
    entityId: string,
    after?: unknown,
    schoolId?: string | null,
  ): Promise<void> {
    const performedById = this.tenant.userId;
    if (!performedById) return;
    await this.prisma.auditLog.create({
      data: {
        schoolId: schoolId ?? null,
        performedById,
        action,
        entityType,
        entityId,
        after: (after as object) ?? undefined,
      },
    });
  }

  async platformStats() {
    const [totalSchools, activeSchools, totalStudents, totalUsers, subs] =
      await Promise.all([
        this.prisma.school.count(),
        this.prisma.school.count({ where: { isActive: true } }),
        this.prisma.student.count({ where: { isActive: true } }),
        this.prisma.user.count(),
        this.prisma.schoolSubscription.findMany({
          where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
          select: { plan: true },
        }),
      ]);
    const mrr = subs.reduce((s, sub) => s + (PLAN_MRR[sub.plan] ?? 0), 0);
    return {
      totalSchools,
      activeSchools,
      suspendedSchools: totalSchools - activeSchools,
      totalStudents,
      totalUsers,
      mrr,
    };
  }

  async analytics() {
    const [schools, subs] = await Promise.all([
      this.prisma.school.findMany({ select: { createdAt: true } }),
      this.prisma.schoolSubscription.findMany({ select: { plan: true } }),
    ]);

    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    const buckets: { month: string; institutes: number; revenue: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const cumulative = schools.filter(
        (s) => s.createdAt <= new Date(d.getFullYear(), d.getMonth() + 1, 0),
      ).length;
      buckets.push({ month: label, institutes: cumulative, revenue: 0 });
    }

    const planMap = new Map<SubscriptionPlan, number>();
    for (const s of subs) planMap.set(s.plan, (planMap.get(s.plan) ?? 0) + 1);
    const planDistribution = Array.from(planMap.entries()).map(([plan, count]) => ({
      plan,
      count,
    }));
    const mrr = subs.reduce((sum, s) => sum + (PLAN_MRR[s.plan] ?? 0), 0);
    for (const b of buckets) b.revenue = mrr;

    return { growth: buckets, planDistribution, mrr };
  }

  async listSchools(query: PaginationQueryDto) {
    const where = query.search
      ? { name: { contains: query.search, mode: 'insensitive' as const } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          subscription: true,
          _count: { select: { students: true, users: true } },
        },
      }),
      this.prisma.school.count({ where }),
    ]);
    const data = rows.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      schoolType: s.schoolType,
      city: s.city,
      state: s.state,
      phone: s.primaryPhone,
      adminEmail: s.primaryEmail,
      isActive: s.isActive,
      plan: s.subscription?.plan ?? null,
      subscriptionStatus: s.subscription?.status ?? null,
      studentCount: s._count.students,
      userCount: s._count.users,
      createdAt: s.createdAt.toISOString(),
    }));
    return paginate(data, total, query.page, query.pageSize);
  }

  async getSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        subscription: true,
        bankDetail: true,
        _count: { select: { students: true, users: true } },
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async onboardSchool(dto: OnboardSchoolDto) {
    return this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          schoolType: dto.schoolType ?? SchoolType.OTHER,
          primaryEmail: dto.primaryEmail,
          primaryPhone: dto.primaryPhone,
          addressLine1: dto.addressLine1 ?? '',
          city: dto.city ?? '',
          state: dto.state ?? '',
          pinCode: dto.pinCode ?? '',
          academicYearStart: 6,
          subscription: {
            create: {
              plan: dto.plan ?? SubscriptionPlan.FREE,
              status: SubscriptionStatus.TRIAL,
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
            },
          },
        },
      });
      await tx.user.create({
        data: {
          schoolId: school.id,
          role: UserRole.SCHOOL_ADMIN,
          email: dto.adminEmail,
          username: `${dto.slug}-admin`,
          passwordHash: await bcrypt.hash(dto.adminPassword, 10),
          mustChangePassword: true,
        },
      });
      return school;
    }).then(async (school) => {
      await this.writeAudit('SCHOOL_ONBOARDED', 'School', school.id, { name: school.name, slug: school.slug }, school.id);
      return school;
    });
  }

  async updateSchool(id: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    const updated = await this.prisma.school.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.city ? { city: dto.city } : {}),
        ...(dto.state ? { state: dto.state } : {}),
        ...(dto.primaryPhone ? { primaryPhone: dto.primaryPhone } : {}),
      },
    });
    await this.writeAudit(
      dto.isActive === false ? 'SCHOOL_SUSPENDED' : 'SCHOOL_UPDATED',
      'School',
      id,
      { isActive: updated.isActive },
      id,
    );
    return updated;
  }

  listSubscriptions() {
    return this.prisma.schoolSubscription.findMany({
      include: { school: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSubscription(schoolId: string, dto: UpdateSubscriptionDto) {
    const sub = await this.prisma.schoolSubscription.findUnique({
      where: { schoolId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    const updated = await this.prisma.schoolSubscription.update({
      where: { schoolId },
      data: {
        ...(dto.plan ? { plan: dto.plan } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
    await this.writeAudit(
      'SUBSCRIPTION_UPDATED',
      'SchoolSubscription',
      updated.id,
      { plan: updated.plan, status: updated.status },
      schoolId,
    );
    return updated;
  }

  async listUsers(query: PaginationQueryDto & { schoolId?: string }) {
    const where = {
      ...(query.schoolId ? { schoolId: query.schoolId } : {}),
      ...(query.search
        ? { email: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          schoolId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.pageSize);
  }

  async createUser(dto: CreatePlatformUserDto) {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        role: dto.role,
        schoolId: dto.schoolId || null,
        passwordHash: await bcrypt.hash(dto.password, 10),
        mustChangePassword: true,
      },
    });
    await this.writeAudit('PLATFORM_USER_CREATED', 'User', user.id, { email: user.email, role: user.role });
    return user;
  }

  async updateUser(id: string, dto: UpdatePlatformUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.username ? { username: dto.username } : {}),
        ...(dto.role ? { role: dto.role } : {}),
      },
    });
    await this.writeAudit(
      dto.isActive === false ? 'PLATFORM_USER_SUSPENDED' : 'PLATFORM_USER_UPDATED',
      'User',
      id,
      { email: updated.email, role: updated.role, isActive: updated.isActive }
    );
    return updated;
  }

  listAudit(query: PaginationQueryDto) {
    return this.prisma.auditLog
      .findMany({
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          performedBy: { select: { email: true, username: true, role: true } },
        },
      })
      .then(async (rows) => {
        const total = await this.prisma.auditLog.count();
        return paginate(
          rows.map((r) => ({
            ...r,
            actorEmail: r.performedBy?.email ?? r.performedById,
            actorUsername: r.performedBy?.username ?? null,
            actorRole: r.performedBy?.role ?? null,
          })),
          total,
          query.page,
          query.pageSize,
        );
      });
  }

  private defaultPlatformConfig() {
    return {
      platform: {
        name: 'EduFees Pro',
        supportEmail: 'support@edufees.pro',
        supportPhone: '+91-1800-XXX-XXXX',
        website: 'https://edufees.pro',
      },
      security: {
        maxAttempts: 5,
        sessionTimeout: 30,
        minPassword: 8,
        twoFA: true,
        ipWhitelist: false,
      },
      notifications: {
        whatsappProvider: 'Twilio',
        emailProvider: 'SendGrid',
        reminderDays: '7, 3, 1',
        autoReminder: true,
      },
      gateways: [
        {
          id: 'razorpay',
          name: 'Razorpay',
          mode: 'Live',
          keyId: '',
          active: true,
        },
      ],
    };
  }

  async getSettings() {
    const row = await this.prisma.platformConfig.findUnique({
      where: { id: 'default' },
    });
    if (!row) {
      const config = this.defaultPlatformConfig();
      await this.prisma.platformConfig.create({
        data: { id: 'default', config: config as Prisma.InputJsonValue },
      });
      return config;
    }
    return row.config;
  }

  async updateSettings(patch: Record<string, unknown>) {
    const current = (await this.getSettings()) as Record<string, unknown>;
    const merged = { ...current, ...patch };
    const config = merged as Prisma.InputJsonValue;
    await this.prisma.platformConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', config },
      update: { config },
    });
    await this.writeAudit('PLATFORM_SETTINGS_UPDATED', 'PlatformConfig', 'default', merged);
    return merged;
  }
}

class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schoolId?: string;
}

@ApiTags('super-admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('super-admin')
class SuperAdminController {
  constructor(private readonly svc: SuperAdminService) {}

  @Get('stats')
  stats() {
    return this.svc.platformStats();
  }

  @Get('analytics')
  analytics() {
    return this.svc.analytics();
  }

  @Get('schools')
  listSchools(@Query() query: PaginationQueryDto) {
    return this.svc.listSchools(query);
  }

  @Get('schools/:id')
  getSchool(@Param('id') id: string) {
    return this.svc.getSchool(id);
  }

  @Post('schools')
  onboard(@Body() dto: OnboardSchoolDto) {
    return this.svc.onboardSchool(dto);
  }

  @Patch('schools/:id')
  updateSchool(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.svc.updateSchool(id, dto);
  }

  @Get('subscriptions')
  listSubscriptions() {
    return this.svc.listSubscriptions();
  }

  @Patch('subscriptions/:schoolId')
  updateSubscription(
    @Param('schoolId') schoolId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.svc.updateSubscription(schoolId, dto);
  }

  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.svc.listUsers(query);
  }

  @Post('users')
  createUser(@Body() dto: CreatePlatformUserDto) {
    return this.svc.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdatePlatformUserDto) {
    return this.svc.updateUser(id, dto);
  }

  @Get('audit')
  listAudit(@Query() query: PaginationQueryDto) {
    return this.svc.listAudit(query);
  }

  @Get('settings')
  getSettings() {
    return this.svc.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: Record<string, unknown>) {
    return this.svc.updateSettings(dto);
  }
}

@Module({
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
