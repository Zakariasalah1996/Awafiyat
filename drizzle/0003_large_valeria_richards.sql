CREATE TABLE `recipe_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipeId` varchar(64) NOT NULL,
	`imageUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recipe_images_id` PRIMARY KEY(`id`),
	CONSTRAINT `recipe_images_recipeId_unique` UNIQUE(`recipeId`)
);
