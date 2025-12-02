CREATE TABLE "server_whitelists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"parent_id" uuid,
	"uuid" uuid NOT NULL,
	"discord_id" text,
	"banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "server_whitelists_email_unique" UNIQUE("email"),
	CONSTRAINT "server_whitelists_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "server_whitelists_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
ALTER TABLE "server_whitelists" ADD CONSTRAINT "server_whitelists_parent_id_server_whitelists_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."server_whitelists"("id") ON DELETE no action ON UPDATE no action;