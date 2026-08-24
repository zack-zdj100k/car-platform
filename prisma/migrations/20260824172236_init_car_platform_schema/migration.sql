-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CarStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SUV', 'CROSSOVER', 'SEDAN', 'HATCHBACK', 'COUPE', 'CONVERTIBLE', 'WAGON', 'MPV', 'VAN', 'PICKUP');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'PLUG_IN_HYBRID', 'ELECTRIC', 'LPG', 'CNG');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('MANUAL', 'AUTOMATIC', 'CVT', 'DCT', 'AMT', 'SINGLE_SPEED');

-- CreateEnum
CREATE TYPE "Drivetrain" AS ENUM ('FWD', 'RWD', 'AWD', 'FOUR_WD');

-- CreateEnum
CREATE TYPE "ColorKind" AS ENUM ('EXTERIOR', 'INTERIOR');

-- CreateEnum
CREATE TYPE "ImageKind" AS ENUM ('MAIN', 'GALLERY', 'EXTERIOR', 'INTERIOR', 'WHEEL');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'FR', 'AR');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "profile_image" TEXT,
    "google_id" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "logo_url" TEXT,
    "description" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cars" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "generation" TEXT,
    "trim" TEXT,
    "body_type" "BodyType" NOT NULL,
    "segment" TEXT,
    "category" TEXT,
    "doors" INTEGER,
    "seats" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "marketing_description" TEXT,
    "description" TEXT,
    "status" "CarStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_translations" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "marketing_description" TEXT,
    "description" TEXT,
    "exterior_description" TEXT,
    "interior_description" TEXT,

    CONSTRAINT "car_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_engines" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "engine_type" TEXT,
    "displacement_l" DECIMAL(4,1),
    "displacement_cc" INTEGER,
    "cylinders" INTEGER,
    "fuel_type" "FuelType" NOT NULL,
    "power_hp" INTEGER,
    "power_kw" INTEGER,
    "power_rpm" TEXT,
    "torque_nm" INTEGER,
    "torque_rpm" TEXT,
    "transmission" "Transmission",
    "gears" INTEGER,
    "drivetrain" "Drivetrain",
    "top_speed_kph" INTEGER,
    "acceleration_0_100" DECIMAL(4,1),
    "fuel_consumption_city" DECIMAL(4,1),
    "fuel_consumption_highway" DECIMAL(4,1),
    "fuel_consumption_combined" DECIMAL(4,1),
    "emission_standard" TEXT,
    "battery_capacity_kwh" DECIMAL(6,1),
    "electric_range_km" INTEGER,
    "charging_ac_kw" DECIMAL(5,1),
    "charging_dc_kw" DECIMAL(5,1),

    CONSTRAINT "car_engines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_wheels" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "wheel_size_inch" INTEGER,
    "wheel_type" TEXT,
    "wheel_design" TEXT,
    "front_tyre_size" TEXT,
    "rear_tyre_size" TEXT,
    "tyre_type" TEXT,
    "spare_wheel" TEXT,
    "description" TEXT,

    CONSTRAINT "car_wheels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_exteriors" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "description" TEXT,
    "front_grille" TEXT,
    "headlights" TEXT,
    "daytime_running_lights" TEXT,
    "front_bumper" TEXT,
    "hood_design" TEXT,
    "side_profile" TEXT,
    "door_design" TEXT,
    "side_mirrors" TEXT,
    "wheel_arches" TEXT,
    "alloy_wheels" TEXT,
    "rear_lights" TEXT,
    "rear_bumper" TEXT,
    "exhaust" TEXT,
    "roofline" TEXT,
    "roof" TEXT,
    "spoiler" TEXT,
    "body_lines" TEXT,
    "aerodynamics" TEXT,

    CONSTRAINT "car_exteriors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_interiors" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "description" TEXT,
    "dashboard" TEXT,
    "steering_wheel" TEXT,
    "instrument_cluster" TEXT,
    "infotainment_screen" TEXT,
    "center_console" TEXT,
    "gear_selector" TEXT,
    "front_seats" TEXT,
    "rear_seats" TEXT,
    "seat_material" TEXT,
    "interior_color" TEXT,
    "ambient_lighting" TEXT,
    "air_conditioning" TEXT,
    "storage" TEXT,
    "usb_ports" INTEGER,
    "sound_system" TEXT,
    "speaker_count" INTEGER,
    "interior_technology" TEXT,
    "cargo_capacity_l" INTEGER,

    CONSTRAINT "car_interiors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_technologies" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "touchscreen" BOOLEAN NOT NULL DEFAULT false,
    "touchscreen_size_inch" DECIMAL(4,1),
    "apple_car_play" BOOLEAN NOT NULL DEFAULT false,
    "android_auto" BOOLEAN NOT NULL DEFAULT false,
    "bluetooth" BOOLEAN NOT NULL DEFAULT false,
    "navigation" BOOLEAN NOT NULL DEFAULT false,
    "digital_instrument_cluster" BOOLEAN NOT NULL DEFAULT false,
    "wireless_charging" BOOLEAN NOT NULL DEFAULT false,
    "keyless_entry" BOOLEAN NOT NULL DEFAULT false,
    "push_button_start" BOOLEAN NOT NULL DEFAULT false,
    "parking_sensors" BOOLEAN NOT NULL DEFAULT false,
    "rear_camera" BOOLEAN NOT NULL DEFAULT false,
    "camera_360" BOOLEAN NOT NULL DEFAULT false,
    "adaptive_cruise_control" BOOLEAN NOT NULL DEFAULT false,
    "drive_modes" TEXT[],
    "notes" TEXT,

    CONSTRAINT "car_technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_safeties" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "abs" BOOLEAN NOT NULL DEFAULT false,
    "electronic_stability_control" BOOLEAN NOT NULL DEFAULT false,
    "traction_control" BOOLEAN NOT NULL DEFAULT false,
    "hill_start_assist" BOOLEAN NOT NULL DEFAULT false,
    "autonomous_emergency_braking" BOOLEAN NOT NULL DEFAULT false,
    "forward_collision_warning" BOOLEAN NOT NULL DEFAULT false,
    "lane_keeping_assist" BOOLEAN NOT NULL DEFAULT false,
    "blind_spot_monitoring" BOOLEAN NOT NULL DEFAULT false,
    "rear_cross_traffic_alert" BOOLEAN NOT NULL DEFAULT false,
    "adaptive_cruise_control" BOOLEAN NOT NULL DEFAULT false,
    "parking_assistance" BOOLEAN NOT NULL DEFAULT false,
    "airbag_count" INTEGER,
    "airbag_types" TEXT[],
    "ncap_rating" INTEGER,
    "notes" TEXT,

    CONSTRAINT "car_safeties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_dimensions" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "length_mm" INTEGER,
    "width_mm" INTEGER,
    "height_mm" INTEGER,
    "wheelbase_mm" INTEGER,
    "ground_clearance_mm" INTEGER,
    "boot_capacity_l" INTEGER,
    "boot_capacity_max_l" INTEGER,
    "fuel_tank_l" DECIMAL(5,1),
    "kerb_weight_kg" INTEGER,

    CONSTRAINT "car_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_colors" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "kind" "ColorKind" NOT NULL DEFAULT 'EXTERIOR',
    "name" TEXT NOT NULL,
    "hex_code" TEXT NOT NULL,
    "finish" TEXT,
    "image_url" TEXT,
    "price_delta" DECIMAL(12,2),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "car_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_images" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "color_id" TEXT,
    "kind" "ImageKind" NOT NULL DEFAULT 'GALLERY',
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recently_viewed" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recently_viewed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparisons" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_cars" (
    "id" TEXT NOT NULL,
    "comparison_id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "user_id" TEXT,
    "car_id" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "buyer_email" TEXT NOT NULL,
    "buyer_phone" TEXT NOT NULL,
    "selected_color_id" TEXT,
    "selected_color_name" TEXT,
    "message" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_views" (
    "id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "user_id" TEXT,
    "anonymous_id" TEXT,
    "referrer" TEXT,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "order_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cars_slug_key" ON "cars"("slug");

-- CreateIndex
CREATE INDEX "cars_brand_id_idx" ON "cars"("brand_id");

-- CreateIndex
CREATE INDEX "cars_status_deleted_at_idx" ON "cars"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "cars_year_idx" ON "cars"("year");

-- CreateIndex
CREATE INDEX "cars_price_idx" ON "cars"("price");

-- CreateIndex
CREATE INDEX "cars_body_type_idx" ON "cars"("body_type");

-- CreateIndex
CREATE INDEX "cars_model_idx" ON "cars"("model");

-- CreateIndex
CREATE INDEX "cars_created_at_idx" ON "cars"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "car_translations_car_id_locale_key" ON "car_translations"("car_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "car_engines_car_id_key" ON "car_engines"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "car_wheels_car_id_key" ON "car_wheels"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "car_exteriors_car_id_key" ON "car_exteriors"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "car_interiors_car_id_key" ON "car_interiors"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "car_technologies_car_id_key" ON "car_technologies"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "car_safeties_car_id_key" ON "car_safeties"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "car_dimensions_car_id_key" ON "car_dimensions"("car_id");

-- CreateIndex
CREATE INDEX "car_colors_car_id_idx" ON "car_colors"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "car_colors_car_id_kind_name_key" ON "car_colors"("car_id", "kind", "name");

-- CreateIndex
CREATE INDEX "car_images_car_id_kind_idx" ON "car_images"("car_id", "kind");

-- CreateIndex
CREATE INDEX "favorites_user_id_created_at_idx" ON "favorites"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "favorites_car_id_idx" ON "favorites"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_car_id_key" ON "favorites"("user_id", "car_id");

-- CreateIndex
CREATE INDEX "recently_viewed_user_id_viewed_at_idx" ON "recently_viewed"("user_id", "viewed_at");

-- CreateIndex
CREATE INDEX "recently_viewed_car_id_idx" ON "recently_viewed"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "recently_viewed_user_id_car_id_key" ON "recently_viewed"("user_id", "car_id");

-- CreateIndex
CREATE INDEX "comparisons_user_id_created_at_idx" ON "comparisons"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "comparison_cars_car_id_idx" ON "comparison_cars"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "comparison_cars_comparison_id_car_id_key" ON "comparison_cars"("comparison_id", "car_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reference_key" ON "orders"("reference");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_car_id_idx" ON "orders"("car_id");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "car_views_car_id_viewed_at_idx" ON "car_views"("car_id", "viewed_at");

-- CreateIndex
CREATE INDEX "car_views_viewed_at_idx" ON "car_views"("viewed_at");

-- CreateIndex
CREATE INDEX "car_views_user_id_idx" ON "car_views"("user_id");

-- CreateIndex
CREATE INDEX "settings_group_idx" ON "settings"("group");

-- CreateIndex
CREATE INDEX "email_logs_status_created_at_idx" ON "email_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "email_logs_order_id_idx" ON "email_logs"("order_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_translations" ADD CONSTRAINT "car_translations_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_engines" ADD CONSTRAINT "car_engines_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_wheels" ADD CONSTRAINT "car_wheels_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_exteriors" ADD CONSTRAINT "car_exteriors_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_interiors" ADD CONSTRAINT "car_interiors_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_technologies" ADD CONSTRAINT "car_technologies_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_safeties" ADD CONSTRAINT "car_safeties_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_dimensions" ADD CONSTRAINT "car_dimensions_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_colors" ADD CONSTRAINT "car_colors_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_images" ADD CONSTRAINT "car_images_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_images" ADD CONSTRAINT "car_images_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "car_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_cars" ADD CONSTRAINT "comparison_cars_comparison_id_fkey" FOREIGN KEY ("comparison_id") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_cars" ADD CONSTRAINT "comparison_cars_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_selected_color_id_fkey" FOREIGN KEY ("selected_color_id") REFERENCES "car_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_views" ADD CONSTRAINT "car_views_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_views" ADD CONSTRAINT "car_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
