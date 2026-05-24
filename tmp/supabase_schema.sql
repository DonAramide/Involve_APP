CREATE TABLE IF NOT EXISTS "categories" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "business_mode" VARCHAR(255) ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "items" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "category" VARCHAR(255) NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "cost_price" DOUBLE PRECISION ,
  "stock_qty" INTEGER ,
  "min_stock_qty" DOUBLE PRECISION ,
  "image" BYTEA ,
  "category_id" INTEGER ,
  "type" VARCHAR(255) ,
  "billing_type" VARCHAR(255) ,
  "service_category" VARCHAR(255) ,
  "requires_time_tracking" BOOLEAN ,
  "business_mode" VARCHAR(255) ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN ,
  "is_default" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(255) ,
  "email" VARCHAR(255) ,
  "address" VARCHAR(255) ,
  "image" BYTEA ,
  "balance" DOUBLE PRECISION ,
  "virtual_account_number" VARCHAR(255) ,
  "virtual_account_name" VARCHAR(255) ,
  "virtual_account_bank" VARCHAR(255) ,
  "created_at" TIMESTAMP ,
  "sync_status" VARCHAR(255) 
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" INTEGER ,
  "invoice_number" VARCHAR(255) NOT NULL,
  "date_created" TIMESTAMP ,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "tax_amount" DOUBLE PRECISION NOT NULL,
  "discount_amount" DOUBLE PRECISION NOT NULL,
  "discount_type" VARCHAR(255) ,
  "total_amount" DOUBLE PRECISION NOT NULL,
  "payment_status" VARCHAR(255) NOT NULL,
  "amount_paid" DOUBLE PRECISION ,
  "balance_amount" DOUBLE PRECISION ,
  "customer_name" VARCHAR(255) ,
  "customer_id" VARCHAR(255) ,
  "customer_address" VARCHAR(255) ,
  "payment_method" VARCHAR(255) ,
  "staff_id" INTEGER ,
  "staff_name" VARCHAR(255) ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN ,
  "total_print_amount" DOUBLE PRECISION ,
  "business_mode" VARCHAR(255) ,
  "student_id" INTEGER ,
  "class_id" INTEGER ,
  "term_id" INTEGER ,
  "academic_year_id" INTEGER ,
  "admission_number" VARCHAR(255) ,
  "class_name" VARCHAR(255) ,
  "term_name" VARCHAR(255) ,
  "academic_year_name" VARCHAR(255) ,
  "student_image" BYTEA ,
  "warranty_duration" VARCHAR(255) 
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" INTEGER ,
  "invoice_id" INTEGER NOT NULL,
  "item_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" DOUBLE PRECISION NOT NULL,
  "type" VARCHAR(255) ,
  "service_meta" VARCHAR(255) ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN ,
  "print_price" DOUBLE PRECISION ,
  "returned_quantity" INTEGER ,
  "is_replacement" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" INTEGER ,
  "organization_name" VARCHAR(255) NOT NULL,
  "address" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(255) NOT NULL,
  "business_description" VARCHAR(255) ,
  "tax_id" VARCHAR(255) ,
  "logo_path" VARCHAR(255) ,
  "logo" BYTEA ,
  "logo_svg" VARCHAR(255) ,
  "theme_mode" VARCHAR(255) ,
  "currency" VARCHAR(255) ,
  "tax_enabled" BOOLEAN ,
  "discount_enabled" BOOLEAN ,
  "default_invoice_template" VARCHAR(255) ,
  "confirm_price_on_selection" BOOLEAN ,
  "tax_rate" DOUBLE PRECISION ,
  "bank_name" VARCHAR(255) ,
  "account_number" VARCHAR(255) ,
  "account_name" VARCHAR(255) ,
  "show_account_details" BOOLEAN ,
  "receipt_footer" VARCHAR(255) ,
  "show_signature_space" BOOLEAN ,
  "payment_methods_enabled" BOOLEAN ,
  "primary_color" INTEGER ,
  "failed_attempts" INTEGER ,
  "is_locked" BOOLEAN ,
  "locked_at" TIMESTAMP ,
  "show_date_time" BOOLEAN ,
  "service_billing_enabled" BOOLEAN ,
  "service_types" VARCHAR(255) ,
  "staff_management_enabled" BOOLEAN ,
  "paper_width" INTEGER ,
  "half_day_start_hour" INTEGER ,
  "half_day_end_hour" INTEGER ,
  "show_sync_status" BOOLEAN ,
  "custom_receipt_pricing_enabled" BOOLEAN ,
  "show_logo" BOOLEAN ,
  "cac_number" VARCHAR(255) ,
  "show_cac_number" BOOLEAN ,
  "show_total_sales_card" BOOLEAN ,
  "stock_return_enabled" BOOLEAN ,
  "show_sales_trend_chart" BOOLEAN ,
  "show_expense_pie_chart" BOOLEAN ,
  "show_top_selling_chart" BOOLEAN ,
  "show_stock_value_chart" BOOLEAN ,
  "business_mode" VARCHAR(255) ,
  "menu_order" VARCHAR(255) ,
  "skip_splash" BOOLEAN ,
  "restore_last_state" BOOLEAN ,
  "last_route" VARCHAR(255) ,
  "show_logo_as_menu_background" BOOLEAN ,
  "currency_name" VARCHAR(255) ,
  "currency_subunit" VARCHAR(255) ,
  "admin_signature" BYTEA ,
  "show_admin_signature" BOOLEAN ,
  "warranty_enabled" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "license_history" (
  "id" INTEGER ,
  "license_id" VARCHAR(255) NOT NULL,
  "business_name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(255) NOT NULL,
  "plan" VARCHAR(255) NOT NULL,
  "expiry_date" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP NOT NULL,
  "is_activated" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "staff" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "staff_code" VARCHAR(255) NOT NULL,
  "staff_id" VARCHAR(255) ,
  "phone" VARCHAR(255) ,
  "role" VARCHAR(255) ,
  "is_active" BOOLEAN ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "sync_meta" (
  "id" INTEGER ,
  "device_id" VARCHAR(255) NOT NULL,
  "device_name" VARCHAR(255) NOT NULL,
  "is_master" BOOLEAN ,
  "secret_token" VARCHAR(255) ,
  "last_sync_time" TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS "stock_increments" (
  "id" INTEGER ,
  "item_id" INTEGER NOT NULL,
  "quantity_added" INTEGER NOT NULL,
  "quantity_before" INTEGER ,
  "quantity_after" INTEGER ,
  "date_added" TIMESTAMP ,
  "remarks" VARCHAR(255) ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "stock_returns" (
  "id" INTEGER ,
  "invoice_id" INTEGER NOT NULL,
  "item_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "amount_returned" DOUBLE PRECISION NOT NULL,
  "staff_id" INTEGER NOT NULL,
  "date_returned" TIMESTAMP ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" INTEGER ,
  "amount" DOUBLE PRECISION NOT NULL,
  "description" VARCHAR(255) NOT NULL,
  "category" VARCHAR(255) ,
  "date" TIMESTAMP ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "academic_years" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP NOT NULL,
  "is_current" BOOLEAN ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "terms" (
  "id" INTEGER ,
  "academic_year_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP NOT NULL,
  "is_current" BOOLEAN ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "classes" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "description" VARCHAR(255) ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "students" (
  "id" INTEGER ,
  "admission_number" VARCHAR(255) NOT NULL,
  "first_name" VARCHAR(255) NOT NULL,
  "last_name" VARCHAR(255) NOT NULL,
  "class_id" INTEGER NOT NULL,
  "academic_year_id" INTEGER ,
  "parent_name" VARCHAR(255) ,
  "parent_phone" VARCHAR(255) ,
  "balance" DOUBLE PRECISION ,
  "credit_balance" DOUBLE PRECISION ,
  "date_of_birth" TIMESTAMP ,
  "gender" VARCHAR(255) ,
  "registration_date" TIMESTAMP ,
  "image" BYTEA ,
  "virtual_account_number" VARCHAR(255) ,
  "virtual_account_bank" VARCHAR(255) ,
  "virtual_account_status" VARCHAR(255) ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "business_settings" (
  "id" INTEGER ,
  "business_mode" VARCHAR(255) ,
  "updated_at" TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS "teachers" (
  "id" INTEGER ,
  "full_name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(255) ,
  "profession" VARCHAR(255) ,
  "class_id" INTEGER ,
  "salary" DOUBLE PRECISION ,
  "years_in_school" INTEGER ,
  "employment_date" TIMESTAMP ,
  "certificates" VARCHAR(255) ,
  "image" BYTEA ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "subjects" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(255) ,
  "teacher_id" INTEGER ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "results" (
  "id" INTEGER ,
  "student_id" INTEGER NOT NULL,
  "subject_id" INTEGER NOT NULL,
  "term_id" INTEGER NOT NULL,
  "academic_year_id" INTEGER NOT NULL,
  "assessment_score" DOUBLE PRECISION ,
  "exam_score" DOUBLE PRECISION ,
  "total_score" DOUBLE PRECISION ,
  "grade" VARCHAR(255) ,
  "remarks" VARCHAR(255) ,
  "date_entered" TIMESTAMP ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "grading_rules" (
  "id" INTEGER ,
  "min_score" DOUBLE PRECISION NOT NULL,
  "max_score" DOUBLE PRECISION NOT NULL,
  "grade" VARCHAR(255) NOT NULL,
  "remarks" VARCHAR(255) ,
  "sync_id" VARCHAR(255) ,
  "updated_at" TIMESTAMP ,
  "created_at" TIMESTAMP ,
  "device_id" VARCHAR(255) ,
  "is_deleted" BOOLEAN 
);

CREATE TABLE IF NOT EXISTS "printer_configs" (
  "address" VARCHAR(255) NOT NULL,
  "custom_name" VARCHAR(255) ,
  "type" VARCHAR(255) NOT NULL,
  "last_connected_at" TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS "service_jobs" (
  "id" VARCHAR(255) NOT NULL,
  "job_id" VARCHAR(255) NOT NULL,
  "customer_id" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" VARCHAR(255) ,
  "total_amount" DOUBLE PRECISION NOT NULL,
  "amount_paid" DOUBLE PRECISION ,
  "labor_amount" DOUBLE PRECISION ,
  "balance" DOUBLE PRECISION NOT NULL,
  "status" VARCHAR(255) ,
  "due_date" TIMESTAMP ,
  "image" BYTEA ,
  "created_at" TIMESTAMP ,
  "sync_status" VARCHAR(255) ,
  "warranty_duration" VARCHAR(255) 
);

CREATE TABLE IF NOT EXISTS "service_payments" (
  "id" VARCHAR(255) NOT NULL,
  "job_id" VARCHAR(255) NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" VARCHAR(255) NOT NULL,
  "reference" VARCHAR(255) ,
  "created_at" TIMESTAMP ,
  "sync_status" VARCHAR(255) 
);

CREATE TABLE IF NOT EXISTS "local_counters" (
  "type" VARCHAR(255) NOT NULL,
  "last_value" INTEGER 
);

CREATE TABLE IF NOT EXISTS "service_job_presets" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS "service_materials" (
  "id" INTEGER ,
  "category" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "default_price" DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS "service_job_items" (
  "id" INTEGER ,
  "job_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "category" VARCHAR(255) ,
  "price" DOUBLE PRECISION NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS "service_material_categories" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS "service_labor_presets" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS "service_expense_categories" (
  "id" INTEGER ,
  "name" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS "curriculum_map" (
  "id" INTEGER ,
  "class_id" INTEGER NOT NULL,
  "subject_id" INTEGER NOT NULL,
  "term_id" INTEGER NOT NULL,
  "week" INTEGER NOT NULL,
  "topic" VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "lesson_notes" (
  "id" INTEGER ,
  "curriculum_id" INTEGER ,
  "class_id" INTEGER ,
  "subject_id" INTEGER ,
  "term_id" INTEGER ,
  "class_name" VARCHAR(255) NOT NULL,
  "subject_name" VARCHAR(255) NOT NULL,
  "term" VARCHAR(255) NOT NULL,
  "week" INTEGER NOT NULL,
  "topic" VARCHAR(255) NOT NULL,
  "content" VARCHAR(255) NOT NULL,
  "content_hash" VARCHAR(255) NOT NULL,
  "is_ai_generated" BOOLEAN ,
  "version" INTEGER ,
  "sync_status" INTEGER ,
  "sync_id" VARCHAR(255) ,
  "retry_count" INTEGER ,
  "is_deleted" BOOLEAN ,
  "device_id" VARCHAR(255) ,
  "created_at" TIMESTAMP ,
  "updated_at" TIMESTAMP 
);