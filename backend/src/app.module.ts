import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { MaterialsModule } from './materials/materials.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { InquiryOrdersModule } from './inquiry-orders/inquiry-orders.module';
import { PurchaseConfirmsModule } from './purchase-confirms/purchase-confirms.module';
import { DeliveryNoticesModule } from './delivery-notices/delivery-notices.module';
import { ApprovalHistoryModule } from './approval-history/approval-history.module';
import { UploadModule } from './upload/upload.module';
import { CompanyInventoryModule } from './company-inventory/company-inventory.module';
import { ProjectInventoryModule } from './project-inventory/project-inventory.module';
import { StockOutModule } from './stock-out/stock-out.module';
import { MaterialRequisitionsModule } from './material-requisitions/material-requisitions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    MaterialsModule,
    PurchaseRequestsModule,
    InquiryOrdersModule,
    PurchaseConfirmsModule,
    DeliveryNoticesModule,
    ApprovalHistoryModule,
    UploadModule,
    CompanyInventoryModule,
    ProjectInventoryModule,
    StockOutModule,
    MaterialRequisitionsModule,
  ],
})
export class AppModule {}
