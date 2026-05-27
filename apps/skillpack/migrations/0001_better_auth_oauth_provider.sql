CREATE TABLE `jwks` (
	`createdAt` integer NOT NULL,
	`expiresAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`privateKey` text NOT NULL,
	`publicKey` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauthAccessToken` (
	`clientId` text NOT NULL,
	`createdAt` integer,
	`expiresAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`referenceId` text,
	`refreshId` text,
	`scopes` text NOT NULL,
	`sessionId` text,
	`token` text,
	`userId` text
);
--> statement-breakpoint
CREATE INDEX `oauthAccessToken_clientId_idx` ON `oauthAccessToken` (`clientId`);--> statement-breakpoint
CREATE INDEX `oauthAccessToken_refreshId_idx` ON `oauthAccessToken` (`refreshId`);--> statement-breakpoint
CREATE INDEX `oauthAccessToken_sessionId_idx` ON `oauthAccessToken` (`sessionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauthAccessToken_token_unique` ON `oauthAccessToken` (`token`);--> statement-breakpoint
CREATE INDEX `oauthAccessToken_userId_idx` ON `oauthAccessToken` (`userId`);--> statement-breakpoint
CREATE TABLE `oauthClient` (
	`clientId` text NOT NULL,
	`clientSecret` text,
	`contacts` text,
	`createdAt` integer,
	`disabled` integer,
	`enableEndSession` integer,
	`grantTypes` text,
	`icon` text,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`name` text,
	`policy` text,
	`postLogoutRedirectUris` text,
	`public` integer,
	`redirectUris` text NOT NULL,
	`referenceId` text,
	`requirePKCE` integer,
	`responseTypes` text,
	`scopes` text,
	`skipConsent` integer,
	`softwareId` text,
	`softwareStatement` text,
	`softwareVersion` text,
	`subjectType` text,
	`tokenEndpointAuthMethod` text,
	`tos` text,
	`type` text,
	`updatedAt` integer,
	`uri` text,
	`userId` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauthClient_clientId_unique` ON `oauthClient` (`clientId`);--> statement-breakpoint
CREATE INDEX `oauthClient_userId_idx` ON `oauthClient` (`userId`);--> statement-breakpoint
CREATE TABLE `oauthConsent` (
	`clientId` text NOT NULL,
	`createdAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`referenceId` text,
	`scopes` text NOT NULL,
	`updatedAt` integer,
	`userId` text
);
--> statement-breakpoint
CREATE INDEX `oauthConsent_clientId_idx` ON `oauthConsent` (`clientId`);--> statement-breakpoint
CREATE INDEX `oauthConsent_userId_idx` ON `oauthConsent` (`userId`);--> statement-breakpoint
CREATE TABLE `oauthRefreshToken` (
	`authTime` integer,
	`clientId` text NOT NULL,
	`createdAt` integer,
	`expiresAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`referenceId` text,
	`revoked` integer,
	`scopes` text NOT NULL,
	`sessionId` text,
	`token` text NOT NULL,
	`userId` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oauthRefreshToken_clientId_idx` ON `oauthRefreshToken` (`clientId`);--> statement-breakpoint
CREATE INDEX `oauthRefreshToken_sessionId_idx` ON `oauthRefreshToken` (`sessionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauthRefreshToken_token_unique` ON `oauthRefreshToken` (`token`);--> statement-breakpoint
CREATE INDEX `oauthRefreshToken_userId_idx` ON `oauthRefreshToken` (`userId`);