CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone VARCHAR(16) NOT NULL,
  full_name VARCHAR(120) NULL,
  role ENUM('passenger', 'rider', 'admin') NOT NULL DEFAULT 'passenger',
  status ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
  phone_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS rider_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  verification_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted',
  online_status ENUM('offline', 'online', 'on_trip') NOT NULL DEFAULT 'offline',
  license_number VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_rider_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rider_user_id BIGINT UNSIGNED NOT NULL,
  vehicle_type ENUM('bike', 'auto', 'hatchback', 'sedan', 'suv', 'luxury_car', 'pickup', 'traveller', 'bus', 'e_rickshaw', 'cab') NOT NULL,
  registration_number VARCHAR(24) NOT NULL,
  status ENUM('pending', 'active', 'blocked') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehicles_registration (registration_number),
  KEY idx_vehicles_rider_status (rider_user_id, status),
  CONSTRAINT fk_vehicles_rider FOREIGN KEY (rider_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS rides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  passenger_user_id BIGINT UNSIGNED NOT NULL,
  rider_user_id BIGINT UNSIGNED NULL,
  vehicle_type ENUM('bike', 'auto', 'hatchback', 'sedan', 'suv', 'luxury_car', 'pickup', 'traveller', 'bus', 'e_rickshaw', 'cab') NOT NULL,
  pickup_address VARCHAR(500) NOT NULL,
  pickup_latitude DECIMAL(10, 7) NULL,
  pickup_longitude DECIMAL(10, 7) NULL,
  destination_address VARCHAR(500) NOT NULL,
  destination_latitude DECIMAL(10, 7) NULL,
  destination_longitude DECIMAL(10, 7) NULL,
  quoted_fare_minor BIGINT UNSIGNED NULL,
  final_fare_minor BIGINT UNSIGNED NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_driver') NOT NULL DEFAULT 'requested',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_rides_passenger_created (passenger_user_id, requested_at),
  KEY idx_rides_rider_status (rider_user_id, status),
  KEY idx_rides_status_created (status, requested_at),
  CONSTRAINT fk_rides_passenger FOREIGN KEY (passenger_user_id) REFERENCES users (id),
  CONSTRAINT fk_rides_rider FOREIGN KEY (rider_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ride_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ride_id BIGINT UNSIGNED NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NULL,
  previous_status VARCHAR(24) NULL,
  new_status VARCHAR(24) NOT NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ride_status_history_ride_created (ride_id, created_at),
  CONSTRAINT fk_ride_status_history_ride FOREIGN KEY (ride_id) REFERENCES rides (id) ON DELETE CASCADE,
  CONSTRAINT fk_ride_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS event_bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_user_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_hours DECIMAL(5, 2) NOT NULL,
  pickup_address VARCHAR(500) NOT NULL,
  destination_address VARCHAR(500) NOT NULL,
  special_requirements TEXT NULL,
  status ENUM('request_submitted', 'under_review', 'quotation_sent', 'waiting_confirmation', 'booking_confirmed', 'payment_pending', 'completed', 'cancelled') NOT NULL DEFAULT 'request_submitted',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_bookings_customer_created (customer_user_id, created_at),
  KEY idx_event_bookings_status_date (status, event_date),
  CONSTRAINT fk_event_bookings_customer FOREIGN KEY (customer_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS event_booking_vehicles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_booking_id BIGINT UNSIGNED NOT NULL,
  vehicle_type ENUM('bike', 'auto', 'hatchback', 'sedan', 'suv', 'luxury_car', 'pickup', 'traveller', 'bus', 'e_rickshaw', 'cab') NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_booking_vehicles_booking (event_booking_id),
  CONSTRAINT fk_event_booking_vehicles_booking FOREIGN KEY (event_booking_id) REFERENCES event_bookings (id) ON DELETE CASCADE,
  CONSTRAINT chk_event_booking_vehicles_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS event_quotations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_booking_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  total_amount_minor BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  availability_note TEXT NULL,
  status ENUM('sent', 'accepted', 'declined', 'expired', 'superseded') NOT NULL DEFAULT 'sent',
  valid_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_event_quotations_booking_created (event_booking_id, created_at),
  CONSTRAINT fk_event_quotations_booking FOREIGN KEY (event_booking_id) REFERENCES event_bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_quotations_admin FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS complaints (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  filed_by_user_id BIGINT UNSIGNED NOT NULL,
  ride_id BIGINT UNSIGNED NULL,
  event_booking_id BIGINT UNSIGNED NULL,
  subject VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  status ENUM('open', 'investigating', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  assigned_admin_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_complaints_status_created (status, created_at),
  KEY idx_complaints_reporter_created (filed_by_user_id, created_at),
  CONSTRAINT fk_complaints_reporter FOREIGN KEY (filed_by_user_id) REFERENCES users (id),
  CONSTRAINT fk_complaints_ride FOREIGN KEY (ride_id) REFERENCES rides (id) ON DELETE SET NULL,
  CONSTRAINT fk_complaints_event FOREIGN KEY (event_booking_id) REFERENCES event_bookings (id) ON DELETE SET NULL,
  CONSTRAINT fk_complaints_admin FOREIGN KEY (assigned_admin_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS otp_challenges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone VARCHAR(16) NOT NULL,
  otp_hash BINARY(32) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_otp_challenges_phone_created (phone, created_at),
  KEY idx_otp_challenges_expiration (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_audit_logs_admin_created (admin_user_id, created_at),
  KEY idx_admin_audit_logs_entity (entity_type, entity_id),
  CONSTRAINT fk_admin_audit_logs_admin FOREIGN KEY (admin_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
