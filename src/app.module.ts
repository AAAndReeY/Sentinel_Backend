import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AbsenceModule } from './modules/absence/absence.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BodycamModule } from './modules/bodycam/bodycam.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { JobModule } from './modules/job/job.module';
import { JurisdictionModule } from './modules/jurisdiction/jurisdiction.module';
import { LackModule } from './modules/lack/lack.module';
import { LeadModule } from './modules/lead/lead.module';
import { OffenderModule } from './modules/offender/offender.module';
import { ReportModule } from './modules/report/report.module';
import { RoleModule } from './modules/role/role.module';
import { SessionModule } from './modules/session/session.module';
import { SubjectModule } from './modules/subject/subject.module';
import { UserModule } from './modules/user/user.module';
import { ExternalModule } from './external/external.module';
import { RedisModule } from './redis/redis.module';
import { AllExceptionsFilter } from './common/filters';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AbsenceModule,
    AttendanceModule,
    AuditModule,
    AuthModule,
    BodycamModule,
    DashboardModule,
    EvidenceModule,
    JobModule,
    JurisdictionModule,
    LackModule,
    LeadModule,
    OffenderModule,
    ReportModule,
    RoleModule,
    SessionModule,
    SubjectModule,
    UserModule,
    ExternalModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService, AllExceptionsFilter],
})
export class AppModule {}
