CREATE TABLE `audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`action` varchar(50) NOT NULL,
	`resource_type` varchar(50) NOT NULL,
	`resource_id` varchar(256),
	`details` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`request_id` bigint unsigned NOT NULL,
	`notification_type` enum('status_change','new_comment','new_request') NOT NULL,
	`message` text NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`sent_at` timestamp,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `satisfaction_ratings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`request_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`overall_rating` enum('1','2','3','4','5') NOT NULL,
	`speed_rating` enum('1','2','3','4','5'),
	`accuracy_rating` enum('1','2','3','4','5'),
	`ease_of_use_rating` enum('1','2','3','4','5'),
	`communication_rating` enum('1','2','3','4','5'),
	`comment` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `satisfaction_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `satisfaction_ratings_request_id_unique` UNIQUE(`request_id`)
);
--> statement-breakpoint
ALTER TABLE `attachments` ADD `attachment_type` enum('reference','result') DEFAULT 'reference' NOT NULL;--> statement-breakpoint
ALTER TABLE `local_users` ADD `telegram_bot_token` varchar(256);--> statement-breakpoint
ALTER TABLE `local_users` ADD `telegram_chat_id` varchar(100);--> statement-breakpoint
ALTER TABLE `local_users` ADD `telegram_notifications_enabled` enum('true','false') DEFAULT 'true';--> statement-breakpoint
ALTER TABLE `local_users` ADD `email` varchar(256);--> statement-breakpoint
ALTER TABLE `local_users` ADD `email_notifications_enabled` enum('true','false') DEFAULT 'false';--> statement-breakpoint
ALTER TABLE `report_requests` ADD `assigned_to` bigint unsigned;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_local_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_log` ADD CONSTRAINT `notification_log_user_id_local_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_log` ADD CONSTRAINT `notification_log_request_id_report_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `report_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satisfaction_ratings` ADD CONSTRAINT `satisfaction_ratings_request_id_report_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `report_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satisfaction_ratings` ADD CONSTRAINT `satisfaction_ratings_user_id_local_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report_requests` ADD CONSTRAINT `report_requests_assigned_to_local_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;