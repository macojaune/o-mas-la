CREATE TABLE `native_auth_grant` (
	`id` text PRIMARY KEY NOT NULL,
	`redirect_uri` text NOT NULL,
	`code_challenge` text NOT NULL,
	`client_state` text NOT NULL,
	`expires` integer NOT NULL,
	`session_token` text
);
