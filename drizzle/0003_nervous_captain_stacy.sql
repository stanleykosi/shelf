CREATE TABLE "issuer_feed_snapshots" (
	"provider" text PRIMARY KEY NOT NULL,
	"listings" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
