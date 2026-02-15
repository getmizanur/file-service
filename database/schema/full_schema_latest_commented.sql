--
-- PostgreSQL database dump
--

\restrict dU4rgneJGgmPAedNahkSQYgd4vJg5nckEfqm5Y10tJTr48pkDJorukW1qwfNI0v

-- Dumped from database version 18.0 (Debian 18.0-1.pgdg13+3)
-- Dumped by pg_dump version 18.0 (Debian 18.0-1.pgdg13+3)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: asset_event_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.asset_event_type AS ENUM (
    'UPLOAD_INITIATED',
    'UPLOADED',
    'UPLOAD_COMPLETED',
    'ACCESS_GRANTED',
    'DOWNLOADED',
    'VIEWED',
    'DELETED',
    'RESTORED',
    'GDPR_FLAGGED',
    'RETENTION_EXPIRED',
    'METADATA_UPDATED',
    'DERIVATIVE_CREATED',
    'RENAMED',
    'MOVED',
    'PERMISSION_UPDATED',
    'CREATED'
);


ALTER TYPE public.asset_event_type OWNER TO postgres;

--
-- Name: delivery_strategy; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.delivery_strategy AS ENUM (
    'cloudfront_signed_url',
    'cloudfront_signed_cookie',
    'azure_cdn_token',
    'gcp_cdn_signed_url',
    'app_stream',
    'nginx_signed_url',
    'direct'
);


ALTER TYPE public.delivery_strategy OWNER TO postgres;

--
-- Name: file_permission_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.file_permission_role AS ENUM (
    'owner',
    'editor',
    'commenter',
    'viewer'
);


ALTER TYPE public.file_permission_role OWNER TO postgres;

--
-- Name: gdpr_flag; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gdpr_flag AS ENUM (
    'false',
    'true',
    'delete',
    'protect'
);


ALTER TYPE public.gdpr_flag OWNER TO postgres;

--
-- Name: general_access; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.general_access AS ENUM (
    'restricted',
    'anyone_with_link'
);


ALTER TYPE public.general_access OWNER TO postgres;

--
-- Name: integration_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.integration_status AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE public.integration_status OWNER TO postgres;

--
-- Name: record_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.record_status AS ENUM (
    'upload',
    'deleted'
);


ALTER TYPE public.record_status OWNER TO postgres;

--
-- Name: record_sub_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.record_sub_status AS ENUM (
    'upload',
    'pending',
    'completed',
    'deleted',
    'gdpr',
    'retention',
    'customer'
);


ALTER TYPE public.record_sub_status OWNER TO postgres;

--
-- Name: storage_provider; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.storage_provider AS ENUM (
    'aws_s3',
    'azure_blob',
    'gcp_gcs',
    'minio_s3',
    'filesystem',
    'sftp',
    'local_fs'
);


ALTER TYPE public.storage_provider OWNER TO postgres;

--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled'
);


ALTER TYPE public.subscription_status OWNER TO postgres;

--
-- Name: tenant_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tenant_role AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer'
);


ALTER TYPE public.tenant_role OWNER TO postgres;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'invited',
    'disabled'
);


ALTER TYPE public.user_status OWNER TO postgres;

--
-- Name: visibility_default; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.visibility_default AS ENUM (
    'private',
    'public'
);


ALTER TYPE public.visibility_default OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_key; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_key (
    api_key_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid,
    name text NOT NULL,
    key_hash text NOT NULL,
    last_used_dt timestamp with time zone,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    revoked_dt timestamp with time zone
);


ALTER TABLE public.api_key OWNER TO postgres;

--
-- Name: app_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_user (
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    display_name text,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_user OWNER TO postgres;

--
-- Name: asset_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_tag (
    file_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.asset_tag OWNER TO postgres;

--
-- Name: collection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collection (
    collection_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_by uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    updated_dt timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid
);


ALTER TABLE public.collection OWNER TO postgres;

--
-- Name: collection_asset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collection_asset (
    collection_id uuid NOT NULL,
    file_id uuid NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.collection_asset OWNER TO postgres;

--
-- Name: email_verification_token; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_verification_token (
    token_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_dt timestamp with time zone NOT NULL,
    used_dt timestamp with time zone,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_verification_token OWNER TO postgres;

--
-- Name: file_derivative; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_derivative (
    derivative_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    kind text NOT NULL,
    spec jsonb DEFAULT '{}'::jsonb NOT NULL,
    storage_backend_id uuid NOT NULL,
    object_key text NOT NULL,
    storage_uri text,
    size_bytes bigint,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.file_derivative OWNER TO postgres;

--
-- Name: file_event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_event (
    event_id bigint NOT NULL,
    file_id uuid NOT NULL,
    event_type public.asset_event_type NOT NULL,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    actor_user_id uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.file_event OWNER TO postgres;

--
-- Name: file_event_event_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.file_event_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.file_event_event_id_seq OWNER TO postgres;

--
-- Name: file_event_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.file_event_event_id_seq OWNED BY public.file_event.event_id;


--
-- Name: file_metadata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_metadata (
    file_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid,
    storage_backend_id uuid NOT NULL,
    title text,
    description text,
    application_ref_id text,
    document_type text NOT NULL,
    document_type_id text,
    object_key text NOT NULL,
    storage_uri text,
    original_filename text NOT NULL,
    content_type text,
    size_bytes bigint,
    checksum_sha256 text,
    retention_days integer,
    expires_at timestamp with time zone,
    gdpr_flag public.gdpr_flag DEFAULT 'false'::public.gdpr_flag NOT NULL,
    record_status public.record_status DEFAULT 'upload'::public.record_status NOT NULL,
    record_sub_status public.record_sub_status DEFAULT 'pending'::public.record_sub_status NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    visibility public.visibility_default DEFAULT 'private'::public.visibility_default NOT NULL,
    general_access public.general_access DEFAULT 'restricted'::public.general_access NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    created_by uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    updated_dt timestamp with time zone DEFAULT now() NOT NULL,
    folder_id uuid,
    CONSTRAINT ck_file_size_nonneg CHECK (((size_bytes IS NULL) OR (size_bytes >= 0)))
);


ALTER TABLE public.file_metadata OWNER TO postgres;

--
-- Name: file_permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_permission (
    permission_id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    file_id uuid NOT NULL,
    user_id uuid,
    group_id uuid,
    role public.file_permission_role DEFAULT 'viewer'::public.file_permission_role NOT NULL,
    created_by uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_file_perm_subject CHECK ((((user_id IS NOT NULL) AND (group_id IS NULL)) OR ((user_id IS NULL) AND (group_id IS NOT NULL))))
);


ALTER TABLE public.file_permission OWNER TO postgres;

--
-- Name: file_permission_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.file_permission_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.file_permission_permission_id_seq OWNER TO postgres;

--
-- Name: file_permission_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.file_permission_permission_id_seq OWNED BY public.file_permission.permission_id;


--
-- Name: file_star; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_star (
    tenant_id uuid NOT NULL,
    file_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.file_star OWNER TO postgres;

--
-- Name: folder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folder (
    folder_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    parent_folder_id uuid,
    name text NOT NULL,
    created_by uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid
);


ALTER TABLE public.folder OWNER TO postgres;

--
-- Name: folder_event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folder_event (
    event_id bigint NOT NULL,
    folder_id uuid NOT NULL,
    event_type public.asset_event_type NOT NULL,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    actor_user_id uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.folder_event OWNER TO postgres;

--
-- Name: folder_event_event_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folder_event_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.folder_event_event_id_seq OWNER TO postgres;

--
-- Name: folder_event_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folder_event_event_id_seq OWNED BY public.folder_event.event_id;


--
-- Name: folder_permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folder_permission (
    permission_id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    folder_id uuid NOT NULL,
    user_id uuid,
    group_id uuid,
    role public.file_permission_role NOT NULL,
    inherit_to_children boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT folder_permission_check CHECK (((user_id IS NOT NULL) OR (group_id IS NOT NULL)))
);


ALTER TABLE public.folder_permission OWNER TO postgres;

--
-- Name: folder_permission_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folder_permission_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.folder_permission_permission_id_seq OWNER TO postgres;

--
-- Name: folder_permission_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folder_permission_permission_id_seq OWNED BY public.folder_permission.permission_id;


--
-- Name: folder_share_link; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folder_share_link (
    share_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    folder_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_dt timestamp with time zone,
    password_hash text,
    created_by uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    revoked_dt timestamp with time zone
);


ALTER TABLE public.folder_share_link OWNER TO postgres;

--
-- Name: integration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration (
    integration_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status public.integration_status DEFAULT 'active'::public.integration_status NOT NULL,
    webhook_url text,
    webhook_secret_hash text,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    updated_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.integration OWNER TO postgres;

--
-- Name: integration_policy_override; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration_policy_override (
    integration_id uuid NOT NULL,
    storage_backend_id uuid,
    key_template text,
    presigned_url_ttl_seconds integer,
    retention_days integer,
    av_required boolean,
    allowed_mime_types text[],
    default_visibility public.visibility_default,
    max_upload_size_bytes bigint,
    updated_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.integration_policy_override OWNER TO postgres;

--
-- Name: password_reset_token; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_token (
    token_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_dt timestamp with time zone NOT NULL,
    used_dt timestamp with time zone,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_token OWNER TO postgres;

--
-- Name: plan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plan (
    plan_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    monthly_price_pence integer DEFAULT 0 NOT NULL,
    max_upload_size_bytes bigint NOT NULL,
    max_assets_count integer,
    max_collections_count integer,
    included_storage_bytes bigint DEFAULT 0 NOT NULL,
    included_egress_bytes bigint DEFAULT 0 NOT NULL,
    can_share_links boolean DEFAULT true NOT NULL,
    can_derivatives boolean DEFAULT true NOT NULL,
    can_video_transcode boolean DEFAULT false NOT NULL,
    can_ai_indexing boolean DEFAULT false NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_plan_max_upload_positive CHECK ((max_upload_size_bytes > 0))
);


ALTER TABLE public.plan OWNER TO postgres;

--
-- Name: share_link; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.share_link (
    share_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    file_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_dt timestamp with time zone,
    password_hash text,
    created_by uuid,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    revoked_dt timestamp with time zone
);


ALTER TABLE public.share_link OWNER TO postgres;

--
-- Name: storage_backend; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_backend (
    storage_backend_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    provider public.storage_provider NOT NULL,
    delivery public.delivery_strategy NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    updated_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storage_backend OWNER TO postgres;

--
-- Name: subscription; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription (
    subscription_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status public.subscription_status NOT NULL,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    external_ref text,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscription OWNER TO postgres;

--
-- Name: tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tag (
    tag_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tag OWNER TO postgres;

--
-- Name: tenant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant (
    tenant_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tenant OWNER TO postgres;

--
-- Name: tenant_member; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_member (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.tenant_role DEFAULT 'member'::public.tenant_role NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT tenant_member_status_check CHECK ((status = ANY (ARRAY['active'::text, 'invited'::text, 'pending'::text, 'suspended'::text, 'removed'::text])))
);


ALTER TABLE public.tenant_member OWNER TO postgres;

--
-- Name: tenant_policy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_policy (
    tenant_id uuid NOT NULL,
    storage_backend_id uuid NOT NULL,
    key_template text NOT NULL,
    presigned_url_ttl_seconds integer DEFAULT 900 NOT NULL,
    default_retention_days integer,
    av_required boolean DEFAULT true NOT NULL,
    allowed_mime_types text[] DEFAULT '{}'::text[] NOT NULL,
    default_visibility public.visibility_default DEFAULT 'private'::public.visibility_default NOT NULL,
    webhook_url text,
    webhook_secret_hash text,
    updated_dt timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_tenant_policy_ttl_positive CHECK ((presigned_url_ttl_seconds > 0))
);


ALTER TABLE public.tenant_policy OWNER TO postgres;

--
-- Name: usage_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_daily (
    usage_id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    day date NOT NULL,
    storage_bytes bigint DEFAULT 0 NOT NULL,
    egress_bytes bigint DEFAULT 0 NOT NULL,
    uploads_count integer DEFAULT 0 NOT NULL,
    downloads_count integer DEFAULT 0 NOT NULL,
    transforms_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.usage_daily OWNER TO postgres;

--
-- Name: usage_daily_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usage_daily_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usage_daily_usage_id_seq OWNER TO postgres;

--
-- Name: usage_daily_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usage_daily_usage_id_seq OWNED BY public.usage_daily.usage_id;


--
-- Name: user_auth_password; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_auth_password (
    user_id uuid NOT NULL,
    password_hash text NOT NULL,
    password_algo text DEFAULT 'argon2id'::text NOT NULL,
    password_updated_dt timestamp with time zone DEFAULT now() NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    last_login_dt timestamp with time zone,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_auth_password OWNER TO postgres;

--
-- Name: user_group; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_group (
    group_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_group OWNER TO postgres;

--
-- Name: user_group_member; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_group_member (
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_dt timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_group_member OWNER TO postgres;

--
-- Name: file_event event_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_event ALTER COLUMN event_id SET DEFAULT nextval('public.file_event_event_id_seq'::regclass);


--
-- Name: file_permission permission_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_permission ALTER COLUMN permission_id SET DEFAULT nextval('public.file_permission_permission_id_seq'::regclass);


--
-- Name: folder_event event_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_event ALTER COLUMN event_id SET DEFAULT nextval('public.folder_event_event_id_seq'::regclass);


--
-- Name: folder_permission permission_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_permission ALTER COLUMN permission_id SET DEFAULT nextval('public.folder_permission_permission_id_seq'::regclass);


--
-- Name: usage_daily usage_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_daily ALTER COLUMN usage_id SET DEFAULT nextval('public.usage_daily_usage_id_seq'::regclass);


--
-- Name: api_key api_key_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_pkey PRIMARY KEY (api_key_id);


--
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (user_id);


--
-- Name: asset_tag asset_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_tag
    ADD CONSTRAINT asset_tag_pkey PRIMARY KEY (file_id, tag_id);


--
-- Name: collection_asset collection_asset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection_asset
    ADD CONSTRAINT collection_asset_pkey PRIMARY KEY (collection_id, file_id);


--
-- Name: collection collection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection
    ADD CONSTRAINT collection_pkey PRIMARY KEY (collection_id);


--
-- Name: email_verification_token email_verification_token_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_token
    ADD CONSTRAINT email_verification_token_pkey PRIMARY KEY (token_id);


--
-- Name: email_verification_token email_verification_token_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_token
    ADD CONSTRAINT email_verification_token_token_hash_key UNIQUE (token_hash);


--
-- Name: file_derivative file_derivative_file_id_kind_spec_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_derivative
    ADD CONSTRAINT file_derivative_file_id_kind_spec_key UNIQUE (file_id, kind, spec);


--
-- Name: file_derivative file_derivative_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_derivative
    ADD CONSTRAINT file_derivative_pkey PRIMARY KEY (derivative_id);


--
-- Name: file_event file_event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_event
    ADD CONSTRAINT file_event_pkey PRIMARY KEY (event_id);


--
-- Name: file_metadata file_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_pkey PRIMARY KEY (file_id);


--
-- Name: file_metadata file_metadata_tenant_id_storage_backend_id_object_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_tenant_id_storage_backend_id_object_key_key UNIQUE (tenant_id, storage_backend_id, object_key);


--
-- Name: file_permission file_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_permission
    ADD CONSTRAINT file_permission_pkey PRIMARY KEY (permission_id);


--
-- Name: file_star file_star_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_star
    ADD CONSTRAINT file_star_pkey PRIMARY KEY (tenant_id, file_id, user_id);


--
-- Name: folder_event folder_event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_event
    ADD CONSTRAINT folder_event_pkey PRIMARY KEY (event_id);


--
-- Name: folder_permission folder_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_permission
    ADD CONSTRAINT folder_permission_pkey PRIMARY KEY (permission_id);


--
-- Name: folder folder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder
    ADD CONSTRAINT folder_pkey PRIMARY KEY (folder_id);


--
-- Name: folder_share_link folder_share_link_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_share_link
    ADD CONSTRAINT folder_share_link_pkey PRIMARY KEY (share_id);


--
-- Name: folder_share_link folder_share_link_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_share_link
    ADD CONSTRAINT folder_share_link_token_hash_key UNIQUE (token_hash);


--
-- Name: integration integration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration
    ADD CONSTRAINT integration_pkey PRIMARY KEY (integration_id);


--
-- Name: integration_policy_override integration_policy_override_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_policy_override
    ADD CONSTRAINT integration_policy_override_pkey PRIMARY KEY (integration_id);


--
-- Name: integration integration_tenant_id_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration
    ADD CONSTRAINT integration_tenant_id_code_key UNIQUE (tenant_id, code);


--
-- Name: password_reset_token password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (token_id);


--
-- Name: password_reset_token password_reset_token_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_token_hash_key UNIQUE (token_hash);


--
-- Name: plan plan_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan
    ADD CONSTRAINT plan_code_key UNIQUE (code);


--
-- Name: plan plan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan
    ADD CONSTRAINT plan_pkey PRIMARY KEY (plan_id);


--
-- Name: share_link share_link_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_link
    ADD CONSTRAINT share_link_pkey PRIMARY KEY (share_id);


--
-- Name: share_link share_link_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_link
    ADD CONSTRAINT share_link_token_hash_key UNIQUE (token_hash);


--
-- Name: storage_backend storage_backend_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_backend
    ADD CONSTRAINT storage_backend_name_key UNIQUE (name);


--
-- Name: storage_backend storage_backend_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_backend
    ADD CONSTRAINT storage_backend_pkey PRIMARY KEY (storage_backend_id);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (subscription_id);


--
-- Name: subscription subscription_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_tenant_id_key UNIQUE (tenant_id);


--
-- Name: tag tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_pkey PRIMARY KEY (tag_id);


--
-- Name: tenant_member tenant_member_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_member
    ADD CONSTRAINT tenant_member_pkey PRIMARY KEY (tenant_id, user_id);


--
-- Name: tenant tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenant_policy tenant_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_policy
    ADD CONSTRAINT tenant_policy_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenant tenant_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_slug_key UNIQUE (slug);


--
-- Name: file_metadata uq_file_metadata_tenant_file; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT uq_file_metadata_tenant_file UNIQUE (tenant_id, file_id);


--
-- Name: usage_daily usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_daily
    ADD CONSTRAINT usage_daily_pkey PRIMARY KEY (usage_id);


--
-- Name: usage_daily usage_daily_tenant_id_day_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_daily
    ADD CONSTRAINT usage_daily_tenant_id_day_key UNIQUE (tenant_id, day);


--
-- Name: user_auth_password user_auth_password_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_auth_password
    ADD CONSTRAINT user_auth_password_pkey PRIMARY KEY (user_id);


--
-- Name: user_group_member user_group_member_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_member
    ADD CONSTRAINT user_group_member_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: user_group user_group_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group
    ADD CONSTRAINT user_group_pkey PRIMARY KEY (group_id);


--
-- Name: idx_api_key_integration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_key_integration ON public.api_key USING btree (integration_id);


--
-- Name: idx_api_key_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_key_tenant ON public.api_key USING btree (tenant_id);


--
-- Name: idx_asset_tag_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_tag_tag ON public.asset_tag USING btree (tag_id);


--
-- Name: idx_collection_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_collection_tenant ON public.collection USING btree (tenant_id);


--
-- Name: idx_derivative_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_derivative_file ON public.file_derivative USING btree (file_id);


--
-- Name: idx_file_event_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_event_actor ON public.file_event USING btree (actor_user_id, created_dt DESC);


--
-- Name: idx_file_event_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_event_file ON public.file_event USING btree (file_id, created_dt DESC);


--
-- Name: idx_file_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_expires_at ON public.file_metadata USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_file_folder_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_folder_lookup ON public.file_metadata USING btree (tenant_id, folder_id, deleted_at, updated_dt DESC);


--
-- Name: idx_file_perm_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_perm_file ON public.file_permission USING btree (file_id);


--
-- Name: idx_file_perm_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_perm_group ON public.file_permission USING btree (group_id);


--
-- Name: idx_file_perm_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_perm_user ON public.file_permission USING btree (user_id);


--
-- Name: idx_file_star_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_star_user ON public.file_star USING btree (tenant_id, user_id, created_dt DESC);


--
-- Name: idx_file_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_status ON public.file_metadata USING btree (record_status, record_sub_status);


--
-- Name: idx_file_tenant_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_tenant_created ON public.file_metadata USING btree (tenant_id, created_dt DESC);


--
-- Name: idx_file_tenant_doc_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_tenant_doc_type ON public.file_metadata USING btree (tenant_id, document_type, created_dt DESC);


--
-- Name: idx_file_tenant_integration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_tenant_integration ON public.file_metadata USING btree (tenant_id, integration_id, created_dt DESC);


--
-- Name: idx_folder_permission_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_folder_permission_lookup ON public.folder_permission USING btree (tenant_id, folder_id);


--
-- Name: idx_folder_permission_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_folder_permission_user ON public.folder_permission USING btree (tenant_id, user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_group_member_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_member_user ON public.user_group_member USING btree (user_id);


--
-- Name: idx_integration_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_tenant ON public.integration USING btree (tenant_id);


--
-- Name: idx_pwd_reset_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pwd_reset_user ON public.password_reset_token USING btree (user_id, created_dt DESC);


--
-- Name: idx_share_link_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_share_link_tenant ON public.share_link USING btree (tenant_id);


--
-- Name: idx_tenant_member_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenant_member_active ON public.tenant_member USING btree (tenant_id, user_id) WHERE (status = 'active'::text);


--
-- Name: idx_usage_tenant_day; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_tenant_day ON public.usage_daily USING btree (tenant_id, day DESC);


--
-- Name: idx_user_auth_locked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_auth_locked ON public.user_auth_password USING btree (locked_until);


--
-- Name: uq_collection_active_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_collection_active_name ON public.collection USING btree (tenant_id, lower(name)) WHERE (deleted_at IS NULL);


--
-- Name: uq_file_perm_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_file_perm_group ON public.file_permission USING btree (file_id, group_id) WHERE (group_id IS NOT NULL);


--
-- Name: uq_file_perm_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_file_perm_user ON public.file_permission USING btree (file_id, user_id) WHERE (user_id IS NOT NULL);


--
-- Name: uq_tag_tenant_lower_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_tag_tenant_lower_name ON public.tag USING btree (tenant_id, lower(name));


--
-- Name: uq_user_group_tenant_lower_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_user_group_tenant_lower_name ON public.user_group USING btree (tenant_id, lower(name));


--
-- Name: ux_folder_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_folder_unique_active ON public.folder USING btree (tenant_id, parent_folder_id, lower(name)) WHERE (deleted_at IS NULL);


--
-- Name: api_key api_key_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integration(integration_id) ON DELETE SET NULL;


--
-- Name: api_key api_key_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: asset_tag asset_tag_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_tag
    ADD CONSTRAINT asset_tag_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.file_metadata(file_id) ON DELETE CASCADE;


--
-- Name: asset_tag asset_tag_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_tag
    ADD CONSTRAINT asset_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tag(tag_id) ON DELETE CASCADE;


--
-- Name: collection_asset collection_asset_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection_asset
    ADD CONSTRAINT collection_asset_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collection(collection_id) ON DELETE CASCADE;


--
-- Name: collection_asset collection_asset_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection_asset
    ADD CONSTRAINT collection_asset_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.file_metadata(file_id) ON DELETE CASCADE;


--
-- Name: collection collection_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection
    ADD CONSTRAINT collection_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: collection collection_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection
    ADD CONSTRAINT collection_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: collection collection_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection
    ADD CONSTRAINT collection_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: email_verification_token email_verification_token_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_token
    ADD CONSTRAINT email_verification_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;


--
-- Name: file_derivative file_derivative_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_derivative
    ADD CONSTRAINT file_derivative_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.file_metadata(file_id) ON DELETE CASCADE;


--
-- Name: file_derivative file_derivative_storage_backend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_derivative
    ADD CONSTRAINT file_derivative_storage_backend_id_fkey FOREIGN KEY (storage_backend_id) REFERENCES public.storage_backend(storage_backend_id);


--
-- Name: file_event file_event_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_event
    ADD CONSTRAINT file_event_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: file_event file_event_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_event
    ADD CONSTRAINT file_event_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.file_metadata(file_id) ON DELETE CASCADE;


--
-- Name: file_metadata file_metadata_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: file_metadata file_metadata_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: file_metadata file_metadata_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folder(folder_id) ON DELETE SET NULL;


--
-- Name: file_metadata file_metadata_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integration(integration_id) ON DELETE SET NULL;


--
-- Name: file_metadata file_metadata_storage_backend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_storage_backend_id_fkey FOREIGN KEY (storage_backend_id) REFERENCES public.storage_backend(storage_backend_id);


--
-- Name: file_metadata file_metadata_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: file_metadata file_metadata_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: file_permission file_permission_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_permission
    ADD CONSTRAINT file_permission_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: file_permission file_permission_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_permission
    ADD CONSTRAINT file_permission_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.file_metadata(file_id) ON DELETE CASCADE;


--
-- Name: file_permission file_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_permission
    ADD CONSTRAINT file_permission_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.user_group(group_id) ON DELETE CASCADE;


--
-- Name: file_permission file_permission_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_permission
    ADD CONSTRAINT file_permission_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: file_permission file_permission_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_permission
    ADD CONSTRAINT file_permission_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;


--
-- Name: file_star file_star_tenant_id_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_star
    ADD CONSTRAINT file_star_tenant_id_file_id_fkey FOREIGN KEY (tenant_id, file_id) REFERENCES public.file_metadata(tenant_id, file_id) ON DELETE CASCADE;


--
-- Name: file_star file_star_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_star
    ADD CONSTRAINT file_star_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;


--
-- Name: folder folder_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder
    ADD CONSTRAINT folder_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: folder folder_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder
    ADD CONSTRAINT folder_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: folder_event folder_event_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_event
    ADD CONSTRAINT folder_event_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.app_user(user_id);


--
-- Name: folder_event folder_event_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_event
    ADD CONSTRAINT folder_event_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folder(folder_id) ON DELETE CASCADE;


--
-- Name: folder folder_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder
    ADD CONSTRAINT folder_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.folder(folder_id) ON DELETE CASCADE;


--
-- Name: folder_permission folder_permission_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_permission
    ADD CONSTRAINT folder_permission_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: folder_permission folder_permission_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_permission
    ADD CONSTRAINT folder_permission_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folder(folder_id) ON DELETE CASCADE;


--
-- Name: folder_permission folder_permission_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_permission
    ADD CONSTRAINT folder_permission_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id);


--
-- Name: folder_share_link folder_share_link_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_share_link
    ADD CONSTRAINT folder_share_link_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(user_id);


--
-- Name: folder_share_link folder_share_link_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_share_link
    ADD CONSTRAINT folder_share_link_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folder(folder_id) ON DELETE CASCADE;


--
-- Name: folder folder_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder
    ADD CONSTRAINT folder_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: integration_policy_override integration_policy_override_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_policy_override
    ADD CONSTRAINT integration_policy_override_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integration(integration_id) ON DELETE CASCADE;


--
-- Name: integration_policy_override integration_policy_override_storage_backend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_policy_override
    ADD CONSTRAINT integration_policy_override_storage_backend_id_fkey FOREIGN KEY (storage_backend_id) REFERENCES public.storage_backend(storage_backend_id);


--
-- Name: integration integration_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration
    ADD CONSTRAINT integration_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: password_reset_token password_reset_token_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;


--
-- Name: share_link share_link_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_link
    ADD CONSTRAINT share_link_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;


--
-- Name: share_link share_link_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_link
    ADD CONSTRAINT share_link_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.file_metadata(file_id) ON DELETE CASCADE;


--
-- Name: share_link share_link_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_link
    ADD CONSTRAINT share_link_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: subscription subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plan(plan_id);


--
-- Name: subscription subscription_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: tag tag_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_member tenant_member_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_member
    ADD CONSTRAINT tenant_member_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: tenant_member tenant_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_member
    ADD CONSTRAINT tenant_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;


--
-- Name: tenant_policy tenant_policy_storage_backend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_policy
    ADD CONSTRAINT tenant_policy_storage_backend_id_fkey FOREIGN KEY (storage_backend_id) REFERENCES public.storage_backend(storage_backend_id);


--
-- Name: tenant_policy tenant_policy_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_policy
    ADD CONSTRAINT tenant_policy_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: usage_daily usage_daily_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_daily
    ADD CONSTRAINT usage_daily_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- Name: user_auth_password user_auth_password_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_auth_password
    ADD CONSTRAINT user_auth_password_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;


--
-- Name: user_group_member user_group_member_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_member
    ADD CONSTRAINT user_group_member_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.user_group(group_id) ON DELETE CASCADE;


--
-- Name: user_group_member user_group_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_member
    ADD CONSTRAINT user_group_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;


--
-- Name: user_group user_group_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group
    ADD CONSTRAINT user_group_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dU4rgneJGgmPAedNahkSQYgd4vJg5nckEfqm5Y10tJTr48pkDJorukW1qwfNI0v



-- =============================================================
-- Schema documentation comments (generated)
-- =============================================================
COMMENT ON TABLE public.api_key IS "API keys for integrations or service-to-service access (hashed).";
COMMENT ON COLUMN public.api_key.api_key_id IS "Identifier for api_key record.";
COMMENT ON COLUMN public.api_key.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.api_key.integration_id IS "Identifier for integration record.";
COMMENT ON COLUMN public.api_key.name IS "Human-readable name.";
COMMENT ON COLUMN public.api_key.key_hash IS "Hashed API key (store hash, not raw key).";
COMMENT ON COLUMN public.api_key.last_used_dt IS "Last time the API key was used successfully.";
COMMENT ON COLUMN public.api_key.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.api_key.revoked_dt IS "Timestamp when this token/key/link was revoked; NULL means active.";
COMMENT ON TABLE public.app_user IS "Application user profile (identity). Authentication credentials are stored separately.";
COMMENT ON COLUMN public.app_user.user_id IS "User identifier.";
COMMENT ON COLUMN public.app_user.email IS "User email address (unique identity).";
COMMENT ON COLUMN public.app_user.display_name IS "User display name for UI.";
COMMENT ON COLUMN public.app_user.status IS "Lifecycle status for this record.";
COMMENT ON COLUMN public.app_user.email_verified IS "Whether the user has verified their email.";
COMMENT ON COLUMN public.app_user.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.asset_tag IS "Join table mapping files to tags.";
COMMENT ON COLUMN public.asset_tag.file_id IS "File identifier (UUID).";
COMMENT ON COLUMN public.asset_tag.tag_id IS "Identifier for tag record.";
COMMENT ON COLUMN public.asset_tag.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.collection IS "Logical collection for grouping assets (can be used for curated sets independent of folder hierarchy). Soft-deletable.";
COMMENT ON COLUMN public.collection.collection_id IS "Identifier for collection record.";
COMMENT ON COLUMN public.collection.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.collection.name IS "Human-readable name.";
COMMENT ON COLUMN public.collection.description IS "Optional description text.";
COMMENT ON COLUMN public.collection.created_by IS "User who created this record.";
COMMENT ON COLUMN public.collection.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.collection.updated_dt IS "Timestamp when this record was last updated.";
COMMENT ON COLUMN public.collection.deleted_at IS "Soft-delete timestamp; NULL means active.";
COMMENT ON COLUMN public.collection.deleted_by IS "User who performed the soft delete.";
COMMENT ON TABLE public.collection_asset IS "Join table mapping files into collections.";
COMMENT ON COLUMN public.collection_asset.collection_id IS "Identifier for collection record.";
COMMENT ON COLUMN public.collection_asset.file_id IS "File identifier (UUID).";
COMMENT ON COLUMN public.collection_asset.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.email_verification_token IS "One-time token for verifying a user email address.";
COMMENT ON COLUMN public.email_verification_token.token_id IS "Identifier for token record.";
COMMENT ON COLUMN public.email_verification_token.user_id IS "User identifier.";
COMMENT ON COLUMN public.email_verification_token.token_hash IS "Hashed public share token (store hash, not raw token).";
COMMENT ON COLUMN public.email_verification_token.expires_dt IS "Optional expiry time after which the token is invalid.";
COMMENT ON COLUMN public.email_verification_token.used_dt IS "Timestamp field.";
COMMENT ON COLUMN public.email_verification_token.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.file_derivative IS "Represents derived renditions (thumbnails, transcodes) generated from a source file.";
COMMENT ON COLUMN public.file_derivative.derivative_id IS "Primary key for a derivative record.";
COMMENT ON COLUMN public.file_derivative.file_id IS "File identifier (UUID).";
COMMENT ON COLUMN public.file_derivative.kind IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.file_derivative.spec IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.file_derivative.storage_backend_id IS "References storage_backend used to store/deliver binary content.";
COMMENT ON COLUMN public.file_derivative.object_key IS "Storage locator for the derivative binary.";
COMMENT ON COLUMN public.file_derivative.storage_uri IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.file_derivative.size_bytes IS "Size of the file in bytes.";
COMMENT ON COLUMN public.file_derivative.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.file_event IS "Audit/event log for actions taken on a file (upload, rename, delete, access).";
COMMENT ON COLUMN public.file_event.event_id IS "Primary key of the file event record.";
COMMENT ON COLUMN public.file_event.file_id IS "File identifier (UUID).";
COMMENT ON COLUMN public.file_event.event_type IS "Type of event (enum).";
COMMENT ON COLUMN public.file_event.detail IS "Event payload JSON; stores event-specific metadata (e.g., old/new name).";
COMMENT ON COLUMN public.file_event.actor_user_id IS "User who performed the action.";
COMMENT ON COLUMN public.file_event.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.file_metadata IS "Metadata for a stored file/asset. Binary content lives in the configured storage backend; object_key is the immutable storage locator.";
COMMENT ON COLUMN public.file_metadata.file_id IS "File identifier (UUID).";
COMMENT ON COLUMN public.file_metadata.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.file_metadata.integration_id IS "Integration/source system responsible for ingesting/managing this file.";
COMMENT ON COLUMN public.file_metadata.storage_backend_id IS "References storage_backend used to store/deliver binary content.";
COMMENT ON COLUMN public.file_metadata.title IS "User-visible title/display name of the asset.";
COMMENT ON COLUMN public.file_metadata.description IS "Optional description text.";
COMMENT ON COLUMN public.file_metadata.application_ref_id IS "External reference ID from the source application (optional).";
COMMENT ON COLUMN public.file_metadata.document_type IS "Logical type/category (image, video, document, etc.).";
COMMENT ON COLUMN public.file_metadata.document_type_id IS "Optional reference for a more specific document type taxonomy.";
COMMENT ON COLUMN public.file_metadata.object_key IS "Immutable storage locator within the backend (relative path/key).";
COMMENT ON COLUMN public.file_metadata.storage_uri IS "Optional cached canonical URI; typically NULL for local_fs because it is derived from backend + object_key.";
COMMENT ON COLUMN public.file_metadata.original_filename IS "Original filename at upload time.";
COMMENT ON COLUMN public.file_metadata.content_type IS "MIME type of the file (e.g., image/jpeg).";
COMMENT ON COLUMN public.file_metadata.size_bytes IS "Size of the file in bytes.";
COMMENT ON COLUMN public.file_metadata.checksum_sha256 IS "SHA-256 checksum for integrity/deduplication.";
COMMENT ON COLUMN public.file_metadata.retention_days IS "Retention period in days (policy-driven).";
COMMENT ON COLUMN public.file_metadata.expires_at IS "Timestamp after which the asset may be auto-removed/archived per retention policy.";
COMMENT ON COLUMN public.file_metadata.gdpr_flag IS "Whether the asset is flagged for GDPR handling.";
COMMENT ON COLUMN public.file_metadata.record_status IS "High-level lifecycle phase for the asset record (e.g., upload).";
COMMENT ON COLUMN public.file_metadata.record_sub_status IS "Fine-grained state within record_status (e.g., pending, completed, failed).";
COMMENT ON COLUMN public.file_metadata.request_count IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.file_metadata.visibility IS "Visibility classification (e.g., private/public).";
COMMENT ON COLUMN public.file_metadata.general_access IS "General access model (e.g., restricted/anyone_with_link).";
COMMENT ON COLUMN public.file_metadata.deleted_at IS "Soft-delete timestamp; NULL means active.";
COMMENT ON COLUMN public.file_metadata.deleted_by IS "User who performed the soft delete.";
COMMENT ON COLUMN public.file_metadata.created_by IS "User who created this record.";
COMMENT ON COLUMN public.file_metadata.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.file_metadata.updated_by IS "User who last updated this record.";
COMMENT ON COLUMN public.file_metadata.updated_dt IS "Timestamp when this record was last updated.";
COMMENT ON COLUMN public.file_metadata.folder_id IS "Folder that contains the file logically.";
COMMENT ON TABLE public.file_permission IS "Access control entries granting roles on files to users or groups.";
COMMENT ON COLUMN public.file_permission.permission_id IS "Primary key of the permission record.";
COMMENT ON COLUMN public.file_permission.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.file_permission.file_id IS "File identifier (UUID).";
COMMENT ON COLUMN public.file_permission.user_id IS "User identifier.";
COMMENT ON COLUMN public.file_permission.group_id IS "Group identifier (for group-based permissions).";
COMMENT ON COLUMN public.file_permission.role IS "Role/permission level (enum).";
COMMENT ON COLUMN public.file_permission.created_by IS "User who created this record.";
COMMENT ON COLUMN public.file_permission.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.file_star IS "User \u201cstarred/favourite\u201d files per tenant (bookmarking).";
COMMENT ON COLUMN public.file_star.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.file_star.file_id IS "File identifier (UUID).";
COMMENT ON COLUMN public.file_star.user_id IS "User identifier.";
COMMENT ON COLUMN public.file_star.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.folder IS "Logical folder for organising assets; forms a hierarchy via parent_folder_id. Soft-deletable.";
COMMENT ON COLUMN public.folder.folder_id IS "Folder that contains the file logically.";
COMMENT ON COLUMN public.folder.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.folder.parent_folder_id IS "Parent folder (NULL indicates a root folder).";
COMMENT ON COLUMN public.folder.name IS "Human-readable name.";
COMMENT ON COLUMN public.folder.created_by IS "User who created this record.";
COMMENT ON COLUMN public.folder.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.folder.deleted_at IS "Soft-delete timestamp; NULL means active.";
COMMENT ON COLUMN public.folder.deleted_by IS "User who performed the soft delete.";
COMMENT ON TABLE public.folder_event IS "Audit/event log for actions taken on a folder (create/rename/move/delete/restore, etc.).";
COMMENT ON COLUMN public.folder_event.event_id IS "Primary key of the folder event record.";
COMMENT ON COLUMN public.folder_event.folder_id IS "Folder that contains the file logically.";
COMMENT ON COLUMN public.folder_event.event_type IS "Type of event (enum).";
COMMENT ON COLUMN public.folder_event.detail IS "Event payload JSON; stores event-specific metadata (e.g., old/new name).";
COMMENT ON COLUMN public.folder_event.actor_user_id IS "User who performed the action.";
COMMENT ON COLUMN public.folder_event.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.folder_permission IS "Access control entries granting roles on folders to users or groups; may optionally inherit to children.";
COMMENT ON COLUMN public.folder_permission.permission_id IS "Identifier for permission record.";
COMMENT ON COLUMN public.folder_permission.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.folder_permission.folder_id IS "Folder that contains the file logically.";
COMMENT ON COLUMN public.folder_permission.user_id IS "User identifier.";
COMMENT ON COLUMN public.folder_permission.group_id IS "Group identifier (for group-based permissions).";
COMMENT ON COLUMN public.folder_permission.role IS "Role/permission level (enum).";
COMMENT ON COLUMN public.folder_permission.inherit_to_children IS "If true, permission applies to files/subfolders under this folder.";
COMMENT ON COLUMN public.folder_permission.created_by IS "User who created this record.";
COMMENT ON COLUMN public.folder_permission.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.folder_share_link IS "Token-based link sharing for folders (public/anyone-with-link style) with expiry/password/revocation.";
COMMENT ON COLUMN public.folder_share_link.share_id IS "Primary key of the folder share link record.";
COMMENT ON COLUMN public.folder_share_link.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.folder_share_link.folder_id IS "Folder that contains the file logically.";
COMMENT ON COLUMN public.folder_share_link.token_hash IS "Hashed public share token (store hash, not raw token).";
COMMENT ON COLUMN public.folder_share_link.expires_dt IS "Optional expiry time after which the token is invalid.";
COMMENT ON COLUMN public.folder_share_link.password_hash IS "Optional hashed password required to access a share link.";
COMMENT ON COLUMN public.folder_share_link.created_by IS "User who created this record.";
COMMENT ON COLUMN public.folder_share_link.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.folder_share_link.revoked_dt IS "Timestamp when this token/key/link was revoked; NULL means active.";
COMMENT ON TABLE public.integration IS "Represents an integration/source system (CMS, DAM, etc.) that can ingest or manage assets.";
COMMENT ON COLUMN public.integration.integration_id IS "Identifier for integration record.";
COMMENT ON COLUMN public.integration.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.integration.code IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration.name IS "Human-readable name.";
COMMENT ON COLUMN public.integration.status IS "Lifecycle status for this record.";
COMMENT ON COLUMN public.integration.webhook_url IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration.webhook_secret_hash IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.integration.updated_dt IS "Timestamp when this record was last updated.";
COMMENT ON TABLE public.integration_policy_override IS "Per-integration overrides to tenant policy (e.g., different retention/visibility rules).";
COMMENT ON COLUMN public.integration_policy_override.integration_id IS "Identifier for integration record.";
COMMENT ON COLUMN public.integration_policy_override.storage_backend_id IS "References storage_backend used to store/deliver binary content.";
COMMENT ON COLUMN public.integration_policy_override.key_template IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration_policy_override.presigned_url_ttl_seconds IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration_policy_override.retention_days IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration_policy_override.av_required IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration_policy_override.allowed_mime_types IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration_policy_override.default_visibility IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration_policy_override.max_upload_size_bytes IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.integration_policy_override.updated_dt IS "Timestamp when this record was last updated.";
COMMENT ON TABLE public.password_reset_token IS "One-time token for resetting a user password.";
COMMENT ON COLUMN public.password_reset_token.token_id IS "Identifier for token record.";
COMMENT ON COLUMN public.password_reset_token.user_id IS "User identifier.";
COMMENT ON COLUMN public.password_reset_token.token_hash IS "Hashed public share token (store hash, not raw token).";
COMMENT ON COLUMN public.password_reset_token.expires_dt IS "Optional expiry time after which the token is invalid.";
COMMENT ON COLUMN public.password_reset_token.used_dt IS "Timestamp field.";
COMMENT ON COLUMN public.password_reset_token.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.plan IS "Defines subscription plans and limits used to derive tenant policy and entitlements.";
COMMENT ON COLUMN public.plan.plan_id IS "Identifier for plan record.";
COMMENT ON COLUMN public.plan.code IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.name IS "Human-readable name.";
COMMENT ON COLUMN public.plan.monthly_price_pence IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.max_upload_size_bytes IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.max_assets_count IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.max_collections_count IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.included_storage_bytes IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.included_egress_bytes IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.can_share_links IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.can_derivatives IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.can_video_transcode IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.can_ai_indexing IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.plan.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.share_link IS "Token-based link sharing for files (public/anyone-with-link style) with expiry/password/revocation.";
COMMENT ON COLUMN public.share_link.share_id IS "Primary key of the share link record.";
COMMENT ON COLUMN public.share_link.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.share_link.file_id IS "File identifier (UUID).";
COMMENT ON COLUMN public.share_link.token_hash IS "Hashed public share token (store hash, not raw token).";
COMMENT ON COLUMN public.share_link.expires_dt IS "Optional expiry time after which the token is invalid.";
COMMENT ON COLUMN public.share_link.password_hash IS "Optional hashed password required to access a share link.";
COMMENT ON COLUMN public.share_link.created_by IS "User who created this record.";
COMMENT ON COLUMN public.share_link.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.share_link.revoked_dt IS "Timestamp when this token/key/link was revoked; NULL means active.";
COMMENT ON TABLE public.storage_backend IS "Storage provider configuration (local_fs, S3, Azure, etc.) and delivery strategy.";
COMMENT ON COLUMN public.storage_backend.storage_backend_id IS "References storage_backend used to store/deliver binary content.";
COMMENT ON COLUMN public.storage_backend.name IS "Human-readable name.";
COMMENT ON COLUMN public.storage_backend.provider IS "Storage provider type (enum).";
COMMENT ON COLUMN public.storage_backend.delivery IS "Delivery strategy (enum).";
COMMENT ON COLUMN public.storage_backend.is_enabled IS "Whether the configuration is active and can be used.";
COMMENT ON COLUMN public.storage_backend.config IS "Backend-specific configuration as JSON.";
COMMENT ON COLUMN public.storage_backend.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.storage_backend.updated_dt IS "Timestamp when this record was last updated.";
COMMENT ON TABLE public.subscription IS "Associates a tenant with a plan and billing lifecycle information.";
COMMENT ON COLUMN public.subscription.subscription_id IS "Identifier for subscription record.";
COMMENT ON COLUMN public.subscription.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.subscription.plan_id IS "Identifier for plan record.";
COMMENT ON COLUMN public.subscription.status IS "Subscription status (active, cancelled, trial, etc.).";
COMMENT ON COLUMN public.subscription.current_period_start IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.subscription.current_period_end IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.subscription.external_ref IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.subscription.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.tag IS "Defines a tag/label that can be applied to assets.";
COMMENT ON COLUMN public.tag.tag_id IS "Identifier for tag record.";
COMMENT ON COLUMN public.tag.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.tag.name IS "Human-readable name.";
COMMENT ON COLUMN public.tag.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.tenant IS "Represents an organisation/customer (tenant) in the multi-tenant file service.";
COMMENT ON COLUMN public.tenant.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.tenant.slug IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant.name IS "Human-readable name.";
COMMENT ON COLUMN public.tenant.status IS "Lifecycle status for this record.";
COMMENT ON COLUMN public.tenant.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.tenant_member IS "Maps users to tenants (membership). Used for authorisation and scoping queries.";
COMMENT ON COLUMN public.tenant_member.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.tenant_member.user_id IS "User identifier.";
COMMENT ON COLUMN public.tenant_member.role IS "Role/permission level (enum).";
COMMENT ON COLUMN public.tenant_member.created_dt IS "Timestamp when this record was created.";
COMMENT ON COLUMN public.tenant_member.status IS "Lifecycle status for this record.";
COMMENT ON TABLE public.tenant_policy IS "Effective policy settings for a tenant (limits, retention, security).";
COMMENT ON COLUMN public.tenant_policy.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.tenant_policy.storage_backend_id IS "References storage_backend used to store/deliver binary content.";
COMMENT ON COLUMN public.tenant_policy.key_template IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant_policy.presigned_url_ttl_seconds IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant_policy.default_retention_days IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant_policy.av_required IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant_policy.allowed_mime_types IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant_policy.default_visibility IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant_policy.webhook_url IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant_policy.webhook_secret_hash IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.tenant_policy.updated_dt IS "Timestamp when this record was last updated.";
COMMENT ON TABLE public.usage_daily IS "Daily usage rollups for billing/quotas (e.g., bytes stored, bandwidth).";
COMMENT ON COLUMN public.usage_daily.usage_id IS "Identifier for usage record.";
COMMENT ON COLUMN public.usage_daily.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.usage_daily.day IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.usage_daily.storage_bytes IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.usage_daily.egress_bytes IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.usage_daily.uploads_count IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.usage_daily.downloads_count IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.usage_daily.transforms_count IS "Field purpose: see application logic.";
COMMENT ON TABLE public.user_auth_password IS "Password authentication record for a user (hashed password + metadata).";
COMMENT ON COLUMN public.user_auth_password.user_id IS "User identifier.";
COMMENT ON COLUMN public.user_auth_password.password_hash IS "Hashed password (never store plaintext).";
COMMENT ON COLUMN public.user_auth_password.password_algo IS "Hash algorithm identifier (e.g., bcrypt/argon2).";
COMMENT ON COLUMN public.user_auth_password.password_updated_dt IS "When the password was last set/rotated.";
COMMENT ON COLUMN public.user_auth_password.failed_attempts IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.user_auth_password.locked_until IS "Field purpose: see application logic.";
COMMENT ON COLUMN public.user_auth_password.last_login_dt IS "Timestamp field.";
COMMENT ON COLUMN public.user_auth_password.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.user_group IS "Defines a group of users for permission assignment within a tenant.";
COMMENT ON COLUMN public.user_group.group_id IS "Group identifier (for group-based permissions).";
COMMENT ON COLUMN public.user_group.tenant_id IS "Tenant that owns/contains this record.";
COMMENT ON COLUMN public.user_group.name IS "Human-readable name.";
COMMENT ON COLUMN public.user_group.created_dt IS "Timestamp when this record was created.";
COMMENT ON TABLE public.user_group_member IS "Maps users into groups.";
COMMENT ON COLUMN public.user_group_member.group_id IS "Group identifier (for group-based permissions).";
COMMENT ON COLUMN public.user_group_member.user_id IS "User identifier.";
COMMENT ON COLUMN public.user_group_member.created_dt IS "Timestamp when this record was created.";
