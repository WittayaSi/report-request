CREATE TABLE `attachments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`request_id` bigint unsigned NOT NULL,
	`comment_id` bigint unsigned,
	`uploader_id` bigint unsigned NOT NULL,
	`filename` varchar(256) NOT NULL,
	`stored_filename` varchar(256) NOT NULL,
	`file_type` varchar(100) NOT NULL,
	`file_size` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_request_id_report_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `report_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_comment_id_comments_id_fk` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploader_id_local_users_id_fk` FOREIGN KEY (`uploader_id`) REFERENCES `local_users`(`id`) ON DELETE no action ON UPDATE no action;