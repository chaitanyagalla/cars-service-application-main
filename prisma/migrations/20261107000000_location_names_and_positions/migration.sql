BEGIN;
LOCK TABLE "Location" IN EXCLUSIVE MODE;

-- Keep the properly capitalized record, preferring the richer record on ties.
-- Preserve every removed original so content can be recovered without a backup restore.
CREATE TABLE "LocationDuplicateArchive" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "keptLocationId" TEXT NOT NULL,
  "original" JSONB NOT NULL,
  "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TEMP TABLE location_name_merge ON COMMIT DROP AS
SELECT "id", first_value("id") OVER (
  PARTITION BY lower(btrim(regexp_replace("name", '\s+', ' ', 'g')))
  ORDER BY
    (btrim("name") ~ '^[A-Z]') DESC,
    (length("subtitle") + length("description")) DESC,
    "sortOrder", "id"
) AS kept_id
FROM "Location";

INSERT INTO "LocationDuplicateArchive" ("id", "keptLocationId", "original")
SELECT area."id", merge.kept_id, to_jsonb(area)
FROM "Location" area JOIN location_name_merge merge ON area."id" = merge."id"
WHERE merge."id" <> merge.kept_id;

DELETE FROM "Location" area USING location_name_merge merge
WHERE area."id" = merge."id" AND merge."id" <> merge.kept_id;

UPDATE "Location" SET "name" = btrim(regexp_replace("name", '\s+', ' ', 'g'));

-- Expression index also protects direct database writes and concurrent requests.
CREATE UNIQUE INDEX "Location_normalized_name_key"
ON "Location" (lower(btrim(regexp_replace("name", '\s+', ' ', 'g'))));

WITH positions AS (
  SELECT "id", (row_number() OVER (ORDER BY "sortOrder", "name", "id") - 1)::integer AS position
  FROM "Location"
)
UPDATE "Location" area SET "sortOrder" = positions.position
FROM positions WHERE area."id" = positions."id";
COMMIT;
