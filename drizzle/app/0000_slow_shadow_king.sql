CREATE TABLE `comments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`request_id` bigint unsigned NOT NULL,
	`author_id` bigint unsigned NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `local_users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`external_username` varchar(100) NOT NULL,
	`name` varchar(256),
	`department` varchar(256),
	`role` enum('ADMIN','USER') NOT NULL DEFAULT 'USER',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `local_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_users_external_username_unique` UNIQUE(`external_username`)
);
--> statement-breakpoint
CREATE TABLE `report_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`requested_by` bigint unsigned NOT NULL,
	`status` enum('pending','in_progress','completed','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_request_id_report_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `report_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_local_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report_requests` ADD CONSTRAINT `report_requests_requested_by_local_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_created_by_local_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;