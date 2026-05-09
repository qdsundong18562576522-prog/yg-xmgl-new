-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('sales', 'pm', 'purchaser', 'finance', 'leader', 'engineer', 'admin');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('integration', 'supply');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'confirmed');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('draft', 'pending_pm', 'pending_leader', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PurchaseConfirmStatus" AS ENUM ('draft', 'pending_pm', 'pending_leader', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DeliveryNoticeStatus" AS ENUM ('draft', 'pending_purchaser', 'pending_leader', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "StockInStatus" AS ENUM ('auto_generated', 'confirmed');

-- CreateEnum
CREATE TYPE "StockOutStatus" AS ENUM ('draft', 'pending_leader', 'pending_purchaser', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "StockOutReason" AS ENUM ('design_change', 'solution_optimization', 'procurement_error', 'other');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('draft', 'pending_purchaser', 'pending_leader', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ExpenseRequestStatus" AS ENUM ('draft', 'pending_leader', 'pending_finance', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('draft', 'pending_pm', 'pending_leader', 'pending_finance', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "VariationStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "LaborContractStatus" AS ENUM ('draft', 'pending_pm', 'pending_leader', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "LaborVisaStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentRequestStatus" AS ENUM ('draft', 'pending_leader', 'pending_finance', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(128) NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" VARCHAR(100),
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "ProjectType" NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "description" TEXT,
    "contract_amount" DECIMAL(12,2) NOT NULL,
    "expected_profit_rate" DECIMAL(5,2),
    "project_manager_id" INTEGER NOT NULL,
    "plan_start_date" TIMESTAMP(3) NOT NULL,
    "plan_end_date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "remarks" TEXT,
    "attachment" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lib" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,

    CONSTRAINT "material_lib_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "delivery_address" TEXT,
    "receiver_id" INTEGER,
    "phone" VARCHAR(20),
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_items" (
    "id" SERIAL NOT NULL,
    "pr_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "contract_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "required_delivery_date" TIMESTAMP(3),
    "remark" TEXT,

    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_orders" (
    "id" SERIAL NOT NULL,
    "pr_id" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiry_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_items" (
    "id" SERIAL NOT NULL,
    "inquiry_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "contract_price" DECIMAL(12,2) NOT NULL,
    "purchase_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "is_extra" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inquiry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_confirmations" (
    "id" SERIAL NOT NULL,
    "inquiry_id" INTEGER NOT NULL,
    "delivery_payment_terms" TEXT,
    "supply_cycle" VARCHAR(200),
    "contract_file" TEXT,
    "status" "PurchaseConfirmStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_confirm_items" (
    "id" SERIAL NOT NULL,
    "confirm_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "purchase_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_confirm_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_inventory" (
    "id" SERIAL NOT NULL,
    "material_lib_id" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "remark" TEXT,

    CONSTRAINT "company_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_inventory_logs" (
    "id" SERIAL NOT NULL,
    "inventory_id" INTEGER NOT NULL,
    "change_qty" DECIMAL(12,2) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "ref_id" INTEGER,
    "project_id" INTEGER,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_notices" (
    "id" SERIAL NOT NULL,
    "confirm_id" INTEGER NOT NULL,
    "delivery_option" VARCHAR(50),
    "total_date" TIMESTAMP(3),
    "receiver" VARCHAR(100),
    "phone" VARCHAR(20),
    "address" TEXT,
    "status" "DeliveryNoticeStatus" NOT NULL DEFAULT 'draft',
    "project_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_notice_items" (
    "id" SERIAL NOT NULL,
    "notice_id" INTEGER NOT NULL,
    "confirm_item_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "purchase_price" DECIMAL(12,2) NOT NULL,
    "delivery_date" TIMESTAMP(3),

    CONSTRAINT "delivery_notice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_inventory" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "project_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ins" (
    "id" SERIAL NOT NULL,
    "notice_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "stock_in_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StockInStatus" NOT NULL DEFAULT 'auto_generated',
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_in_items" (
    "id" SERIAL NOT NULL,
    "stock_in_id" INTEGER NOT NULL,
    "notice_item_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "stock_in_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_outs" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "reason_type" "StockOutReason" NOT NULL,
    "reason_detail" TEXT,
    "status" "StockOutStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_out_items" (
    "id" SERIAL NOT NULL,
    "out_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "cost_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "stock_out_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_requisitions" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_requisition_items" (
    "id" SERIAL NOT NULL,
    "requisition_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "contract_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "material_requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_adjustments" (
    "id" SERIAL NOT NULL,
    "source_project_id" INTEGER NOT NULL,
    "target_project_id" INTEGER NOT NULL,
    "stock_out_id" INTEGER,
    "requisition_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_expense_requests" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "pay_method" VARCHAR(50) NOT NULL,
    "other_method" VARCHAR(100),
    "status" "ExpenseRequestStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_expense_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reimbursements" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "has_invoice" BOOLEAN NOT NULL DEFAULT false,
    "invoice_file" TEXT,
    "no_invoice_reason" TEXT,
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'draft',
    "needs_pm_approve" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_variations" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "status" "VariationStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variation_items" (
    "id" SERIAL NOT NULL,
    "variation_id" INTEGER NOT NULL,
    "material_lib_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "contract_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "variation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_contracts" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "contract_file" TEXT,
    "status" "LaborContractStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_visas" (
    "id" SERIAL NOT NULL,
    "labor_contract_id" INTEGER NOT NULL,
    "reason_calc" TEXT NOT NULL,
    "amount_change" DECIMAL(12,2) NOT NULL,
    "status" "LaborVisaStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_visas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_requests" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "contract_type" VARCHAR(20) NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "payment_terms" TEXT,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_confirmations" (
    "id" SERIAL NOT NULL,
    "payment_request_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_receivables" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "received_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_ledgers" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "contract_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variation_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjusted_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_receivable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_paid_out" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "purchase_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "labor_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expense_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "requisition_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stock_out_pending_deduct" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deducted_by_other_projects" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_name" VARCHAR(50) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "changes" TEXT,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" SERIAL NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_path" TEXT NOT NULL,
    "mime_type" VARCHAR(100),
    "size" INTEGER,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "uploaded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_history" (
    "id" SERIAL NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "approver_id" INTEGER NOT NULL,
    "action" VARCHAR(10) NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_inventory_logs" (
    "id" SERIAL NOT NULL,
    "inventory_id" INTEGER NOT NULL,
    "change_qty" DECIMAL(12,2) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "ref_id" INTEGER,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "material_lib_name_brand_spec_unit_key" ON "material_lib"("name", "brand", "spec", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "inquiry_orders_pr_id_key" ON "inquiry_orders"("pr_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_confirmations_inquiry_id_key" ON "purchase_confirmations"("inquiry_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_inventory_material_lib_id_key" ON "company_inventory"("material_lib_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_inventory_project_id_material_lib_id_key" ON "project_inventory"("project_id", "material_lib_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_confirmations_payment_request_id_key" ON "payment_confirmations"("payment_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_ledgers_project_id_key" ON "project_ledgers"("project_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "operation_logs_entity_type_entity_id_idx" ON "operation_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "approval_history_entity_type_entity_id_idx" ON "approval_history"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_id_fkey" FOREIGN KEY ("project_manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_material_lib_id_fkey" FOREIGN KEY ("material_lib_id") REFERENCES "material_lib"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_orders" ADD CONSTRAINT "inquiry_orders_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_orders" ADD CONSTRAINT "inquiry_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_items" ADD CONSTRAINT "inquiry_items_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiry_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_items" ADD CONSTRAINT "inquiry_items_material_lib_id_fkey" FOREIGN KEY ("material_lib_id") REFERENCES "material_lib"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_confirmations" ADD CONSTRAINT "purchase_confirmations_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiry_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_confirmations" ADD CONSTRAINT "purchase_confirmations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_confirm_items" ADD CONSTRAINT "purchase_confirm_items_confirm_id_fkey" FOREIGN KEY ("confirm_id") REFERENCES "purchase_confirmations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_confirm_items" ADD CONSTRAINT "purchase_confirm_items_material_lib_id_fkey" FOREIGN KEY ("material_lib_id") REFERENCES "material_lib"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_inventory" ADD CONSTRAINT "company_inventory_material_lib_id_fkey" FOREIGN KEY ("material_lib_id") REFERENCES "material_lib"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_inventory_logs" ADD CONSTRAINT "company_inventory_logs_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "company_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notices" ADD CONSTRAINT "delivery_notices_confirm_id_fkey" FOREIGN KEY ("confirm_id") REFERENCES "purchase_confirmations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notices" ADD CONSTRAINT "delivery_notices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notices" ADD CONSTRAINT "delivery_notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notice_items" ADD CONSTRAINT "delivery_notice_items_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "delivery_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notice_items" ADD CONSTRAINT "delivery_notice_items_material_lib_id_fkey" FOREIGN KEY ("material_lib_id") REFERENCES "material_lib"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_inventory" ADD CONSTRAINT "project_inventory_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_inventory" ADD CONSTRAINT "project_inventory_material_lib_id_fkey" FOREIGN KEY ("material_lib_id") REFERENCES "material_lib"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "delivery_notices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_in_items" ADD CONSTRAINT "stock_in_items_stock_in_id_fkey" FOREIGN KEY ("stock_in_id") REFERENCES "stock_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outs" ADD CONSTRAINT "stock_outs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outs" ADD CONSTRAINT "stock_outs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_out_items" ADD CONSTRAINT "stock_out_items_out_id_fkey" FOREIGN KEY ("out_id") REFERENCES "stock_outs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requisitions" ADD CONSTRAINT "material_requisitions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requisitions" ADD CONSTRAINT "material_requisitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_requisition_items" ADD CONSTRAINT "material_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "material_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_adjustments" ADD CONSTRAINT "cost_adjustments_source_project_id_fkey" FOREIGN KEY ("source_project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_adjustments" ADD CONSTRAINT "cost_adjustments_target_project_id_fkey" FOREIGN KEY ("target_project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_adjustments" ADD CONSTRAINT "cost_adjustments_stock_out_id_fkey" FOREIGN KEY ("stock_out_id") REFERENCES "stock_outs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_adjustments" ADD CONSTRAINT "cost_adjustments_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "material_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expense_requests" ADD CONSTRAINT "project_expense_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expense_requests" ADD CONSTRAINT "project_expense_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_variations" ADD CONSTRAINT "contract_variations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_variations" ADD CONSTRAINT "contract_variations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variation_items" ADD CONSTRAINT "variation_items_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "contract_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_contracts" ADD CONSTRAINT "labor_contracts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_contracts" ADD CONSTRAINT "labor_contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_visas" ADD CONSTRAINT "labor_visas_labor_contract_id_fkey" FOREIGN KEY ("labor_contract_id") REFERENCES "labor_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_visas" ADD CONSTRAINT "labor_visas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_receivables" ADD CONSTRAINT "project_receivables_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_receivables" ADD CONSTRAINT "project_receivables_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_ledgers" ADD CONSTRAINT "project_ledgers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
