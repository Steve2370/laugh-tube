CREATE TABLE IF NOT EXISTS users
(
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE  NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT                NOT NULL,
    role          VARCHAR(10) DEFAULT 'membre' CHECK (role IN ('membre', 'admin')),
    avatar_url VARCHAR(255) DEFAULT '/uploads/avatars/default.png',
    cover_url VARCHAR(255) DEFAULT '/uploads/covers/default.png',
    bio           TEXT,
    total_commentaires INTEGER DEFAULT 0,
    created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos
(
    id                 SERIAL PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title              VARCHAR(100) NOT NULL,
    description        TEXT,
    filename           VARCHAR(255) NOT NULL,
    thumbnail          VARCHAR(255),
    duration           INTEGER,
    views              INTEGER       DEFAULT 0,
    unique_views       INTEGER       DEFAULT 0,
    total_watch_time   BIGINT        DEFAULT 0,
    average_watch_time INTEGER       DEFAULT 0,
    completion_rate    DECIMAL(5, 4) DEFAULT 0.0000,
    encoded            BOOLEAN       DEFAULT FALSE,
    visibility         VARCHAR(10)   DEFAULT 'publique' CHECK (visibility IN ('publique', 'privee')),
    status             VARCHAR(20)   DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_views
(
    id               SERIAL PRIMARY KEY,
    video_id         INTEGER NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    user_id          INTEGER REFERENCES users (id) ON DELETE SET NULL,
    session_id       VARCHAR(255),
    ip_address       INET,
    user_agent       TEXT,
    watch_time       INTEGER       DEFAULT 0,
    watch_percentage DECIMAL(5, 4) DEFAULT 0.0000,
    completed        BOOLEAN       DEFAULT FALSE,
    viewed_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_session_video UNIQUE NULLS NOT DISTINCT (video_id, user_id, session_id)
);

CREATE TABLE IF NOT EXISTS subscriptions
(
    id            SERIAL PRIMARY KEY,
    creator_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    subscriber_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_subscription UNIQUE (creator_id, subscriber_id),
    CONSTRAINT check_not_self_subscribe CHECK (creator_id != subscriber_id)
);

CREATE TABLE IF NOT EXISTS likes
(
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    video_id   INTEGER NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS dislikes
(
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    video_id   INTEGER NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS encoding_queue
(
    id         SERIAL PRIMARY KEY,
    video_id   INTEGER NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    status     VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commentaires
(
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    video_id   INTEGER NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comment_replies
(
    id         SERIAL PRIMARY KEY,
    comment_id INTEGER   NOT NULL REFERENCES commentaires (id) ON DELETE CASCADE,
    user_id    INTEGER   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content    TEXT      NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comment_likes
(
    comment_id INTEGER NOT NULL REFERENCES commentaires (id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS tags
(
    id   SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS video_tags
(
    video_id INTEGER NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (video_id, tag_id)
);

CREATE TABLE IF NOT EXISTS abonnements
(
    id               BIGSERIAL PRIMARY KEY,
    subscriber_id    BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    subscribed_to_id BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT subscriptions_unique UNIQUE (subscriber_id, subscribed_to_id),
    CONSTRAINT subscriptions_no_self CHECK (subscriber_id <> subscribed_to_id)
);

CREATE TABLE IF NOT EXISTS reply_likes
(
    id         SERIAL PRIMARY KEY,
    reply_id   INTEGER NOT NULL REFERENCES comment_replies (id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reply_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications
(
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    actor_id        INTEGER REFERENCES users (id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    video_id        INTEGER REFERENCES videos (id) ON DELETE CASCADE,
    comment_id      INTEGER REFERENCES commentaires (id) ON DELETE CASCADE,
    message         TEXT,
    actor_name      VARCHAR(50),
    video_title     VARCHAR(100),
    comment_preview TEXT,
    is_read         BOOLEAN   DEFAULT false,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at         TIMESTAMP,

    CONSTRAINT valid_notification_type CHECK (
        type IN ('like', 'comment', 'subscribe', 'mention', 'reply', 'video_upload')
        )
);

CREATE TABLE IF NOT EXISTS session_anonymes
(
    id            SERIAL PRIMARY KEY,
    session_id    VARCHAR(255) UNIQUE NOT NULL,
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs
(
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      REFERENCES users (id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata   JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views);
CREATE INDEX IF NOT EXISTS idx_videos_unique_views ON videos(unique_views);
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON videos(visibility);
CREATE INDEX IF NOT EXISTS idx_videos_encoded ON videos(encoded);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id    ON comment_replies (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_created_at ON comment_replies (created_at);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id    ON comment_likes (user_id);

CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_session_id ON video_views(session_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewed_at ON video_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_video_views_completed ON video_views(completed);
CREATE INDEX IF NOT EXISTS idx_video_views_ip_address ON video_views(ip_address);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_video_id ON notifications(video_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id ON reply_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_likes_video_id ON likes(video_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

CREATE INDEX IF NOT EXISTS idx_dislikes_video_id ON dislikes(video_id);
CREATE INDEX IF NOT EXISTS idx_dislikes_user_id ON dislikes(user_id);

CREATE INDEX IF NOT EXISTS idx_commentaires_video_id ON commentaires(video_id);
CREATE INDEX IF NOT EXISTS idx_commentaires_user_id ON commentaires(user_id);
CREATE INDEX IF NOT EXISTS idx_commentaires_created_at ON commentaires(created_at);

CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON video_tags(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON video_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_encoding_queue_status ON encoding_queue(status);
CREATE INDEX IF NOT EXISTS idx_encoding_queue_created_at ON encoding_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_session_id ON session_anonymes(session_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_last_activity ON session_anonymes(last_activity);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscribed_to ON abonnements (subscribed_to_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON abonnements (subscriber_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber_new ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_date ON subscriptions(subscribed_at);

CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_encoding_queue_updated_at ON encoding_queue;
CREATE TRIGGER update_encoding_queue_updated_at
    BEFORE UPDATE ON encoding_queue
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_video_statistics()
    RETURNS TRIGGER AS $$
BEGIN
    UPDATE videos
    SET
        views = (SELECT COUNT(*)
                 FROM video_views
                 WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)),

        unique_views = (SELECT (COALESCE((SELECT COUNT(DISTINCT user_id)
                                          FROM video_views
                                          WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)
                                            AND user_id IS NOT NULL), 0)
            +
                                COALESCE((SELECT COUNT(DISTINCT session_id)
                                          FROM video_views
                                          WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)
                                            AND user_id IS NULL
                                            AND session_id IS NOT NULL), 0)
                                   )),

        total_watch_time = (SELECT COALESCE(SUM(watch_time), 0)
                            FROM video_views
                            WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)),

        average_watch_time = (
            SELECT COALESCE(AVG(watch_time), 0)::INTEGER
            FROM video_views
            WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)
              AND watch_time > 0
        ),

        completion_rate = (
            SELECT CASE
                       WHEN COUNT(*) > 0
                           THEN (COUNT(*) FILTER (WHERE completed = true))::DECIMAL / COUNT(*)
                       ELSE 0
                       END
            FROM video_views
            WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)
        ),

        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.video_id, OLD.video_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_video_statistics ON video_views;
CREATE TRIGGER trigger_update_video_statistics
    AFTER INSERT OR UPDATE OR DELETE ON video_views
    FOR EACH ROW
EXECUTE FUNCTION update_video_statistics();

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
    RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND is_read = true;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_self_notification()
    RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id = NEW.actor_id AND NEW.type IN ('like', 'comment', 'subscribe') THEN
        RAISE EXCEPTION 'Un utilisateur ne peut pas se notifier lui-même';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_self_notification ON notifications;
CREATE TRIGGER check_self_notification
    BEFORE INSERT ON notifications
    FOR EACH ROW
EXECUTE FUNCTION prevent_self_notification();

CREATE OR REPLACE FUNCTION cleanup_old_anonymous_sessions()
    RETURNS void AS $$
BEGIN
    DELETE FROM session_anonymes
    WHERE last_activity < NOW() - INTERVAL '30 days';

    DELETE FROM video_views
    WHERE session_id IS NOT NULL
      AND session_id NOT IN (SELECT session_id FROM session_anonymes);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_subscriptions()
    RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'subscriptions' AND TG_OP = 'INSERT' THEN
        INSERT INTO abonnements (subscriber_id, subscribed_to_id, created_at)
        VALUES (NEW.subscriber_id, NEW.creator_id, NEW.subscribed_at)
        ON CONFLICT (subscriber_id, subscribed_to_id) DO NOTHING;
    ELSIF TG_TABLE_NAME = 'abonnements' AND TG_OP = 'INSERT' THEN
        INSERT INTO subscriptions (creator_id, subscriber_id, subscribed_at)
        VALUES (NEW.subscribed_to_id, NEW.subscriber_id, NEW.created_at)
        ON CONFLICT (creator_id, subscriber_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_to_abonnements ON subscriptions;
CREATE TRIGGER sync_to_abonnements
    AFTER INSERT ON subscriptions
    FOR EACH ROW
EXECUTE FUNCTION sync_subscriptions();

DROP TRIGGER IF EXISTS sync_to_subscriptions ON abonnements;
CREATE TRIGGER sync_to_subscriptions
    AFTER INSERT ON abonnements
    FOR EACH ROW
EXECUTE FUNCTION sync_subscriptions();

CREATE OR REPLACE VIEW video_analytics AS
SELECT
    v.id,
    v.title,
    v.user_id,
    v.views,
    v.unique_views,
    v.total_watch_time,
    v.average_watch_time,
    v.completion_rate,
    v.duration,
    CASE
        WHEN v.duration > 0 THEN (v.average_watch_time::DECIMAL / (v.duration * 1000)) * 100
        ELSE 0
        END AS retention_percentage,
    v.created_at,
    COUNT(DISTINCT l.user_id) AS likes_count,
    COUNT(DISTINCT d.user_id) AS dislikes_count,
    COUNT(DISTINCT c.id) AS comments_count,
    u.username AS creator_name
FROM videos v
         LEFT JOIN likes l ON v.id = l.video_id
         LEFT JOIN dislikes d ON v.id = d.video_id
         LEFT JOIN commentaires c ON v.id = c.video_id
         LEFT JOIN users u ON v.user_id = u.id
GROUP BY
    v.id, v.title, v.user_id, v.views, v.unique_views, v.total_watch_time,
    v.average_watch_time, v.completion_rate, v.duration, v.created_at, u.username;

CREATE OR REPLACE FUNCTION get_trending_videos(
    days_period INTEGER DEFAULT 7,
    video_limit INTEGER DEFAULT 10
)
    RETURNS TABLE
            (
                video_id              INTEGER,
                title                 VARCHAR(100),
                thumbnail             VARCHAR(255),
                duration              INTEGER,
                total_views           INTEGER,
                recent_views          BIGINT,
                unique_recent_viewers BIGINT,
                creator_name          VARCHAR(50),
                trend_score           DECIMAL
            ) AS $$
BEGIN
    RETURN QUERY
        SELECT
            v.id,
            v.title,
            v.thumbnail,
            v.duration,
            v.views,
            COUNT(vw.id) AS recent_views,
            COUNT(DISTINCT COALESCE(vw.user_id, vw.session_id)) AS unique_recent_viewers,
            u.username,
            (COUNT(vw.id) * 0.7 + COUNT(DISTINCT COALESCE(vw.user_id, vw.session_id)) * 0.3)::DECIMAL AS trend_score
        FROM videos v
                 LEFT JOIN video_views vw
                           ON v.id = vw.video_id
                               AND vw.viewed_at >= NOW() - (days_period || ' days')::INTERVAL
                 LEFT JOIN users u ON v.user_id = u.id
        WHERE v.visibility = 'publique'
          AND v.encoded = true
          AND v.status = 'published'
        GROUP BY v.id, v.title, v.thumbnail, v.duration, v.views, u.username
        ORDER BY trend_score DESC, recent_views DESC
        LIMIT video_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE subscriptions IS 'Table des abonnements entre utilisateurs (nouvelle version)';
COMMENT ON COLUMN subscriptions.creator_id IS 'ID du créateur (celui à qui on s''abonne)';
COMMENT ON COLUMN subscriptions.subscriber_id IS 'ID de l''abonné (celui qui s''abonne)';

ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS encoded_filename VARCHAR(255);
ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS encoded BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN videos.filename IS 'Nom du fichier ORIGINAL uploadé';
COMMENT ON COLUMN videos.encoded_filename IS 'Nom du fichier ENCODÉ (après traitement FFmpeg)';
ALTER TABLE encoding_queue
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE encoding_queue
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

ALTER TABLE encoding_queue
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE encoding_queue
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_encoding_queue_priority
    ON encoding_queue(priority DESC, created_at ASC)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_encoding_queue_status
    ON encoding_queue(status);

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'videos'
ORDER BY ordinal_position;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'encoding_queue'
ORDER BY ordinal_position;

COMMENT ON TABLE notifications IS 'Table des notifications utilisateur';
COMMENT ON COLUMN notifications.type IS 'Type de notification: like, comment, subscribe, mention, reply, video_upload';
COMMENT ON COLUMN notifications.user_id IS 'Utilisateur qui reçoit la notification';
COMMENT ON COLUMN notifications.actor_id IS 'Utilisateur qui a effectué l''action (peut être NULL pour certains types)';
COMMENT ON COLUMN notifications.actor_name IS 'Nom de l''acteur (dénormalisé pour performance)';
COMMENT ON COLUMN notifications.video_title IS 'Titre de la vidéo (dénormalisé pour performance)';
COMMENT ON COLUMN notifications.comment_preview IS 'Aperçu du commentaire (dénormalisé pour performance)';
COMMENT ON COLUMN notifications.video_id IS 'Vidéo concernée (si applicable)';
COMMENT ON COLUMN notifications.comment_id IS 'Commentaire concerné (si applicable)';
COMMENT ON COLUMN notifications.is_read IS 'Indique si la notification a été lue';
COMMENT ON COLUMN notifications.read_at IS 'Date de lecture de la notification';

COMMENT ON TABLE video_views IS 'Table des vues de vidéos (user_id OU session_id requis)';
COMMENT ON CONSTRAINT unique_user_session_video ON video_views IS 'Un user/session peut voir une vidéo plusieurs fois mais pas simultanément';

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64),
    ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP,
    ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(32),
    ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ip_registration VARCHAR(45),
    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64),
    ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64),
    ADD COLUMN IF NOT EXISTS user_agent_registration TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

CREATE TABLE IF NOT EXISTS sessions
(
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token         VARCHAR(128) UNIQUE NOT NULL,
    ip_address    VARCHAR(45)         NOT NULL,
    user_agent    TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at    TIMESTAMP           NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active     BOOLEAN   DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS security_logs
(
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER     REFERENCES users (id) ON DELETE SET NULL,
    event_type      VARCHAR(50) NOT NULL,
    description     TEXT,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    additional_data JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens
(
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token      VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP          NOT NULL,
    used       BOOLEAN   DEFAULT FALSE,
    ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS two_fa_backup_codes
(
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code       VARCHAR(10) NOT NULL,
    used       BOOLEAN   DEFAULT FALSE,
    used_at    TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_two_fa_backup_user_id ON two_fa_backup_codes(user_id);

CREATE TABLE IF NOT EXISTS email_logs
(
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      REFERENCES users (id) ON DELETE SET NULL,
    email_type VARCHAR(50)  NOT NULL,
    recipient  VARCHAR(255) NOT NULL,
    subject    VARCHAR(255) NOT NULL,
    body       TEXT,
    status     VARCHAR(20) DEFAULT 'pending',
    error      TEXT,
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    sent_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

CREATE TABLE IF NOT EXISTS account_deletion_requests
(
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason       TEXT,
    ip_address   VARCHAR(45),
    requested_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP,
    status       VARCHAR(20) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON account_deletion_requests(status);

CREATE TABLE IF NOT EXISTS login_attempts
(
    id           SERIAL PRIMARY KEY,
    email        VARCHAR(255),
    ip_address   VARCHAR(45) NOT NULL,
    success      BOOLEAN     NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
    RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions
    WHERE expires_at < CURRENT_TIMESTAMP
       OR last_activity < CURRENT_TIMESTAMP - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
    RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_tokens
    WHERE expires_at < CURRENT_TIMESTAMP
       OR (used = TRUE AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
    RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM login_attempts
    WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
