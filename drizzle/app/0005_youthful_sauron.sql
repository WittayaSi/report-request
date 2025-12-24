CREATE TABLE `request_views` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`request_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`viewed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `request_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `request_views_request_id_user_id_unique` UNIQUE(`request_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `request_views` ADD CONSTRAINT `request_views_request_id_report_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `report_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_views` ADD CONSTRAINT `request_views_user_id_local_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;