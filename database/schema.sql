BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Original identifier from the external data source.
    external_id INTEGER NOT NULL,

    headline TEXT,

    body TEXT NOT NULL,

    source VARCHAR(255) NOT NULL,

    published_at TIMESTAMPTZ NOT NULL,

    language VARCHAR(10) NOT NULL,

    -- AI-generated summary of the article.
    summary TEXT,

    sentiment VARCHAR(20),

    -- AI-generated topic tags stored as a JSON array.
    topics JSONB NOT NULL DEFAULT '[]'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT articles_source_external_id_unique
        UNIQUE (source, external_id),

    CONSTRAINT articles_external_id_positive
        CHECK (external_id > 0),

    CONSTRAINT articles_headline_not_whitespace
        CHECK (
            headline IS NULL
            OR headline = ''
            OR LENGTH(BTRIM(headline)) > 0
        ),

    CONSTRAINT articles_body_not_empty
        CHECK (LENGTH(BTRIM(body)) > 0),

    CONSTRAINT articles_source_not_empty
        CHECK (LENGTH(BTRIM(source)) > 0),

    CONSTRAINT articles_language_not_empty
        CHECK (LENGTH(BTRIM(language)) > 0),

    CONSTRAINT articles_language_format
        CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),

    CONSTRAINT articles_sentiment_valid
        CHECK (
            sentiment IS NULL
            OR sentiment IN (
                'positive',
                'negative',
                'neutral',
                'mixed'
            )
        ),

    CONSTRAINT articles_topics_is_array
        CHECK (jsonb_typeof(topics) = 'array'),

    CONSTRAINT articles_topics_contains_only_strings
        CHECK (
            NOT jsonb_path_exists(
                topics,
                '$[*] ? (@.type() != "string")'
            )
        )
);

-- Supports the default article feed and keyset pagination.
CREATE INDEX IF NOT EXISTS idx_articles_published_at_id
    ON articles (published_at DESC, id DESC);

-- Supports filtering by source while preserving cursor pagination.
CREATE INDEX IF NOT EXISTS idx_articles_source_published_at_id
    ON articles (
        source,
        published_at DESC,
        id DESC
    );

-- Supports filtering by language while preserving cursor pagination.
CREATE INDEX IF NOT EXISTS idx_articles_language_published_at_id
    ON articles (
        language,
        published_at DESC,
        id DESC
    );

-- Supports filtering by source and language together.
CREATE INDEX IF NOT EXISTS idx_articles_source_language_published_at_id
    ON articles (
        source,
        language,
        published_at DESC,
        id DESC
    );

-- Supports filtering by sentiment.
CREATE INDEX IF NOT EXISTS idx_articles_sentiment_published_at_id
    ON articles (
        sentiment,
        published_at DESC,
        id DESC
    )
    WHERE sentiment IS NOT NULL;

-- Supports efficient topic membership and containment queries.
CREATE INDEX IF NOT EXISTS idx_articles_topics_gin
    ON articles
    USING GIN (topics jsonb_path_ops);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_articles_set_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;