ALTER TABLE `report_requests` ADD `output_type` enum('file','hosxp_report','dashboard','other') DEFAULT 'file' NOT NULL;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `file_format` enum('excel','pdf','csv','word');--> statement-breakpoint
ALTER TABLE `report_requests` ADD `date_range_type` enum('specific','fiscal_year','custom') DEFAULT 'specific' NOT NULL;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `start_date` date;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `end_date` date;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `fiscal_year_start` varchar(4);--> statement-breakpoint
ALTER TABLE `report_requests` ADD `fiscal_year_end` varchar(4);--> statement-breakpoint
ALTER TABLE `report_requests` ADD `priority` enum('low','medium','high','urgent') DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `expected_deadline` date;--> statement-breakpoint
ALTER TABLE `report_requests` ADD `data_source` varchar(256);--> statement-breakpoint
ALTER TABLE `report_requests` ADD `additional_notes` text;