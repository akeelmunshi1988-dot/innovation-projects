--
-- PostgreSQL database dump
--

\restrict GujbQzswfHlBQuPxkJGBwg362VR2KLW4mzILmJF9kihWlUu6oex3FQKK9yvPeCy

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_messages (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    session_id character varying(100),
    staff_id integer,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_chat_messages_id_seq OWNED BY public.ai_chat_messages.id;


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: announcement_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcement_messages (
    id integer NOT NULL,
    tenant_id integer,
    text character varying(200) NOT NULL,
    link_url character varying(300),
    sort_order integer,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: announcement_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcement_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcement_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcement_messages_id_seq OWNED BY public.announcement_messages.id;


--
-- Name: api_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_clients (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name character varying(150) NOT NULL,
    key_hash character varying(64) NOT NULL,
    key_prefix character varying(16) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone
);


--
-- Name: api_clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_clients_id_seq OWNED BY public.api_clients.id;


--
-- Name: catalog_size_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_size_master (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    ft character varying(50) NOT NULL,
    cm character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: catalog_size_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.catalog_size_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: catalog_size_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.catalog_size_master_id_seq OWNED BY public.catalog_size_master.id;


--
-- Name: collection_displays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_displays (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    category character varying(150) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    images json NOT NULL
);


--
-- Name: collection_displays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collection_displays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collection_displays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collection_displays_id_seq OWNED BY public.collection_displays.id;


--
-- Name: custom_rug_page_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_rug_page_images (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    title character varying(150) NOT NULL,
    image_url character varying(500) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_rug_page_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.custom_rug_page_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: custom_rug_page_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.custom_rug_page_images_id_seq OWNED BY public.custom_rug_page_images.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    tenant_id integer,
    name character varying(150) NOT NULL,
    email character varying(200) NOT NULL,
    phone character varying(50),
    company character varying(150),
    gstin character varying(20),
    state_code character varying(2),
    address text,
    country character varying(100),
    is_export_buyer boolean,
    account_type character varying(20),
    hashed_password character varying(300),
    is_active boolean,
    is_verified boolean,
    verification_token character varying(100),
    verification_token_expires_at timestamp with time zone,
    reset_token character varying(100),
    reset_token_expires_at timestamp with time zone,
    oauth_provider character varying(20),
    oauth_id character varying(200),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    key character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    subject character varying(300) NOT NULL,
    body_html text NOT NULL,
    body_text text NOT NULL,
    is_active boolean,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faqs (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    rug_catalog_id integer,
    question character varying(500) NOT NULL,
    answer text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: faqs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faqs_id_seq OWNED BY public.faqs.id;


--
-- Name: homepage_enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homepage_enquiries (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(200) NOT NULL,
    subject character varying(250) NOT NULL,
    message text NOT NULL,
    consent boolean DEFAULT true NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: homepage_enquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.homepage_enquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: homepage_enquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.homepage_enquiries_id_seq OWNED BY public.homepage_enquiries.id;


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    id integer NOT NULL,
    tenant_id integer,
    material_id integer NOT NULL,
    qty_change double precision NOT NULL,
    transaction_type character varying(50) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id integer NOT NULL,
    tenant_id integer,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    color character varying(100) NOT NULL,
    stock_meters double precision,
    cost_per_sqm double precision NOT NULL,
    cost_currency character varying(10),
    is_available boolean
);


--
-- Name: materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;


--
-- Name: mcp_catalog_upload_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_catalog_upload_grants (
    id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    tenant_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mcp_catalog_upload_grants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mcp_catalog_upload_grants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mcp_catalog_upload_grants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mcp_catalog_upload_grants_id_seq OWNED BY public.mcp_catalog_upload_grants.id;


--
-- Name: mcp_oauth_authorization_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_oauth_authorization_codes (
    id integer NOT NULL,
    code_hash character varying(64) NOT NULL,
    client_id character varying(128) NOT NULL,
    staff_user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    redirect_uri character varying(1000) NOT NULL,
    scopes json NOT NULL,
    code_challenge character varying(128) NOT NULL,
    resource character varying(1000),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mcp_oauth_authorization_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mcp_oauth_authorization_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mcp_oauth_authorization_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mcp_oauth_authorization_codes_id_seq OWNED BY public.mcp_oauth_authorization_codes.id;


--
-- Name: mcp_oauth_authorization_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_oauth_authorization_requests (
    id integer NOT NULL,
    transaction_hash character varying(64) NOT NULL,
    client_id character varying(128) NOT NULL,
    redirect_uri character varying(1000) NOT NULL,
    state character varying(500),
    scopes json NOT NULL,
    code_challenge character varying(128) NOT NULL,
    resource character varying(1000),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mcp_oauth_authorization_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mcp_oauth_authorization_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mcp_oauth_authorization_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mcp_oauth_authorization_requests_id_seq OWNED BY public.mcp_oauth_authorization_requests.id;


--
-- Name: mcp_oauth_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_oauth_clients (
    id integer NOT NULL,
    client_id character varying(128) NOT NULL,
    client_name character varying(200),
    redirect_uris json NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mcp_oauth_clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mcp_oauth_clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mcp_oauth_clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mcp_oauth_clients_id_seq OWNED BY public.mcp_oauth_clients.id;


--
-- Name: mcp_oauth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_oauth_tokens (
    id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    token_type character varying(10) NOT NULL,
    client_id character varying(128) NOT NULL,
    staff_user_id integer NOT NULL,
    tenant_id integer NOT NULL,
    scopes json NOT NULL,
    resource character varying(1000),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mcp_oauth_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mcp_oauth_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mcp_oauth_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mcp_oauth_tokens_id_seq OWNED BY public.mcp_oauth_tokens.id;


--
-- Name: mood_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mood_master (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name character varying(100) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: mood_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mood_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mood_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mood_master_id_seq OWNED BY public.mood_master.id;


--
-- Name: moq_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moq_rules (
    id integer NOT NULL,
    tenant_id integer,
    rug_type character varying(100) NOT NULL,
    minimum_sqm double precision,
    minimum_pieces integer,
    notes text
);


--
-- Name: moq_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.moq_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: moq_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.moq_rules_id_seq OWNED BY public.moq_rules.id;


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id integer NOT NULL,
    tenant_id integer,
    email character varying(200) NOT NULL,
    source character varying(50),
    subscribed_at timestamp with time zone DEFAULT now()
);


--
-- Name: newsletter_subscribers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.newsletter_subscribers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: newsletter_subscribers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.newsletter_subscribers_id_seq OWNED BY public.newsletter_subscribers.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    quote_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id integer NOT NULL,
    order_id integer NOT NULL,
    status character varying(50) NOT NULL,
    changed_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_status_history_id_seq OWNED BY public.order_status_history.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    tenant_id integer,
    quote_id integer,
    status character varying(50),
    shipping_address text,
    estimated_delivery timestamp with time zone,
    actual_delivery timestamp with time zone,
    promo_code character varying(50),
    discount_amount double precision,
    shipping_cost double precision,
    total_amount double precision,
    price_currency character varying(10),
    razorpay_payment_id character varying(100),
    refund_id character varying(100),
    refund_status character varying(20),
    refund_amount double precision,
    refunded_at timestamp with time zone,
    recovered_via_webhook boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payment_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_attempts (
    id integer NOT NULL,
    tenant_id integer,
    razorpay_order_id character varying(100) NOT NULL,
    customer_id_hint integer,
    payload json NOT NULL,
    amount double precision NOT NULL,
    currency character varying(10) NOT NULL,
    status character varying(20),
    order_id integer,
    processing_started_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);


--
-- Name: payment_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_attempts_id_seq OWNED BY public.payment_attempts.id;


--
-- Name: pending_ai_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_ai_actions (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    session_id character varying(100),
    action_type character varying(20) NOT NULL,
    entity_type character varying(30) NOT NULL,
    entity_id integer,
    payload json NOT NULL,
    summary text NOT NULL,
    status character varying(20) NOT NULL,
    created_by_staff_id integer,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);


--
-- Name: pending_ai_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pending_ai_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pending_ai_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pending_ai_actions_id_seq OWNED BY public.pending_ai_actions.id;


--
-- Name: pile_height_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pile_height_master (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name character varying(50) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: pile_height_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pile_height_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pile_height_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pile_height_master_id_seq OWNED BY public.pile_height_master.id;


--
-- Name: pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_rules (
    id integer NOT NULL,
    tenant_id integer,
    name character varying(150) NOT NULL,
    rule_type character varying(50) NOT NULL,
    min_qty double precision,
    max_qty double precision,
    multiplier double precision,
    flat_fee double precision,
    description text
);


--
-- Name: pricing_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pricing_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pricing_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pricing_rules_id_seq OWNED BY public.pricing_rules.id;


--
-- Name: production_timelines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_timelines (
    id integer NOT NULL,
    tenant_id integer,
    order_type character varying(100) NOT NULL,
    base_days integer NOT NULL,
    complexity_multiplier_per_sqm double precision,
    notes text
);


--
-- Name: production_timelines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_timelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_timelines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_timelines_id_seq OWNED BY public.production_timelines.id;


--
-- Name: project_gallery_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_gallery_images (
    id integer NOT NULL,
    project_gallery_item_id integer NOT NULL,
    image_url character varying(300) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_gallery_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_gallery_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_gallery_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_gallery_images_id_seq OWNED BY public.project_gallery_images.id;


--
-- Name: project_gallery_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_gallery_items (
    id integer NOT NULL,
    tenant_id integer,
    image_url character varying(300) NOT NULL,
    caption character varying(150),
    link_url character varying(300),
    sort_order integer,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    description text,
    owner_name character varying(150),
    owner_message text,
    rating integer
);


--
-- Name: project_gallery_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_gallery_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_gallery_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_gallery_items_id_seq OWNED BY public.project_gallery_items.id;


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id integer NOT NULL,
    tenant_id integer,
    code character varying(50) NOT NULL,
    discount_type character varying(20) NOT NULL,
    discount_value double precision,
    min_order_value double precision,
    max_uses integer,
    one_per_customer boolean,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: promo_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promo_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promo_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promo_codes_id_seq OWNED BY public.promo_codes.id;


--
-- Name: promo_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_redemptions (
    id integer NOT NULL,
    promo_code_id integer NOT NULL,
    customer_id integer,
    order_id integer,
    discount_amount double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: promo_redemptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promo_redemptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promo_redemptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promo_redemptions_id_seq OWNED BY public.promo_redemptions.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    tenant_id integer,
    customer_id integer,
    rug_catalog_id integer,
    custom_size_w double precision,
    custom_size_h double precision,
    rug_shape character varying(20),
    material_id integer,
    qty integer,
    base_price double precision,
    final_price double precision,
    rush_order boolean,
    price_currency character varying(10),
    margin_pct double precision,
    gst_pct double precision,
    manual_discount_pct double precision,
    shipping_cost double precision,
    expected_delivery_days integer,
    status character varying(50),
    notes text,
    vendor_notes text,
    customer_response_notes text,
    review_request_count integer,
    is_custom_request boolean,
    room_type character varying(100),
    material_preference character varying(150),
    budget_range character varying(100),
    expected_delivery character varying(50),
    request_group_id character varying(36),
    reference_image_urls json,
    vendor_sample_image_urls json,
    revised_from_quote_id integer,
    created_at timestamp with time zone DEFAULT now(),
    selected_color character varying(100)
);


--
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_type character varying(10) NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    replaced_by_id integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: rug_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rug_catalog (
    id integer NOT NULL,
    tenant_id integer,
    name character varying(150) NOT NULL,
    slug character varying(220),
    description text,
    about_content_html text,
    sizes json NOT NULL,
    base_price double precision NOT NULL,
    base_price_currency character varying(10),
    material_id integer NOT NULL,
    pile_height character varying(50),
    weave_type character varying(100),
    lead_time_days integer,
    image_url character varying(300),
    profit_margin_pct double precision,
    hsn_code character varying(10),
    room_types json,
    mood_tags json,
    is_available boolean NOT NULL,
    inventory_quantity integer,
    color_options json,
    additional_information_html text
);


--
-- Name: rug_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rug_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rug_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rug_catalog_id_seq OWNED BY public.rug_catalog.id;


--
-- Name: rug_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rug_images (
    id integer NOT NULL,
    rug_catalog_id integer NOT NULL,
    image_url character varying(300) NOT NULL,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: rug_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rug_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rug_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rug_images_id_seq OWNED BY public.rug_images.id;


--
-- Name: rug_journey_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rug_journey_steps (
    id integer NOT NULL,
    tenant_id integer,
    title character varying(150) NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: rug_journey_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rug_journey_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rug_journey_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rug_journey_steps_id_seq OWNED BY public.rug_journey_steps.id;


--
-- Name: showcase_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.showcase_videos (
    id integer NOT NULL,
    tenant_id integer,
    title character varying(150) NOT NULL,
    description text,
    video_url character varying(300) NOT NULL,
    poster_url character varying(300),
    sort_order integer,
    is_active boolean,
    is_intro boolean,
    created_at timestamp with time zone DEFAULT now(),
    tab_name character varying(100)
);


--
-- Name: showcase_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.showcase_videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: showcase_videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.showcase_videos_id_seq OWNED BY public.showcase_videos.id;


--
-- Name: space_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.space_master (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name character varying(100) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: space_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.space_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: space_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.space_master_id_seq OWNED BY public.space_master.id;


--
-- Name: staff_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_users (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    email character varying(200) NOT NULL,
    hashed_password character varying(300) NOT NULL,
    full_name character varying(150),
    role character varying(20),
    is_active boolean,
    reset_token character varying(100),
    reset_token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_users_id_seq OWNED BY public.staff_users.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(100) NOT NULL,
    gstin character varying(20),
    state_code character varying(2),
    address text,
    lut_number character varying(50),
    currency character varying(10),
    base_currency character varying(10),
    exchange_rates json,
    exchange_rates_auto boolean,
    exchange_rates_updated_at timestamp with time zone,
    logo_url character varying(300),
    plan character varying(50),
    plan_status character varying(20),
    razorpay_customer_id character varying(100),
    razorpay_subscription_id character varying(100),
    ai_credits_used integer,
    billing_cycle_start timestamp with time zone,
    default_profit_margin_pct double precision,
    rush_surcharge_pct double precision,
    default_gst_pct double precision,
    gst_inclusive boolean,
    large_format_threshold_sqm double precision,
    large_format_surcharge_pct double precision,
    ai_assistant_customer_enabled boolean,
    ai_assistant_vendor_enabled boolean,
    vendor_notification_email character varying(200),
    default_size_unit character varying(10),
    contact_emails json,
    contact_phones json,
    contact_address text,
    contact_hours character varying(200),
    catalog_pdf_url character varying(300),
    hero_image_url character varying(500),
    hero_eyebrow character varying(100),
    hero_heading character varying(200),
    hero_cta_label character varying(50),
    certifications json,
    default_shipping_rate double precision,
    cancellation_window_hours integer,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    hero_images json,
    refund_cancellation_policy_html text,
    privacy_policy_html text,
    default_catalog_additional_information_html text,
    enabled_currencies json,
    about_us_content_html text,
    homepage_full_bleed_image_url character varying(500),
    homepage_full_bleed_alt_text character varying(200),
    homepage_full_bleed_enabled boolean DEFAULT true NOT NULL,
    homepage_values_eyebrow character varying(100),
    homepage_values_headline character varying(250),
    homepage_values_headline_accent character varying(250),
    homepage_values_description text,
    homepage_values_items json,
    homepage_values_enabled boolean DEFAULT true NOT NULL,
    homepage_intro_title_line_one character varying(100),
    homepage_intro_title_line_two character varying(100),
    homepage_intro_label character varying(100),
    homepage_intro_description text,
    homepage_intro_cta_label character varying(60),
    homepage_intro_cta_url character varying(300),
    homepage_intro_enabled boolean DEFAULT true NOT NULL,
    homepage_contact_image_url character varying(500),
    homepage_contact_image_alt character varying(200),
    homepage_contact_heading character varying(200),
    homepage_contact_consent_text character varying(300),
    homepage_contact_button_label character varying(60),
    homepage_contact_success_message character varying(300),
    homepage_contact_enabled boolean DEFAULT true NOT NULL,
    about_page json,
    homepage_intro_trusted_by_text character varying(100),
    product_accordion_sections json,
    storefront_menu_labels json,
    order_tracking_eyebrow character varying(100),
    order_tracking_heading character varying(200),
    order_tracking_body text,
    order_tracking_shipping_policy_url character varying(500),
    order_tracking_carriers json,
    order_tracking_steps json,
    order_tracking_media_url character varying(500),
    order_tracking_media_type character varying(10),
    colour_matching_eyebrow character varying(100),
    colour_matching_heading character varying(200),
    colour_matching_body text,
    colour_matching_items json,
    storefront_menu_visibility json,
    trending_rug_ids json
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id integer NOT NULL,
    tenant_id integer,
    author_name character varying(150) NOT NULL,
    author_title character varying(150),
    country character varying(100),
    quote text NOT NULL,
    photo_url character varying(300),
    rating integer,
    sort_order integer,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: testimonials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.testimonials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: testimonials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.testimonials_id_seq OWNED BY public.testimonials.id;


--
-- Name: trade_enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trade_enquiries (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    email character varying(200) NOT NULL,
    phone character varying(50) NOT NULL,
    city character varying(150),
    country character varying(150),
    profession character varying(50) NOT NULL,
    company character varying(200) NOT NULL,
    website character varying(300),
    project_type character varying(50),
    project_brief text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trade_enquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trade_enquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trade_enquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trade_enquiries_id_seq OWNED BY public.trade_enquiries.id;


--
-- Name: weave_type_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weave_type_master (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name character varying(100) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: weave_type_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weave_type_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weave_type_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weave_type_master_id_seq OWNED BY public.weave_type_master.id;


--
-- Name: workshop_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshop_photos (
    id integer NOT NULL,
    tenant_id integer,
    caption character varying(150) NOT NULL,
    description text,
    image_url character varying(300) NOT NULL,
    sort_order integer,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workshop_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workshop_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workshop_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workshop_photos_id_seq OWNED BY public.workshop_photos.id;


--
-- Name: ai_chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages ALTER COLUMN id SET DEFAULT nextval('public.ai_chat_messages_id_seq'::regclass);


--
-- Name: announcement_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_messages ALTER COLUMN id SET DEFAULT nextval('public.announcement_messages_id_seq'::regclass);


--
-- Name: api_clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_clients ALTER COLUMN id SET DEFAULT nextval('public.api_clients_id_seq'::regclass);


--
-- Name: catalog_size_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_size_master ALTER COLUMN id SET DEFAULT nextval('public.catalog_size_master_id_seq'::regclass);


--
-- Name: collection_displays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_displays ALTER COLUMN id SET DEFAULT nextval('public.collection_displays_id_seq'::regclass);


--
-- Name: custom_rug_page_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_rug_page_images ALTER COLUMN id SET DEFAULT nextval('public.custom_rug_page_images_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: faqs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs ALTER COLUMN id SET DEFAULT nextval('public.faqs_id_seq'::regclass);


--
-- Name: homepage_enquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_enquiries ALTER COLUMN id SET DEFAULT nextval('public.homepage_enquiries_id_seq'::regclass);


--
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- Name: materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);


--
-- Name: mcp_catalog_upload_grants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_catalog_upload_grants ALTER COLUMN id SET DEFAULT nextval('public.mcp_catalog_upload_grants_id_seq'::regclass);


--
-- Name: mcp_oauth_authorization_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_authorization_codes ALTER COLUMN id SET DEFAULT nextval('public.mcp_oauth_authorization_codes_id_seq'::regclass);


--
-- Name: mcp_oauth_authorization_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_authorization_requests ALTER COLUMN id SET DEFAULT nextval('public.mcp_oauth_authorization_requests_id_seq'::regclass);


--
-- Name: mcp_oauth_clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_clients ALTER COLUMN id SET DEFAULT nextval('public.mcp_oauth_clients_id_seq'::regclass);


--
-- Name: mcp_oauth_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_tokens ALTER COLUMN id SET DEFAULT nextval('public.mcp_oauth_tokens_id_seq'::regclass);


--
-- Name: mood_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_master ALTER COLUMN id SET DEFAULT nextval('public.mood_master_id_seq'::regclass);


--
-- Name: moq_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moq_rules ALTER COLUMN id SET DEFAULT nextval('public.moq_rules_id_seq'::regclass);


--
-- Name: newsletter_subscribers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers ALTER COLUMN id SET DEFAULT nextval('public.newsletter_subscribers_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_status_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history ALTER COLUMN id SET DEFAULT nextval('public.order_status_history_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payment_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts ALTER COLUMN id SET DEFAULT nextval('public.payment_attempts_id_seq'::regclass);


--
-- Name: pending_ai_actions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_ai_actions ALTER COLUMN id SET DEFAULT nextval('public.pending_ai_actions_id_seq'::regclass);


--
-- Name: pile_height_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pile_height_master ALTER COLUMN id SET DEFAULT nextval('public.pile_height_master_id_seq'::regclass);


--
-- Name: pricing_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules ALTER COLUMN id SET DEFAULT nextval('public.pricing_rules_id_seq'::regclass);


--
-- Name: production_timelines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_timelines ALTER COLUMN id SET DEFAULT nextval('public.production_timelines_id_seq'::regclass);


--
-- Name: project_gallery_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_gallery_images ALTER COLUMN id SET DEFAULT nextval('public.project_gallery_images_id_seq'::regclass);


--
-- Name: project_gallery_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_gallery_items ALTER COLUMN id SET DEFAULT nextval('public.project_gallery_items_id_seq'::regclass);


--
-- Name: promo_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes ALTER COLUMN id SET DEFAULT nextval('public.promo_codes_id_seq'::regclass);


--
-- Name: promo_redemptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions ALTER COLUMN id SET DEFAULT nextval('public.promo_redemptions_id_seq'::regclass);


--
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: rug_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_catalog ALTER COLUMN id SET DEFAULT nextval('public.rug_catalog_id_seq'::regclass);


--
-- Name: rug_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_images ALTER COLUMN id SET DEFAULT nextval('public.rug_images_id_seq'::regclass);


--
-- Name: rug_journey_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_journey_steps ALTER COLUMN id SET DEFAULT nextval('public.rug_journey_steps_id_seq'::regclass);


--
-- Name: showcase_videos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcase_videos ALTER COLUMN id SET DEFAULT nextval('public.showcase_videos_id_seq'::regclass);


--
-- Name: space_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_master ALTER COLUMN id SET DEFAULT nextval('public.space_master_id_seq'::regclass);


--
-- Name: staff_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_users ALTER COLUMN id SET DEFAULT nextval('public.staff_users_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: testimonials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials ALTER COLUMN id SET DEFAULT nextval('public.testimonials_id_seq'::regclass);


--
-- Name: trade_enquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_enquiries ALTER COLUMN id SET DEFAULT nextval('public.trade_enquiries_id_seq'::regclass);


--
-- Name: weave_type_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weave_type_master ALTER COLUMN id SET DEFAULT nextval('public.weave_type_master_id_seq'::regclass);


--
-- Name: workshop_photos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_photos ALTER COLUMN id SET DEFAULT nextval('public.workshop_photos_id_seq'::regclass);


--
-- Data for Name: ai_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_chat_messages (id, tenant_id, session_id, staff_id, role, content, created_at) FROM stdin;
1	1	61a9a8ba-f17f-4cd7-a6bc-99ffd785356f	1	user	Floor / Reference Price per sqm *\nchange price of natural jute rug to 80	2026-08-29 04:32:32+00
2	1	61a9a8ba-f17f-4cd7-a6bc-99ffd785356f	1	assistant	I've prepared a draft to update the base price of the "Natural Diamond Jute Rug" from 45 to 80 INR per square meter. This change is ready for you to confirm in the admin UI before it takes effect.	2026-08-29 04:32:32+00
3	1	9c96a508-1207-497d-966a-bc9318dd4344	1	user	change Jute material Cost to 50 INR	2026-08-29 04:50:14+00
4	1	9c96a508-1207-497d-966a-bc9318dd4344	1	assistant	I've prepared a draft to update the cost of the Jute material to 50 INR per square meter. This change needs your confirmation in the admin UI before it takes effect.	2026-08-29 04:50:14+00
5	1	ba5591d6-59f6-4963-9d77-a8528290f9bf	1	user	Create a prompt to create catalog based on form fields that is compulsory to fill in.	2026-08-29 07:57:04+00
6	1	ba5591d6-59f6-4963-9d77-a8528290f9bf	1	assistant	To create a catalog entry for a rug, the following fields are compulsory to fill in:\n\n1. **Name**: The name of the rug.\n2. **Sizes**: Vendor-entered standard sizes, specified in feet (e.g., '6x9').\n3. **Base Price**: The base price per square meter, expressed in INR.\n4. **Material ID**: The ID of an existing material to be used for the rug.\n5. **Weave Type**: The type of weave for the rug (e.g., 'hand-knotted', 'hand-tufted').\n6. **Lead Time Days** (optional, but often included): Estimated production time in days.\n\nYou can structure your prompt to include these essential details, ensuring to ask for the necessary information if some fields are not provided. For example:\n\n---\n\n**Prompt to Create a Rug Catalog Entry:**\n\n"Please provide the following details to create a new rug catalog entry:\n\n1. **Name of the rug**:\n2. **Sizes** (in feet, e.g., '6x9'):\n3. **Base price per square meter** (in INR):\n4. **Material ID** (please specify an existing material):\n5. **Weave Type** (e.g., 'hand-knotted', 'hand-tufted'):\n6. **Lead Time Days** (if known, in days):\n\nOnce I have this information, I can prepare the draft for you."	2026-08-29 07:57:04+00
7	1	ba5591d6-59f6-4963-9d77-a8528290f9bf	1	user	image and gallery image url include in prompt	2026-08-29 08:01:36+00
8	1	ba5591d6-59f6-4963-9d77-a8528290f9bf	1	assistant	To create a catalog entry for a rug including image and gallery image URLs, the following fields are compulsory to fill in:\n\n1. **Name**: The name of the rug.\n2. **Sizes**: Vendor-entered standard sizes, specified in feet (e.g., '6x9').\n3. **Base Price**: The base price per square meter, expressed in INR.\n4. **Material ID**: The ID of an existing material to be used for the rug.\n5. **Weave Type**: The type of weave for the rug (e.g., 'hand-knotted', 'hand-tufted').\n6. **Cover Image URL**: URL for the cover photo of the rug.\n7. **Gallery Image URLs**: URLs for additional gallery photos of the rug.\n8. **Lead Time Days** (optional, but often included): Estimated production time in days.\n\nYou can structure your prompt to include these essential details, ensuring to ask for the necessary information if some fields are not provided. For example:\n\n---\n\n**Prompt to Create a Rug Catalog Entry:**\n\n"Please provide the following details to create a new rug catalog entry:\n\n1. **Name of the rug**:\n2. **Sizes** (in feet, e.g., '6x9'):\n3. **Base price per square meter** (in INR):\n4. **Material ID** (please specify an existing material):\n5. **Weave Type** (e.g., 'hand-knotted', 'hand-tufted'):\n6. **Cover Image URL** (the main photo of the rug):\n7. **Gallery Image URLs** (please provide one or more additional photo URLs):\n8. **Lead Time Days** (if known, in days):\n\nOnce I have this information, I can prepare the draft for you."	2026-08-29 08:01:36+00
9	1	ba5591d6-59f6-4963-9d77-a8528290f9bf	1	user	Create a Rug Catalog Entry:\n\n"Please provide the following details to create a new rug catalog entry:\n\nName of the rug: Handknotted Indo Tibetan\nSizes (in feet, e.g., '6x9'): 6x9, 5x6, 10x15, 20x30\nBase price per square meter (in INR): 340\nMaterial ID (please specify an existing material): 9\nWeave Type (e.g., 'hand-knotted', 'hand-tufted'): hand-knotted\nLead Time Days (if known, in days): 20	2026-08-29 08:18:50+00
10	1	ba5591d6-59f6-4963-9d77-a8528290f9bf	1	assistant	I have prepared a draft to create the rug catalog entry for "Handknotted Indo Tibetan." Here’s a summary of the details:\n\n- **Name**: Handknotted Indo Tibetan\n- **Sizes**: \n  - 6x9\n  - 5x6\n  - 10x15\n  - 20x30\n- **Base Price**: 340 INR per square meter\n- **Material ID**: 9\n- **Weave Type**: Hand-knotted\n- **Lead Time Days**: 20\n- **Cover Image URL**: [Cover Image]( /static/rugs/41a5481798084385af042bb6b3d40363.png)\n\nThis draft is ready for you to confirm in the admin UI before it takes effect. Please review it to complete the action.	2026-08-29 08:18:50+00
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
20260907_0033
\.


--
-- Data for Name: announcement_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcement_messages (id, tenant_id, text, link_url, sort_order, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: api_clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.api_clients (id, tenant_id, name, key_hash, key_prefix, is_active, created_at, last_used_at, revoked_at) FROM stdin;
1	1	ChatGPTClient	9dc115f8d6fde2202395e53328a542a1f6a63eba4021663ae9fe9e38430e67e2	rug_live__JEsJ4	f	2026-08-27 07:29:05+00	\N	2026-08-27 07:29:17.231902+00
2	1	ChatGPT Client	e8f3354a1b3fec3de4db9f92d5af8ebbdcc3440725e1043bd6c3411d08f5961d	rug_live_IKX9tx	t	2026-08-27 07:29:24+00	\N	\N
3	1	ChatGPT Client Key	3043bb01e577ff98414ae1b4b8da113d9c11fcbb0e77950dbe698757a0e93714	rug_live_rmzov9	t	2026-08-27 08:57:25+00	2026-08-27 09:19:07.874186+00	\N
4	1	Automation Agent	94c2f115410be24ba6a0604ed8fb01e13a6824806c18017e5bf69cb06d9464fc	rug_live_lNsZjD	t	2026-08-30 01:31:04+00	2026-09-02 03:58:58.024182+00	\N
\.


--
-- Data for Name: catalog_size_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.catalog_size_master (id, tenant_id, ft, cm, sort_order, is_active) FROM stdin;
1	1	2x3	60x90	0	t
2	1	3x5	90x150	1	t
3	1	4x6	120x180	2	t
4	1	5x8	150x240	3	t
5	1	6x9	180x270	4	t
6	1	8x10	240 x 300	5	t
7	1	9x12	270x360	6	t
8	1	10x14	300x420	7	t
9	1	12x15	360x450	8	t
20	1	3 round ft	90 round cm	9	t
21	1	4 round ft	120 round cm	10	t
22	1	5 round ft	150 round cm	11	t
23	1	6 round ft	180 round cm	12	t
24	1	7 round ft	210 round cm	13	t
25	1	8 round ft	240 round cm	14	t
26	1	9 round ft	270 round cm	15	t
\.


--
-- Data for Name: collection_displays; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.collection_displays (id, tenant_id, category, enabled, images) FROM stdin;
1	1	default	t	[{"image_url": "/static/rugs/09b7f1b0e5494b459f5b515eb8d0e140.jpg", "caption": ""}, {"image_url": "/static/rugs/3d9ab336000a47e195a20cbad67b5e8c.png", "caption": ""}, {"image_url": "/static/rugs/51093301cf8c433dbfb0cf096ecece0b.png", "caption": ""}]
\.


--
-- Data for Name: custom_rug_page_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.custom_rug_page_images (id, tenant_id, title, image_url, sort_order, is_active, created_at) FROM stdin;
5	1	Buyer Request	/static/custom-rug-page/037cfd7642f54c34a43f0d4245c04e19.jpg	0	t	2026-09-04 06:42:05.224007+00
2	1	Material Dyeing	/static/custom-rug-page/7a343b7f80d642e4a30655280750f5e1.webp	3	t	2026-09-04 06:42:05.224007+00
6	1	Weaving	/static/custom-rug-page/62a270b02a4141a49146fd4ecbe88484.jpeg	4	t	2026-09-05 07:40:55.974888+00
1	1	Color Check	/static/custom-rug-page/ae1e8de4fc774fff9ab8a77498150588.jpeg	4	t	2026-09-04 06:42:05.224007+00
7	1	Washing	/static/custom-rug-page/c5000981aaa44ba6befee5cd871c470e.jpeg	5	t	2026-09-05 07:41:20.302101+00
11	1	Binding Process	/static/custom-rug-page/f1d63eb96e7042abbba2c12766605c02.jpeg	6	t	2026-09-05 10:20:49.889579+00
10	1	Finishing Process	/static/custom-rug-page/567f695dfc9e4de094eb757fa9df9e42.jpeg	7	t	2026-09-05 10:15:41.773527+00
8	1	Quality Check	/static/custom-rug-page/60cbf947ac614a9dbd203878d7f3897e.jpg	8	t	2026-09-05 07:41:36.034887+00
9	1	Packaging & Delivery	/static/custom-rug-page/8453af58fa674b1ab4442798dab93b50.jpg	9	t	2026-09-05 07:41:53.90244+00
3	1	CAD Approval	/static/custom-rug-page/8382d217156d4081bac57d8b67b78f13.jpeg	2	t	2026-09-04 06:42:05.224007+00
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, tenant_id, name, email, phone, company, gstin, state_code, address, country, is_export_buyer, account_type, hashed_password, is_active, is_verified, verification_token, verification_token_expires_at, reset_token, reset_token_expires_at, oauth_provider, oauth_id, created_at) FROM stdin;
1	1	Sarah Mitchell	sarah.mitchell@interiordesigns.com	+1-555-0142	Mitchell Interior Designs LLC	\N	\N	\N	India	f	retail	\N	t	f	\N	\N	\N	\N	\N	\N	2026-08-17 06:59:31+00
2	1	James Thornton	j.thornton@luxuryhotels.com	+1-555-0287	Grand Thornton Hotel Group	\N	\N	\N	India	f	retail	\N	t	f	\N	\N	\N	\N	\N	\N	2026-08-17 06:59:31+00
3	1	Priya Sharma	priya@homefurnishings.in	+91-98765-43210	Sharma Home Furnishings	\N	\N	\N	India	f	retail	\N	t	f	\N	\N	\N	\N	\N	\N	2026-08-17 06:59:31+00
4	1	akeel munshi	akeel.munshi@gmail.com	\N	\N	\N	\N	\N	India	f	retail	$2b$12$OcWbN9OQmtdWTCBnjrzjae48G7i./NUQyNGn6qX1bOVp7Xflj0RPK	t	t	pa3chKzkMEZ-8disM63iY9VskwE0rGI9xRkd01UsSl0	2026-08-30 14:23:33.62781+00	\N	\N	\N	\N	2026-08-29 14:23:33+00
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_templates (id, tenant_id, key, name, subject, body_html, body_text, is_active, updated_at) FROM stdin;
6	1	vendor_custom_rug_request	New Custom Rug Request (to Vendor)	New custom rug request from {{customer_name}}		Hello {{tenant_name}} team,\n\n{{customer_name}} ({{customer_email}}{{customer_phone_line}}) submitted a custom rug design request.\n\nRoom: {{room_type}}\nApproximate size: {{size}}\nQuantity: {{qty}}\nMaterial preference: {{material_preference}}\nBudget range: {{budget_range}}\n{{notes_line}}{{images_line}}\nQuote #{{quote_id}} has been created as a draft with no price yet. Log in to the admin panel, review the brief, set a price, and send it to the customer.\n\n— {{tenant_name}} System	t	2026-08-23 23:25:08+00
1	1	quote_sent	Quote Sent to Customer	Your Quote is Ready — {{rug_name}} | {{tenant_name}}	<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto">\n<div style="background:#1c1c1b;padding:24px 32px;border-radius:12px 12px 0 0">\n  <h1 style="color:#fbbf24;margin:0;font-size:22px">{{tenant_name}}</h1>\n  <p style="color:#929290;margin:4px 0 0;font-size:13px">Your quote is ready for review</p>\n</div>\n<div style="background:#f9f9f9;padding:24px 32px;border:1px solid #e5e5e5;border-top:none">\n  <p>Dear <strong>{{customer_name}}</strong>,</p>\n  <p>Great news — we've prepared a quote for your order. Please review the details below:</p>\n  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">\n    <tr><td style="padding:8px 0;color:#666;width:40%">Rug</td><td style="padding:8px 0;font-weight:600">{{rug_name}}</td></tr>\n    <tr><td style="padding:8px 0;color:#666">Size</td><td style="padding:8px 0">{{size}}</td></tr>\n    <tr><td style="padding:8px 0;color:#666">Quantity</td><td style="padding:8px 0">{{qty}}</td></tr>\n    <tr><td style="padding:8px 0;color:#666">Expected delivery</td><td style="padding:8px 0">{{expected_delivery}}</td></tr>\n    <tr style="border-top:1px solid #e5e5e5"><td style="padding:8px 0;color:#666">Subtotal</td><td style="padding:8px 0">{{subtotal}}</td></tr>\n    {{discount_line_html}}\n    <tr><td style="padding:8px 0;color:#666">GST</td><td style="padding:8px 0">{{gst_pct}}</td></tr>\n    <tr style="border-top:2px solid #e5e5e5"><td style="padding:12px 0;color:#666;font-weight:600">Total Price</td>\n    <td style="padding:12px 0;font-size:18px;font-weight:700;color:#d97706">{{price}}</td></tr>\n  </table>\n  {{note_html}}\n  <p style="margin:24px 0"><a href="{{quote_link}}" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View My Quotes</a></p>\n  <p>To <strong>accept or decline</strong> this quote, click above or log in to your account and visit <em>My Quotes</em>.</p>\n  <p style="color:#888;font-size:12px;margin-top:24px">This quote is valid for 7 days. For any queries, reply to this email.<br>— {{tenant_name}} Team</p>\n</div>\n</body></html>	Dear {{customer_name}},\n\nYour quote from {{tenant_name}} is ready.\n\nRug: {{rug_name}}\nSize: {{size}}\nQty: {{qty}}\nExpected delivery: {{expected_delivery}}\nSubtotal: {{subtotal}}\n{{discount_line_text}}GST: {{gst_pct}}\nTotal: {{price}}\n{{note_text}}\nView and respond to your quote: {{quote_link}}\n\n– {{tenant_name}} Team	t	2026-08-23 23:25:08+00
2	1	quote_rejected	Quote Declined	Update on your quote — {{rug_name}} | {{tenant_name}}	<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto">\n<div style="background:#1c1c1b;padding:24px 32px;border-radius:12px 12px 0 0">\n  <h1 style="color:#fbbf24;margin:0;font-size:22px">{{tenant_name}}</h1>\n  <p style="color:#929290;margin:4px 0 0;font-size:13px">Update on your quote request</p>\n</div>\n<div style="background:#f9f9f9;padding:24px 32px;border:1px solid #e5e5e5;border-top:none">\n  <p>Dear <strong>{{customer_name}}</strong>,</p>\n  <p>Thank you for your interest in <strong>{{rug_name}}</strong>. Unfortunately, we're unable to move forward with this request at this time.</p>\n  {{reason_line_html}}\n  <p>We'd still love to help you find the right rug — browse our full collection or reach out to discuss alternatives.</p>\n  <p style="margin:24px 0"><a href="{{catalog_link}}" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Browse Collection</a></p>\n  <p style="color:#888;font-size:12px;margin-top:24px">For any queries, reply to this email.<br>— {{tenant_name}} Team</p>\n</div>\n</body></html>	Dear {{customer_name}},\n\nThank you for your interest in {{rug_name}}. Unfortunately, we're unable to move forward with this request at this time.\n\n{{reason_line_text}}\nWe'd still love to help you find the right rug — browse our collection: {{catalog_link}}\n\n– {{tenant_name}} Team	t	2026-08-23 23:25:08+00
3	1	invoice_email	Invoice Email	{{invoice_type_label}} – {{rug_name}} – {{tenant_name}}		Dear {{customer_name}},\n\nPlease find attached your {{invoice_type_label}} from {{tenant_name}}.\n\nOrder Details:\n  Rug      : {{rug_name}}\n  Size     : {{size}}\n  Quantity : {{qty}}\n  Amount   : {{price}}\n\n{{disclaimer}}\n\nFor any queries, please reply to this email.\n\nBest regards,\n{{tenant_name}}\n	t	2026-08-23 23:25:08+00
4	1	vendor_review_request	Customer Review Request (to Vendor)	[Review Request #{{request_num}}] {{customer_name}} — {{rug_name}}		Hello {{tenant_name}} team,\n\n{{customer_name}} ({{customer_email}}) has requested a review of Quote #{{quote_id}}.\n\nRug: {{rug_name}}\nSize: {{size}}\nStatus: {{status}}\nReview Request: #{{request_num}} of {{max_requests}}\n\nPlease review and update the quote.\n\n— {{tenant_name}} System	t	2026-08-23 23:25:47+00
5	1	vendor_quote_request	New Quote Request (to Vendor)	New quote request — {{rug_name}} from {{customer_name}}		Hello {{tenant_name}} team,\n\n{{customer_name}} ({{customer_email}}{{customer_phone_line}}) just requested a quote.\n\nRug: {{rug_name}}\nSize: {{size}}\nQuantity: {{qty}}\nEstimated price: {{price}}\n{{notes_line}}\nQuote #{{quote_id}} has been created as a draft. Log in to the admin panel to review and send it.\n\n— {{tenant_name}} System	t	2026-08-23 23:25:08+00
7	1	customer_verification	Registration Verification	Verify your email — {{tenant_name}}	<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto">\n<div style="background:#1c1c1b;padding:24px 32px;border-radius:12px 12px 0 0">\n  <h1 style="color:#fbbf24;margin:0;font-size:22px">{{tenant_name}}</h1>\n  <p style="color:#929290;margin:4px 0 0;font-size:13px">Confirm your email address</p>\n</div>\n<div style="background:#f9f9f9;padding:24px 32px;border:1px solid #e5e5e5;border-top:none">\n  <p>Dear <strong>{{customer_name}}</strong>,</p>\n  <p>Thanks for creating an account with {{tenant_name}}. Please confirm your email address to activate your account:</p>\n  <p style="margin:24px 0"><a href="{{verification_link}}" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email Address</a></p>\n  <p style="color:#888;font-size:12px">Or copy this link into your browser:<br>{{verification_link}}</p>\n  <p style="color:#888;font-size:12px;margin-top:24px">This link expires in 24 hours. If you didn't create this account, you can ignore this email.<br>— {{tenant_name}} Team</p>\n</div>\n</body></html>	Dear {{customer_name}},\n\nThanks for creating an account with {{tenant_name}}. Please confirm your email address by visiting the link below:\n\n{{verification_link}}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.\n\n– {{tenant_name}} Team	t	2026-08-23 23:25:08+00
8	1	customer_password_reset	Customer Password Reset	Reset your password — {{tenant_name}}	<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto">\n<div style="background:#1c1c1b;padding:24px 32px;border-radius:12px 12px 0 0">\n  <h1 style="color:#fbbf24;margin:0;font-size:22px">{{tenant_name}}</h1>\n  <p style="color:#929290;margin:4px 0 0;font-size:13px">Password reset request</p>\n</div>\n<div style="background:#f9f9f9;padding:24px 32px;border:1px solid #e5e5e5;border-top:none">\n  <p>Dear <strong>{{customer_name}}</strong>,</p>\n  <p>We received a request to reset your {{tenant_name}} account password. Click below to choose a new one:</p>\n  <p style="margin:24px 0"><a href="{{reset_link}}" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a></p>\n  <p style="color:#888;font-size:12px">Or copy this link into your browser:<br>{{reset_link}}</p>\n  <p style="color:#888;font-size:12px;margin-top:24px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.<br>— {{tenant_name}} Team</p>\n</div>\n</body></html>	Dear {{customer_name}},\n\nWe received a request to reset your {{tenant_name}} account password. Visit the link below to choose a new one:\n\n{{reset_link}}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.\n\n– {{tenant_name}} Team	t	2026-08-23 23:25:08+00
9	1	staff_password_reset	Staff Password Reset	Reset your password — {{tenant_name}}	<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto">\n<div style="background:#1c1c1b;padding:24px 32px;border-radius:12px 12px 0 0">\n  <h1 style="color:#fbbf24;margin:0;font-size:22px">{{tenant_name}}</h1>\n  <p style="color:#929290;margin:4px 0 0;font-size:13px">Password reset request</p>\n</div>\n<div style="background:#f9f9f9;padding:24px 32px;border:1px solid #e5e5e5;border-top:none">\n  <p>Dear <strong>{{staff_name}}</strong>,</p>\n  <p>We received a request to reset your {{tenant_name}} staff account password. Click below to choose a new one:</p>\n  <p style="margin:24px 0"><a href="{{reset_link}}" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a></p>\n  <p style="color:#888;font-size:12px">Or copy this link into your browser:<br>{{reset_link}}</p>\n  <p style="color:#888;font-size:12px;margin-top:24px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.<br>— {{tenant_name}} Team</p>\n</div>\n</body></html>	Dear {{staff_name}},\n\nWe received a request to reset your {{tenant_name}} staff account password. Visit the link below to choose a new one:\n\n{{reset_link}}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.\n\n– {{tenant_name}} Team	t	2026-08-23 23:25:08+00
\.


--
-- Data for Name: faqs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.faqs (id, tenant_id, rug_catalog_id, question, answer, sort_order, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: homepage_enquiries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.homepage_enquiries (id, tenant_id, name, email, subject, message, consent, is_read, created_at) FROM stdin;
1	1	Akeel Munshi	munshiaqueel@gmail.com	test	test	t	t	2026-09-04 17:56:36.383386+00
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_transactions (id, tenant_id, material_id, qty_change, transaction_type, notes, created_at) FROM stdin;
1	1	1	500	restock	Initial inventory load - Pakistani Wool	2026-08-17 06:59:31+00
2	1	1	-72	used	Used for Quote #1 - Persian Medallion order	2026-08-17 06:59:31+00
3	1	2	350	restock	Initial inventory load - Silk Blend	2026-08-17 06:59:31+00
4	1	4	1200	restock	Initial inventory load - Premium Synthetic	2026-08-17 06:59:31+00
5	1	5	50	restock	Initial inventory load - Tibetan Highland Wool	2026-08-17 06:59:31+00
6	1	5	-8	used	Sample rugs production	2026-08-17 06:59:31+00
7	1	10	50	restock	Restocked 50.0 meters	2026-08-29 04:49:33+00
8	1	5	60	restock	Restocked 60.0 meters	2026-08-29 04:49:38+00
9	1	11	100	restock	Restocked 100.0 meters	2026-09-02 03:14:51.261804+00
10	1	12	120	restock	Restocked 120.0 meters	2026-09-02 10:08:07.229634+00
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materials (id, tenant_id, name, type, color, stock_meters, cost_per_sqm, cost_currency, is_available) FROM stdin;
9	1	Wool	wool	White	0	20	INR	t
10	1	Jute	wool	white	50	50	INR	t
11	1	Wool & Viscose Silk	wool	White	110	50	INR	t
12	1	Wool & Bamboo Silk	wool	White	120	5600	INR	t
2	1	Wool & Silk	silk	Ivory / Multi	320	3500	INR	t
5	1	New Zealand Wool	wool	Natural Undyed	102	2800	INR	t
1	1	Semi-Worsted New Zealand Wool	wool	Natural/Off-white	850	1800	INR	f
3	1	Handspun New Zealand Wool	cotton	Natural White	600	1200	INR	t
4	1	Premium Synthetic (Polypropylene)	synthetic	Multi / Various	1200	750	INR	f
\.


--
-- Data for Name: mcp_catalog_upload_grants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mcp_catalog_upload_grants (id, token_hash, tenant_id, filename, expires_at, used_at, created_at) FROM stdin;
1	ab387250a0cad4ac7abfbd294f3fd16aacd59beb7899ba0150a4ceac2fc7eba0	1	handwoven-jute-rug.webp	2026-09-05 12:04:40.525864+00	\N	2026-09-05 11:54:40.528158+00
2	c5bc6f31e3e9781df9692b5dbe86b34586b76761205e30098711bd6250df427a	1	handwoven-jute-rug-main.webp	2026-09-05 12:06:50.473428+00	\N	2026-09-05 11:56:50.474815+00
3	3a1e258d643e9bd8b8c1780726c7607689516613664cd1f8e2e54dd7fbc5ca00	1	handknotted-woollen-carpet-main-transparent.png	2026-09-07 15:23:17.513802+00	\N	2026-09-07 15:13:17.516126+00
4	22459004a767b5cc189865b8bf10e1dd6b490a17360444b23866667ec25d79cd	1	handknotted-woollen-carpet-main-transparent.png	2026-09-07 15:24:21.121458+00	\N	2026-09-07 15:14:21.124478+00
5	5d8e417c7322fc3ddd9605d0d60047d7c0ecd8843ff4db3b234de682b9dafb50	1	natural-jute-medallion-main-transparent.png	2026-09-09 18:12:33.496352+00	\N	2026-09-09 18:02:33.49788+00
6	323e705283792cdffa6a8821e4f352bb508d97b24910f0ca475008bb3bde20c0	1	natural-jute-medallion-living-room.png	2026-09-09 18:12:49.916223+00	\N	2026-09-09 18:02:49.917507+00
7	93abb73df6e97f97971bb052c5dba4247413e235d83a8c0631b95f8a7b3cd150	1	natural-jute-medallion-dining-room.png	2026-09-09 18:13:03.785651+00	\N	2026-09-09 18:03:03.787333+00
8	a6fa44a9b6e2eb0f30f7b8b404a0a990a3fc6e7fac843a88eb3a8eec940b5533	1	natural-jute-medallion-study.png	2026-09-09 18:13:17.645449+00	\N	2026-09-09 18:03:17.646254+00
9	515e2678c6c00f34f4129188d7771c5badc6856508e247c2a8aa4bccf0f16f84	1	natural-jute-medallion-bedroom.png	2026-09-09 18:13:31.675542+00	\N	2026-09-09 18:03:31.676814+00
10	ce22c9d463c395fc87abd4b1e638c5baf9b37061ccc967dc554572f911d729b5	1	natural-jute-medallion-entryway.png	2026-09-09 18:13:45.916506+00	\N	2026-09-09 18:03:45.918026+00
11	289349b8dbaf515e80b944f7a7d77d89aa7fc426b8ae773834995ac86f52b508	1	handmade-round-braided-rug-main-transparent-rectified.png	2026-09-09 18:35:57.443399+00	\N	2026-09-09 18:25:57.444647+00
\.


--
-- Data for Name: mcp_oauth_authorization_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mcp_oauth_authorization_codes (id, code_hash, client_id, staff_user_id, tenant_id, redirect_uri, scopes, code_challenge, resource, expires_at, used_at, created_at) FROM stdin;
1	55e49beb9fb44f9943f32547321b17ef946e74d209ee6be2ff4034b8a7e74259	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	https://chatgpt.com/connector/oauth/BHC_QRC1TyJx	["catalog:read", "catalog:write"]	SgFazx0ZfxIbNw-WYA2BpqAyFGjeMQt8MrCPra14vx4	https://dreamrugscreation.in/mcp/	2026-09-02 02:37:39.492153+00	2026-09-02 02:32:41.820622+00	2026-09-02 02:32:39.246604+00
2	0dda8075df204cefa0d3b8de6765269e29ac97a622d943e836889a747dff6c8f	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	https://chatgpt.com/connector/oauth/BHC_QRC1TyJx	["catalog:read", "catalog:write"]	0OFcLsnnsYHkbO-_KNtR95oYtdFUS3Bgw3j2sc5FeHk	https://dreamrugscreation.in/mcp/	2026-09-02 02:38:20.763497+00	2026-09-02 02:33:22.897975+00	2026-09-02 02:33:20.526629+00
3	55ed89e92c9f0c23f86994cddb9d622a485717e2bdf29f62bb9f1b15b1291373	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	https://claude.ai/api/mcp/auth_callback	["catalog:read", "catalog:write"]	tYzn9bKIM9bKy-edUhzZmg8c9HIKkmEmVXDbwY5zgI0	https://dreamrugscreation.in/mcp/	2026-09-05 11:55:15.111439+00	2026-09-05 11:50:16.279364+00	2026-09-05 11:50:14.870547+00
\.


--
-- Data for Name: mcp_oauth_authorization_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mcp_oauth_authorization_requests (id, transaction_hash, client_id, redirect_uri, state, scopes, code_challenge, resource, expires_at, used_at, created_at) FROM stdin;
1	63e38b60f1b9422919ddcad72e3c0ea00ba1f2b22eb6e23b0320b220d9b053ec	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	https://chatgpt.com/connector/oauth/BHC_QRC1TyJx	oauth_s_6a978ac2fd908191b45320425056d66f	["catalog:read", "catalog:write"]	SgFazx0ZfxIbNw-WYA2BpqAyFGjeMQt8MrCPra14vx4	https://dreamrugscreation.in/mcp/	2026-09-02 02:42:36.0208+00	2026-09-02 02:32:39.492092+00	2026-09-02 02:32:36.019759+00
2	5e5d457b6f19a18226b6686cebef42670a0d9a482f04f151fccd8b6633595b20	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	https://chatgpt.com/connector/oauth/BHC_QRC1TyJx	oauth_s_6a978ae88d3c81918efbe859db48e492	["catalog:read", "catalog:write"]	0OFcLsnnsYHkbO-_KNtR95oYtdFUS3Bgw3j2sc5FeHk	https://dreamrugscreation.in/mcp/	2026-09-02 02:43:14.74346+00	2026-09-02 02:33:20.763431+00	2026-09-02 02:33:14.742753+00
3	ef83a6fe5caf271f5407765c24ec75b5fcc1b510efc4efe4dec9807e36ae5eac	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	https://claude.ai/api/mcp/auth_callback	bEdNVAKuBEp24b2LG3oj8T2DmJkyODH343OhCmzFHhM	["catalog:read", "catalog:write"]	tYzn9bKIM9bKy-edUhzZmg8c9HIKkmEmVXDbwY5zgI0	https://dreamrugscreation.in/mcp/	2026-09-05 12:00:13.030449+00	2026-09-05 11:50:15.111363+00	2026-09-05 11:50:13.02943+00
\.


--
-- Data for Name: mcp_oauth_clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mcp_oauth_clients (id, client_id, client_name, redirect_uris, created_at) FROM stdin;
1	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	ChatGPT	["https://chatgpt.com/connector/oauth/BHC_QRC1TyJx"]	2026-09-02 02:32:20.730259+00
2	mcp_yUr3HMgZkoK3-c2CdfSLCRgvQnHQZ079	Claude	["https://claude.ai/api/mcp/auth_callback"]	2026-09-05 11:50:05.849641+00
3	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	Claude	["https://claude.ai/api/mcp/auth_callback"]	2026-09-05 11:50:12.210545+00
\.


--
-- Data for Name: mcp_oauth_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mcp_oauth_tokens (id, token_hash, token_type, client_id, staff_user_id, tenant_id, scopes, resource, expires_at, revoked_at, created_at) FROM stdin;
1	5f903bafe61f108aa1c80408285a7125c0a767b58fb7fcc424ebb482ad39054e	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 03:32:41.824125+00	\N	2026-09-02 02:32:41.823384+00
2	521a063f3d5fef6b386ad6f3ff2724ea026718af6a1133477eab33023d656bce	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 02:32:41.824125+00	\N	2026-09-02 02:32:41.823384+00
3	4a55832ab5f2afbe29f3915162458d6b6949c30a0e51f59c9797e607a147259a	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 03:33:22.901234+00	\N	2026-09-02 02:33:22.900494+00
4	6193056825cf85363f187c7232e8ddf213c6e11e47fe1becdc13371b21be69ac	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 02:33:22.901234+00	2026-09-02 03:28:57.442409+00	2026-09-02 02:33:22.900494+00
5	964f1387b2f3bb4a9004f60e361460e8cd6b0acce3290bd3adaa38806fa6ed41	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 04:28:57.446684+00	\N	2026-09-02 03:28:57.445887+00
6	d1d87e1c81ba120f78a9548455394380aabf4ff66a569ad0d4750f759fb74714	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 03:28:57.446684+00	2026-09-02 05:01:31.529062+00	2026-09-02 03:28:57.445887+00
7	cf2d8b0d3aecb0ea6567b3369abfed85fd132392ee4c294564a5481da19384d4	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 06:01:31.533206+00	\N	2026-09-02 05:01:31.532329+00
8	6baa0a4097b8ede86a940bf262758a0113db2f1a0942a37b6175af02e48b81bf	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 05:01:31.533206+00	2026-09-02 05:53:25.022707+00	2026-09-02 05:01:31.532329+00
9	02e9ee3c5cd0a943c7c529df66ec60e10beca3d53196d0a33d72dc6c9fd5065e	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 06:53:25.02556+00	\N	2026-09-02 05:53:25.025098+00
10	1675088e9672bdddf09985c3af142b0960e35caf23af0f3b285f1f88fbf8cf20	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 05:53:25.02556+00	2026-09-02 06:44:35.289992+00	2026-09-02 05:53:25.025098+00
11	7a889747e6bc02450020d61315fdb5580e1ff590bdcd60adff05b75fd0b44333	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 07:44:35.294074+00	\N	2026-09-02 06:44:35.29321+00
12	3fc0221131cc204c71c67a5399e051379a34c11bff71a6c42a9d0b979c0806b5	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 06:44:35.294074+00	2026-09-02 08:07:29.040123+00	2026-09-02 06:44:35.29321+00
13	71e40f6c57abde4cafd3f7c330d297ac14f505ea86abf8b12be0b220bfcaa0a8	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 09:07:29.043417+00	\N	2026-09-02 08:07:29.042614+00
14	b74aa0d759eed3fcffaa374e881016cd62dd7b7a107a0aae90c4f8b95f3fd8b9	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 08:07:29.043417+00	2026-09-02 10:04:27.448991+00	2026-09-02 08:07:29.042614+00
15	c7600b3a1ed218e392685455d53d3c0dadf1a38e4c4b7827a3274480a3912c77	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 11:04:27.453585+00	\N	2026-09-02 10:04:27.45244+00
16	1107eb550603f7b9534e7c37748e1fe7a266eeeea638ef7018f64ee1fbb8462a	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 10:04:27.453585+00	2026-09-02 13:11:05.727372+00	2026-09-02 10:04:27.45244+00
17	db8a94d7979e00f06490d245a1e786cb18c017fbc79f166715452db8e70d5c43	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 14:11:05.730145+00	\N	2026-09-02 13:11:05.729491+00
18	a2b33183e4faca6966743e0042a2e55beaf37556562188cd271edb8c4b796d54	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 13:11:05.730145+00	2026-09-02 14:01:24.841447+00	2026-09-02 13:11:05.729491+00
19	8f2a002e7829605585b13979d0529363e484fd22347346c5f723287e9c509f30	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 15:01:24.845569+00	\N	2026-09-02 14:01:24.844798+00
20	5be5669a3db169896485956ee5ee045a53025e1c4171b51f6f1d1940a1fd979d	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 14:01:24.845569+00	2026-09-02 16:20:53.084862+00	2026-09-02 14:01:24.844798+00
21	bf604854eb8f9cbdab7a71541058bdb41c014534368572c19a9985c0a4bda77b	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 17:20:53.089153+00	\N	2026-09-02 16:20:53.087944+00
22	504c21df7bed36812fe37834c9101dc2762036c12c261d29ab85fc72b599e9e2	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 16:20:53.089153+00	2026-09-02 18:22:55.786244+00	2026-09-02 16:20:53.087944+00
23	f9af887ed4676e875fa645eae2d442ff1d0abbad5203095fe04f6dce7dadf5a4	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 19:22:55.790066+00	\N	2026-09-02 18:22:55.789151+00
24	62392cf201c313616e0a1a73393a4f37af930c6b3c039c5f51a0ea8dfdba9dea	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 18:22:55.790066+00	2026-09-02 19:27:11.246141+00	2026-09-02 18:22:55.789151+00
25	ef330c241c15af1267ff20a8c207ffc81f20aaae2aeed587fbb323df007a7d32	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 20:27:11.249179+00	\N	2026-09-02 19:27:11.248514+00
26	ae7a05ffe95a38221040308e6e04e34a12c2d4f9caec0f9fb1b17b28b8b19442	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 19:27:11.249179+00	2026-09-02 22:22:17.793798+00	2026-09-02 19:27:11.248514+00
27	5b5d46abaf2886cd9fdbba65b12b57e47850c6a18614160889d6b0e7597e44c1	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-02 23:22:17.796913+00	\N	2026-09-02 22:22:17.79615+00
28	5f011611bac78a95b23c16057588123972bb5025382e7b839055576b985bf8eb	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 22:22:17.796913+00	2026-09-02 23:12:24.831391+00	2026-09-02 22:22:17.79615+00
29	0d98fb799cd364146762e00534c293fc85899e250d28263795786ebd846dc199	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-03 00:12:24.834131+00	\N	2026-09-02 23:12:24.833661+00
30	86bd8cbb1de17510e15483030660b8c2f4c92bf057365a1f4e398e2b136ad162	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-02 23:12:24.834131+00	2026-09-03 01:50:46.716243+00	2026-09-02 23:12:24.833661+00
31	cdda64207320ac14ebc334df592cc354c98df44980152aacd91951b485f3da6c	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-03 02:50:46.719323+00	\N	2026-09-03 01:50:46.718574+00
32	43606ae38f2f85bed2e49400c3178b85b2d0ea9e174e2ec84c57b3c9fcad0aa4	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-03 01:50:46.719323+00	2026-09-03 03:05:55.283548+00	2026-09-03 01:50:46.718574+00
33	3a5ecbe0d646151f26a7891da55deffc8433c8345655e4192c53d584eea8bdc2	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-03 04:05:55.287608+00	\N	2026-09-03 03:05:55.286814+00
34	fb4753413d885edff90a0567c6725e1bc35b64c9eab54386f9d5878d3951239d	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-03 03:05:55.287608+00	2026-09-03 05:30:51.710225+00	2026-09-03 03:05:55.286814+00
35	04b4011cc734ce3562b996ec840ed0f076e1207bba1329e0fb5eaa1368096236	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-03 06:30:51.713706+00	\N	2026-09-03 05:30:51.712797+00
36	409814dd221614bd516d74ed1405613d1cfb02de5c922ca5e9495a4c842018e3	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-03 05:30:51.713706+00	2026-09-03 13:33:08.901302+00	2026-09-03 05:30:51.712797+00
37	c780eb3a6cac78d8e4e416d04c281fa01d1f74ee40adb5b069482b28ee5c10f9	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-03 14:33:08.906285+00	\N	2026-09-03 13:33:08.905195+00
38	fac8b9d947c1a35f18f871353c4f375c4c7af29ead461afb0ee2e2405146f493	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-03 13:33:08.906285+00	2026-09-04 11:27:35.199001+00	2026-09-03 13:33:08.905195+00
39	6fe3df8739436e833b59dd54bbeea45b657a9731187394953625f2caf899f09e	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-04 12:27:35.205113+00	\N	2026-09-04 11:27:35.203829+00
40	28f2d53e5083e9577f4db1c677e7e6d172bd10a4113da32e980165a6855ed75e	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-04 11:27:35.205113+00	2026-09-04 12:48:05.388928+00	2026-09-04 11:27:35.203829+00
41	4a9a49827a0315664fc05c9b1bb9604620bf155822eec4bf7557b0da0c0bc580	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-04 13:48:05.392445+00	\N	2026-09-04 12:48:05.39151+00
42	3809462d963f0724589890b6dd554e055e4ba46b6ef4cff433c1cceb81b0d2c6	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-04 12:48:05.392445+00	2026-09-05 02:00:57.390342+00	2026-09-04 12:48:05.39151+00
43	bc54396c787c0ea1a0748976083ba605976ff2ff36d3c18050c9eb818852a97b	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-05 03:00:57.412438+00	\N	2026-09-05 02:00:57.409486+00
44	0fc0743a28260a46db21caba3ed517c32bf942896dcccd5b9d75bdce08517d84	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-05 02:00:57.412438+00	2026-09-05 02:52:12.448614+00	2026-09-05 02:00:57.409486+00
45	35fa0f3f06d0518327904348f25a05d6659b1e8f88b244b7655b9e8827f5dce5	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-05 03:52:12.452571+00	\N	2026-09-05 02:52:12.451591+00
46	fd77e837e58945fe5d58c410041e299b72272c4d676e0f2d23474ba9701dbb34	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-05 02:52:12.452571+00	2026-09-05 04:25:48.845771+00	2026-09-05 02:52:12.451591+00
47	04692e71b92c337f4b4526a3ca94d0186fa4dbb0052bb1363a490e114a104643	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-05 05:25:48.850626+00	\N	2026-09-05 04:25:48.849723+00
48	ffa5b4bf23bf2be7d9cd462228a711e3a1b2f0386a486e73d8d605bc2700f024	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-05 04:25:48.850626+00	2026-09-05 08:32:57.226061+00	2026-09-05 04:25:48.849723+00
49	b729ded7d83663288da806f705cb2133037eafe41d50154d075288c58d00c3b6	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-05 09:32:57.239475+00	\N	2026-09-05 08:32:57.236353+00
51	189fec41d84099bb28569418046e83ed5fffd3868632c861a15241b43e08baaa	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-05 12:50:16.28289+00	\N	2026-09-05 11:50:16.282243+00
50	0e56092bdc733057d6921c0a6b54041c453a9bbf7533adc6d7db92e4b19e3af6	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-05 08:32:57.239475+00	2026-09-05 12:38:22.082458+00	2026-09-05 08:32:57.236353+00
53	3a307fb489b7234cdec830f32e1fd75f39eaf3cf191f99f317846161d735b741	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-05 13:38:22.087692+00	\N	2026-09-05 12:38:22.086832+00
54	daf77e64b28674572912bd239ad88059a99b12020ab62ab078df6ad5a38b2aec	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-05 12:38:22.087692+00	2026-09-05 14:09:16.759635+00	2026-09-05 12:38:22.086832+00
55	bc3cf776a70804bc9b4b201d87d05e4bfda99fc80864a9975b0f879b30c19c59	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-05 15:09:16.764947+00	\N	2026-09-05 14:09:16.763986+00
52	fe2e2f489de7507281fe99f4bc6949426d90320b6ad52ef0ea09da62c701da6d	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-05 11:50:16.28289+00	2026-09-05 16:55:41.00985+00	2026-09-05 11:50:16.282243+00
57	d4a08536852d3863d807da45f871ef674ce0b43a3910b3a243835ba4971a611d	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-05 17:55:41.01391+00	\N	2026-09-05 16:55:41.013125+00
58	fa9a8b673526df4ab833140fed090b0c9fdc70a188e71cbe06759de95f69fc71	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-05 16:55:41.01391+00	2026-09-06 01:32:31.983653+00	2026-09-05 16:55:41.013125+00
59	bc466a99ee8258cf903510138adc573b29629e83daf46b54f2de5d1452b8d6fc	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-06 02:32:32.009051+00	\N	2026-09-06 01:32:32.005265+00
60	07a8aeed73773b2d9ba65f5ab2134b109290c7bb7658af6ffa7837ac4d2fb9d0	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-06 01:32:32.009051+00	2026-09-06 02:48:00.5311+00	2026-09-06 01:32:32.005265+00
61	32bffc2d34795c2eda0fc5da2c184acddcbcff085a8afdb93b86b2945448244f	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-06 03:48:00.572176+00	\N	2026-09-06 02:48:00.568763+00
56	300a5825b17fa824dfee1c9a37106d781d4e7f40a814c0df83326cc70ccd424a	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-05 14:09:16.764947+00	2026-09-06 06:30:12.005414+00	2026-09-05 14:09:16.763986+00
63	e8a2cf3faea17feec127805088390dc252695b2788b05e9597ed1987789fc3af	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-06 07:30:12.011537+00	\N	2026-09-06 06:30:12.010249+00
62	73b025ac3e07f77837dee47c514b8d914ba5bccc9406f78e01ac310503220e26	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-06 02:48:00.572176+00	2026-09-06 06:41:10.104671+00	2026-09-06 02:48:00.568763+00
65	73e5c34878ce5af3cf0021adca72e9f619bf4cdc0d465505443a425ff33f802e	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-06 07:41:10.107271+00	\N	2026-09-06 06:41:10.1068+00
64	3cb605dbfc3096e1628610c9b42d2e3a67170bd03533a89ab53a20a528a30209	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-06 06:30:12.011537+00	2026-09-07 05:07:58.16601+00	2026-09-06 06:30:12.010249+00
66	786f7e2f90c30fc48654910854b517e5c0b82cd5553a4e84d4ed627724a0b1ba	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-06 06:41:10.107271+00	2026-09-07 01:33:30.295475+00	2026-09-06 06:41:10.1068+00
67	ad064aef7479596d8e9e464fca196feb8a575cd288034171fc363abf9569ef62	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 02:33:30.30247+00	\N	2026-09-07 01:33:30.301028+00
69	478baa1e5de83bb39c6ee27610385002b0334bf33ad9a8a5ef91414da28d5131	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 06:07:58.169502+00	\N	2026-09-07 05:07:58.168659+00
68	0c91fc8f2cd95b746f0a9c55c3ca89db4358f3f1815c6f3860002d037c4e3655	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 01:33:30.30247+00	2026-09-07 07:36:57.182868+00	2026-09-07 01:33:30.301028+00
71	e1a8f43cd84f6170d40d7c9f5a3a572faa6c755278cf7db91f2edf21bb122981	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 08:36:57.189959+00	\N	2026-09-07 07:36:57.188459+00
70	53918459926954cff158e8781b521e954369ead7cfea74c8b3b3c66661f631c0	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 05:07:58.169502+00	2026-09-07 10:44:23.450944+00	2026-09-07 05:07:58.168659+00
73	2d42d0f2bb32835dc07c093e670fe253a3cf638b9e1783c1acc59248d0e5a5ab	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 11:44:23.455685+00	\N	2026-09-07 10:44:23.454097+00
74	b5066b02962acbd89134b3c2d9802f6fcbeacc901dea49b8e2a0482d2d0b0770	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 10:44:23.455685+00	2026-09-07 12:24:30.567406+00	2026-09-07 10:44:23.454097+00
75	512234b08dc6b8a693fad19dc79cca14d69b8baa7b04097e435041f7cbb169e8	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 13:24:30.571166+00	\N	2026-09-07 12:24:30.570292+00
72	a263c8e66aab4f4a2c413d51509ca995ccd69024a5d372549af1b6da405037a5	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 07:36:57.189959+00	2026-09-07 14:11:55.369468+00	2026-09-07 07:36:57.188459+00
77	08c3e26a81011c1ac24cb1b97582d297fa378b4e222830f87e28ffa074f9f6ad	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 15:11:55.372959+00	\N	2026-09-07 14:11:55.372073+00
76	7ddf8718aabebe970ce97626e47eeea994229b16ec64678ab7ab25cf0750b1b8	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 12:24:30.571166+00	2026-09-07 14:19:24.037454+00	2026-09-07 12:24:30.570292+00
79	caba0542ca8dc0e7d84d19d5a27bdbb39cfbf3926041cd6d29a4e1e5868744db	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 15:19:24.040523+00	\N	2026-09-07 14:19:24.039636+00
80	8b368c0b3681b8237edcf304a1774189e966005c30b521e16b41f4f254f6d93e	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 14:19:24.040523+00	2026-09-07 15:09:37.290003+00	2026-09-07 14:19:24.039636+00
81	18d0f59851c32113adff04a56247c84ba87ad57e22c2b53e9c909655a04a1414	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 16:09:37.293866+00	\N	2026-09-07 15:09:37.293169+00
82	20ed32b742d98a3e7bb27b8ab0ca6ced108d05611a9538bf483c55b0fe8f82a0	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 15:09:37.293866+00	2026-09-07 16:46:29.691172+00	2026-09-07 15:09:37.293169+00
83	2b3b30ae18ef85c8d2baf94af65a2ee55bee3d4940b9bd1c4e5c9ad807e45608	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 17:46:29.694677+00	\N	2026-09-07 16:46:29.693772+00
84	505465743ed7c50acf13d3d081d5b642ba7677178de51274aa8b71a732a9c5a9	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 16:46:29.694677+00	2026-09-07 18:05:32.794818+00	2026-09-07 16:46:29.693772+00
85	e109043edad3ae70ef08b45de3a66261dd61b4d6b5912e82f640eb4b16b421de	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-07 19:05:32.798+00	\N	2026-09-07 18:05:32.797083+00
78	15ca8d388bb65283d0a868a034264780571a18b1396a6e7c36029600c425f922	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 14:11:55.372959+00	2026-09-08 01:12:37.76967+00	2026-09-07 14:11:55.372073+00
87	7dcc6de322585c1e252553fec7bcdd49f7cec24bf36f18407df4a981e4f36f08	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 02:12:37.784288+00	\N	2026-09-08 01:12:37.781845+00
86	18ea33901856253619f1c449e80c5911a8825ba91e57d10935359b519a6320b5	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-07 18:05:32.798+00	2026-09-08 01:15:53.97348+00	2026-09-07 18:05:32.797083+00
89	e600a2015d3ef9e33db2c189e59d208c0b06d42c73afa2068f2ec99c83dbe216	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 02:15:53.976537+00	\N	2026-09-08 01:15:53.975964+00
90	291d028e602fdb8ac684955407ab1ee5fd2222e24214d4719d013a580e434f81	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 01:15:53.976537+00	2026-09-08 04:11:58.043844+00	2026-09-08 01:15:53.975964+00
91	e8baa9cfa9cf9f6b90122bd781007051189e122cea2893461d027ee08126da24	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 05:11:58.047483+00	\N	2026-09-08 04:11:58.04648+00
92	c012b0f1146ebf33e5536008b9eac748a237af49b48e11bdfbee3ae160014bc1	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 04:11:58.047483+00	2026-09-08 06:02:05.095673+00	2026-09-08 04:11:58.04648+00
93	6c0297e654dcbf46512558a933b29189618263ec0ce4c1531edd94bff4c355ee	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 07:02:05.100209+00	\N	2026-09-08 06:02:05.099079+00
88	c13159f11a3cf2f2ffa5930bb719b4bf04452a62dcf648b79bc5b4970e7d13b2	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 01:12:37.784288+00	2026-09-08 07:19:08.300151+00	2026-09-08 01:12:37.781845+00
95	2df81f9e80512a92408b13fd567372a3c8887238bfc273d0a3a02bc88bf2c9f7	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 08:19:08.305301+00	\N	2026-09-08 07:19:08.303976+00
96	320b445e3fcb1eb4de09e57aae256444bdf4b727572ec1efcec1b4037b36bcb1	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 07:19:08.305301+00	2026-09-08 14:07:30.381361+00	2026-09-08 07:19:08.303976+00
97	51b6e7225354147f17db87423510cec6c3a8dfa6a6a6854f00b930852f008429	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 15:07:30.412333+00	\N	2026-09-08 14:07:30.408056+00
98	e2fd3e868b1a044e54ffade0f59e611f04e659e4326d474a6c4a008f6945414a	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 14:07:30.412333+00	2026-09-08 19:34:23.641403+00	2026-09-08 14:07:30.408056+00
94	65667226986bf721e4f199ffd631d19171d32f5b1501af55a406f8b5a1b13997	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 06:02:05.100209+00	2026-09-08 14:09:13.714001+00	2026-09-08 06:02:05.099079+00
99	f08d7b82a0523fc3812160fd7e6c1793c2bf943dc31032a3416df94302707899	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 15:09:13.717601+00	\N	2026-09-08 14:09:13.717012+00
100	c35a0ea5f3d9107f2e2b8a72a8007ad9b0a0424fd8b0a0b49762736d1c68be70	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 14:09:13.717601+00	2026-09-08 17:10:06.583294+00	2026-09-08 14:09:13.717012+00
101	003e301dac6f8dae2135b516d1b3a53b76ad992653a7d8431b9786034625e2ad	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 18:10:06.587832+00	\N	2026-09-08 17:10:06.586821+00
103	824ccf53d020761c0e11a13048151889f8ff05eca73eb05cccfeb96f7858eb39	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-08 20:34:23.64625+00	\N	2026-09-08 19:34:23.644868+00
104	84a0cc033318aa1b058033e818495732c7f867cdffdc52bc6486f7cf85ca44b5	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 19:34:23.64625+00	2026-09-09 02:44:09.098362+00	2026-09-08 19:34:23.644868+00
105	1779920ee92548183f57676b560e665fbc01f1ed79610760363bbbd2de4a1ba0	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-09 03:44:09.10248+00	\N	2026-09-09 02:44:09.101242+00
106	3150a082c8adea74f41526bc2d40957322a77168bf907bf4f411c23365e49bf1	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-09 02:44:09.10248+00	2026-09-09 04:21:06.866051+00	2026-09-09 02:44:09.101242+00
107	8381defa84f69304d19cb9f521178652b5e5d1b916361dec489b2bc5a39fc95b	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-09 05:21:06.870163+00	\N	2026-09-09 04:21:06.868991+00
108	b742aea00a51c5d5f045defaabc8948fad04d04afafed6de305a2e18737ba137	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-09 04:21:06.870163+00	2026-09-09 06:29:01.650207+00	2026-09-09 04:21:06.868991+00
109	5777022ace6cefe564e8e30d903e0fe60b896ba08ada6c23af2ce9d3a1277f4c	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-09 07:29:01.671375+00	\N	2026-09-09 06:29:01.667564+00
110	57bc2cf4a140ebd012de79de8e853b39d548329be1a449e288d6c23314e9ee57	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-09 06:29:01.671375+00	2026-09-09 16:50:23.995491+00	2026-09-09 06:29:01.667564+00
111	32e0023bc320fcc7ad5ac292759809e4aab3834bd705658e20bc59dc6870d5cd	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-09 17:50:24.007002+00	\N	2026-09-09 16:50:24.003018+00
102	17b717f66e1254a50dd4bef994b27a5e7302e16f50bf5d1aa8087b58017d4646	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-08 17:10:06.587832+00	2026-09-09 17:32:32.812251+00	2026-09-08 17:10:06.586821+00
113	e484f89ce05b8e5cf81189caafb6521ebf9b1553dd56f116f8ca24f35dd5ffd6	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-09 18:32:32.815749+00	\N	2026-09-09 17:32:32.814742+00
114	d657f6c644ecd704cc839d3a0fa69428a91eef7745c113a2c9d11d570d3190a3	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-09 17:32:32.815749+00	2026-09-09 18:25:56.508728+00	2026-09-09 17:32:32.814742+00
115	f9c2f5671a41d989762bc0ab3956067d131fc9ed3f29e3d916e8deacfac576ce	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-09 19:25:56.511626+00	\N	2026-09-09 18:25:56.511078+00
112	8a77659d744e71183db9079a1623416a8f2fb1f36df4f72d13ab10f2a3ead6df	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-09 16:50:24.007002+00	2026-09-10 04:51:44.320796+00	2026-09-09 16:50:24.003018+00
117	ae0d534d9c31679093f65e56777ccc21ae56af230d4ebaf910b450d2c4ba815b	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-10 05:51:44.35136+00	\N	2026-09-10 04:51:44.34726+00
116	b5a2aa9e789ab8e412aae615432c0631ece2661e6034f72bd125a7c87f3c575a	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-09 18:25:56.511626+00	2026-09-10 06:15:30.879434+00	2026-09-09 18:25:56.511078+00
119	d898eae051a4f59dcb9943e7ad35922e4635c7b76eb318387adcd138d014a281	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-10 07:15:30.891585+00	\N	2026-09-10 06:15:30.890261+00
118	8ef797fdf7998a836b943b22ff2c4cd15495d27eb62114b1b8d10daeba4a73ca	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-10 04:51:44.35136+00	2026-09-10 08:01:18.444026+00	2026-09-10 04:51:44.34726+00
121	4259a696dabe603c62f7dab066258e82d8db993b604e7b8f3413972f476967de	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-10 09:01:18.448503+00	\N	2026-09-10 08:01:18.447298+00
122	4682308cc6522339659136e9c1f00061cac323e0cc8fad91df1354136ac075f8	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-10 08:01:18.448503+00	2026-09-10 10:56:12.288287+00	2026-09-10 08:01:18.447298+00
123	46c4b40af81879a30fc12028557434a7ea2dfd3f49b02f826a338530346e15dd	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-10 11:56:12.297542+00	\N	2026-09-10 10:56:12.295869+00
124	3e2cc8c8c2ec199d0f04572ef03e4d778291dc7b1dbdbf14246de291dcd904d4	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-10 10:56:12.297542+00	2026-09-10 17:01:14.290793+00	2026-09-10 10:56:12.295869+00
125	05f9018325487e0353323de197fa507ecc675a8700734b3e886c95586470b4ca	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-10 18:01:14.30616+00	\N	2026-09-10 17:01:14.303562+00
126	c084bb40075e77e6874d084b1767e0ce11e04f17b620a35b9f965d9decaf08d8	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-10 17:01:14.30616+00	2026-09-11 01:30:11.471763+00	2026-09-10 17:01:14.303562+00
127	c91d1f088148ca62d2d0d9bce90c2eae60394358a297efdd96af1754126fe6d4	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-11 02:30:11.496068+00	\N	2026-09-11 01:30:11.4923+00
128	a05f824c317d661a7b681c27fb6474c1a919c4ec845504eb46e7a01b168cc47f	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-11 01:30:11.496068+00	2026-09-11 03:18:54.11976+00	2026-09-11 01:30:11.4923+00
129	119260465f0c17ea66b8e0ebc7b78eccdf7600aed205f273973d534857bceb2e	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-11 04:18:54.123667+00	\N	2026-09-11 03:18:54.122478+00
120	ed6846b8a12cdec6904d3f2f5226da5da3214d552b31e1dfdfb930d2bc639efc	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-10 06:15:30.891585+00	2026-09-11 12:39:58.572678+00	2026-09-10 06:15:30.890261+00
130	d7ee6a7ea0ba708610be65b13477619770d3b051745efadfd2bced9dd937aa79	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-11 03:18:54.123667+00	2026-09-11 05:27:17.586637+00	2026-09-11 03:18:54.122478+00
131	a948dd9fd9312a31974eb3c745963d70aff75433ddd5fb362eba2705bf06eb8e	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-11 06:27:17.59306+00	\N	2026-09-11 05:27:17.591735+00
132	1a093f55c02b453802d9286bc93c00ed207032fbb2f2a2851f4923f261b8c016	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-11 05:27:17.59306+00	2026-09-11 07:42:19.34896+00	2026-09-11 05:27:17.591735+00
133	1af96d317b7aa1df8b47d297da9dde8d5f92c49b6902a49f89b3a94d3f1d7da4	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-11 08:42:19.390101+00	\N	2026-09-11 07:42:19.384857+00
134	16291b112b22414764914db90cbcce947227b420f4627c2c42349c259afbb602	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-11 07:42:19.390101+00	2026-09-11 10:15:25.035457+00	2026-09-11 07:42:19.384857+00
135	5083aa280ea6bb3766a8aaeff37122fd8bbe2d80627692b79b21a2cdb18efdc4	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-11 11:15:25.059886+00	\N	2026-09-11 10:15:25.056965+00
137	86918667747a4ce914dc907393086a064d84b56559562fe2131b3737bb767f29	access	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-11 13:39:58.587666+00	\N	2026-09-11 12:39:58.585616+00
138	289e3e603cb6eba6a59691eb74c7724aeacbdfce9e5e986650acdc2b1ef2610d	refresh	mcp_KXVW0TFcnSx_dCWTlDq6lMk7jUg0w-qP	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-11 12:39:58.587666+00	\N	2026-09-11 12:39:58.585616+00
136	b8ccbd1d4e0498af66af550090a09dd799b0be0cd59426cd009ac48979b397c5	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-11 10:15:25.059886+00	2026-09-11 16:18:04.295234+00	2026-09-11 10:15:25.056965+00
139	e0845975347398335761364e07a6d23142d88813e9a56597cf2cebd91dd97c81	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-11 17:18:04.317642+00	\N	2026-09-11 16:18:04.314182+00
140	d518cf34e56b3bb5919f2ebed73edf2213c18b22bc1584b279bb6a9d31b37c53	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-11 16:18:04.317642+00	2026-09-11 18:44:16.167007+00	2026-09-11 16:18:04.314182+00
141	8d5e23d344be1a200759a28221fcc8b2fb4544780bb1ba4b57108732678bfd62	access	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-09-11 19:44:16.185486+00	\N	2026-09-11 18:44:16.182567+00
142	7f78889a69d0614ab4c57361eda289d884f2b015c8e7e09567ec4717f6e47bcf	refresh	mcp_zelUnvrBCuVghVHv2arlyk1RwBozjVcI	1	1	["catalog:read", "catalog:write"]	https://dreamrugscreation.in/mcp/	2026-10-11 18:44:16.185486+00	\N	2026-09-11 18:44:16.182567+00
\.


--
-- Data for Name: mood_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mood_master (id, tenant_id, name, sort_order, is_active) FROM stdin;
1	1	warm_earthy	0	t
2	1	quiet_luxury	1	t
3	1	modern_minimal	2	t
4	1	bohemian	3	t
5	1	bold_artistic	4	t
6	1	timeless_traditional	5	t
7	1	artisan	6	t
8	1	luxury	7	t
9	1	timeless	8	t
\.


--
-- Data for Name: moq_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.moq_rules (id, tenant_id, rug_type, minimum_sqm, minimum_pieces, notes) FROM stdin;
1	1	custom	4	\N	All custom-size orders must be at least 4 sqm.
2	1	catalog	\N	2	Standard catalog orders require a minimum of 2 pieces.
3	1	hand-knotted	6	1	Hand-knotted rugs require a minimum of 6 sqm per order.
4	1	flatweave	\N	4	Flatweave rugs: minimum 4 pieces per order.
5	1	machine-woven	\N	10	Machine-woven orders: minimum 10 pieces per run.
\.


--
-- Data for Name: newsletter_subscribers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.newsletter_subscribers (id, tenant_id, email, source, subscribed_at) FROM stdin;
1	1	munshiaqueel@gmail.com	homepage_footer	2026-08-19 05:15:15+00
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, quote_id, created_at) FROM stdin;
1	1	1	2026-08-19 02:08:36+00
\.


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_status_history (id, order_id, status, changed_at) FROM stdin;
1	1	quality_check	2026-08-19 05:14:43+00
2	1	pending	2026-09-05 10:48:56.220243+00
3	1	cancelled	2026-09-05 10:48:58.934315+00
4	1	pending	2026-09-06 07:07:21.495746+00
5	1	cancelled	2026-09-06 07:07:24.120807+00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, tenant_id, quote_id, status, shipping_address, estimated_delivery, actual_delivery, promo_code, discount_amount, shipping_cost, total_amount, price_currency, razorpay_payment_id, refund_id, refund_status, refund_amount, refunded_at, recovered_via_webhook, created_at) FROM stdin;
1	1	1	cancelled	\N	2026-09-14 06:59:31.398139+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-08-17 06:59:31+00
\.


--
-- Data for Name: payment_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_attempts (id, tenant_id, razorpay_order_id, customer_id_hint, payload, amount, currency, status, order_id, processing_started_at, last_error, created_at, completed_at) FROM stdin;
1	1	order_TRT3QwUVcBy450	\N	{"items": [{"rug_id": 1, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 1, "rush_order": false, "shape": "rect", "notes": null}], "name": "Akeel Munshi", "email": "munshiaqueel@gmail.com", "phone": "+918208112047", "company": null, "shipping_address": "Near Kedari petrol pump, Ashwini Palace, Wanowrie, Pune, Maharashtra, 411040, India", "country": "India", "promo_code": null}	12642.34	INR	created	\N	\N	\N	2026-08-19 02:43:34+00	\N
2	1	order_TVuVqVfhEuKjpc	\N	{"items": [{"rug_id": 7, "size_w": 0.6096, "size_h": 0.9144000000000001, "qty": 1, "rush_order": false, "shape": "rect", "notes": null}], "name": "Aqueel Munshi", "email": "munshiaqueel@gmail.com", "phone": null, "company": null, "shipping_address": "test, test, test, test, 241242, India", "country": "India", "promo_code": null, "_checkout_snapshot": {"subtotal": 2300.0, "shipping_cost": 0.0, "discount_amount": 0.0, "promo_code": null, "items": [{"item": {"rug_id": 7, "size_w": 0.6096, "size_h": 0.9144000000000001, "qty": 1, "rush_order": false, "shape": "rect", "notes": null}, "rug_id": 7, "material_id": 5, "shape": "rect", "calc": {"shape": "rect", "size_sqm": 0.5574, "total_sqm": 0.5574, "catalog_price_per_piece": 2300.0, "base_price_per_sqm": 4126.3, "material_cost_per_sqm": 2800.0, "profit_margin_pct": 33.97, "subtotal": 2300.0, "bulk_discount": 0.0, "manual_discount": 0.0, "rush_surcharge": 0.0, "size_surcharge": 0.0, "pre_gst_price": 2300.0, "gst_pct": 0.0, "gst_amount": 0.0, "gst_inclusive": false, "final_price": 2300.0, "price_per_piece": 2300.0, "price_currency": "INR", "moq_met": false, "moq_message": "MOQ not met: minimum 6.0 sqm required, you ordered 0.56 sqm.", "material_available": true, "material_message": "Stock sufficient: 102.0 sqm available, need 0.6 sqm.", "estimated_days": 36, "standard_days": 36, "rush_days": 26, "rush_available": true, "breakdown": [{"label": "Catalog price (2300.00 \\u00d7 1 piece)", "amount": 2300.0}]}, "total_sqm": 0.5574182400000001}]}}	2300	INR	created	\N	\N	\N	2026-08-30 08:11:12.334639+00	\N
3	1	order_TWBeJkV1m0WaQa	\N	{"items": [{"rug_id": 9, "size_w": 2.4384, "size_h": 3.048, "qty": 5, "rush_order": true, "shape": "rect", "notes": null}, {"rug_id": 10, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 6, "rush_order": true, "shape": "rect", "notes": null}, {"rug_id": 8, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 6, "rush_order": false, "shape": "rect", "notes": null}], "name": "Aqueel Munshi", "email": "munshiaqueel@gmail.com", "phone": null, "company": null, "shipping_address": "test, test, test, test, 545353, United States", "country": "United States", "promo_code": null, "_checkout_snapshot": {"subtotal": 83704.8, "shipping_cost": 0.0, "discount_amount": 0.0, "promo_code": null, "items": [{"item": {"rug_id": 9, "size_w": 2.4384, "size_h": 3.048, "qty": 5, "rush_order": true, "shape": "rect", "notes": null}, "rug_id": 9, "material_id": 5, "shape": "rect", "calc": {"shape": "rect", "size_sqm": 7.4322, "total_sqm": 37.161, "catalog_price_per_piece": 7890.0, "base_price_per_sqm": 1061.6, "material_cost_per_sqm": 2800.0, "profit_margin_pct": -65.53, "subtotal": 39450.0, "bulk_discount": 2761.5, "manual_discount": 0.0, "rush_surcharge": 9862.5, "size_surcharge": 0.0, "pre_gst_price": 46551.0, "gst_pct": 0.0, "gst_amount": 0.0, "gst_inclusive": false, "final_price": 46551.0, "price_per_piece": 9310.2, "price_currency": "INR", "moq_met": true, "moq_message": "MOQ requirements met.", "material_available": true, "material_message": "Stock sufficient: 102.0 sqm available, need 40.9 sqm.", "estimated_days": 15, "standard_days": 21, "rush_days": 15, "rush_available": true, "breakdown": [{"label": "Catalog price (7890.00 \\u00d7 5 pieces)", "amount": 39450.0}, {"rule": "Rush surcharge (25%)", "type": "rush_fee", "amount": 9862.5, "description": "Priority production: +25% on subtotal"}, {"rule": "Mid-Volume Discount (5-9 pieces)", "type": "bulk_discount", "amount": -2761.5, "description": "Orders of 5\\u20139 pieces receive a 7% discount."}]}, "total_sqm": 37.161216}, {"item": {"rug_id": 10, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 6, "rush_order": true, "shape": "rect", "notes": null}, "rug_id": 10, "material_id": 5, "shape": "rect", "calc": {"shape": "rect", "size_sqm": 5.0168, "total_sqm": 30.1008, "catalog_price_per_piece": 3435.0, "base_price_per_sqm": 684.7, "material_cost_per_sqm": 2800.0, "profit_margin_pct": -77.77, "subtotal": 20610.0, "bulk_discount": 1442.7, "manual_discount": 0.0, "rush_surcharge": 5152.5, "size_surcharge": 0.0, "pre_gst_price": 24319.8, "gst_pct": 0.0, "gst_amount": 0.0, "gst_inclusive": false, "final_price": 24319.8, "price_per_piece": 4053.3, "price_currency": "INR", "moq_met": false, "moq_message": "MOQ not met: minimum 10 pieces required, you ordered 6.", "material_available": true, "material_message": "Stock sufficient: 102.0 sqm available, need 33.1 sqm.", "estimated_days": 19, "standard_days": 26, "rush_days": 19, "rush_available": true, "breakdown": [{"label": "Catalog price (3435.00 \\u00d7 6 pieces)", "amount": 20610.0}, {"rule": "Rush surcharge (25%)", "type": "rush_fee", "amount": 5152.5, "description": "Priority production: +25% on subtotal"}, {"rule": "Mid-Volume Discount (5-9 pieces)", "type": "bulk_discount", "amount": -1442.7, "description": "Orders of 5\\u20139 pieces receive a 7% discount."}]}, "total_sqm": 30.100584960000006}, {"item": {"rug_id": 8, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 6, "rush_order": false, "shape": "rect", "notes": null}, "rug_id": 8, "material_id": 5, "shape": "rect", "calc": {"shape": "rect", "size_sqm": 5.0168, "total_sqm": 30.1008, "catalog_price_per_piece": 2300.0, "base_price_per_sqm": 458.46, "material_cost_per_sqm": 2800.0, "profit_margin_pct": -85.11, "subtotal": 13800.0, "bulk_discount": 966.0, "manual_discount": 0.0, "rush_surcharge": 0.0, "size_surcharge": 0.0, "pre_gst_price": 12834.0, "gst_pct": 0.0, "gst_amount": 0.0, "gst_inclusive": false, "final_price": 12834.0, "price_per_piece": 2139.0, "price_currency": "INR", "moq_met": true, "moq_message": "MOQ requirements met.", "material_available": true, "material_message": "Stock sufficient: 102.0 sqm available, need 33.1 sqm.", "estimated_days": 21, "standard_days": 21, "rush_days": 15, "rush_available": true, "breakdown": [{"label": "Catalog price (2300.00 \\u00d7 6 pieces)", "amount": 13800.0}, {"rule": "Mid-Volume Discount (5-9 pieces)", "type": "bulk_discount", "amount": -966.0, "description": "Orders of 5\\u20139 pieces receive a 7% discount."}]}, "total_sqm": 30.100584960000006}]}}	83704.8	INR	created	\N	\N	\N	2026-08-31 00:57:00.965416+00	\N
4	1	order_TWBhtzPGcc11am	\N	{"items": [{"rug_id": 9, "size_w": 2.4384, "size_h": 3.048, "qty": 5, "rush_order": true, "shape": "rect", "notes": null}, {"rug_id": 10, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 6, "rush_order": true, "shape": "rect", "notes": null}, {"rug_id": 8, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 6, "rush_order": false, "shape": "rect", "notes": null}], "name": "Aqueel Munshi", "email": "munshiaqueel@gmail.com", "phone": null, "company": null, "shipping_address": "test, test, test, test, 765765, United States", "country": "United States", "promo_code": null, "_checkout_snapshot": {"subtotal": 83704.8, "shipping_cost": 0.0, "discount_amount": 0.0, "promo_code": null, "items": [{"item": {"rug_id": 9, "size_w": 2.4384, "size_h": 3.048, "qty": 5, "rush_order": true, "shape": "rect", "notes": null}, "rug_id": 9, "material_id": 5, "shape": "rect", "calc": {"shape": "rect", "size_sqm": 7.4322, "total_sqm": 37.161, "catalog_price_per_piece": 7890.0, "base_price_per_sqm": 1061.6, "material_cost_per_sqm": 2800.0, "profit_margin_pct": -65.53, "subtotal": 39450.0, "bulk_discount": 2761.5, "manual_discount": 0.0, "rush_surcharge": 9862.5, "size_surcharge": 0.0, "pre_gst_price": 46551.0, "gst_pct": 0.0, "gst_amount": 0.0, "gst_inclusive": false, "final_price": 46551.0, "price_per_piece": 9310.2, "price_currency": "INR", "moq_met": true, "moq_message": "MOQ requirements met.", "material_available": true, "material_message": "Stock sufficient: 102.0 sqm available, need 40.9 sqm.", "estimated_days": 15, "standard_days": 21, "rush_days": 15, "rush_available": true, "breakdown": [{"label": "Catalog price (7890.00 \\u00d7 5 pieces)", "amount": 39450.0}, {"rule": "Rush surcharge (25%)", "type": "rush_fee", "amount": 9862.5, "description": "Priority production: +25% on subtotal"}, {"rule": "Mid-Volume Discount (5-9 pieces)", "type": "bulk_discount", "amount": -2761.5, "description": "Orders of 5\\u20139 pieces receive a 7% discount."}]}, "total_sqm": 37.161216}, {"item": {"rug_id": 10, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 6, "rush_order": true, "shape": "rect", "notes": null}, "rug_id": 10, "material_id": 5, "shape": "rect", "calc": {"shape": "rect", "size_sqm": 5.0168, "total_sqm": 30.1008, "catalog_price_per_piece": 3435.0, "base_price_per_sqm": 684.7, "material_cost_per_sqm": 2800.0, "profit_margin_pct": -77.77, "subtotal": 20610.0, "bulk_discount": 1442.7, "manual_discount": 0.0, "rush_surcharge": 5152.5, "size_surcharge": 0.0, "pre_gst_price": 24319.8, "gst_pct": 0.0, "gst_amount": 0.0, "gst_inclusive": false, "final_price": 24319.8, "price_per_piece": 4053.3, "price_currency": "INR", "moq_met": false, "moq_message": "MOQ not met: minimum 10 pieces required, you ordered 6.", "material_available": true, "material_message": "Stock sufficient: 102.0 sqm available, need 33.1 sqm.", "estimated_days": 19, "standard_days": 26, "rush_days": 19, "rush_available": true, "breakdown": [{"label": "Catalog price (3435.00 \\u00d7 6 pieces)", "amount": 20610.0}, {"rule": "Rush surcharge (25%)", "type": "rush_fee", "amount": 5152.5, "description": "Priority production: +25% on subtotal"}, {"rule": "Mid-Volume Discount (5-9 pieces)", "type": "bulk_discount", "amount": -1442.7, "description": "Orders of 5\\u20139 pieces receive a 7% discount."}]}, "total_sqm": 30.100584960000006}, {"item": {"rug_id": 8, "size_w": 1.8288000000000002, "size_h": 2.7432000000000003, "qty": 6, "rush_order": false, "shape": "rect", "notes": null}, "rug_id": 8, "material_id": 5, "shape": "rect", "calc": {"shape": "rect", "size_sqm": 5.0168, "total_sqm": 30.1008, "catalog_price_per_piece": 2300.0, "base_price_per_sqm": 458.46, "material_cost_per_sqm": 2800.0, "profit_margin_pct": -85.11, "subtotal": 13800.0, "bulk_discount": 966.0, "manual_discount": 0.0, "rush_surcharge": 0.0, "size_surcharge": 0.0, "pre_gst_price": 12834.0, "gst_pct": 0.0, "gst_amount": 0.0, "gst_inclusive": false, "final_price": 12834.0, "price_per_piece": 2139.0, "price_currency": "INR", "moq_met": true, "moq_message": "MOQ requirements met.", "material_available": true, "material_message": "Stock sufficient: 102.0 sqm available, need 33.1 sqm.", "estimated_days": 21, "standard_days": 21, "rush_days": 15, "rush_available": true, "breakdown": [{"label": "Catalog price (2300.00 \\u00d7 6 pieces)", "amount": 13800.0}, {"rule": "Mid-Volume Discount (5-9 pieces)", "type": "bulk_discount", "amount": -966.0, "description": "Orders of 5\\u20139 pieces receive a 7% discount."}]}, "total_sqm": 30.100584960000006}]}}	83704.8	INR	created	\N	\N	\N	2026-08-31 01:00:24.538611+00	\N
5	1	order_TWOTEMd6v2s77X	\N	{"items": [{"rug_id": 10, "size_w": 0.9144000000000001, "size_h": 1.524, "qty": 1, "rush_order": false, "shape": "rect", "notes": null}], "name": "Aqueel Munshi", "email": "munshiaqueel@gmail.com", "phone": null, "company": null, "shipping_address": "test, test, test, test, 411040, India", "country": "India", "promo_code": null, "_checkout_snapshot": {"subtotal": 2322.0, "shipping_cost": 0.0, "discount_amount": 0.0, "promo_code": null, "items": [{"item": {"rug_id": 10, "size_w": 0.9144000000000001, "size_h": 1.524, "qty": 1, "rush_order": false, "shape": "rect", "notes": null}, "rug_id": 10, "material_id": 5, "shape": "rect", "calc": {"shape": "rect", "size_sqm": 1.3935, "total_sqm": 1.3935, "catalog_price_per_piece": 2322.0, "base_price_per_sqm": 1666.31, "material_cost_per_sqm": 2800.0, "profit_margin_pct": -45.9, "subtotal": 2322.0, "bulk_discount": 0.0, "manual_discount": 0.0, "rush_surcharge": 0.0, "size_surcharge": 0.0, "pre_gst_price": 2322.0, "gst_pct": 0.0, "gst_amount": 0.0, "gst_inclusive": false, "final_price": 2322.0, "price_per_piece": 2322.0, "price_currency": "INR", "moq_met": false, "moq_message": "MOQ not met: minimum 10 pieces required, you ordered 1.", "material_available": true, "material_message": "Stock sufficient: 102.0 sqm available, need 1.5 sqm.", "estimated_days": 234, "standard_days": 234, "rush_days": 164, "rush_available": true, "breakdown": [{"label": "Catalog price (2322.00 \\u00d7 1 piece)", "amount": 2322.0}]}, "total_sqm": 1.3935456000000002}]}}	2322	INR	created	\N	\N	\N	2026-08-31 13:29:32.149741+00	\N
\.


--
-- Data for Name: pending_ai_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pending_ai_actions (id, tenant_id, session_id, action_type, entity_type, entity_id, payload, summary, status, created_by_staff_id, created_at, resolved_at) FROM stdin;
1	1	291b8096-4cac-4322-833d-dbcaa0e61235	create	material	\N	{"name": "Merino wool", "type": "wool", "color": "cream", "stock_meters": 0.0, "cost_per_sqm": 1200.0, "cost_currency": null, "is_available": true}	Create material "Merino wool" — wool, cream, cost 1200.0/sqm	confirmed	1	2026-08-27 10:21:28+00	2026-08-27 10:21:43.743638+00
2	1	61a9a8ba-f17f-4cd7-a6bc-99ffd785356f	update	rug_catalog	1	{"base_price": 80.0}	Update catalog rug "Natural Diamond Jute Rug" (id 1): base_price=80.0	confirmed	1	2026-08-29 04:32:30+00	2026-08-29 04:32:36.424601+00
3	1	9c96a508-1207-497d-966a-bc9318dd4344	update	material	10	{"cost_per_sqm": 50.0}	Update material "Jute" (id 10): cost_per_sqm=50.0	confirmed	1	2026-08-29 04:50:13+00	2026-08-29 04:50:17.144909+00
4	1	ba5591d6-59f6-4963-9d77-a8528290f9bf	create	rug_catalog	\N	{"name": "Handknotted Indo Tibetan", "description": null, "about_content_html": null, "sizes": [{"ft": "6x9", "cm": null, "is_default": false}, {"ft": "5x6", "cm": null, "is_default": false}, {"ft": "10x15", "cm": null, "is_default": false}, {"ft": "20x30", "cm": null, "is_default": false}], "base_price": 340.0, "base_price_currency": null, "material_id": 9, "pile_height": null, "weave_type": "hand-knotted", "lead_time_days": 20, "image_url": "/static/rugs/41a5481798084385af042bb6b3d40363.png", "profit_margin_pct": null, "hsn_code": "5703", "room_types": null, "mood_tags": null}	Create catalog rug "Handknotted Indo Tibetan" — Wool, base price 340.0	confirmed	1	2026-08-29 08:18:42+00	2026-08-29 08:18:47.640178+00
\.


--
-- Data for Name: pile_height_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pile_height_master (id, tenant_id, name, sort_order, is_active) FROM stdin;
1	1	low	0	t
2	1	medium	1	t
3	1	high	2	t
4	1	flat	3	t
5	1	5-6 MM	4	t
6	1	3-4 MM	5	t
7	1	7-8 MM	6	t
8	1	8-9 MM	7	t
9	1	10-11 MM	8	t
10	1	6-7 MM	9	t
11	1	Zero Pile	10	t
\.


--
-- Data for Name: pricing_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pricing_rules (id, tenant_id, name, rule_type, min_qty, max_qty, multiplier, flat_fee, description) FROM stdin;
1	1	Bulk Discount (10+ pieces)	bulk_discount	10	\N	0.85	\N	Orders of 10 or more pieces receive a 15% bulk discount.
2	1	Mid-Volume Discount (5-9 pieces)	bulk_discount	5	9	0.93	\N	Orders of 5–9 pieces receive a 7% discount.
3	1	Rush Order Surcharge (<7 days)	rush_fee	\N	\N	1.25	\N	Rush orders carry a 25% surcharge.
4	1	Large Format Surcharge (>20 sqm per piece)	size_multiplier	20	\N	1.05	\N	Rugs exceeding 20 sqm carry a 5% surcharge.
5	1	Custom Design Fee	custom_work	\N	\N	\N	350	Flat fee for custom design work.
\.


--
-- Data for Name: production_timelines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_timelines (id, tenant_id, order_type, base_days, complexity_multiplier_per_sqm, notes) FROM stdin;
1	1	standard	21	0.3	\N
2	1	custom	35	0.5	\N
3	1	rush	7	0.7	\N
4	1	hand-knotted	35	1.2	\N
5	1	hand-tufted	21	0.4	\N
6	1	flatweave	14	0.2	\N
7	1	machine-woven	7	0.1	\N
\.


--
-- Data for Name: project_gallery_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_gallery_images (id, project_gallery_item_id, image_url, sort_order, created_at) FROM stdin;
1	2	/static/gallery/824fbd1f435d4dc8a246168618d6ba5a.jpg	0	2026-09-02 13:03:53.725295+00
2	2	/static/gallery/207ec63057ca446cb49da3efbe9dc279.jpg	1	2026-09-02 13:03:54.355224+00
3	2	/static/gallery/1e0f037f4c7c43f49fb6aad73e713ab6.jpg	2	2026-09-02 13:03:54.906297+00
4	2	/static/gallery/e02aaee999ea4154a7c6fcef43b8b955.jpg	3	2026-09-02 13:03:55.145247+00
\.


--
-- Data for Name: project_gallery_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_gallery_items (id, tenant_id, image_url, caption, link_url, sort_order, is_active, created_at, description, owner_name, owner_message, rating) FROM stdin;
2	1	/static/gallery/08d2651cbb34445a9e3eb8b879045d02.jpg	CFA, SEEE exhibition, April 2023, Spazio Quattro Imbriani, Milano	\N	0	t	2026-09-02 13:03:12.52637+00	Handknotted Tibetan Woollen Carpet Project	Marco	An absolutely reliable and well-organized manufacturer, handling every stage of the process professionally, from receiving the order and managing samples through to production and shipping.	5
3	1	/static/gallery/57bd6b9a53e543f0bc9eb2cfcdf830f7.jpg	Italy	\N	0	t	2026-09-03 05:42:24.131092+00	\N	Elena	We’ve had so many compliments on this rug. It completely changed the feel of the room without overpowering the space.	5
4	1	/static/gallery/352b2cfe3a3e4f60b07512e690abd97d.png	USA	\N	0	t	2026-09-03 06:28:45.204765+00	\N	Michael Anderson	From the finish to the overall quality, everything feels very well made. We’re extremely pleased with the final result.	5
1	1	/static/gallery/3f699f4b3a954689a6f38724a01950ad.jpeg	USA	\N	1	t	2026-08-29 02:59:56+00	\N	Jason Reynolds	Beautiful rug and amazing quality. The neutral tones work perfectly in our space, and we couldn’t be happier with how it turned out.	4
\.


--
-- Data for Name: promo_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promo_codes (id, tenant_id, code, discount_type, discount_value, min_order_value, max_uses, one_per_customer, starts_at, expires_at, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: promo_redemptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promo_redemptions (id, promo_code_id, customer_id, order_id, discount_amount, created_at) FROM stdin;
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotes (id, tenant_id, customer_id, rug_catalog_id, custom_size_w, custom_size_h, rug_shape, material_id, qty, base_price, final_price, rush_order, price_currency, margin_pct, gst_pct, manual_discount_pct, shipping_cost, expected_delivery_days, status, notes, vendor_notes, customer_response_notes, review_request_count, is_custom_request, room_type, material_preference, budget_range, expected_delivery, request_group_id, reference_image_urls, vendor_sample_image_urls, revised_from_quote_id, created_at, selected_color) FROM stdin;
1	1	1	\N	4	6	rect	1	3	181440	181440	f	INR	\N	\N	\N	\N	\N	accepted	For client's living room renovation project.	\N	\N	0	f	\N	\N	\N	\N	\N	null	null	\N	2026-08-17 06:59:31+00	\N
2	1	2	\N	3	5	rect	4	15	236250	200813	f	INR	\N	\N	\N	\N	\N	sent	Hotel lobby and corridor placement.	\N	\N	0	f	\N	\N	\N	\N	\N	null	null	\N	2026-08-17 06:59:31+00	\N
3	1	3	\N	2	3	rect	2	1	29400	36750	t	INR	\N	\N	\N	\N	\N	draft	Gift order — urgent.	\N	\N	0	f	\N	\N	\N	\N	\N	null	null	\N	2026-08-17 06:59:31+00	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_type, user_id, token_hash, expires_at, revoked_at, replaced_by_id, created_at) FROM stdin;
109	staff	1	cc190fd153ef5ad67bf62630ce3b5c60cbfa4f493ad113e65795eddf8732a923	2026-10-06 07:05:40.446802+00	2026-09-06 07:07:50.260405+00	\N	2026-09-06 07:05:40.195986+00
110	staff	1	c63b0b386150b42c427a82d66414062793d5efef56cd962de4097d2738931d08	2026-10-06 07:07:52.224709+00	2026-09-06 07:07:56.163528+00	\N	2026-09-06 07:07:51.98771+00
112	staff	1	85056c528e9a8e507eb1ce3f3dfecad2dec5ef1e6f52d5e01e8a27cc154fc5c0	2026-10-06 07:55:45.263141+00	\N	\N	2026-09-06 07:55:45.026676+00
114	staff	1	891f9e2e5925c8a5eb15d6608a5813473973caff5f8525426a4f150bc2fea5a3	2026-10-06 08:54:12.330655+00	\N	\N	2026-09-06 08:54:12.090117+00
116	staff	1	32c33941058b622dcba51394cd8c1657bde50b91c75211cd956854f7519ef22b	2026-10-06 09:47:15.885285+00	\N	\N	2026-09-06 09:47:15.647999+00
117	staff	1	89822ff1c237be962fe20e63f21f3f077a0a78d5d2f3cdc74b345ff6b1a9ddf3	2026-10-06 09:56:22.99386+00	\N	\N	2026-09-06 09:56:22.753271+00
119	staff	1	dd14f5bdb9de8997bc62043260e7831fe5eb98bc09a4d5fc04290a5d5f3a5ce0	2026-10-06 11:38:21.621878+00	\N	\N	2026-09-06 11:38:21.380217+00
121	staff	1	b237c644936a67b7cf5ae1bd43838e63e1da585d4beb5700d4f2545ea9d1147e	2026-10-06 18:08:49.838867+00	\N	\N	2026-09-06 18:08:49.600337+00
123	staff	1	55970fc6a2f803b89075e7b8b56dee3c823eff6c315047c3d63cafef585de250	2026-10-06 18:56:08.526806+00	\N	\N	2026-09-06 18:56:08.287991+00
126	staff	1	66f89511db3ce856a663b735a8fe2909a81fb8d8b88799ec615a667228ce48b7	2026-10-07 01:21:37.793494+00	\N	\N	2026-09-07 01:21:37.55336+00
128	staff	1	a95f66f10f8f1bc30a8c93a1f3cb8f9a973b10026c704804b960707093e42bf9	2026-10-07 05:22:51.471216+00	\N	\N	2026-09-07 05:22:51.227478+00
129	staff	1	e6dddca36f48de856e62b503027d95f8b556ee07bf0e8b6b6869a519b9cdd54c	2026-10-07 05:24:51.919775+00	\N	\N	2026-09-07 05:24:51.673732+00
131	staff	1	948d5815ebf4e8564152aebb7f3fe3d1921067f83321d0bfc10814806f328c6a	2026-10-07 06:51:11.081545+00	2026-09-07 07:45:32.933625+00	\N	2026-09-07 06:51:10.840679+00
134	staff	1	9e8de826b35be89abf7e997cd7b707d02ec36fddbe5b456a5a25dd1881beccc9	2026-10-07 08:12:47.030467+00	\N	\N	2026-09-07 08:12:46.792538+00
133	staff	1	2fd3241a3953533948dac8fee913dbcf8283616aa916f1b56a8cde4a03af5ef7	2026-10-07 08:12:45.503422+00	2026-09-07 09:59:20.932622+00	\N	2026-09-07 08:12:45.260321+00
136	staff	1	7e7056415f3bac6092a4e0f629bc7359ab6bac47843fd5d73664cbb607a6eaf2	2026-10-07 09:59:37.623006+00	\N	\N	2026-09-07 09:59:37.382516+00
138	staff	1	83ab5727ccffd9bde5c04850ba5795445f492f561eb1b701083e8784816108e0	2026-10-07 13:23:57.205652+00	\N	\N	2026-09-07 13:23:56.968391+00
140	staff	1	2f9e86224296cda8cf7df3bff60eeeb92567e069b6767e5d4f0d966aae3d176e	2026-10-07 14:14:40.278481+00	\N	\N	2026-09-07 14:14:40.042864+00
142	staff	1	e63259df3b2db44f74e3cc97e9fb59ea263b738e489250a5e21719b948a5f4f9	2026-10-07 14:45:23.616839+00	\N	\N	2026-09-07 14:45:23.37706+00
141	staff	1	a8306df9fe1a273ce0a0cf62d525c86cbfd138aacec52efedb08e17cbeb8f85b	2026-10-07 14:42:13.570387+00	2026-09-07 14:50:32.255643+00	\N	2026-09-07 14:42:13.326619+00
143	staff	1	1d5e48f2488be766418048ac45364060c76be7c89bac1541740c6e09d1c79b8c	2026-10-07 15:17:34.960266+00	\N	\N	2026-09-07 15:17:34.722984+00
144	staff	1	d61b11164ebab58942b2d77b0a4933dc5b3f194799a54b8deae71ec6a40acb4e	2026-10-07 16:16:52.06649+00	\N	\N	2026-09-07 16:16:51.831647+00
145	staff	1	91d9d62991a2e398a2d9ce3dcb14a2ad407ffccd40940ba0899efb126a256a67	2026-10-07 18:48:31.787148+00	\N	\N	2026-09-07 18:48:31.549973+00
146	staff	1	cbbc604a198deb01c86c3a1aaf3cb20725f635780243b09029d7b304215b20a9	2026-10-08 01:13:40.849699+00	\N	\N	2026-09-08 01:13:40.612204+00
147	staff	1	ec162953e89586b3fba242fb3e01fd6351aa13386caf9031c974e71902cffe0a	2026-10-08 07:28:52.773779+00	\N	\N	2026-09-08 07:28:52.532753+00
148	staff	1	62022ee1d38cf63cff177320b6751bb4498ea5ad5784131f253af70628d60aea	2026-10-09 10:49:24.325617+00	\N	\N	2026-09-09 10:49:24.079714+00
149	staff	1	0c15aca3698e402917d1fcddf9ccd6e763b6ec7c022fd22913c3e02ef231d91a	2026-10-10 07:29:54.440946+00	\N	\N	2026-09-10 07:29:54.20003+00
150	staff	1	0e57d990700495e9a87237f5524e512799d3a309bbcc6769a2bbdbe5cd69ffc4	2026-10-10 12:34:23.135088+00	\N	\N	2026-09-10 12:34:22.875623+00
151	staff	1	3a7faa116f568194097070dad5f8a71621f2a17e36ce90a3fd6c158556771ee5	2026-10-10 13:17:45.264134+00	\N	\N	2026-09-10 13:17:45.023873+00
1	staff	1	0976fee12896f5bfc2d5d50983e9901afa64b91cf888752847cde55828ab6e0d	2026-09-17 04:09:46.475918+00	2026-08-19 02:34:46.292044+00	6	2026-08-18 04:09:46+00
2	staff	1	de7a9e661ae93c83008c00d3ec9c88f7106a3d71a12603d5e2ead6476e5472d6	2026-09-18 02:00:39.324194+00	\N	\N	2026-08-19 02:00:39+00
3	staff	1	35db4f8a3b707262a835fe4d358b300309dca306c0a08d186c4519f83a8efeeb	2026-09-18 02:05:16.371243+00	\N	\N	2026-08-19 02:05:16+00
4	staff	1	abd0236fe98872e903cbcf34fd577571e264a341f59ba5c97c2854f13a314b59	2026-09-18 02:05:26.80959+00	\N	\N	2026-08-19 02:05:26+00
5	staff	1	fd6de97b564e3c13d50583e7e19b7a5d8c5d0b2e2ac6714bfa9338d1fb36dade	2026-09-18 02:08:58.51406+00	\N	\N	2026-08-19 02:08:58+00
6	staff	1	d7fb0f5818b2338e195841a430131afa1465d4df3a969f747000f3604905bf1c	2026-09-18 02:34:46.292084+00	2026-08-19 02:35:23.599285+00	7	2026-08-19 02:34:46+00
7	staff	1	dcb8a4d3ad2e6a1d4e2c554a4d7fab6eef06ce5bdab46abaceedabb8fbb03ff8	2026-09-18 02:35:23.599312+00	2026-08-19 05:10:57.07237+00	9	2026-08-19 02:35:23+00
8	staff	1	eb82ac637325315254be0984e5d1b458bc90d9c98e9dde7d252a134e6a78f212	2026-09-18 02:43:48.342325+00	\N	\N	2026-08-19 02:43:48+00
9	staff	1	3a1977183433d7194aebe9953b3cd1a4b44a4febc4d0ac2dbfa281dc4e448015	2026-09-18 05:10:57.072408+00	2026-08-19 05:13:28.066293+00	10	2026-08-19 05:10:57+00
10	staff	1	842bad0d65559caf0bcf51c70bbee836f996a2bd46ef036aa0a2765f8bed30b5	2026-09-18 05:13:28.066325+00	2026-08-19 06:11:45.897783+00	11	2026-08-19 05:13:28+00
11	staff	1	3e883e368dd6c17601dbc2c2626adcfa19f515610b60ea9dc0a54096fa508f58	2026-09-18 06:11:45.897818+00	2026-08-23 18:03:40.923577+00	12	2026-08-19 06:11:45+00
12	staff	1	51d61e5ec6ba017c38f7630782d474521e85dcdb7665a18fd5c269732ff7e86f	2026-09-22 18:03:40.924735+00	2026-08-23 23:25:08.56785+00	13	2026-08-23 18:03:40+00
13	staff	1	5c4cd3e551a776285e90741dca1c4114905b554941baa7f556662a0d918e47d3	2026-09-22 23:25:08.567889+00	2026-08-25 03:07:32.31087+00	14	2026-08-23 23:25:08+00
14	staff	1	ed21d71c395fda86d003ae5f5b41f4223cf036c1ec629aeea6127086b7879bfe	2026-09-24 03:07:32.31339+00	2026-08-25 03:49:52.350391+00	15	2026-08-25 03:07:32+00
15	staff	1	72939b93f2f8edc7690b497f651ee68777057d0dafc4dba64380c442456e9cbe	2026-09-24 03:49:52.352836+00	2026-08-27 07:28:50.293016+00	17	2026-08-25 03:49:52+00
16	staff	1	11173413842de2ffa75c0c9110663be642b77de96ac0499c4326c032b917806c	2026-09-25 17:08:57.592725+00	\N	\N	2026-08-26 17:08:57+00
17	staff	1	2e87776cfcb6897b1879962c68c12d82ef28bb515c39bd03fbf258f5c2b0746c	2026-09-26 07:28:50.293066+00	2026-08-27 08:57:25.253397+00	18	2026-08-27 07:28:50+00
18	staff	1	9ccb01124da15c72e2249942894a298afc1dfe95f00226a40e2ac62613b51229	2026-09-26 08:57:25.253458+00	2026-08-27 10:21:12.019412+00	19	2026-08-27 08:57:25+00
19	staff	1	a4236c5d02e9c1d5a763f5328916cbeb455f15d1205cb1448f081f3ab80fbb94	2026-09-26 10:21:12.019483+00	2026-08-27 10:21:20.367369+00	20	2026-08-27 10:21:12+00
20	staff	1	3eeaf605313683e507707af6a5d019d366b1b413c0c31d65d4145bf304da5ef0	2026-09-26 10:21:20.367401+00	2026-08-27 13:44:05.95361+00	21	2026-08-27 10:21:20+00
21	staff	1	33554edec37f3b4fb17e46137ecebf862349096942f749bb9309b87225f55bb9	2026-09-26 13:44:05.953651+00	2026-08-27 14:15:30.349954+00	22	2026-08-27 13:44:05+00
22	staff	1	a7b058a7a38f5db500c6ea35d7206c481612f2aea74769896c0b72b7e18fe498	2026-09-26 14:15:30.349985+00	2026-08-27 14:16:22.361093+00	23	2026-08-27 14:15:30+00
23	staff	1	f54c7072196ff2b27c421ba9535380989d985cde37bea0668e9b8508eb6b7643	2026-09-26 14:16:22.361156+00	2026-08-27 14:46:33.784228+00	24	2026-08-27 14:16:22+00
24	staff	1	b348353b9fbf8d25006e7204ff867b99df3b659da9abec569b22e486e4890eaa	2026-09-26 14:46:33.784271+00	2026-08-27 14:46:58.377693+00	25	2026-08-27 14:46:33+00
25	staff	1	141a4a30759ae28f1c0f44b36d67512ed783af62e02bef29194e7d783c7d3825	2026-09-26 14:46:58.377731+00	2026-08-28 01:07:48.376273+00	26	2026-08-27 14:46:58+00
26	staff	1	1153c2b30ca3203ac31f09cf0f1839b21321447de7713c66f11334c162fbf4a0	2026-09-27 01:07:48.37631+00	2026-08-28 01:07:55.381792+00	27	2026-08-28 01:07:48+00
27	staff	1	035f8cfe3e892699a41c9c4e33dc2d0bbca3a2fcaf706cb2f543d7bd62a1b7b4	2026-09-27 01:07:55.381818+00	2026-08-29 01:20:14.894382+00	28	2026-08-28 01:07:55+00
28	staff	1	b3cf277d347f90c0b208162d4ab3526c11e21802442f2af4205d2d9895a75368	2026-09-28 01:20:14.894428+00	2026-08-29 01:21:17.346423+00	29	2026-08-29 01:20:14+00
29	staff	1	c15685012a599741d4b330e5de0dbdd361743c2855923f21a5acba5d6db960b5	2026-09-28 01:21:17.346464+00	2026-08-29 02:15:47.850343+00	30	2026-08-29 01:21:17+00
30	staff	1	06d31f359664b743659f0430b9d1d6beed00165db1eda4d87b24d4dc32ed536f	2026-09-28 02:15:47.850383+00	2026-08-29 02:43:11.149297+00	31	2026-08-29 02:15:47+00
31	staff	1	e78bf5e924a4c7b69e9ffeb4373aaea3d8f675afd2c1dd001a26a28f2526d606	2026-09-28 02:43:11.149355+00	2026-08-29 03:26:28.318639+00	32	2026-08-29 02:43:11+00
32	staff	1	1cd5dbdfbe824659dac6615239c02d7769862ff9c2818c1fb9934b08670a4397	2026-09-28 03:26:28.318673+00	2026-08-29 03:26:43.756478+00	33	2026-08-29 03:26:28+00
33	staff	1	3f196091e4a32875d5b926d32cb760722ddd821b1a1f017adc7fd095b758b267	2026-09-28 03:26:43.756538+00	2026-08-29 04:24:22.979074+00	34	2026-08-29 03:26:43+00
34	staff	1	09b13c0270c4eb916c0b989c914c32de5b30a97a9dce8e13c495af27e539c406	2026-09-28 04:24:22.979118+00	\N	\N	2026-08-29 04:24:22+00
35	staff	1	f480f484aaeb3871f1e84d2bcc55a62340744c65cd3723e0b1d80993848e9f32	2026-09-28 07:30:25.479129+00	2026-08-29 08:01:31.459455+00	36	2026-08-29 07:30:25+00
36	staff	1	782c7dc5a3c0bb4a45e10a027f6e2eea87c65cef75eedf520762b21ec2173fc0	2026-09-28 08:01:31.459515+00	2026-08-29 08:26:33.313653+00	37	2026-08-29 08:01:31+00
37	staff	1	419cc7f72a8f6a51e3f03c0703f5c2eb7143be365287244796e6e843278cc9d8	2026-09-28 08:26:33.3137+00	2026-08-29 08:57:08.803142+00	38	2026-08-29 08:26:33+00
38	staff	1	2f3932ae3d00f756ee39a6f99cb040708814bb871a860744d88db3bdf96dbc2c	2026-09-28 08:57:08.803176+00	2026-08-29 09:59:23.774956+00	39	2026-08-29 08:57:08+00
39	staff	1	49b4e0eed7e6f00860655073bb880180c31efcc2f644b0c47e7d11f4286a043f	2026-09-28 09:59:23.774986+00	2026-08-29 10:37:21.177356+00	40	2026-08-29 09:59:23+00
40	staff	1	695157d61e277f167223ee3167630f128e11ef60b15aec5a859a66eff42bd37f	2026-09-28 10:37:21.177402+00	2026-08-29 10:49:11.30665+00	41	2026-08-29 10:37:21+00
41	staff	1	5ec7ca6b71d267c14e26e394be202b04d1261b06d147d4ae0762478faae0716f	2026-09-28 10:49:11.306696+00	2026-08-29 11:31:24.503273+00	42	2026-08-29 10:49:11+00
42	staff	1	284f3f2734f22c72743c041a0e9daaa6ac5a43efac1952a723119d7a2c4b5c85	2026-09-28 11:31:24.503323+00	2026-08-29 11:37:36.692715+00	43	2026-08-29 11:31:24+00
43	staff	1	36bb6dec11b6cf021bd1256fde1f584072f0e737c0ab3fdbe1ef9e7edf157f17	2026-09-28 11:37:36.692759+00	2026-08-29 12:41:58.735135+00	44	2026-08-29 11:37:36+00
44	staff	1	dc6c3d77598a78088592b95fc4694cce5c734e301c60e0b9114bc52bed6e4432	2026-09-28 12:41:58.735189+00	2026-08-29 12:45:21.09653+00	45	2026-08-29 12:41:58+00
45	staff	1	52ba1cc191ee2bb503f49e9aea6eb28a6e9471b5e3cb0b1569681f4cb937f7a8	2026-09-28 12:45:21.096577+00	2026-08-29 13:33:11.656492+00	46	2026-08-29 12:45:21+00
46	staff	1	dc3d63661170bff682bdb722069824b4c43859e9ceffaf57e783c3b287b9fc4c	2026-09-28 13:33:11.656544+00	2026-08-29 13:40:25.748848+00	\N	2026-08-29 13:33:11+00
47	staff	1	9fddfe3205f7ba2c21425a4d18007e29b6ea8b9609fdc41071cdf470c57dc802	2026-09-29 01:30:49.438229+00	2026-08-30 02:11:10.218334+00	48	2026-08-30 01:30:49+00
48	staff	1	4abe11b79efb5cae4cc708089205c6c4e669076aed146e0ab71602775fac6f75	2026-09-29 02:11:10.218385+00	\N	\N	2026-08-30 02:11:10+00
49	staff	1	5757e726f435bc96d907d551c7fc871f48ea91d167c5b07453dfa32b0111fe89	2026-09-29 04:19:37.837995+00	\N	\N	2026-08-30 04:19:37.602944+00
50	staff	1	d2bdc639226711ef9fc3ead50aa57f80557660dda1e99066ae121264f7f1fd63	2026-09-29 15:39:19.521604+00	\N	\N	2026-08-30 15:39:19.283642+00
51	staff	1	68e0c1f27a90240dae5e6f377f49ee6302de671d59764c46624cb8149c9df526	2026-09-30 00:55:55.059298+00	\N	\N	2026-08-31 00:55:54.811417+00
52	staff	1	1c3ca7954037196f9a2ebebf6483eb05b73ba911a0c0078f61eea1d9cfa92426	2026-09-30 18:20:17.123336+00	\N	\N	2026-08-31 18:20:16.883099+00
53	staff	1	c06d96935aaec32eafe83d2d80a37414acf5148530d991500d110606d3399ed9	2026-10-01 18:14:14.76397+00	\N	\N	2026-09-01 18:14:14.527066+00
54	staff	1	9c37e5c438b137d465d9c8e238222abbfb052c6579a2b7cff067dbc4e80e10c2	2026-10-02 02:53:48.202187+00	\N	\N	2026-09-02 02:53:47.966607+00
55	staff	1	d6657f3af7c22fe5fd4f18a25a31d4a9dd7ad086e4b229b517361ebf933403fe	2026-10-02 10:05:15.720779+00	\N	\N	2026-09-02 10:05:15.465436+00
56	staff	1	3ab0711088c5891254ac522e04431ddb4a18dcbb5a920f76e53203e7347465f8	2026-10-02 12:09:34.881638+00	2026-09-02 12:10:48.703339+00	\N	2026-09-02 12:09:34.642156+00
57	staff	1	f870b6f4714540cbd25d595a98616fae4cb86a30ff03e36ffce87bcf022a17e7	2026-10-02 12:10:59.60102+00	2026-09-02 12:11:02.458761+00	\N	2026-09-02 12:10:59.362352+00
58	staff	1	93ac0dafb662cf400fcba988815f8d06c2b7d5fd975e5fcec6d1422e0dbca268	2026-10-02 12:11:10.788873+00	\N	\N	2026-09-02 12:11:10.55366+00
60	staff	1	b53cf0023bf383e7da8b54fe02f301852570ae486c18389903551dc18e3248ff	2026-10-02 12:49:51.26447+00	\N	\N	2026-09-02 12:49:51.027898+00
59	staff	1	28fad8e32b00b8f2a06e644bffcd6c2243f2ccc2d5ead6b48af29eba5cc8821a	2026-10-02 12:17:06.779376+00	2026-09-02 12:50:23.180146+00	\N	2026-09-02 12:17:06.531185+00
61	staff	1	784f718930f6911730126128dfe2e6f43c31bbc577039ea5032167d7fdd623e0	2026-10-02 12:51:36.52657+00	\N	\N	2026-09-02 12:51:36.27733+00
62	staff	1	a4789e7282e1facc98541a056fba20bc6f72dd69ece2b01190476ff2319d6a92	2026-10-02 13:48:39.663616+00	\N	\N	2026-09-02 13:48:39.414532+00
63	staff	1	e1bca895625b28b15bc7074b81e809dd9d745eb9b1ea5b593fae4057691b7db8	2026-10-02 13:49:36.762374+00	\N	\N	2026-09-02 13:49:36.525704+00
64	staff	1	12b900587508410e6d817ae34fb951a6f99d4d07a8b627ff796cb1d4e05b630f	2026-10-03 02:01:09.053723+00	2026-09-03 02:13:50.744976+00	\N	2026-09-03 02:01:08.800728+00
65	staff	1	59b98806bd8d669ffccae6da431d27bfd9c82d6082ad31fcbbeee84cf46f3260	2026-10-03 02:13:52.084158+00	\N	\N	2026-09-03 02:13:51.847872+00
111	staff	1	42a4781c278634505145e47bb4761190f26b5197f27cec961e1756ee5f6a97ea	2026-10-06 07:40:59.643315+00	2026-09-06 07:50:35.535068+00	\N	2026-09-06 07:40:59.406675+00
67	staff	1	e79cfe9c8324d35a6a2f2122150edf9e1045679d1181fcfc288ae9bbd90a84bb	2026-10-03 05:26:23.035699+00	\N	\N	2026-09-03 05:26:22.797902+00
66	staff	1	46e127530f13fd3dddbf9b3bd31c192549e3155ef3dd8f9eb063841ab6e34bbc	2026-10-03 05:10:16.959812+00	2026-09-03 05:41:18.453732+00	\N	2026-09-03 05:10:16.720417+00
68	staff	1	b7512702e87d18642660e680bf21b98145944cd6b78ccbdfe7bd484e92cf2802	2026-10-03 05:41:36.259459+00	\N	\N	2026-09-03 05:41:36.022063+00
69	staff	1	fced250936e5d06d2b82cce976f0bcf9dfbd417b718c4f56440fe20cb7ea6bd7	2026-10-03 05:56:58.248527+00	\N	\N	2026-09-03 05:56:58.003672+00
70	staff	1	6c0fa2280de1a84d55ffac0801fcf8ba4a5c32f7f02e321638f0aabb57a17f96	2026-10-03 06:28:08.490173+00	\N	\N	2026-09-03 06:28:08.253526+00
113	staff	1	c3e9b9f02dcbe1c8aa865139658780137f138d108320525f12facc430eed0607	2026-10-06 07:59:39.893396+00	\N	\N	2026-09-06 07:59:39.653486+00
71	staff	1	36575d7625e68de42e70b7610c8746eee2622d16b2e2eae223f9982a4fb13b47	2026-10-03 09:23:47.146051+00	2026-09-03 10:55:26.826845+00	\N	2026-09-03 09:23:46.904137+00
115	staff	1	59e31f8c47cdc668d805be144b869bc7d79fb37ac55127b34f3f4fe4c07ecf5a	2026-10-06 09:25:08.691093+00	\N	\N	2026-09-06 09:25:08.453408+00
72	staff	1	bf94fa2d5c1080e8c5fa3bea412562fba1497113e4c9b18c7db90e8ce294e484	2026-10-03 10:55:44.609863+00	2026-09-03 11:32:35.407772+00	\N	2026-09-03 10:55:44.360463+00
118	staff	1	cd23e5f9df66d68fcc392ae46490f9d83998760e20563fa73609ce4ef2a99e49	2026-10-06 10:27:00.590906+00	\N	\N	2026-09-06 10:27:00.337899+00
73	staff	1	199091e931485d7118a8a2a741c3498489657b3f0ecae186b0f3619a2e113d76	2026-10-03 11:32:54.916238+00	2026-09-03 14:27:37.196514+00	\N	2026-09-03 11:32:54.678806+00
74	staff	1	3be11f572b3167542ce95d410a0750757b5828362a0c50e39751b7fb3e527013	2026-10-03 16:25:11.970149+00	\N	\N	2026-09-03 16:25:11.733202+00
75	staff	1	bc2352630029c7bed1c754bbe06eff26c0f6f667b1b040c66e0138ce5ac0ff7d	2026-10-03 17:27:58.90958+00	\N	\N	2026-09-03 17:27:58.672793+00
76	staff	1	6065e0d82eab0f2a351f65e5ff466234b02dabe6de865880ed58bf4b70a86238	2026-10-03 17:32:31.736964+00	\N	\N	2026-09-03 17:32:31.491551+00
77	staff	1	48c51ae619836b75d35d605a55ae2d2d132eb3161dd1e653efeff41d23247893	2026-10-04 06:45:13.997906+00	\N	\N	2026-09-04 06:45:13.760762+00
120	staff	1	5fe584987f32ab66dd3815817d110aa488a19d755154e304548ece6df180ffca	2026-10-06 12:09:13.187475+00	\N	\N	2026-09-06 12:09:12.95119+00
78	staff	1	b065a8b9e5a9474f3526c75e19992ec2244b187ab48ec9a0aa6f9a9589ffe140	2026-10-04 08:20:13.127016+00	2026-09-04 08:59:36.540463+00	\N	2026-09-04 08:20:12.89036+00
122	staff	1	117a95fcb2c7e073ce6ec75d6aa4a81a3d08a97fe5c51751f4bc80d184936f26	2026-10-06 18:51:18.208806+00	\N	\N	2026-09-06 18:51:17.970508+00
79	staff	1	3d60f5504e8c29fc0471f3bc04e0a12711b9f723c01801fbeabeb623c4ed8e99	2026-10-04 08:59:53.172811+00	2026-09-04 09:55:15.776718+00	\N	2026-09-04 08:59:52.933775+00
124	staff	1	741969d88071ba270be7808462ad59bf7dda3d5c99b38fcd24e36a41cb14320f	2026-10-06 19:14:49.561344+00	\N	\N	2026-09-06 19:14:49.077071+00
80	staff	1	26faf5a130294f8c425564ebfd6b2098522303210d3180d20b39ccadcc49fa55	2026-10-04 09:55:34.428347+00	2026-09-04 12:59:15.784639+00	\N	2026-09-04 09:55:34.191418+00
81	staff	1	f1a355b6b9efd5494f2be75c1204dd751a902fc1ffcc0e13e46ba78c1565281f	2026-10-04 12:59:34.944324+00	2026-09-04 13:43:45.479398+00	\N	2026-09-04 12:59:34.693284+00
82	staff	1	d14d0b25f19df6837b1400922be4ec7bc46f8ad39fa2f3931d5cad8715b66bd5	2026-10-04 17:30:40.497622+00	\N	\N	2026-09-04 17:30:40.254226+00
125	staff	1	0e0901f7ea7b5fbe5422d8b426ae5c7be864908b05bd32b6833100faf6ab67dc	2026-10-06 19:48:32.212958+00	2026-09-06 19:58:41.21308+00	\N	2026-09-06 19:48:31.975161+00
83	staff	1	18cfdc74f8b82b32397a6678cd6b5dc02e412a106d658cd74bee5d12916d9b69	2026-10-04 17:55:40.262909+00	2026-09-04 17:58:17.136806+00	\N	2026-09-04 17:55:40.023548+00
127	staff	1	9b262211140165e5e2afc74428cc292d977085df2acfe6d4490d8bb666262b04	2026-10-07 01:52:18.906982+00	\N	\N	2026-09-07 01:52:18.669541+00
84	staff	1	f2d71291223391650b7d96313afe4f46e4ab0d2cae64db1560e071b1c74f3c12	2026-10-04 18:02:20.638153+00	2026-09-05 02:14:07.001093+00	\N	2026-09-04 18:02:20.395715+00
85	staff	1	fbd252ae78d12c63451ec32209d2e5f866bac6f2375a6201d95d7efb9c0c0abf	2026-10-05 02:14:08.683893+00	\N	\N	2026-09-05 02:14:08.438815+00
86	staff	1	bd59748f3c074e6a9f8b567f5be93420a27b09211b46121ba90beaccd303b270	2026-10-05 02:52:20.314713+00	\N	\N	2026-09-05 02:52:20.076026+00
87	staff	1	33b5cbc08f3f3e19d18fc5dd17ada619446622d941247470eebe0872f25d0e6d	2026-10-05 04:50:26.83727+00	\N	\N	2026-09-05 04:50:26.601512+00
88	staff	1	1f08440f62d9049da1d59fb3570e80a6eebbf325689c624e497bdc33037b7ce5	2026-10-05 06:57:00.806989+00	\N	\N	2026-09-05 06:57:00.562159+00
89	staff	1	d2a8e4e7cd298f36e2b38143a0ef6b13a5a1bd133f4c1339627e22bacbf2cb43	2026-10-05 07:37:46.193992+00	\N	\N	2026-09-05 07:37:45.954086+00
90	staff	1	37078b80b397bdf961288a5b4900be2b8e42a9ec2243683bb670814b7190f496	2026-10-05 08:21:52.542588+00	\N	\N	2026-09-05 08:21:52.301064+00
130	staff	1	e69627b3be6665fed4dd450042e454f53413d13e31ea1ef549188639aacac21b	2026-10-07 05:56:15.216253+00	\N	\N	2026-09-07 05:56:14.97639+00
91	staff	1	cab5c98304f1be1a9608346070be3e7015352b7434c351ba0487b8d88ffa84ab	2026-10-05 08:44:08.234362+00	2026-09-05 10:02:54.859397+00	\N	2026-09-05 08:44:07.992305+00
92	staff	1	89bd24d2fee24d3b2a8024b625f7a2e707da2e1a622dfb9f11981762f50287b0	2026-10-05 10:03:09.908635+00	\N	\N	2026-09-05 10:03:09.668803+00
93	staff	1	2aa1a0fd8ea05a444cfd81b9b98bb6505bbc4dd2ee8ac7828f2fe4e926fb4b74	2026-10-05 10:19:20.339558+00	\N	\N	2026-09-05 10:19:20.102871+00
95	staff	1	e2c8bcf35500cca5b0a4f36d64b80fe8207eba53316e700a4f667ea7fca0d67e	2026-10-05 10:50:28.793449+00	\N	\N	2026-09-05 10:50:28.555592+00
96	staff	1	83d8bfc8ce76eb5a12bb1766b6702b979862a3a493fe240a74258f03f532c030	2026-10-05 12:08:11.517737+00	\N	\N	2026-09-05 12:08:11.277338+00
97	staff	1	a4d45fa3834a6acaf58608c3f7759d913015bde42e05ab5e526c71e94f6abb2b	2026-10-05 12:44:39.233946+00	\N	\N	2026-09-05 12:44:38.997584+00
94	staff	1	5374553a6c17c8ac2b41f35c9a50d268c91d4f065e7aeabd994e930f54040804	2026-10-05 10:43:54.583533+00	2026-09-05 12:53:16.580525+00	\N	2026-09-05 10:43:54.340344+00
98	staff	1	fbc8ba14f8b1d87831c7c9f1111b022a684f5406fb377236fa05b8ed420a9af5	2026-10-05 12:53:46.552323+00	\N	\N	2026-09-05 12:53:46.310597+00
99	staff	1	56ee98690ce5d04301f18beb0f9e0dc6720e105bf751ff1f0469f190fd8b66be	2026-10-05 13:27:07.894773+00	\N	\N	2026-09-05 13:27:07.657928+00
100	staff	1	30b5e96edad5a945e0108827c619640efb3831a77105676b274c42ef74eb59aa	2026-10-05 13:35:07.376643+00	\N	\N	2026-09-05 13:35:07.134889+00
101	staff	1	feaf9b1abd9fe75b09778343489a7155efae59dd36ae8343a08a3cbbc9461cb8	2026-10-05 14:05:50.965331+00	\N	\N	2026-09-05 14:05:50.728928+00
132	staff	1	7c8a0a8de15196607f925d6bf1eaa1ec5acdc88c884b368d0de532117aa6e38a	2026-10-07 07:50:36.649192+00	2026-09-07 08:11:48.162879+00	\N	2026-09-07 07:50:36.405298+00
103	staff	1	2f79a4a40e324bfb20e5c9395d8e78b08781f8aab438b17212a5ff5e51a53e6a	2026-10-05 14:51:47.039872+00	\N	\N	2026-09-05 14:51:46.799063+00
102	staff	1	277e8933b1417efbedcc0002748f0acfc26770607118899e715c64d204428511	2026-10-05 14:41:10.401583+00	2026-09-05 14:51:52.915083+00	\N	2026-09-05 14:41:10.163188+00
104	staff	1	472666177e55d660f084a19aa778f09721ba039e5066d794a2771a2d856e15e1	2026-10-05 16:51:39.705963+00	\N	\N	2026-09-05 16:51:39.467947+00
135	staff	1	2aeb41218907f0c6b7580afa0c9b2d3a66d457088a0ffb285cad7bd72cca4621	2026-10-07 09:03:45.941858+00	\N	\N	2026-09-07 09:03:45.702974+00
105	staff	1	afeb5f2780c55dd925edce6a08f802429009d18bfbe6f62eb9aa6901d2efb656	2026-10-06 03:00:51.032923+00	2026-09-06 03:18:19.510737+00	\N	2026-09-06 03:00:50.796776+00
137	staff	1	37917ce47e7fb8157ff8164babdf300635877017886532e1110bd31f602cd69e	2026-10-07 12:31:16.393933+00	\N	\N	2026-09-07 12:31:16.158178+00
106	staff	1	a81c0ee9884c2219e48d571267a9e12899dfaaeadfa2193676355aa6de2edbdf	2026-10-06 03:28:31.3248+00	2026-09-06 03:39:42.806818+00	\N	2026-09-06 03:28:31.086835+00
139	staff	1	04a541ca96352dfcc81e2736d094bdec5fb1aa0c8b905b577141a8227dc8e9a3	2026-10-07 14:11:04.202307+00	\N	\N	2026-09-07 14:11:03.965075+00
107	staff	1	53d1268bd5f7984d3c34c09e3e57815f5f23c8960d751faa8a7c4ea63536257c	2026-10-06 03:39:48.262256+00	2026-09-06 03:39:50.481782+00	\N	2026-09-06 03:39:48.026199+00
108	staff	1	2ed61e2235c08e7c8f918dc2299a9cd192d2eca3d0cf999a91295727d72cc34f	2026-10-06 03:40:00.213059+00	\N	\N	2026-09-06 03:39:59.972709+00
\.


--
-- Data for Name: rug_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rug_catalog (id, tenant_id, name, slug, description, about_content_html, sizes, base_price, base_price_currency, material_id, pile_height, weave_type, lead_time_days, image_url, profit_margin_pct, hsn_code, room_types, mood_tags, is_available, inventory_quantity, color_options, additional_information_html) FROM stdin;
24	1	Abstract Hand-Tufted Wool Rug	abstract-hand-tufted-wool-rug	Hand-tufted wool rug with a painterly, abstract pattern in deep burgundy, muted blues, warm tans and cream. The dense, plush pile creates a soft, textured surface with a dynamic, mottled appearance. Suited to contemporary or transitional living rooms, bedrooms, or offices as a bold focal accent.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 1900.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3300.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4600.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6900.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9 round ft", "cm": "270 round cm", "master_size_id": 26, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4600	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/bc98838c304d424faf82b648b15f8d33.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
13	1	Hand-Tufted Navy Geometric Wool Rug	hand-tufted-navy-geometric-wool-rug	Hand-tufted in wool, this rug showcases a contemporary geometric pattern of intersecting arcs and grid lines in pale gray set against a deep navy field. The dense, low-to-medium pile provides a soft, slightly lustrous texture that grounds a room without overwhelming it. Its restrained palette and architectural motif suit modern, transitional, or minimalist living rooms, bedrooms, and home offices.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 1900.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3300.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4400.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4400	INR	5	Zero Pile	Hand-Tufted	21	/static/rugs/94c8719f42da493d81902a1f12b22b08.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
7	1	Pink Medallion Graphic Rug	pink-medallion-graphic-rug	This is a contemporary Tibetan-style rug designed like an oversized playing card. It features a bold pink field, decorative blue borders, and a large circular mandala-like centerpiece in green, blue, and burgundy. The playful card symbols and hand-drawn geometric patterns give it a modern, artistic character.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 2300.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	2300	INR	1	5-6 MM	Hand-knotted Indo-Tibetan	21	/static/rugs/887f6fe59c8e4cc1934c322afde7a5eb.png	\N	5703	["living_room"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
22	1	Hand-Tufted Multicolor Abstract Wool Rug	hand-tufted-multicolor-abstract-wool-rug	Hand-tufted in wool, this rug features a painterly abstract composition with soft neutrals and stormy blues accented by crimson and golden yellow pops. The dense, low-to-medium pile creates a plush, slightly textured surface with a sculptural look. It suits contemporary, transitional, or industrial interiors—ideal for living rooms, bedrooms, and loft spaces.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2000.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3200.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4300.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6700.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4300	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/37fd78a6395b46acb0c13e1cee3b67e1.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
35	1	Hand-knotted Indo-Tibetan Wool & Bamboo Silk Mix Rug	hand-knotted-indo-tibetan-wool-bamboo-silk-mix-rug	Hand-knotted in a wool and bamboo silk mix, this Indo-Tibetan rug features a rich brown tone with subtle horizontal variations and a soft, understated sheen. Its simple design highlights the texture of the pile and brings warmth to contemporary and traditional interiors.	\N	[{"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 4920.0, "lead_time_days": 60}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 7650.0, "lead_time_days": 60}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	7650	INR	12	6-7 MM	Hand-knotted Indo-Tibetan	60	/static/rugs/e87e3a95d6e742dc89989646ea14f0fc.png	\N	5703	["living-room", "dining-room", "study", "entryway", "bedroom"]	[]	t	\N	[]	\N
38	1	Hand-knotted Jute Carpet	hand-knotted-jute-carpet	Hand-knotted in jute, this rectangular carpet brings warm golden-tan tones and richly textured natural fibers to the home. Its plain field, subtle horizontal texture and neatly finished edges complement contemporary living rooms, bedrooms, dining spaces, studies and entryways.	\N	[{"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 4520.0, "lead_time_days": 24}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 5370.0, "lead_time_days": 27}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 7490.0, "lead_time_days": 36}, {"master_size_id": 20, "ft": "3 round ft", "cm": "90 round cm", "price": 7490.0, "lead_time_days": 36, "is_default": false}, {"master_size_id": 21, "ft": "4 round ft", "cm": "120 round cm", "price": 7490.0, "lead_time_days": 36, "is_default": false}, {"master_size_id": 22, "ft": "5 round ft", "cm": "150 round cm", "price": 7490.0, "lead_time_days": 36, "is_default": false}, {"master_size_id": 23, "ft": "6 round ft", "cm": "180 round cm", "price": 7490.0, "lead_time_days": 36, "is_default": false}, {"master_size_id": 24, "ft": "7 round ft", "cm": "210 round cm", "price": 7490.0, "lead_time_days": 36, "is_default": false}, {"master_size_id": 25, "ft": "8 round ft", "cm": "240 round cm", "price": 7490.0, "lead_time_days": 36, "is_default": false}, {"master_size_id": 26, "ft": "9 round ft", "cm": "270 round cm", "price": 7490.0, "lead_time_days": 36, "is_default": false}]	7490	INR	10	medium	Hand-knotted Indo-Tibetan	36	/static/rugs/798a50fe1347435487b7e8c7a38d6508.jpg	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	[]	t	\N	[]	\N
3	1	Handknotted Indo Tibetan , Material - Wool & Silk Mix	handknotted-indo-tibetan-material-wool-silk-mix	This Hand-Knotted Indo-Tibetan Wool & Silk Rug combines traditional craftsmanship with a refined modern aesthetic. Expert artisans carefully hand-knot each rug using a premium blend of natural wool and silk, producing a beautifully textured surface with exceptional softness and a sophisticated sheen.\n\nThe wool provides warmth, durability, and resilience, while the silk highlights selected areas of the design with a smooth, luminous finish. This contrast creates visual depth and allows the rug to change subtly depending on the direction of light.\n\nPerfect for living rooms, bedrooms, dining areas, luxury residences, boutique hotels, and designer interiors, this Indo-Tibetan rug adds elegance without overwhelming the surrounding décor.	<p>This <strong>Hand-Knotted Indo-Tibetan Wool &amp; Silk Rug</strong> combines traditional craftsmanship with a refined modern aesthetic. Expert artisans carefully hand-knot each rug using a premium blend of natural wool and silk, producing a beautifully textured surface with exceptional softness and a sophisticated sheen.</p><p>The wool provides warmth, durability, and resilience, while the silk highlights selected areas of the design with a smooth, luminous finish. This contrast creates visual depth and allows the rug to change subtly depending on the direction of light.</p><p>Perfect for <strong>living rooms, bedrooms, dining areas, luxury residences, boutique hotels, and designer interiors</strong>, this Indo-Tibetan rug adds elegance without overwhelming the surrounding décor.</p>	[{"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 45.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 45.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}]	45	INR	1	5-6 MM	Hand-knotted Indo-Tibetan	21	/static/rugs/7fbf5169e8674bcebf5a564469ac33fb.png	\N	5703	["living_room", "bedroom", "dining_room", "entryway"]	["warm_earthy", "quiet_luxury"]	t	\N	[]	\N
44	1	Hand Knotted Indo Tibetan	10-32-wool-silk-geometric-rug	A contemporary handmade wool and silk rug featuring interconnected circular motifs in soft ivory and muted taupe. Its refined texture, subtle sheen, and versatile neutral palette bring understated luxury to modern living rooms, bedrooms, dining spaces, and offices.	\N	[{"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 4800.0, "lead_time_days": 24}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 6200.0, "lead_time_days": 28}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 7600.0, "lead_time_days": 34}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 0.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	0	INR	11	5-6 MM	Hand-knotted Indo-Tibetan	21	/static/rugs/b06ef4d6457e41e4a672cef0b4ed8167.png	\N	5703	["living_room", "bedroom", "dining_room", "study", "entryway"]	["quiet_luxury", "modern_minimal", "artisan"]	t	\N	[]	\N
5	1	Hand Tufted  Material- Wool & Viscose Silk	hand-tufted-material-wool-viscose-silk	This Hand-Tufted Wool & Viscose Silk Rug combines softness, durability, and an elegant silky sheen. Crafted with a premium blend of natural wool and viscose silk, the rug offers a plush, comfortable feel underfoot while the viscose fibers add subtle luster and depth to the surface.\n\nIts refined texture and sophisticated finish make it a beautiful choice for living rooms, bedrooms, lounges, dressing areas, and luxury interiors. The hand-tufted construction gives the rug a dense, cushioned pile, while the wool provides resilience and warmth.\n\nMaterial: Wool & Viscose Silk\nConstruction: Hand Tufted\nFeel: Soft, Plush & Luxurious\nFinish: Subtle Silk-Like Sheen\nSuitable For: Living Room, Bedroom, Lounge, Office & Premium Interior Spaces	<p>This <strong>Hand-Tufted Wool &amp; Viscose Silk Rug</strong> combines softness, durability, and an elegant silky sheen. Crafted with a premium blend of <strong>natural wool and viscose silk</strong>, the rug offers a plush, comfortable feel underfoot while the viscose fibers add subtle luster and depth to the surface.</p><p>Its refined texture and sophisticated finish make it a beautiful choice for <strong>living rooms, bedrooms, lounges, dressing areas, and luxury interiors</strong>. The hand-tufted construction gives the rug a dense, cushioned pile, while the wool provides resilience and warmth.</p><p><strong>Material:</strong> Wool &amp; Viscose Silk<br><strong>Construction:</strong> Hand Tufted<br><strong>Feel:</strong> Soft, Plush &amp; Luxurious<br><strong>Finish:</strong> Subtle Silk-Like Sheen<br><strong>Suitable For:</strong> Living Room, Bedroom, Lounge, Office &amp; Premium Interior Spaces</p>	[{"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 44.88, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	44.88	INR	11	8-9 MM	Hand-Tufted	21	/static/rugs/78aeb2519b5045b4814245c9e70f9bd3.png	\N	5703	["living_room", "bedroom"]	["warm_earthy"]	t	\N	[]	\N
20	1	Hand-Tufted Wool Floral Medallion Rug	hand-tufted-wool-floral-medallion-rug	A hand-tufted wool rug with a classic floral medallion design set on a warm ivory field and a mustard-gold border accented with soft blue and rust tones. Dense, low-pile wool provides a cushioned, textured surface that suits living rooms, dining rooms, or traditionally styled interiors. The refined palette and ornate botanical motif lend a timeless, transitional look.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 1800.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3200.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4600.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6600.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4600	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/044a506a88844cb68075aa0a7bf2872a.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
17	1	Ivory Floral Medallion Hand-Tufted Wool Rug	ivory-floral-medallion-hand-tufted-wool-rug	This hand-tufted wool rug features a traditional floral medallion pattern on an ivory field with a deep contrasting border. Accented in plum, aqua and soft gold, the palette offers subtle color pops while the low-to-medium plush pile provides a soft, textured underfoot feel. Its classic design suits traditional and transitional interiors such as living rooms, dining rooms, or bedrooms.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2100.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3200.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4400.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6700.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4400	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/d664ae91ff4f400284979e348e44fce7.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
45	1	Hand-Knotted Wool Checkerboard Carpet	hand-knotted-wool-checkerboard-carpet	Hand-knotted from wool, this premium checkerboard carpet combines warm taupe and soft ivory tones with rich texture and distinctive handcrafted tassels. Its timeless geometric design brings artisan character and understated luxury to contemporary interiors.	\N	[{"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 5200.0, "lead_time_days": 24}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 6500.0, "lead_time_days": 29}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": true, "price": 7800.0, "lead_time_days": 35}]	7800	INR	9	high	Hand-Knotted	35	/static/rugs/528fad7b72cc4929a28d2c6263fd20c5.png	\N	5703	["living_room", "bedroom", "dining_room", "study", "entryway"]	["warm_earthy", "quiet_luxury", "artisan"]	t	\N	null	\N
9	1	Hand-Knotted Indo-Tibetan Wool-Silk Pink Rug	hand-knotted-indo-tibetan-wool-silk-pink-rug	Hand-knotted in an Indo-Tibetan style from a wool and silk blend, this rug features a low, lustrous pile with a soft, velvety hand. The tonal pink palette shifts from pale blush to deeper rose with a subtle sheen for a contemporary, minimalist or glam aesthetic. Its refined, solid field works beautifully in modern living rooms, bedrooms, and boutique interiors.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 4500.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 4567.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 6789.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 5678.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	5678	INR	12	6-7 MM	Hand-knotted Indo-Tibetan	21	/static/rugs/59a9d07ea60240bdbaa41aa5a3bd0884.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
25	1	Hand‑Tufted Wool Floral Rug	handtufted-wool-floral-rug	Hand-tufted in wool, this rug displays a classic floral and arabesque pattern on an ivory field framed by a powder‑blue border. The soft low-to-medium pile reads plush and refined, with a palette of ivory, blue, tan and muted greens. It suits traditional or transitional interiors and is ideal for hallways, living rooms or bedrooms.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1300.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2100.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3600.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4700.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6500.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4700	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/c493d7a3de3740958e131d6dcdc9c493.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
36	1	Hand-Knotted Indo-Tibetan Wool Rug	hand-knotted-indo-tibetan-wool-rug-2	A distinctive hand-knotted Indo-Tibetan rug crafted from wool, featuring an intricate scientific sequence-inspired pattern in black and grey over a natural cream foundation. Its detailed graphic composition, natural woven texture, and contemporary monochrome palette make it an artistic statement for modern interiors.	\N	[{"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 4999.0, "lead_time_days": 25}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 6499.0, "lead_time_days": 30}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 7999.0, "lead_time_days": 35}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	7999	INR	1	5-6 MM	Hand-knotted Indo-Tibetan	35	/static/rugs/478ed135a9284bff9039f51e456ee5dd.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	[]	t	\N	[]	\N
46	1	Midnight Teal Linear Wool Rug	midnight-teal-linear-wool-rug	A contemporary hand-tufted wool rug featuring a deep midnight field with striking teal linear accents. Its rich ribbed texture and minimalist design bring modern sophistication and bold character to premium interiors.	\N	[{"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 4800.0, "lead_time_days": 23}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 6300.0, "lead_time_days": 29}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": true, "price": 7700.0, "lead_time_days": 36}]	7700	INR	9	medium	Hand-Tufted	36	/static/rugs/9438da01feef4316adb0c1ac9e7697ae.png	\N	5703	["living_room", "bedroom", "dining_room", "study", "entryway"]	["modern_minimal", "bold_artistic", "luxury"]	t	\N	null	\N
37	1	Hand-knotted Indo-Tibetan Wool Rug	hand-knotted-indo-tibetan-wool-rug-3	Hand-knotted in wool, this Indo-Tibetan rug features an intricate burgundy geometric pattern against a cream field. Angular motifs and outlined squares create a distinctive contemporary design, complemented by natural wool texture and a neatly bound edge.	\N	[{"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 5648.0, "lead_time_days": 22}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 7908.0, "lead_time_days": 20}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 5451.0, "lead_time_days": 22}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	5451	INR	1	5-6 MM	Hand-knotted Indo-Tibetan	22	/static/rugs/a8f4c7d024824a4786ae41df4be0945c.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	[]	t	\N	[]	\N
47	1	Blush Linear Textured Rug	blush-linear-textured-rug	A refined hand-tufted rug in a soft blush tone, crafted with wool and viscose silk for rich texture and a subtle lustrous finish. Its understated linear surface brings warmth, elegance, and contemporary sophistication to modern interiors.	\N	[{"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 4600.0, "lead_time_days": 22}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 6200.0, "lead_time_days": 29}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": true, "price": 7600.0, "lead_time_days": 37}]	7600	INR	11	medium	Hand-Tufted	37	/static/rugs/9b6db63b5e694f69a8c606988eee3493.png	\N	5703	["living_room", "bedroom", "dining_room", "study", "entryway"]	["quiet_luxury", "modern_minimal", "luxury"]	t	\N	null	\N
10	1	Modern Green Pixel Patchwork Rug	modern-green-pixel-patchwork-rug	This machine-woven area rug features a bold pixelated patchwork pattern in layered shades of lime, grass, olive and deep green with small coral and chocolate accents; the image file is labeled 'WhatsApp Image 2026-08-29 at 17.32.29 (1).jpeg'. Its low-pile, smooth construction provides a flat, slightly plush hand that complements contemporary, mid-century modern, and casual interiors such as living rooms, home offices, and playrooms.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 2000.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 2322.0, "lead_time_days": 234}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 3233.0, "lead_time_days": 23}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 4222.0, "lead_time_days": 25}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 3435.0, "lead_time_days": 26}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 4534.0, "lead_time_days": 35}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 35}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 35}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 35}]	3435	INR	1	5-6 MM	Hand-knotted Indo-Tibetan	26	/static/rugs/6ee929ac7c264b3ead827964cc6a4af1.jpg	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
48	1	Ivory Moroccan Diamond Rug	ivory-moroccan-diamond-rug	A luxurious hand-knotted Moroccan-style wool rug featuring an organic charcoal diamond lattice over a warm ivory high-pile surface. Finished with natural fringe and rich handmade texture, it brings timeless softness and understated character to contemporary interiors.	\N	[{"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 4875.0, "lead_time_days": 23}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 6140.0, "lead_time_days": 27}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": true, "price": 7425.0, "lead_time_days": 33}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 7890.0, "lead_time_days": 38}]	7425	INR	9	high	Hand-Knotted	33	/static/rugs/6915a43469d84e0d93c54d345a3dccd6.png	\N	5703	[]	[]	t	\N	null	\N
15	1	Hand-Tufted Wool Hexagon Medallion Rug	hand-tufted-wool-hexagon-medallion-rug	Hand-tufted in wool, this rug showcases a repeating hexagon medallion layout filled with floral and geometric motifs in deep blue and soft cream. Contrasting cut-pile motifs give a subtle sculpted texture against a slightly striated ground, offering a low-to-medium pile feel. The muted blue-and-cream palette and transitional pattern suit contemporary, coastal, or transitional living rooms and bedrooms.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1300.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 1900.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3400.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4300.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6800.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4300	INR	5	Zero Pile	Hand-Tufted	21	/static/rugs/1125a7acce2e40529cc39ad1cef47fba.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
49	1	Natural Sage Jute Flatweave Rug	natural-sage-jute-flatweave-rug	A hand-woven jute flatweave rug featuring natural brown and muted sage tones with a richly textured organic surface. Finished with handcrafted fringe, this durable and versatile rug brings warm, earthy character to modern, coastal and contemporary interiors.	\N	[{"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 4650.0, "lead_time_days": 23}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 5980.0, "lead_time_days": 28}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": true, "price": 7250.0, "lead_time_days": 33}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 7890.0, "lead_time_days": 38}]	7250	INR	10	flat	Hand-woven Flat Weave	33	/static/rugs/1181b04470294de2ad05bf64e6030449.png	\N	5703	[]	[]	t	\N	null	\N
34	1	Hand-knotted Indo-Tibetan Handspun New Zealand Wool Rug	hand-knotted-indo-tibetan-handspun-new-zealand-wool-rug	Hand-knotted in handspun New Zealand wool, this Indo-Tibetan rug features a rich olive tone with subtle horizontal variations. Its understated design and natural wool texture bring warmth and depth to both contemporary and traditional interiors.	\N	[{"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 4875.0, "lead_time_days": 24}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 7480.0, "lead_time_days": 35}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	7480	INR	3	6-7 MM	Hand-knotted Indo-Tibetan	35	/static/rugs/82522656292b4e64881b5ca87c407289.jpg	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	[]	t	\N	[]	\N
39	1	Handwoven Blue-Grey Jute Rug	handwoven-blue-grey-jute-rug	A handwoven blue-grey jute rug featuring subtle tonal variations, natural texture, and contrasting cream fringe. Its durable flatweave construction and understated contemporary finish make it ideal for living rooms, bedrooms, dining areas, studies, and entryways.	\N	[{"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 0.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 15}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	0	INR	10	flat	Hand-woven Flat Weave	21	/static/rugs/d0c88c0b75c641b2b62b8359e81169c5.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["warm_earthy", "bold_artistic", "timeless_traditional"]	t	\N	[]	\N
6	1	Hand Tufted	hand-knotted-indo-tibetan-wool-silk-rug-2	Hand-Crafted Indo-Tibetan Wool & Silk Rug — a refined statement piece blending traditional craftsmanship with contemporary design. Expertly hand-crafted using a luxurious combination of premium wool and silk, this rug offers a soft, rich texture with a subtle natural sheen that enhances its pattern and depth. The Indo-Tibetan construction delivers excellent durability while preserving an elegant, artisanal finish. Ideal for living rooms, bedrooms, dining spaces, and sophisticated interiors, it adds warmth, texture, and timeless character to any setting.	<p>Hand-Crafted Indo-Tibetan Wool &amp; Silk Rug — a refined statement piece blending traditional craftsmanship with contemporary design. Expertly hand-crafted using a luxurious combination of premium wool and silk, this rug offers a soft, rich texture with a subtle natural sheen that enhances its pattern and depth. The Indo-Tibetan construction delivers excellent durability while preserving an elegant, artisanal finish. Ideal for living rooms, bedrooms, dining spaces, and sophisticated interiors, it adds warmth, texture, and timeless character to any setting.</p>	[{"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 45.88, "lead_time_days": 21}, {"master_size_id": 20, "ft": "3 round ft", "cm": "90 round cm", "price": 45.88, "lead_time_days": 21, "is_default": false}, {"master_size_id": 21, "ft": "4 round ft", "cm": "120 round cm", "price": 45.88, "lead_time_days": 21, "is_default": false}, {"master_size_id": 22, "ft": "5 round ft", "cm": "150 round cm", "price": 45.88, "lead_time_days": 21, "is_default": false}, {"master_size_id": 23, "ft": "6 round ft", "cm": "180 round cm", "price": 45.88, "lead_time_days": 21, "is_default": false}, {"master_size_id": 24, "ft": "7 round ft", "cm": "210 round cm", "price": 45.88, "lead_time_days": 21, "is_default": false}, {"master_size_id": 25, "ft": "8 round ft", "cm": "240 round cm", "price": 45.88, "lead_time_days": 21, "is_default": false}, {"master_size_id": 26, "ft": "9 round ft", "cm": "270 round cm", "price": 45.88, "lead_time_days": 21, "is_default": false}]	45.88	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/f1b3a3d6dffa4d6dbe4fac556ec4df03.png	\N	5703	["living_room"]	["warm_earthy"]	t	\N	[]	\N
8	1	Tibetan World Map Wool Rug	tibetan-world-map-wool-rug	A machine-woven wool rug featuring a contemporary world‑map motif with crisp graphic outlines and clustered accent spots inspired by the Tibetan design referenced in the filename. The cool gray field is punctuated by vivid crimson and rust accents and framed by slate borders, offering a soft, low‑profile wool texture that complements modern living rooms, home offices, and travel‑themed interiors.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 2300.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	2300	INR	1	5-6 MM	Hand-knotted Indo-Tibetan	21	/static/rugs/bf34c594eebe43ae93dd91fda65fc1e7.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
21	1	Hand-Tufted Abstract Wool Rug — Blue & Rust	hand-tufted-abstract-wool-rug-blue-rust	Hand-tufted wool construction with a painterly, abstract motif in deep blues and indigo punctuated by warm rust, tan and cream accents. The dense, low-to-medium pile provides a soft, textured surface that suits modern, transitional, or contemporary interiors such as living rooms, bedrooms, and offices.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2100.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3300.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4500.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6900.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4500	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/88d3f2afc1b840fbae71ef6f0d476cd8.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
12	1	Handwoven Jute Dhurrie Rug	handwoven-jute-dhurrie-rug	Handwoven jute dhurrie with a tight flatweave construction showcasing geometric diamond motifs in warm natural tan with muted teal accents. Its low‑profile, tactile texture offers an organic, rustic feel that suits coastal, bohemian, farmhouse, or modern casual interiors.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 2300.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 3455.0, "lead_time_days": 26}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 345.0, "lead_time_days": 65454}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3535.0, "lead_time_days": 4646}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 345.0, "lead_time_days": 35}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 353.0, "lead_time_days": 46}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	345	INR	10	flat	Hand-woven Flat Weave	35	/static/rugs/d1e1abad4f104421bc311a0bd453fb77.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
28	1	Patchwork Hand-Tufted Wool Rug	patchwork-hand-tufted-wool-rug	Hand-tufted wool rug composed of stitched patchwork panels that mix floral and traditional motifs for a collected look. A soft low-to-medium pile and a muted palette of blush, dusty rose, teal and slate lend texture and warmth, making it well suited to contemporary bohemian, eclectic, or transitional living rooms and bedrooms.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2000.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3400.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4800.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6400.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4800	INR	5	Zero Pile	Hand-Tufted	21	/static/rugs/22132c746012499b863c4440deae5a04.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
23	1	Hand-Tufted Wool Abstract Rug — Slate & Sand	hand-tufted-wool-abstract-rug-slate-sand	This hand-tufted wool rug features a painterly abstract pattern of mottled speckles and organic shapes across a deep slate background, punctuated with sand, taupe, and cream tones. The dense, soft pile provides a plush underfoot texture ideal for modern, contemporary, or transitional living rooms and bedrooms looking for a subtle, artful focal point.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 1900.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3600.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4400.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4400	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/54f507d68a4a4df3be72b62900fee7fa.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
26	1	Hand-Tufted Wool Patchwork Rug	hand-tufted-wool-patchwork-rug	Hand‑tufted wool patchwork rug made from stitched panels of traditional floral and medallion motifs. A muted palette of sage, dove gray, taupe, cream and soft brown creates a gently aged, transitional look while the low-to-medium wool pile offers a soft, subtly textured surface. Works well in living rooms, bedrooms or casual, vintage-inspired interiors.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2000.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3600.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4500.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6700.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4500	INR	5	Zero Pile	Hand-Tufted	21	/static/rugs/6fbd5cfd3c7746019f55d206ac7c66e4.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
30	1	Hand-Tufted Patchwork Wool Rug	hand-tufted-patchwork-wool-rug-2	This hand-tufted patchwork wool rug features a collage of vintage-inspired medallions and geometric panels in a lively palette of red, yellow, green, blue and cream. The soft, low-to-medium wool pile provides subtle texture and warmth, making it a versatile choice for bohemian, eclectic, or contemporary living rooms and entryways.	\N	[{"ft": "6x9", "cm": "180x270", "is_default": false, "price": 500.0, "lead_time_days": 21, "master_size_id": 5}, {"ft": "8x10", "cm": "240 x 300", "is_default": false, "price": 1200.0, "lead_time_days": 21, "master_size_id": 6}, {"ft": "9x12", "cm": "270x360", "is_default": false, "price": 2000.0, "lead_time_days": 21, "master_size_id": 7}, {"ft": "10x14", "cm": "300x420", "is_default": false, "price": 3300.0, "lead_time_days": 21, "master_size_id": 8}, {"ft": "2x3", "cm": "60x90", "is_default": true, "price": 4200.0, "lead_time_days": 21, "master_size_id": 1}, {"ft": "12x15", "cm": "360x450", "is_default": false, "price": 6600.0, "lead_time_days": 21, "master_size_id": 9}, {"master_size_id": 20, "ft": "3 round ft", "cm": "90 round cm", "price": 4200.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 21, "ft": "4 round ft", "cm": "120 round cm", "price": 4200.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 22, "ft": "5 round ft", "cm": "150 round cm", "price": 4200.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 23, "ft": "6 round ft", "cm": "180 round cm", "price": 4200.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 24, "ft": "7 round ft", "cm": "210 round cm", "price": 4200.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 25, "ft": "8 round ft", "cm": "240 round cm", "price": 4200.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 26, "ft": "9 round ft", "cm": "270 round cm", "price": 4200.0, "lead_time_days": 21, "is_default": false}]	4200	INR	5	Zero Pile	Hand-Tufted	21	/static/rugs/992925d8e8274ba79726dcf546d87859.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
16	1	Hand-Tufted Wool Floral Rug — Grey & Sage	hand-tufted-wool-floral-rug-grey-sage	A hand-tufted wool rug featuring a large-scale floral medallion pattern in layered greys with subtle sage undertones. The low-to-medium pile and tonal strié texture provide a soft, structured feel that reads modern yet classic. Ideal for contemporary or transitional living rooms, bedrooms, and home offices.	\N	[{"ft": "6x9", "cm": "180x270", "is_default": false, "price": 500.0, "lead_time_days": 21, "master_size_id": 5}, {"ft": "8x10", "cm": "240 x 300", "is_default": false, "price": 1200.0, "lead_time_days": 21, "master_size_id": 6}, {"ft": "9x12", "cm": "270x360", "is_default": false, "price": 2000.0, "lead_time_days": 21, "master_size_id": 7}, {"ft": "10x14", "cm": "300x420", "is_default": false, "price": 3500.0, "lead_time_days": 21, "master_size_id": 8}, {"ft": "2x3", "cm": "60x90", "is_default": true, "price": 4500.0, "lead_time_days": 21, "master_size_id": 1}, {"ft": "12x15", "cm": "360x450", "is_default": false, "price": 6800.0, "lead_time_days": 21, "master_size_id": 9}, {"master_size_id": 20, "ft": "3 round ft", "cm": "90 round cm", "price": 4500.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 21, "ft": "4 round ft", "cm": "120 round cm", "price": 4500.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 22, "ft": "5 round ft", "cm": "150 round cm", "price": 4500.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 23, "ft": "6 round ft", "cm": "180 round cm", "price": 4500.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 24, "ft": "7 round ft", "cm": "210 round cm", "price": 4500.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 25, "ft": "8 round ft", "cm": "240 round cm", "price": 4500.0, "lead_time_days": 21, "is_default": false}, {"master_size_id": 26, "ft": "9 round ft", "cm": "270 round cm", "price": 4500.0, "lead_time_days": 21, "is_default": false}]	4500	INR	5	Zero Pile	Hand-Tufted	21	/static/rugs/ec97c8b1f92e4d2098f8cbfd9b04c207.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
32	1	Hand Knotted Woollen Carpet – Wool	hand-knotted-woollen-carpet-wool	Hand-knotted in wool, this rectangular carpet features flowing golden-brown abstract motifs across a soft cream field. Its natural wool texture and organic pattern bring warmth and character to living rooms, bedrooms, dining spaces, studies, and entryways.	\N	[{"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 5801.0, "lead_time_days": 24}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 7395.0, "lead_time_days": 29}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6371.0, "lead_time_days": 40}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}]	7395	INR	1	8-9 MM	Hand Knotted	29	/static/rugs/0a24d8a59e9b4caaa86e5ded5f3eb522.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	[]	t	\N	[]	\N
40	1	Machine-woven	machine-woven	Handcrafted round jute rug with soft concentric detailing and a naturally textured finish. Its warm neutral tones add an understated, organic character to modern, coastal, minimalist, and contemporary interiors.	\N	[{"ft": "3 round ft", "cm": "90 round cm", "master_size_id": 20, "is_default": true, "price": 0.0, "lead_time_days": 12}, {"ft": "4 round ft", "cm": "120 round cm", "master_size_id": 21, "is_default": false, "price": 0.0, "lead_time_days": 12}, {"ft": "5 round ft", "cm": "150 round cm", "master_size_id": 22, "is_default": false, "price": 0.0, "lead_time_days": 12}, {"ft": "6 round ft", "cm": "180 round cm", "master_size_id": 23, "is_default": false, "price": 0.0, "lead_time_days": 12}, {"ft": "7 round ft", "cm": "210 round cm", "master_size_id": 24, "is_default": false, "price": 0.0, "lead_time_days": 12}, {"ft": "8 round ft", "cm": "240 round cm", "master_size_id": 25, "is_default": false, "price": 0.0, "lead_time_days": 12}, {"ft": "9 round ft", "cm": "270 round cm", "master_size_id": 26, "is_default": false, "price": 0.0, "lead_time_days": 12}]	0	INR	10	flat	Machine-Woven	12	/static/rugs/1e60011e230448eebc460f0ad28adba8.png	\N	5703	[]	[]	t	\N	[]	\N
41	1	Hand-woven Jute Rug	hand-woven-jute-rug	The Ciel Desert Handwoven Jute Dhurrie features warm terracotta and natural beige stripes with fringed edges. Its durable flatweave and organic texture bring understated character to contemporary interiors.	\N	[{"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 0.0, "lead_time_days": 12}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 12}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 12}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	0	INR	10	flat	Hand-woven Flat Weave	12	/static/rugs/12b681fb0c724a12bf0d6986a3c9a1a2.webp	\N	5703	[]	[]	t	\N	[]	\N
2	1	Handknotted Indo Tibetan	handknotted-indo-tibetan	\N	<p>The <strong>Tibetan Abstract Blush &amp; Charcoal Rug</strong> is a contemporary statement piece inspired by modern art and traditional Tibetan rug craftsmanship. Its expressive abstract pattern combines soft blush pink with deep charcoal, muted teal and subtle sage tones, creating a sophisticated balance of warmth and contrast.</p><p>The layered, distressed design gives the rug depth and artistic character while maintaining an elegant, luxurious appearance. Its versatile color palette complements contemporary, modern, eclectic and designer interiors beautifully.</p><p>Crafted with attention to texture and detail, this rug is designed to bring softness, visual interest and distinctive character to living rooms, bedrooms, dining areas, offices and hospitality spaces. It can also serve as a striking focal point in minimalist interiors.</p><p><strong>Key Features</strong></p><ul><li><p>Contemporary Tibetan-inspired abstract design</p></li><li><p>Elegant blush pink, charcoal, teal and sage color palette</p></li><li><p>Rich textured appearance</p></li><li><p>Soft and luxurious underfoot</p></li><li><p>Statement design for modern interiors</p></li><li><p>Suitable for residential and hospitality projects</p></li><li><p>Custom sizing and color options can be offered for made-to-order projects</p></li></ul><p></p>	[{"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 340.0, "lead_time_days": 20}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 340.0, "lead_time_days": 20}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 340.0, "lead_time_days": 20}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 340.0, "lead_time_days": 20}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	340	INR	1	6-7 MM	Hand-knotted Indo-Tibetan	20	/static/rugs/111f1953bb2149e2b246d2bdd51b1d6e.png	\N	5703	["living_room", "bedroom", "dining_room", "entryway"]	["quiet_luxury"]	t	\N	[]	\N
18	1	Green Floral Hand-Tufted Wool Rug	green-floral-hand-tufted-wool-rug-2	Hand-tufted wool rug featuring a Persian-inspired floral field and ornate border in a soothing green and teal palette with accents of blue, cream, and rust. The cut-pile construction creates a plush, slightly raised texture that maintains crisp pattern definition. Ideal for traditional or transitional living rooms, bedrooms, or studies seeking a calm, classic grounding piece.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1300.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2100.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3200.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4800.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6400.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4800	INR	5	8-9 MM	Hand-Tufted	21	/static/rugs/293322269a3349829d0990380291e9f8.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
19	1	Black & Ivory Hand-Tufted Wool Rug	black-ivory-hand-tufted-wool-rug	Hand-tufted from wool in a high-contrast black and ivory palette, this rug features narrow vertical stripes and rectangular, tribal-inspired motifs for a graphic look. The low-to-medium pile provides a subtly textured surface with crisp pattern definition. Ideal for modern, minimalist, bohemian, or transitional interiors—use it to anchor living rooms, dining areas, hallways, or layered floor schemes.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 2100.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3100.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4300.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6200.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4300	INR	5	Zero Pile	Hand-Tufted	21	/static/rugs/ab410061583c4d8ea38d303854167b68.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
31	1	Hand-knotted Indo-Tibetan Wool & Viscose Silk Rug	hand-knotted-indo-tibetan-wool-viscose-silk-rug	Bring the character of Indo-Tibetan craftsmanship into your home with this hand-knotted rug in Wool & Viscose Silk. The blend pairs wool's inviting texture with the subtle sheen of viscose silk, creating an elegant foundation for living rooms, bedrooms, dining spaces, studies, and entryways.	\N	[{"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 4936.0, "lead_time_days": 36}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 5507.0, "lead_time_days": 31}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 4208.0, "lead_time_days": 31}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}]	5507	INR	12	5-6 MM	Hand-knotted Indo-Tibetan	31	/static/rugs/589bd43219c04cbcbcf9d782ce34dca3.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	[]	t	\N	[]	\N
43	1	Handknotted Sumac & Pile Woollen Carpet	handknotted-woollen-carpet	A luxurious hand-knotted wool rug in warm ivory, featuring a sculpted diagonal texture and refined high-low pile. Handcrafted for elegant contemporary interiors, it offers natural softness, depth, and enduring artisan quality.	\N	[{"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 0.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	0	INR	1	8-9 MM	Hand-Knotted	21	/static/rugs/591f73beee404975ad526da3a1d6c115.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	[]	t	\N	[]	\N
4	1	Hand-Knotted Indo-Tibetan Wool & Silk Rug	hand-knotted-indo-tibetan-wool-silk-rug	This Hand-Knotted Indo-Tibetan Wool & Silk Rug combines traditional craftsmanship with a refined modern aesthetic. Expert artisans carefully hand-knot each rug using a premium blend of natural wool and silk, producing a beautifully textured surface with exceptional softness and a sophisticated sheen.\n\nThe wool provides warmth, durability, and resilience, while the silk highlights selected areas of the design with a smooth, luminous finish. This contrast creates visual depth and allows the rug to change subtly depending on the direction of light.\n\nPerfect for living rooms, bedrooms, dining areas, luxury residences, boutique hotels, and designer interiors, this Indo-Tibetan rug adds elegance without overwhelming the surrounding décor.	<p>This <strong>Hand-Knotted Indo-Tibetan Wool &amp; Silk Rug</strong> combines traditional craftsmanship with a refined modern aesthetic. Expert artisans carefully hand-knot each rug using a premium blend of natural wool and silk, producing a beautifully textured surface with exceptional softness and a sophisticated sheen.</p><p>The wool provides warmth, durability, and resilience, while the silk highlights selected areas of the design with a smooth, luminous finish. This contrast creates visual depth and allows the rug to change subtly depending on the direction of light.</p><p>Perfect for <strong>living rooms, bedrooms, dining areas, luxury residences, boutique hotels, and designer interiors</strong>, this Indo-Tibetan rug adds elegance without overwhelming the surrounding décor.</p>	[{"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 50.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 0.0, "lead_time_days": 21}]	50	INR	12	6-7 MM	Hand-knotted Indo-Tibetan	21	/static/rugs/c47d700e9bdf444e81ffcb69380364ee.png	\N	5703	["living_room"]	["warm_earthy"]	t	\N	[]	\N
27	1	Hand-Tufted Patchwork Wool Rug	hand-tufted-patchwork-wool-rug	Hand-tufted in wool, this patchwork rug combines stitched rectangular panels of traditional floral and geometric motifs in a lively mix of jewel and pastel tones—magenta, teal, green, navy and cream. The dense, low-to-medium pile gives a soft underfoot feel with subtle texture from the stitched seams, making it well suited to eclectic, bohemian, or transitional living rooms and entryways. Its vibrant, mixed-palette design layers easily with neutral furnishings or bold accent pieces.	\N	[{"ft": "6x9", "cm": "180x270", "master_size_id": 5, "is_default": false, "price": 500.0, "lead_time_days": 21}, {"ft": "8x10", "cm": "240 x 300", "master_size_id": 6, "is_default": false, "price": 1200.0, "lead_time_days": 21}, {"ft": "9x12", "cm": "270x360", "master_size_id": 7, "is_default": false, "price": 1900.0, "lead_time_days": 21}, {"ft": "10x14", "cm": "300x420", "master_size_id": 8, "is_default": false, "price": 3100.0, "lead_time_days": 21}, {"ft": "2x3", "cm": "60x90", "master_size_id": 1, "is_default": true, "price": 4200.0, "lead_time_days": 21}, {"ft": "12x15", "cm": "360x450", "master_size_id": 9, "is_default": false, "price": 6800.0, "lead_time_days": 21}, {"ft": "3x5", "cm": "90x150", "master_size_id": 2, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "4x6", "cm": "120x180", "master_size_id": 3, "is_default": false, "price": 0.0, "lead_time_days": 21}, {"ft": "5x8", "cm": "150x240", "master_size_id": 4, "is_default": false, "price": 0.0, "lead_time_days": 21}]	4200	INR	5	Zero Pile	Hand-Tufted	21	/static/rugs/93af74272a8443db960d984e0be9bc51.png	\N	5703	["living-room", "bedroom", "dining-room", "study", "entryway"]	["artisan", "luxury", "timeless"]	t	\N	[]	\N
\.


--
-- Data for Name: rug_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rug_images (id, rug_catalog_id, image_url, sort_order, created_at) FROM stdin;
2	2	/static/rugs/f4288230bf6a41e4bcc0111b4a6b35dc.png	0	2026-08-29 08:37:20+00
3	2	/static/rugs/916b1a4650f4486d8e308be430f4eeff.png	1	2026-08-29 08:37:27+00
4	2	/static/rugs/b77e36ef3fcb4a64b7cdda73146bb671.png	2	2026-08-29 08:37:33+00
5	2	/static/rugs/c41a7d386fb246e1ad15e8c1ea07a6ac.png	3	2026-08-29 08:37:37+00
6	2	/static/rugs/77d1d5c8c2324eb9babf234327be29ed.png	4	2026-08-29 08:37:42+00
7	3	/static/rugs/edd2e7772f504126961f00ab4308a176.png	0	2026-08-29 10:49:36+00
8	3	/static/rugs/71133d28f024438e9e9d13a4f52cce91.png	1	2026-08-29 10:49:44+00
9	3	/static/rugs/96c295b5e2d54b1796bd81fb2038c4ce.png	2	2026-08-29 10:49:48+00
10	3	/static/rugs/e51b3570883f403d938d3c774bbdf475.png	3	2026-08-29 10:50:14+00
11	4	/static/rugs/e1ec268217374a549013f4970895a757.png	0	2026-08-29 10:53:49+00
12	4	/static/rugs/97e7fae8c08f41f8a8f4c3cc79b51dfd.png	1	2026-08-29 10:53:55+00
13	4	/static/rugs/f72c235e208e473596097d3ac89b5e55.png	2	2026-08-29 10:54:04+00
14	4	/static/rugs/fb05355588e04764bf5135603613f628.png	3	2026-08-29 10:54:11+00
15	5	/static/rugs/0e4a8a08603b4ddb9947274335884b95.png	0	2026-08-29 11:38:00+00
16	5	/static/rugs/37ed8245dab643f78ba578c60cf84215.png	1	2026-08-29 11:38:05+00
17	5	/static/rugs/f76a0c81708a442bac30ec92dc3d6d97.png	3	2026-08-29 11:38:21+00
18	5	/static/rugs/4645f307ab8c426da906e1edb0310092.png	4	2026-08-29 11:38:30+00
19	5	/static/rugs/598b622d1ad24ed2b16848c7dcfebe24.png	5	2026-08-29 11:38:39+00
20	6	/static/rugs/53604b48bc634f34a5828c613715e1a0.png	0	2026-08-29 13:01:54+00
21	6	/static/rugs/d7bb7a5090bf44edb9e320b8460292d4.png	1	2026-08-29 13:02:05+00
22	6	/static/rugs/4106be20208b47f8ab22eeec86ab4e6f.png	2	2026-08-29 13:02:14+00
23	6	/static/rugs/eca1ba8c32b241c882147b5f3973f6f2.png	3	2026-08-29 13:02:25+00
24	7	/static/rugs/44e13526b25e4713bcdf3f4bb0d719b4.png	1	2026-08-30 01:35:59+00
25	7	/static/rugs/9747d00bfa2a4b3eb3205e6c96c46102.png	2	2026-08-30 01:35:59+00
26	7	/static/rugs/e279df49ba2d477faddaf06bc0bcf01a.png	3	2026-08-30 01:35:59+00
27	7	/static/rugs/53b57bdada8a43d6b34e40c443b72c68.png	4	2026-08-30 01:35:59+00
28	7	/static/rugs/e4662247dcf7411dbf1cd553f86a6348.png	5	2026-08-30 01:35:59+00
29	8	/static/rugs/eb8364b1141b4723986f4523df483ffd.png	1	2026-08-30 01:36:42+00
30	8	/static/rugs/1b0c410970c94ef7b5fba0a4c9f62fa9.png	2	2026-08-30 01:36:42+00
31	8	/static/rugs/67d9529d3dfb4362ba759d9efa286569.png	3	2026-08-30 01:36:42+00
32	8	/static/rugs/e9f364aac34c45bf81077c91fc016527.png	4	2026-08-30 01:36:42+00
33	8	/static/rugs/391a919740844a6e981b9165abc4bcb0.png	5	2026-08-30 01:36:43+00
34	9	/static/rugs/841b53d77e9242b2a6e293d2d96bb27a.png	1	2026-08-30 12:40:41.096121+00
35	9	/static/rugs/5cb3e65b90dd4d46aa9cc569c4c8baa1.png	2	2026-08-30 12:40:41.544179+00
36	9	/static/rugs/a02abe00273a43c0966630bb8d310685.png	3	2026-08-30 12:40:42.065385+00
37	9	/static/rugs/6b26cfcaed1e48ada18f71028b28f0a2.png	4	2026-08-30 12:40:42.614068+00
38	9	/static/rugs/ab0f8b3d233c42cdbfc4f0309ec0ed21.png	5	2026-08-30 12:40:43.369992+00
39	10	/static/rugs/dab732c6634d4727bdfe13df13bd6072.png	1	2026-08-30 14:57:24.931414+00
40	10	/static/rugs/86602794f85948a7aa35bae2a8407bfd.png	2	2026-08-30 14:57:26.595181+00
41	10	/static/rugs/f87892cdcbb541f386e8cd7add116f3a.png	3	2026-08-30 14:57:27.682315+00
42	10	/static/rugs/23ed258543d64b629f4f71194211fe20.png	4	2026-08-30 14:57:28.718472+00
43	10	/static/rugs/ec074875675b4bedb3d41a9cec16e0c8.png	5	2026-08-30 14:57:30.01156+00
49	12	/static/rugs/d732ceaa704a49a18820039c46a6d70b.png	1	2026-08-31 10:07:42.931094+00
50	12	/static/rugs/a2c16acb490c453d9cf0e877655d71b0.png	2	2026-08-31 10:07:43.752379+00
51	12	/static/rugs/bb5a0fc4451e42e091250aceac038e0e.png	3	2026-08-31 10:07:45.239193+00
52	12	/static/rugs/ddfebcf754b84c5db9b04bc96fabe35c.png	4	2026-08-31 10:07:46.305694+00
53	12	/static/rugs/ef4395f3d2a44c378ca5609c4533efea.png	5	2026-08-31 10:07:49.032918+00
54	13	/static/rugs/6badf323ca68498b84a012d8e7efac5c.png	1	2026-09-01 15:48:37.593149+00
55	13	/static/rugs/a0bd4a334e4f4a73b69f6a1a5aaf6d6e.png	2	2026-09-01 15:48:38.986225+00
56	13	/static/rugs/fc01070cf39b479ab7a4f04ada778e4d.png	3	2026-09-01 15:48:40.176066+00
57	13	/static/rugs/c5cf799769fe46da84dee47ceb82cd00.png	4	2026-09-01 15:48:41.28627+00
58	13	/static/rugs/1704c6a5020c4290bcd7c5124eef5de5.png	5	2026-09-01 15:48:42.863595+00
64	15	/static/rugs/39e38d308c384e40a80215af295b2628.png	1	2026-09-01 19:23:37.030735+00
65	15	/static/rugs/50ed50cf2b3648b486cc799c770acebd.png	2	2026-09-01 19:23:38.485534+00
66	15	/static/rugs/bb6141cf2f834d74bc49e555e85b39e1.png	3	2026-09-01 19:23:40.306315+00
67	15	/static/rugs/29db12dd2c0648fd903da9f824ac1634.png	4	2026-09-01 19:23:42.46131+00
68	15	/static/rugs/939d6728c6e44c0e91c146b601231d6c.png	5	2026-09-01 19:23:44.939486+00
69	16	/static/rugs/d57128095d904914aa9e4a0426376bd7.png	1	2026-09-01 19:34:31.114216+00
70	16	/static/rugs/99d1cdbd2be1409cab86bda5f73e6625.png	2	2026-09-01 19:34:32.665758+00
71	16	/static/rugs/687b3d045a154c7b82d6df3ceb86ee48.png	3	2026-09-01 19:34:34.095664+00
72	16	/static/rugs/a588d85152cb48df8421d6b66834bc5f.png	4	2026-09-01 19:34:35.39188+00
73	16	/static/rugs/d624b5815ceb4f738797dbb2002a305d.png	5	2026-09-01 19:34:36.568822+00
74	17	/static/rugs/99dc2381b33f40efbe8b4f67f1a440c9.png	1	2026-09-01 19:47:56.943656+00
75	17	/static/rugs/3bf07f249f43487a8b0a60e1f9027d74.png	2	2026-09-01 19:47:57.70246+00
76	17	/static/rugs/4d90605dfcc246d080bdd6b6a61c1e50.png	3	2026-09-01 19:47:58.518602+00
77	17	/static/rugs/79b0b8ff384e49fb9beddda929ae490c.png	4	2026-09-01 19:47:59.11463+00
78	17	/static/rugs/780135bce916442eaa5d1a5936f51df1.png	5	2026-09-01 19:47:59.693242+00
79	18	/static/rugs/57425a73251247fa976b86f407f1092e.png	1	2026-09-01 20:10:06.921531+00
80	18	/static/rugs/e300c624d70f4edeb8ab0e9a20456232.png	2	2026-09-01 20:10:07.834869+00
81	18	/static/rugs/3f4f5e6edae14c9d814c62787ffd328c.png	3	2026-09-01 20:10:08.670116+00
82	18	/static/rugs/af4d298d805e43fbb319beaffeb1b93a.png	4	2026-09-01 20:10:09.590729+00
83	18	/static/rugs/678cf01cd56f40b4b63000bdcc13bf45.png	5	2026-09-01 20:10:10.447976+00
84	19	/static/rugs/c91cd1adec504323946f97a798ac4cfe.png	1	2026-09-02 01:34:26.892624+00
85	19	/static/rugs/01833c131549457b99b8f222b733e11d.png	2	2026-09-02 01:34:28.515301+00
86	19	/static/rugs/97136878e7eb4e049f5a31d95fa06da7.png	3	2026-09-02 01:34:30.108533+00
87	19	/static/rugs/8bc7b166b5784eee8f8f3d7fb5770789.png	4	2026-09-02 01:34:31.625984+00
88	19	/static/rugs/0d45bdb9437c448b85136ae28ce7063e.png	5	2026-09-02 01:34:33.810007+00
89	20	/static/rugs/a33ea2258eb4469c8586e61b0b7a857d.png	1	2026-09-02 01:55:27.268654+00
90	20	/static/rugs/930ac56216cf49cdb28bdf22a59d9fae.png	2	2026-09-02 01:55:27.617657+00
91	20	/static/rugs/4550ec8cc1e444de9565b1715463fb9c.png	3	2026-09-02 01:55:27.995341+00
92	20	/static/rugs/e29ef0432c944a74a8c927bad270c24e.png	4	2026-09-02 01:55:28.384098+00
93	20	/static/rugs/f8de7c2fc25a422495468bb7d06084ad.png	5	2026-09-02 01:55:28.834425+00
94	21	/static/rugs/d57179308f394ef59820b8908f120c8a.png	1	2026-09-02 02:05:48.264529+00
95	21	/static/rugs/8ec093d1a483420c93ef7dae200279ef.png	2	2026-09-02 02:05:48.759733+00
96	21	/static/rugs/cb69fd90c08740f4baa1e206770e06a5.png	3	2026-09-02 02:05:49.395001+00
97	21	/static/rugs/0e7fc76f39254d1287a26fedc1cb7b40.png	4	2026-09-02 02:05:49.876699+00
98	21	/static/rugs/40155958165c4db3a9e35626bd4e9d40.png	5	2026-09-02 02:05:50.291389+00
99	22	/static/rugs/5b636491034146098827226e0033e8f4.png	1	2026-09-02 02:16:13.483607+00
100	22	/static/rugs/78718ca8543d484fb46e50a57e4c136c.png	2	2026-09-02 02:16:13.885421+00
101	22	/static/rugs/a1750d5f2bd34a8ca7519a6dee617dd1.png	3	2026-09-02 02:16:14.25781+00
102	22	/static/rugs/ef18269a58b6440d878421cbf396dcdc.png	4	2026-09-02 02:16:14.630615+00
103	22	/static/rugs/4eeed30c2c5849db81c1f4f422bb6b83.png	5	2026-09-02 02:16:15.085457+00
104	23	/static/rugs/004eb13f97de41bf8d9be5b1e9def445.png	1	2026-09-02 02:26:44.204631+00
105	23	/static/rugs/9e07d28dc86d4d1c99e68b55ad179ee6.png	2	2026-09-02 02:26:44.591112+00
106	23	/static/rugs/719e430100ac42d083e44b9a180e13f4.png	3	2026-09-02 02:26:44.920782+00
107	23	/static/rugs/384976c519a54af8a13a84701566d170.png	4	2026-09-02 02:26:45.314779+00
108	23	/static/rugs/541af40e355a46ee8b11b2e547078d69.png	5	2026-09-02 02:26:45.681835+00
109	24	/static/rugs/687214a3e854466ea3abc2dc8d7601ce.png	1	2026-09-02 02:37:31.118405+00
110	24	/static/rugs/42b9f73a9e5a491d8e463b041489b8a7.png	2	2026-09-02 02:37:31.522229+00
111	24	/static/rugs/6e12977a970e453694558c1ab6cec334.png	3	2026-09-02 02:37:31.869086+00
112	24	/static/rugs/1562a9ef29d24b108231d4bf73ab7aff.png	4	2026-09-02 02:37:32.236068+00
113	24	/static/rugs/24d8dd97cef940dca72fed642c8876e1.png	5	2026-09-02 02:37:32.677921+00
114	25	/static/rugs/27656a360168489a805b87f2c3faf5c0.png	1	2026-09-02 02:49:32.385158+00
115	25	/static/rugs/86c106388d624ba4a73f911297b7c7d6.png	2	2026-09-02 02:49:32.753406+00
116	25	/static/rugs/af5cade6027e484abee5b79c8ddd6da4.png	3	2026-09-02 02:49:33.112438+00
117	25	/static/rugs/3b3303757ad14c34a2ad456688a50008.png	4	2026-09-02 02:49:33.456681+00
118	25	/static/rugs/c4f71c8a1a9e4a64a0b2c54c34085f01.png	5	2026-09-02 02:49:33.91648+00
119	26	/static/rugs/b95161b0f3544021bfcd17a430d3e045.png	1	2026-09-02 03:02:05.491851+00
120	26	/static/rugs/07b07d4564124dc79dd632767799f239.png	2	2026-09-02 03:02:05.966002+00
121	26	/static/rugs/6f83694113e74f2d96c23705960312e4.png	3	2026-09-02 03:02:06.395796+00
122	26	/static/rugs/a69fa123549a4aa998ca54b7f0825ac2.png	4	2026-09-02 03:02:06.803795+00
123	26	/static/rugs/0450d8d765cc4396b689e0480ea7c62b.png	5	2026-09-02 03:02:07.287703+00
124	27	/static/rugs/8703af70244041e4801d2eecb1ca94c9.png	1	2026-09-02 03:24:13.776569+00
125	27	/static/rugs/6a4566176a1a4ac69c84583a3fd08b0a.png	2	2026-09-02 03:24:14.494325+00
126	27	/static/rugs/6f27564d2dd84477a1a5490f28165b8b.png	3	2026-09-02 03:24:15.366061+00
127	27	/static/rugs/0b00af5f076b495caccd878d206a3bef.png	4	2026-09-02 03:24:16.397134+00
128	27	/static/rugs/5520677f14224391a6c54c161be59240.png	5	2026-09-02 03:24:17.516671+00
129	28	/static/rugs/2f9a55fed26d4c3983df13c1cbacb9ae.png	1	2026-09-02 03:36:44.706147+00
130	28	/static/rugs/1760776b21fb4b468b53c0afc5dbd885.png	2	2026-09-02 03:36:45.718029+00
131	28	/static/rugs/cd466cc7aeee4903b3bab568a2e3ac8f.png	3	2026-09-02 03:36:46.744556+00
132	28	/static/rugs/c1d3250e6c6548978942a5290e919084.png	4	2026-09-02 03:36:47.890102+00
133	28	/static/rugs/ba93c0cf99ac485a9febbf96d3d53289.png	5	2026-09-02 03:36:49.044774+00
139	30	/static/rugs/d2effe38bbd04574b973f8d4f1e5cfc1.png	1	2026-09-02 03:58:51.231267+00
140	30	/static/rugs/d76a8fcb883b4dbe9a65f884745c1edc.png	2	2026-09-02 03:58:52.728175+00
141	30	/static/rugs/9e713265df95464982fcff19f1b09960.png	3	2026-09-02 03:58:54.192141+00
142	30	/static/rugs/45dc22080a4c42c6bc27f7aa6868ddff.png	4	2026-09-02 03:58:56.268927+00
143	30	/static/rugs/2b4fa2a6ff6f4018a6caafcafb5f67dd.png	5	2026-09-02 03:58:58.026543+00
144	31	/static/rugs/9e16ea3fbf1e44759a3924bd59af2ff2.png	1	2026-09-02 05:11:58.928014+00
145	31	/static/rugs/bba51aa50bf240fe8ef55df30757ae7f.png	2	2026-09-02 05:11:58.930668+00
146	31	/static/rugs/3ab31784dd064f73868d13c80db9823e.png	3	2026-09-02 05:11:58.934331+00
147	31	/static/rugs/97427ed0a7ff46bc8d0960d7261ca513.png	4	2026-09-02 05:11:58.937274+00
148	31	/static/rugs/180e9b1238c14738a92e57b9f7d989fd.png	5	2026-09-02 05:11:58.939966+00
149	32	/static/rugs/ad4da5e80dcd48e288de3ebe9329f3ef.png	1	2026-09-02 05:53:25.981081+00
150	32	/static/rugs/3c7df2b5699548fc95766c3417aef4a2.png	2	2026-09-02 05:53:25.985478+00
151	32	/static/rugs/a71a3345902c4773b3035edf2138765d.png	3	2026-09-02 05:53:25.989273+00
152	32	/static/rugs/f596c59416604feab87f7dd9549f8cd4.png	4	2026-09-02 05:53:25.992709+00
153	32	/static/rugs/dcecab7799574a33a93f44ea85c8cf78.png	5	2026-09-02 05:53:25.995539+00
162	34	/static/rugs/bc3a74002c7340a68ea4788beb69f994.png	5	2026-09-02 08:26:29.297674+00
161	34	/static/rugs/d0d2556f18b2433481666ffe3c535726.png	4	2026-09-02 08:26:29.294836+00
160	34	/static/rugs/f445b8c8667a406f8972513689da19ff.png	3	2026-09-02 08:26:29.291445+00
159	34	/static/rugs/99ddf7d622d8484abbbbf4ed805af0f1.png	2	2026-09-02 08:26:29.287647+00
164	35	/static/rugs/6cd02682d7bc4b8cbdff4edf99ae263a.png	1	2026-09-02 10:25:00.582222+00
165	35	/static/rugs/bb90709f24c84c24b3783e6619d24ead.png	2	2026-09-02 10:25:00.587642+00
166	35	/static/rugs/a589ef34df6e4867b1b03b2837807e70.png	3	2026-09-02 10:25:00.592805+00
167	35	/static/rugs/1bada96da0264a45be8976b425b13fc0.png	4	2026-09-02 10:25:00.598001+00
168	35	/static/rugs/da87d1870d804c9f8e058bb6e12a8f56.png	5	2026-09-02 10:25:00.602269+00
163	34	/static/rugs/9688d438cf984f9cb6f0c3887e015ab2.png	6	2026-09-02 08:26:29.30035+00
232	48	/static/rugs/4c7b5e2688394eb38e8cbf33a64599a3.png	3	2026-09-08 06:10:25.8658+00
233	48	/static/rugs/f90448e9782642afa277728cddbdd6fc.png	4	2026-09-08 06:10:25.871368+00
234	48	/static/rugs/43b790c9a76645dbb34d195364854f16.png	5	2026-09-08 06:10:25.876189+00
235	49	/static/rugs/6e29e1b2b98e44368388270b91dfdf16.png	1	2026-09-08 17:10:07.50705+00
169	34	/static/rugs/f42a6899801c4a8782762c65fbac8c08.webp	1	2026-09-02 12:20:23.568773+00
170	36	/static/rugs/0b2a3ed78d3f48489869e38c0bc4282b.png	1	2026-09-02 16:20:54.563825+00
171	36	/static/rugs/218eea7e1cdc4dffad5b6432fa4a286d.png	2	2026-09-02 16:20:54.567181+00
172	36	/static/rugs/30826cd73f614ef38e50da20d9eb3aa8.png	3	2026-09-02 16:20:54.570386+00
173	36	/static/rugs/6fda6e5518864d5c8ecbc166e303b9cd.png	4	2026-09-02 16:20:54.573419+00
174	36	/static/rugs/4a224363a82d497086963eb14e7ce849.png	5	2026-09-02 16:20:54.576178+00
175	37	/static/rugs/d794b2f8d56b41bba481f89aadc9d1ba.png	1	2026-09-03 01:50:48.128968+00
176	37	/static/rugs/32007a4713164e49960b1b718ef16ab4.png	2	2026-09-03 01:50:48.135484+00
177	37	/static/rugs/be83b37e76b646f385cc4fdf8c75f7d4.png	3	2026-09-03 01:50:48.138611+00
178	37	/static/rugs/e376410275cb43598bc10c53e404ae3a.png	4	2026-09-03 01:50:48.141136+00
179	37	/static/rugs/d57a5aac2cae44d398c0d395d57027a2.png	5	2026-09-03 01:50:48.143556+00
180	38	/static/rugs/00d09c9c7d39455095e5de145240c556.png	1	2026-09-03 02:23:07.426483+00
181	38	/static/rugs/86154bc7768b4588ac668ad614d5e777.png	2	2026-09-03 02:23:07.43007+00
182	38	/static/rugs/cdac22ca02364cc99c06341a29e72bbc.png	3	2026-09-03 02:23:07.433757+00
183	38	/static/rugs/75062ae4d3374ea497e813bdc16c6324.png	4	2026-09-03 02:23:07.436423+00
184	38	/static/rugs/95672548fa8f46a093cf2d06b3cb3514.png	5	2026-09-03 02:23:07.438787+00
185	39	/static/rugs/6c55d7cefd7443d6bbf38e046e8bdecb.png	1	2026-09-05 13:03:42.015205+00
186	39	/static/rugs/ceb9516ffd294d419654d76897c111a5.png	2	2026-09-05 13:03:42.022901+00
187	39	/static/rugs/b8bee30c754c46e4a6efefcf0036966d.png	3	2026-09-05 13:03:42.0298+00
188	39	/static/rugs/f45275adc16345feb196648977070dac.png	4	2026-09-05 13:03:42.034438+00
189	39	/static/rugs/e677b4de1cb8470daf3a9205beeb8047.png	5	2026-09-05 13:03:42.037665+00
190	40	/static/rugs/2798eb27702b49a694f6beb0fa49b714.png	0	2026-09-05 13:53:28.693541+00
191	40	/static/rugs/32bcac263bdd40f98e5f5381423d867e.png	1	2026-09-05 13:53:29.45423+00
192	40	/static/rugs/23ea3de228494c4a86d90f8cb14918f8.png	2	2026-09-05 13:53:29.975151+00
193	40	/static/rugs/428387845d0846ecba61d4937730b73a.png	3	2026-09-05 13:53:30.348944+00
194	40	/static/rugs/41cc180632784b7aa16227c53400f04c.png	4	2026-09-05 13:53:30.753626+00
195	41	/static/rugs/877588a1f6df43d4a29d4dc2c0ac4f75.png	0	2026-09-05 14:44:05.598018+00
196	41	/static/rugs/29a2fa53e3ae41889a938204b4954c5a.png	1	2026-09-05 14:44:06.148596+00
197	41	/static/rugs/a48d0633da9049dfb790ddde76890875.png	2	2026-09-05 14:44:06.627761+00
198	41	/static/rugs/3e72d9c216b341658108a4672b39366b.png	3	2026-09-05 14:44:07.155071+00
199	41	/static/rugs/2c63709bc10249fe941e10a9b75a62f3.png	4	2026-09-05 14:44:07.663319+00
205	43	/static/rugs/460b2a7b7d9340a7a970daac12d102a7.png	1	2026-09-06 06:45:33.836955+00
206	43	/static/rugs/8fe273ce2ce24cb6af7c83b8a3eed7d4.png	2	2026-09-06 06:45:33.842633+00
207	43	/static/rugs/426e36deedef471293da5103b9cf2576.png	3	2026-09-06 06:45:33.846856+00
208	43	/static/rugs/4f59b1f70b54484b8d2f35baf7383cb5.png	4	2026-09-06 06:45:33.850332+00
209	43	/static/rugs/c3756ac9c16f4ce4bf084ca69cc9a0cb.png	5	2026-09-06 06:45:33.853507+00
210	44	/static/rugs/93eb0410648a4c039700cce285c94ec1.png	1	2026-09-07 14:39:09.921097+00
211	44	/static/rugs/ee06697078074692b802dcb91a233801.png	2	2026-09-07 14:39:09.925862+00
212	44	/static/rugs/dcb34cd6b0e341cea0f9202d5bbe5d03.png	3	2026-09-07 14:39:09.929574+00
213	44	/static/rugs/c1a8b5689aa8498fb184f04681e475ab.png	4	2026-09-07 14:39:09.932507+00
214	44	/static/rugs/9be0dc83302f41679dbd518588bbdef0.png	5	2026-09-07 14:39:09.935319+00
215	45	/static/rugs/194e21d2d9554a19a1ab60ef4c9a6bff.jpg	1	2026-09-07 16:46:31.061704+00
216	45	/static/rugs/2ae9941ded0b469ca1e2ba995bb8a2bb.jpg	2	2026-09-07 16:46:31.066961+00
217	45	/static/rugs/ce8aeba7f5d64ac0bc669a5b108d2398.jpg	3	2026-09-07 16:46:31.072735+00
218	45	/static/rugs/008d0ac5136e41be8d835fa35062f534.jpg	4	2026-09-07 16:46:31.076428+00
219	45	/static/rugs/fc5ed57a81a44cbfa0aa816ac4c99ddf.jpg	5	2026-09-07 16:46:31.079587+00
220	46	/static/rugs/ff4b79476eb7416586e59aab4c1ccda8.jpg	1	2026-09-07 17:05:59.497421+00
221	46	/static/rugs/5d09e290fa4c4980a1f69262ea984960.jpg	2	2026-09-07 17:05:59.50166+00
222	46	/static/rugs/50d3bef57e644d3a81e6f015ae8486cb.jpg	3	2026-09-07 17:05:59.505627+00
223	46	/static/rugs/1145ae109ef8499d89c14e735a9136ac.jpg	4	2026-09-07 17:05:59.508763+00
224	46	/static/rugs/0f1b469b9947458dab597073a558dee4.jpg	5	2026-09-07 17:05:59.511662+00
225	47	/static/rugs/a47745953fc94574848d0530df56556e.jpg	1	2026-09-07 17:28:15.978646+00
226	47	/static/rugs/db005ae8053748bc99662f88d749ae1b.jpg	2	2026-09-07 17:28:15.981388+00
227	47	/static/rugs/111c33f14b7b4027a3446cf797b6906a.jpg	3	2026-09-07 17:28:15.984145+00
228	47	/static/rugs/b72f23f939d742d7b928452f2c65ea88.jpg	4	2026-09-07 17:28:15.987079+00
229	47	/static/rugs/932b785f08fa479281a8c289c536af84.jpg	5	2026-09-07 17:28:15.98973+00
230	48	/static/rugs/5df348b9789a4f4ea607c77b0417201c.png	1	2026-09-08 06:10:25.851141+00
231	48	/static/rugs/b3a93447e0d84323a3bc5dc626e578ca.png	2	2026-09-08 06:10:25.860506+00
236	49	/static/rugs/cce76830f33643be891c2757818e2b1a.png	2	2026-09-08 17:10:07.514529+00
237	49	/static/rugs/036a865743644185a0a5f8154dcdb5e6.png	3	2026-09-08 17:10:07.518819+00
238	49	/static/rugs/ed730e8f04514abbaf3c4ed7e642e083.png	4	2026-09-08 17:10:07.522338+00
239	49	/static/rugs/fd0c5d510be44d70b71fa88caf7951fe.png	5	2026-09-08 17:10:07.525242+00
\.


--
-- Data for Name: rug_journey_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rug_journey_steps (id, tenant_id, title, description, sort_order, is_active, created_at) FROM stdin;
1	1	Buyer Request	Share your vision, room dimensions, and style — our team scopes your custom rug request.	10	t	2026-09-03 02:01:46.879325+00
2	1	CAD Approval	A CAD rendering of your design is prepared and shared for sign-off before any material is touched.	20	t	2026-09-03 02:01:46.879325+00
3	1	Material Dyeing	Wool, silk, cotton, or synthetic fibres are dyed in-house to your approved colourway.	30	t	2026-09-03 02:01:46.879325+00
4	1	Color Check	Dyed yarn is matched against the approved palette for consistency before weaving begins.	40	t	2026-09-03 02:01:46.879325+00
5	1	Weaving	Master artisans hand-knot every rug on traditional looms, weeks or months in the making.	50	t	2026-09-03 02:01:46.879325+00
6	1	Finishing, Washing & Stretching	Each rug is trimmed, washed, and stretched to its final shape and pile.	60	t	2026-09-03 02:01:46.879325+00
7	1	Quality Check	Every piece is checked for weave density, accurate sizing, and dye consistency before it ships.	70	t	2026-09-03 02:01:46.879325+00
8	1	Packaging & Delivery	Packed and shipped worldwide, with export documentation handled for you door to door.	80	t	2026-09-03 02:01:46.879325+00
\.


--
-- Data for Name: showcase_videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.showcase_videos (id, tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro, created_at, tab_name) FROM stdin;
1	\N	Traditional Moroccan Weave	Patchwork color and pattern, woven the way it has been for generations	/static/showcase/rug-moroccan-weaving-process.mp4	/static/showcase/rug-moroccan-weaving-process-poster.jpg	-1	t	t	2026-08-17 06:59:49+00	\N
2	\N	Color on the Loom	Every thread hand-picked for a rug that never fades quietly into the background	/static/showcase/rug-colorful-loom-weaving.mp4	/static/showcase/rug-colorful-loom-weaving-poster.jpg	0	t	t	2026-08-17 06:59:49+00	\N
6	1	Final Product	final product	/static/showcase/88446f38ada645a8880002dd75f35989.mp4	/static/showcase/b548457b5e9343aca9588acad0e0c34b-poster.jpg	1	t	t	2026-08-19 02:14:53+00	\N
3	\N	Threading the Loom	Warp threads set by hand before a single knot is tied	/static/showcase/rug-weaving-thread-loom.mp4	/static/showcase/rug-weaving-thread-loom-poster.jpg	1	t	f	2026-08-17 06:59:49+00	Craftsmanship
4	\N	Hand-Knotted, Thread by Thread	Traditional knotting technique passed down through generations	/static/showcase/rug-traditional-loom-hands.mp4	/static/showcase/rug-traditional-loom-hands-poster.jpg	2	t	f	2026-08-17 06:59:49+00	Craftsmanship
5	\N	The Finer Details	Close-up craftsmanship on every pass of the shuttle	/static/showcase/rug-tapestry-loom-closeup.mp4	/static/showcase/rug-tapestry-loom-closeup-poster.jpg	3	t	f	2026-08-17 06:59:49+00	Craftsmanship
\.


--
-- Data for Name: space_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.space_master (id, tenant_id, name, sort_order, is_active) FROM stdin;
1	1	living_room	0	t
2	1	bedroom	1	t
3	1	dining_room	2	t
4	1	entryway	3	t
7	1	study	6	t
5	1	living-room	4	f
6	1	dining-room	5	f
\.


--
-- Data for Name: staff_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_users (id, tenant_id, email, hashed_password, full_name, role, is_active, reset_token, reset_token_expires_at, created_at) FROM stdin;
1	1	admin@dreamrugscreation.in	$2b$12$7CY0uwQNZcefMkx20M3WRu7MaQTTFoHhcfzVmhQsF0aOGvnMbrmaS	Demo Admin	admin	t	\N	\N	2026-08-17 06:59:31+00
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenants (id, name, slug, gstin, state_code, address, lut_number, currency, base_currency, exchange_rates, exchange_rates_auto, exchange_rates_updated_at, logo_url, plan, plan_status, razorpay_customer_id, razorpay_subscription_id, ai_credits_used, billing_cycle_start, default_profit_margin_pct, rush_surcharge_pct, default_gst_pct, gst_inclusive, large_format_threshold_sqm, large_format_surcharge_pct, ai_assistant_customer_enabled, ai_assistant_vendor_enabled, vendor_notification_email, default_size_unit, contact_emails, contact_phones, contact_address, contact_hours, catalog_pdf_url, hero_image_url, hero_eyebrow, hero_heading, hero_cta_label, certifications, default_shipping_rate, cancellation_window_hours, is_active, created_at, hero_images, refund_cancellation_policy_html, privacy_policy_html, default_catalog_additional_information_html, enabled_currencies, about_us_content_html, homepage_full_bleed_image_url, homepage_full_bleed_alt_text, homepage_full_bleed_enabled, homepage_values_eyebrow, homepage_values_headline, homepage_values_headline_accent, homepage_values_description, homepage_values_items, homepage_values_enabled, homepage_intro_title_line_one, homepage_intro_title_line_two, homepage_intro_label, homepage_intro_description, homepage_intro_cta_label, homepage_intro_cta_url, homepage_intro_enabled, homepage_contact_image_url, homepage_contact_image_alt, homepage_contact_heading, homepage_contact_consent_text, homepage_contact_button_label, homepage_contact_success_message, homepage_contact_enabled, about_page, homepage_intro_trusted_by_text, product_accordion_sections, storefront_menu_labels, order_tracking_eyebrow, order_tracking_heading, order_tracking_body, order_tracking_shipping_policy_url, order_tracking_carriers, order_tracking_steps, order_tracking_media_url, order_tracking_media_type, colour_matching_eyebrow, colour_matching_heading, colour_matching_body, colour_matching_items, storefront_menu_visibility, trending_rug_ids) FROM stdin;
1	DreamRugsCreation	loomcraft-demo	\N	\N	\N	\N	INR	INR	{"AED": 0.038443, "AFN": 0.683997, "ALL": 0.830467, "AMD": 3.814933, "ANG": 0.018737, "AOA": 9.959097, "ARS": 15.83781, "AUD": 0.014596, "AWG": 0.018737, "AZN": 0.017834, "BAM": 0.017637, "BBD": 0.020936, "BDT": 1.294906, "BGN": 0.017637, "BHD": 0.003936, "BIF": 31.568627, "BMD": 0.010468, "BND": 0.013273, "BOB": 0.131913, "BRL": 0.053542, "BSD": 0.010468, "BTN": 1, "BWP": 0.145343, "BYN": 0.03182, "BZD": 0.020936, "CAD": 0.014487, "CDF": 24.210526, "CHF": 0.008512, "CLF": 0.000246, "CLP": 9.725636, "CNH": 0.070315, "CNY": 0.070546, "COP": 32.578119, "CRC": 4.764917, "CUP": 0.251228, "CVE": 0.99433, "CZK": 0.218761, "DJF": 1.860357, "DKK": 0.06739, "DOP": 0.616903, "DZD": 1.395907, "EGP": 0.538152, "ERN": 0.157018, "ETB": 1.692955, "EUR": 0.009021, "FJD": 0.023326, "FKP": 0.007748, "FOK": 0.067413, "GBP": 0.00775, "GEL": 0.027336, "GGP": 0.007748, "GHS": 0.120569, "GIP": 0.007748, "GMD": 0.78874, "GNF": 92.764092, "GTQ": 0.08014, "GYD": 2.196453, "HKD": 0.082198, "HNL": 0.281647, "HRK": 0.067943, "HTG": 1.372549, "HUF": 3.290842, "IDR": 183.730761, "ILS": 0.031833, "IMP": 0.007748, "IQD": 13.760684, "IRR": 14392.631579, "ISK": 1.261967, "JEP": 0.007748, "JMD": 1.65754, "JOD": 0.007422, "JPY": 1.61572, "KES": 1.363795, "KGS": 0.917371, "KHR": 42.368421, "KID": 0.014593, "KMF": 4.436388, "KRW": 14.088369, "KWD": 0.003228, "KYD": 0.008723, "KZT": 4.711517, "LAK": 233.375422, "LBP": 936.872487, "LKR": 3.445515, "LRD": 1.831728, "LSL": 0.169364, "LYD": 0.066401, "MAD": 0.098245, "MDL": 0.180773, "MGA": 45.352113, "MKD": 0.55464, "MMK": 22.042255, "MNT": 37.313857, "MOP": 0.084639, "MRU": 0.419927, "MUR": 0.496928, "MVR": 0.162252, "MWK": 18.440949, "MXN": 0.177735, "MYR": 0.042614, "MZN": 0.674354, "NAD": 0.169364, "NGN": 14.174426, "NIO": 0.386242, "NOK": 0.09702, "NPR": 1.6, "NZD": 0.018004, "OMR": 0.004025, "PAB": 0.010468, "PEN": 0.035207, "PGK": 0.047208, "PHP": 0.65561, "PKR": 2.91069, "PLN": 0.038992, "PYG": 61.909471, "QAR": 0.038103, "RON": 0.04737, "RSD": 1.057913, "RUB": 0.883502, "RWF": 15.583025, "SAR": 0.039254, "SBD": 0.08281, "SCR": 0.146364, "SDG": 4.693878, "SEK": 0.101176, "SGD": 0.01328, "SHP": 0.007748, "SLE": 0.258365, "SLL": 258.363464, "SOS": 5.996276, "SRD": 0.399603, "SSP": 59.81133, "STN": 0.220932, "SYP": 1.277617, "SZL": 0.169364, "THB": 0.346492, "TJS": 0.096581, "TMT": 0.03667, "TND": 0.0304, "TOP": 0.024836, "TRY": 0.509037, "TTD": 0.071244, "TVD": 0.014593, "TWD": 0.330888, "TZS": 27.988933, "UAH": 0.467705, "UGX": 39.951683, "USD": 0.01047, "UYU": 0.422319, "UZS": 123.625081, "VES": 8.714403, "VND": 271.125055, "VUV": 1.235863, "WST": 0.028207, "XAF": 5.915184, "XCD": 0.028263, "XCG": 0.018737, "XDR": 0.007637, "XOF": 5.915184, "XPF": 1.076093, "YER": 2.487848, "ZAR": 0.169334, "ZMW": 0.202787, "ZWG": 0.279238, "ZWL": 0.27924}	t	2026-09-11 05:02:46.48788+00	/static/branding/a53768ec47d848ad9e792dd1da74da44.png	starter	trial	\N	\N	6	\N	40	25	12	f	20	5	f	f	dreamrugscreation@gmail.com	ft	["dreamrusgcreation@gmail.com"]	["+919860321204"]	Badohi, Uttar Pradesh	Mon-Sat, 9am - 6pm	\N	/static/branding/254407c6e43041e6991bf4d079ae9623.png	\N	\N	\N	[]	0	24	t	2026-08-17 06:59:31+00	[{"image_url": "/static/branding/254407c6e43041e6991bf4d079ae9623.png", "alt_text": "", "eyebrow": "40+ Years in the making", "headline": "", "button_text": ""}, {"image_url": "/static/branding/2340a15c51594e14b5cce77b353c32ac.jpg", "alt_text": "", "eyebrow": "40+ Years in the making", "headline": "", "button_text": ""}]	\N	\N	\N	["INR", "USD", "EUR", "GBP", "CAD", "AUD", "AED", "SGD", "CHF", "SAR", "QAR", "JPY", "NZD", "ZAR"]	<p><strong>About Dream Rugs Creation</strong></p><p></p><p><strong>Four Generations of Rug-Making Heritage</strong></p><p>Dream Rugs Creation is a family-owned handmade rug manufacturer based in Bhadohi, India, one of the world’s most respected centres for traditional carpet weaving and rug craftsmanship. Built upon four generations of family expertise, we combine time-honoured artisanal techniques with contemporary design sensibilities to create distinctive rugs for homes, interior projects, designers, retailers, and trade clients across the United States, Europe, Canada, Australia, and other international markets.</p><p></p><p><strong>Who We Are</strong></p><p>Founded by Mohammad Haris Ahmed, Dream Rugs Creation represents the fourth generation of a family deeply rooted in the art and tradition of handmade rug making. Our experience has been shaped by decades of working closely with skilled craftspeople in Bhadohi, where rug making is not simply a profession but a specialised craft passed from one generation to the next.</p><p>Every rug is developed through close collaboration with an experienced network of designers, yarn specialists, dyers, weavers, carvers, washers, stretchers, and finishers. By maintaining direct involvement throughout the entire manufacturing process, we are able to carefully oversee the elements that define a well-made rug, including colour accuracy, texture, construction, pile, proportions, finishing, and overall quality.</p><p>Our approach combines traditional Indian rug-making knowledge with the expectations of contemporary international interiors. Whether the requirement is for a refined residential setting, a luxury interior project, a retail collection, or a completely bespoke design, our focus remains on craftsmanship, consistency, and attention to detail.</p><p></p><p><strong>What We Create</strong></p><p>Dream Rugs Creation specialises in a broad range of handcrafted rug constructions, including hand-knotted rugs, Tibetan hand-knotted rugs, hand-tufted rugs, hand-woven flatweave rugs, Moroccan high-pile rugs, and hand-carved rugs. Each piece is made individually by skilled artisans using carefully selected materials and traditional production techniques.</p><p>Clients may select from our existing collections or collaborate with us to develop a fully customised rug according to the specific requirements of their project. Customisation can include dimensions, colour palettes, materials, patterns, textures, pile heights, carving details, and finishing specifications. This flexibility allows us to work closely with interior designers, architects, retailers, hospitality projects, private clients, and sourcing professionals seeking rugs tailored to a particular space or design concept.</p><p>Before production begins, the relevant design details, colours, measurements, materials, and finishing requirements are carefully reviewed and confirmed to ensure that the final rug reflects the approved specification.</p><p></p><p><strong>Our Manufacturing Process</strong></p><p>Every Dream Rugs Creation rug passes through a carefully managed production process, beginning with design preparation, material selection, and colour development, followed by weaving, carving, washing, stretching, drying, finishing, and final inspection.</p><p>We believe that transparency and communication are particularly important when producing custom pieces for international clients. For this reason, production updates, loom photographs, and progress images can be provided on request, giving clients greater visibility into the craftsmanship behind their rugs and allowing them to follow the journey from design to completion.</p><p>Once weaving and finishing are complete, every rug undergoes a detailed quality inspection. We review construction, dimensions, colour, surface finish, edges, pile, and overall appearance against the approved requirements before preparing the piece for dispatch.</p><p>Finished rugs are professionally packed for international transportation and shipped worldwide through established global carriers such as FedEx and DHL, helping us serve clients efficiently across the United States, Europe, Canada, Australia, and beyond.</p><p></p><p><strong>Crafted by Hand. Refined Through Generations.</strong></p><p>At Dream Rugs Creation, every rug reflects four generations of accumulated knowledge, the craftsmanship of Bhadohi’s skilled artisans, and our commitment to creating pieces with lasting character and quality.</p><p>We believe a handmade rug should do more than complete an interior. It should bring warmth, texture, craftsmanship, and individuality to a space. From contemporary custom designs to timeless hand-knotted pieces, our aim is to create rugs that feel considered, beautifully made, and relevant to the interiors they are designed for.</p><p>Through direct manufacturing, personalised development, and careful attention at every stage of production, Dream Rugs Creation offers international clients a dependable source for authentic handmade rugs from Bhadohi, India, created with craftsmanship that has been refined across generations.</p>	/static/branding/099d570bca2940fc8f4a75c87e4006ff.png	\N	t	\N	\N	\N	\N	\N	t	Rug Making	& Weaving	Final Product	Every rug that leaves our workshop passes through the hands of master weavers who have spent years perfecting their craft — hand-knotting, natural dyeing, and meticulous finishing, checked for weave density, accurate sizing, and colourfast dyes before anything ships.	Explore Collection	/catalog	t	/static/branding/826f9590c14041ed9213c6be842a740c.jpg	A rug artisan at work	Have Questions?\nGet in Touch!	I agree that my submitted data is being collected and stored.	Send Message	Thank you. Your enquiry has been sent successfully.	t	{"hero": {"enabled": true, "eyebrow": "The story behind every thread", "heading": "Rugs with a sense\\nof place and permanence.", "body": "At {business}, traditional rug making meets a more personal way of living. We create made-to-measure pieces with depth, restraint and the unmistakable character of work shaped by hand.", "cta_label": "Begin a custom rug", "image_url": "/static/branding/330c46ca0342413b89243e0e5a207ad4.jpeg", "image_alt": "Handcrafted rug in a warm, natural living room"}, "credentials": {"enabled": true, "items": [{"title": "Made individually", "subtitle": "Never pulled from a production line"}, {"title": "Sized for your space", "subtitle": "Proportion considered from the start"}, {"title": "Reviewed by hand", "subtitle": "Quality checked before dispatch"}]}, "story": {"images": [{"image_url": "/static/branding/e90212e679ce4bbaa5307bf06d292052.jpg", "image_alt": "The rug-making workshop"}, {"image_url": "/static/branding/585e7c181c924421b50029730ad67b61.jpg", "image_alt": "Natural fibres prepared for weaving"}], "enabled": true, "eyebrow": "Our point of view", "heading": "Made slowly.\\nLived with fully.", "quote": "\\u201cLuxury is not excess. It is the time, judgement and human touch held within an object.\\u201d", "primary_image_url": "/static/branding/e90212e679ce4bbaa5307bf06d292052.jpg", "primary_image_alt": "The rug-making workshop", "secondary_image_url": "/static/branding/585e7c181c924421b50029730ad67b61.jpg", "secondary_image_alt": "Natural fibres prepared for weaving"}, "process": {"enabled": true, "eyebrow": "The making of a rug", "heading": "From an idea on paper\\nto a surface underfoot.", "intro": "A made-to-order rug passes through many hands. Each stage is deliberate, and each one leaves a quiet trace in the finished piece.", "steps": [{"number": "01", "title": "A considered beginning ", "text": "Every rug begins with the room: its proportions, light, movement and atmosphere. We refine the scale, palette and construction before a single thread reaches the loom.", "image_url": "/static/branding/538f4570c8264abb92a085560735b98c.jpg", "image_alt": null}, {"number": "02", "title": "Material selection", "text": "Fibres are chosen for both beauty and purpose\\u2014from resilient wool and relaxed cotton to luminous silk and performance-led blends.", "image_url": "/static/branding/41a3bddcac684e5781bbef6558bad2de.jpg", "image_alt": null}, {"number": "03", "title": "Made at the loom", "text": "Skilled hands translate the design knot by knot, line by line. This unhurried process gives each surface its depth, character and quiet individuality.", "image_url": "/static/branding/d247425f88aa400aa528fc70662650b1.jpeg", "image_alt": null}, {"number": "04", "title": "Finished by hand", "text": "The rug is washed, stretched, carved where required and carefully inspected. Edges, pile, colour and dimensions are reviewed before dispatch.", "image_url": "/static/branding/659309e137944f77b26a8656854d2fd7.jpeg", "image_alt": null}]}, "principles": {"enabled": true, "eyebrow": "What matters to us", "heading": "Beauty begins with integrity.", "intro": "The qualities you feel in a finished rug are the result of decisions made long before it enters a room\\u2014who makes it, what it is made from, and how carefully it is finished.", "items": [{"icon": "hand", "title": "Artisan made", "text": "Human skill remains at the centre of every piece, from yarn preparation to final finishing."}, {"icon": "ruler", "title": "Made to measure", "text": "Proportion is part of the design. Every rug can be tailored to the dimensions of its setting."}, {"icon": "leaf", "title": "Thoughtful materials", "text": "We select fibres for longevity, tactility and the way they will live in your home."}, {"icon": "shield-check", "title": "Inspected individually", "text": "Each finished rug is reviewed by hand against the approved specification before it leaves us."}]}, "founder": {"enabled": true, "eyebrow": "A note from the founder", "heading": "Craft is a responsibility.", "body": "For more than two decades, Haris Ahmed has worked alongside makers who understand that excellence is rarely one grand gesture. It is hundreds of small decisions, repeated with patience and care.\\n\\n{business} was founded to bring that standard directly to the people who will live with these rugs\\u2014to make the process more transparent, more personal and more faithful to the hands behind the work.", "name": "Mohammad Haris Ahmed", "role": "Founder", "caption": "A culture of care and precision", "image_url": "/static/branding/c37e48cfade74484a7ca4c2d700348ca.jpg", "image_alt": "Inside the rug workshop"}, "cta": {"enabled": true, "eyebrow": "Let us make something lasting", "heading": "Your room is the beginning of the design.", "body": "Share your dimensions, references and ideas. We will help you consider scale, material, colour and construction before your rug reaches the loom.", "primary_label": "Request a custom rug", "secondary_label": "Explore the collection"}}	1000+ Customers	[{"id": "new-1788620248594-0", "title": "Rug Sample", "html": "<p>Want to check the colour, texture, and craftsmanship before ordering? Request a rug sample to experience the material and quality firsthand. Sample availability may vary by design and material.</p>"}, {"id": "new-1788620257476-1", "title": "Rug Care", "html": "<p>Vacuum gently using a suction-only setting. Blot spills immediately with a clean, dry cloth\\u2014do not rub. Avoid prolonged direct sunlight and rotate the rug periodically for even wear. Professional rug cleaning is recommended when required.</p>"}, {"id": "new-1788620269759-2", "title": "Shipping", "html": "<p>Each rug is carefully inspected and securely packed before dispatch. We ship across USA, Europe internationally, with tracking details provided once your order is on its way. Delivery time and shipping charges depend on the rug size, destination, and customization requirements.</p>"}]	{}	Order visibility	Follow your rug after dispatch.	Once your finished rug has passed final inspection and is collected for shipment, we send the tracking number and tracking link by email or WhatsApp. You can then follow the order until delivery.	\N	[{"label": "DHL", "image_url": "/static/branding/af9051d9a45f4f36931ed580563f4c57.png"}, {"label": "Fedex", "image_url": "/static/branding/748336dec08c43a2ac95ab69bde6f576.jpeg"}]	[{"title": "Final inspection", "description": "Your rug is checked, rolled and securely packed."}, {"title": "Carrier collection", "description": "The carrier collects the completed shipment."}, {"title": "Tracking sent", "description": "We share the tracking number and live tracking link with you."}]	/static/branding/2fc91f0e6cd842b5bf7a49af29a213dd.jpg	image	Professional colour matching	Specify colour with confidence.	Bring your palette into the conversation. Share a colour reference, fabric swatch or yarn sample with your rug brief so we can discuss the closest match for your chosen material.\n\nInclude the reference system and code, such as Pantone, when available. Screens and fibres can show colour differently; discuss a physical sample before confirming your final palette.	[{"title": "Pantone Colours", "description": "Reference a Pantone code or attach your selected swatch.", "image_url": "/static/branding/c9b9faec62ce4680ad8b459ba96bb493.jpg"}, {"title": "ARS Wool & Viscose Silk", "description": "Wool Box 1200 and 1400 \\u00b7 ARS 1000 Viscose Silk Box.", "image_url": "/static/branding/998af495b1c14ddf8909af6d373e910d.webp"}, {"title": "Additional ARS Systems", "description": "ARS 600 Box \\u00b7 ARS 700 Viscose Silk Box.", "image_url": "/static/branding/3debf3632aca4af598a337e156abe066.jpeg"}]	{"heading:material": true}	\N
\.


--
-- Data for Name: testimonials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.testimonials (id, tenant_id, author_name, author_title, country, quote, photo_url, rating, sort_order, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: trade_enquiries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trade_enquiries (id, tenant_id, first_name, last_name, email, phone, city, country, profession, company, website, project_type, project_brief, is_read, created_at) FROM stdin;
1	1	Akeel	Munshi	munshiaqueel@gmail.com	+918208112047	Pune	India	architect	SELF	\N	Commercial	test	t	2026-09-06 03:11:25.142163+00
2	1	Akeel	Munshi	munshiaqueel@gmail.com	+918208112047	Pune	India	architect	SELF	\N	Residential	test	f	2026-09-07 01:55:51.366128+00
\.


--
-- Data for Name: weave_type_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.weave_type_master (id, tenant_id, name, sort_order, is_active) FROM stdin;
6	1	Hand-knotted Indo-Tibetan	5	t
5	1	Hand Knotted	4	f
3	1	Hand-woven Flat Weave	2	t
1	1	Hand-Knotted	0	t
2	1	Hand-Tufted	1	t
7	1	Hand-Crafted	6	t
4	1	Machine-Woven	3	t
10	1	flatweave	7	t
\.


--
-- Data for Name: workshop_photos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshop_photos (id, tenant_id, caption, description, image_url, sort_order, is_active, created_at) FROM stdin;
14	1	1. Where Craftsmanship Begins	Thoughtfully selected materials form the foundation of every rug we create.	/static/workshop/84edf071391e4e47b9b633e273689921.png	0	t	2026-09-07 13:31:28.023555+00
15	1	2. The Art of Yarn Dyeing	Each yarn is carefully dyed to achieve rich, distinctive tones that bring the character of every rug to life.	/static/workshop/7c0cf14823534669987a8dc6d03a4e9f.jpeg	0	t	2026-09-07 13:33:07.162668+00
16	1	3. From Colour to Loom	Once dyed, the yarn is carefully wound and prepared before passing into the hands of our skilled weavers.	/static/workshop/ba5cda8b93d345aea8ed8646fb286497.png	0	t	2026-09-07 13:44:21.164582+00
17	1	4. Where Craftsmanship Takes Form	Skilled artisans bring each design to life, weaving every strand with precision, patience, and generations of craftsmanship.	/static/workshop/fd950c647b744753812d1ccd55b0ea19.jpeg	0	t	2026-09-07 14:11:31.323541+00
18	1	5. Washed & Refined	Each rug is carefully washed to enhance its colour, texture, and natural character, preparing it for the final stages of finishing.	/static/workshop/54ded7f5d01844419638df378a7b9b95.jpeg	0	t	2026-09-07 14:20:01.593642+00
19	1	6. The Art of Hand Carving	Skilled artisans carefully sculpt each detail by hand, creating depth, definition, and distinctive character throughout the design.	/static/workshop/51be9ed113f44202be7d6d61ccfb8ae2.jpeg	0	t	2026-09-07 14:28:59.299452+00
20	1	7. Perfecting Every Detail	Skilled artisans carefully refine each rug by hand, ensuring every detail reflects the craftsmanship and character of the finished piece.	/static/workshop/7f25c96779254cf99925ae5329f958cb.png	0	t	2026-09-07 14:40:30.980406+00
21	1	8. The Final Quality Check	Every rug is individually inspected to ensure its craftsmanship, finish, texture, and overall quality meet our exacting standards.	/static/workshop/7fdfbb4b14024207914c5020c9d1ba54.png	0	t	2026-09-07 14:43:04.007586+00
22	1	9. From Our Hands to Your Home	After passing our final quality review, each rug is carefully rolled and prepared for its journey from our workshop to your space.	/static/workshop/927744d537e0410fbdd2a29e799542cc.jpeg	0	t	2026-09-07 14:49:18.831927+00
\.


--
-- Name: ai_chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_chat_messages_id_seq', 10, true);


--
-- Name: announcement_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.announcement_messages_id_seq', 1, false);


--
-- Name: api_clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.api_clients_id_seq', 4, true);


--
-- Name: catalog_size_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.catalog_size_master_id_seq', 26, true);


--
-- Name: collection_displays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.collection_displays_id_seq', 1, true);


--
-- Name: custom_rug_page_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.custom_rug_page_images_id_seq', 11, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 4, true);


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 9, true);


--
-- Name: faqs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.faqs_id_seq', 1, false);


--
-- Name: homepage_enquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.homepage_enquiries_id_seq', 1, true);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_transactions_id_seq', 10, true);


--
-- Name: materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materials_id_seq', 12, true);


--
-- Name: mcp_catalog_upload_grants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mcp_catalog_upload_grants_id_seq', 11, true);


--
-- Name: mcp_oauth_authorization_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mcp_oauth_authorization_codes_id_seq', 3, true);


--
-- Name: mcp_oauth_authorization_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mcp_oauth_authorization_requests_id_seq', 3, true);


--
-- Name: mcp_oauth_clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mcp_oauth_clients_id_seq', 3, true);


--
-- Name: mcp_oauth_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mcp_oauth_tokens_id_seq', 142, true);


--
-- Name: mood_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mood_master_id_seq', 9, true);


--
-- Name: moq_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.moq_rules_id_seq', 5, true);


--
-- Name: newsletter_subscribers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.newsletter_subscribers_id_seq', 1, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, true);


--
-- Name: order_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_status_history_id_seq', 5, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, true);


--
-- Name: payment_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_attempts_id_seq', 5, true);


--
-- Name: pending_ai_actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pending_ai_actions_id_seq', 4, true);


--
-- Name: pile_height_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pile_height_master_id_seq', 11, true);


--
-- Name: pricing_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pricing_rules_id_seq', 5, true);


--
-- Name: production_timelines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.production_timelines_id_seq', 7, true);


--
-- Name: project_gallery_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_gallery_images_id_seq', 4, true);


--
-- Name: project_gallery_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_gallery_items_id_seq', 4, true);


--
-- Name: promo_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.promo_codes_id_seq', 1, false);


--
-- Name: promo_redemptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.promo_redemptions_id_seq', 1, false);


--
-- Name: quotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quotes_id_seq', 3, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 151, true);


--
-- Name: rug_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rug_catalog_id_seq', 49, true);


--
-- Name: rug_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rug_images_id_seq', 239, true);


--
-- Name: rug_journey_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rug_journey_steps_id_seq', 8, true);


--
-- Name: showcase_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.showcase_videos_id_seq', 18, true);


--
-- Name: space_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.space_master_id_seq', 7, true);


--
-- Name: staff_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_users_id_seq', 1, true);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tenants_id_seq', 1, true);


--
-- Name: testimonials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.testimonials_id_seq', 1, true);


--
-- Name: trade_enquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trade_enquiries_id_seq', 2, true);


--
-- Name: weave_type_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.weave_type_master_id_seq', 10, true);


--
-- Name: workshop_photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workshop_photos_id_seq', 22, true);


--
-- Name: ai_chat_messages ai_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: announcement_messages announcement_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_messages
    ADD CONSTRAINT announcement_messages_pkey PRIMARY KEY (id);


--
-- Name: api_clients api_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_clients
    ADD CONSTRAINT api_clients_pkey PRIMARY KEY (id);


--
-- Name: catalog_size_master catalog_size_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_size_master
    ADD CONSTRAINT catalog_size_master_pkey PRIMARY KEY (id);


--
-- Name: collection_displays collection_displays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_displays
    ADD CONSTRAINT collection_displays_pkey PRIMARY KEY (id);


--
-- Name: custom_rug_page_images custom_rug_page_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_rug_page_images
    ADD CONSTRAINT custom_rug_page_images_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: homepage_enquiries homepage_enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_enquiries
    ADD CONSTRAINT homepage_enquiries_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: mcp_catalog_upload_grants mcp_catalog_upload_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_catalog_upload_grants
    ADD CONSTRAINT mcp_catalog_upload_grants_pkey PRIMARY KEY (id);


--
-- Name: mcp_oauth_authorization_codes mcp_oauth_authorization_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_authorization_codes
    ADD CONSTRAINT mcp_oauth_authorization_codes_pkey PRIMARY KEY (id);


--
-- Name: mcp_oauth_authorization_requests mcp_oauth_authorization_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_authorization_requests
    ADD CONSTRAINT mcp_oauth_authorization_requests_pkey PRIMARY KEY (id);


--
-- Name: mcp_oauth_clients mcp_oauth_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_clients
    ADD CONSTRAINT mcp_oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: mcp_oauth_tokens mcp_oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_tokens
    ADD CONSTRAINT mcp_oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: mood_master mood_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_master
    ADD CONSTRAINT mood_master_pkey PRIMARY KEY (id);


--
-- Name: moq_rules moq_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moq_rules
    ADD CONSTRAINT moq_rules_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_attempts payment_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_pkey PRIMARY KEY (id);


--
-- Name: pending_ai_actions pending_ai_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_ai_actions
    ADD CONSTRAINT pending_ai_actions_pkey PRIMARY KEY (id);


--
-- Name: pile_height_master pile_height_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pile_height_master
    ADD CONSTRAINT pile_height_master_pkey PRIMARY KEY (id);


--
-- Name: pricing_rules pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: production_timelines production_timelines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_timelines
    ADD CONSTRAINT production_timelines_pkey PRIMARY KEY (id);


--
-- Name: project_gallery_images project_gallery_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_gallery_images
    ADD CONSTRAINT project_gallery_images_pkey PRIMARY KEY (id);


--
-- Name: project_gallery_items project_gallery_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_gallery_items
    ADD CONSTRAINT project_gallery_items_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: promo_redemptions promo_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: rug_catalog rug_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_catalog
    ADD CONSTRAINT rug_catalog_pkey PRIMARY KEY (id);


--
-- Name: rug_images rug_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_images
    ADD CONSTRAINT rug_images_pkey PRIMARY KEY (id);


--
-- Name: rug_journey_steps rug_journey_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_journey_steps
    ADD CONSTRAINT rug_journey_steps_pkey PRIMARY KEY (id);


--
-- Name: showcase_videos showcase_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcase_videos
    ADD CONSTRAINT showcase_videos_pkey PRIMARY KEY (id);


--
-- Name: space_master space_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_master
    ADD CONSTRAINT space_master_pkey PRIMARY KEY (id);


--
-- Name: staff_users staff_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_users
    ADD CONSTRAINT staff_users_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: trade_enquiries trade_enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_enquiries
    ADD CONSTRAINT trade_enquiries_pkey PRIMARY KEY (id);


--
-- Name: catalog_size_master uq_catalog_size_master_tenant_ft; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_size_master
    ADD CONSTRAINT uq_catalog_size_master_tenant_ft UNIQUE (tenant_id, ft);


--
-- Name: collection_displays uq_collection_display_tenant_category; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_displays
    ADD CONSTRAINT uq_collection_display_tenant_category UNIQUE (tenant_id, category);


--
-- Name: customers uq_customer_email_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT uq_customer_email_tenant UNIQUE (email, tenant_id);


--
-- Name: email_templates uq_email_template_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT uq_email_template_tenant_key UNIQUE (tenant_id, key);


--
-- Name: mood_master uq_mood_master_tenant_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_master
    ADD CONSTRAINT uq_mood_master_tenant_name UNIQUE (tenant_id, name);


--
-- Name: newsletter_subscribers uq_newsletter_email_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT uq_newsletter_email_tenant UNIQUE (email, tenant_id);


--
-- Name: pile_height_master uq_pile_height_master_tenant_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pile_height_master
    ADD CONSTRAINT uq_pile_height_master_tenant_name UNIQUE (tenant_id, name);


--
-- Name: rug_catalog uq_rug_slug_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_catalog
    ADD CONSTRAINT uq_rug_slug_tenant UNIQUE (slug, tenant_id);


--
-- Name: space_master uq_space_master_tenant_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_master
    ADD CONSTRAINT uq_space_master_tenant_name UNIQUE (tenant_id, name);


--
-- Name: staff_users uq_staff_email_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_users
    ADD CONSTRAINT uq_staff_email_tenant UNIQUE (email, tenant_id);


--
-- Name: weave_type_master uq_weave_type_master_tenant_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weave_type_master
    ADD CONSTRAINT uq_weave_type_master_tenant_name UNIQUE (tenant_id, name);


--
-- Name: weave_type_master weave_type_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weave_type_master
    ADD CONSTRAINT weave_type_master_pkey PRIMARY KEY (id);


--
-- Name: workshop_photos workshop_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_photos
    ADD CONSTRAINT workshop_photos_pkey PRIMARY KEY (id);


--
-- Name: ix_ai_chat_messages_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_chat_messages_id ON public.ai_chat_messages USING btree (id);


--
-- Name: ix_ai_chat_messages_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_chat_messages_session_id ON public.ai_chat_messages USING btree (session_id);


--
-- Name: ix_ai_chat_messages_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_chat_messages_tenant_id ON public.ai_chat_messages USING btree (tenant_id);


--
-- Name: ix_ai_chat_messages_tenant_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_chat_messages_tenant_session ON public.ai_chat_messages USING btree (tenant_id, session_id, created_at);


--
-- Name: ix_announcement_messages_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_announcement_messages_id ON public.announcement_messages USING btree (id);


--
-- Name: ix_api_clients_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_api_clients_id ON public.api_clients USING btree (id);


--
-- Name: ix_api_clients_key_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_api_clients_key_hash ON public.api_clients USING btree (key_hash);


--
-- Name: ix_api_clients_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_api_clients_tenant_id ON public.api_clients USING btree (tenant_id);


--
-- Name: ix_catalog_size_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_catalog_size_master_id ON public.catalog_size_master USING btree (id);


--
-- Name: ix_catalog_size_master_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_catalog_size_master_tenant_id ON public.catalog_size_master USING btree (tenant_id);


--
-- Name: ix_custom_rug_page_images_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_custom_rug_page_images_id ON public.custom_rug_page_images USING btree (id);


--
-- Name: ix_custom_rug_page_images_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_custom_rug_page_images_tenant_id ON public.custom_rug_page_images USING btree (tenant_id);


--
-- Name: ix_custom_rug_page_images_tenant_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_custom_rug_page_images_tenant_sort ON public.custom_rug_page_images USING btree (tenant_id, sort_order);


--
-- Name: ix_customers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_customers_id ON public.customers USING btree (id);


--
-- Name: ix_customers_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_customers_tenant_id ON public.customers USING btree (tenant_id);


--
-- Name: ix_email_templates_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_email_templates_id ON public.email_templates USING btree (id);


--
-- Name: ix_faqs_rug_catalog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_faqs_rug_catalog_id ON public.faqs USING btree (rug_catalog_id);


--
-- Name: ix_faqs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_faqs_tenant_id ON public.faqs USING btree (tenant_id);


--
-- Name: ix_faqs_tenant_rug_active_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_faqs_tenant_rug_active_sort ON public.faqs USING btree (tenant_id, rug_catalog_id, is_active, sort_order);


--
-- Name: ix_homepage_enquiries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_homepage_enquiries_id ON public.homepage_enquiries USING btree (id);


--
-- Name: ix_homepage_enquiries_tenant_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_homepage_enquiries_tenant_created ON public.homepage_enquiries USING btree (tenant_id, created_at);


--
-- Name: ix_homepage_enquiries_tenant_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_homepage_enquiries_tenant_read ON public.homepage_enquiries USING btree (tenant_id, is_read);


--
-- Name: ix_inventory_transactions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inventory_transactions_id ON public.inventory_transactions USING btree (id);


--
-- Name: ix_inventory_transactions_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inventory_transactions_material_id ON public.inventory_transactions USING btree (material_id);


--
-- Name: ix_materials_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_materials_id ON public.materials USING btree (id);


--
-- Name: ix_materials_tenant_stock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_materials_tenant_stock ON public.materials USING btree (tenant_id, stock_meters);


--
-- Name: ix_mcp_catalog_upload_grants_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mcp_catalog_upload_grants_expires_at ON public.mcp_catalog_upload_grants USING btree (expires_at);


--
-- Name: ix_mcp_catalog_upload_grants_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mcp_catalog_upload_grants_tenant_id ON public.mcp_catalog_upload_grants USING btree (tenant_id);


--
-- Name: ix_mcp_catalog_upload_grants_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_mcp_catalog_upload_grants_token_hash ON public.mcp_catalog_upload_grants USING btree (token_hash);


--
-- Name: ix_mcp_oauth_auth_codes_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mcp_oauth_auth_codes_client ON public.mcp_oauth_authorization_codes USING btree (client_id);


--
-- Name: ix_mcp_oauth_auth_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_mcp_oauth_auth_codes_code ON public.mcp_oauth_authorization_codes USING btree (code_hash);


--
-- Name: ix_mcp_oauth_auth_requests_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mcp_oauth_auth_requests_client ON public.mcp_oauth_authorization_requests USING btree (client_id);


--
-- Name: ix_mcp_oauth_auth_requests_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_mcp_oauth_auth_requests_transaction ON public.mcp_oauth_authorization_requests USING btree (transaction_hash);


--
-- Name: ix_mcp_oauth_clients_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_mcp_oauth_clients_client_id ON public.mcp_oauth_clients USING btree (client_id);


--
-- Name: ix_mcp_oauth_tokens_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mcp_oauth_tokens_client ON public.mcp_oauth_tokens USING btree (client_id);


--
-- Name: ix_mcp_oauth_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_mcp_oauth_tokens_hash ON public.mcp_oauth_tokens USING btree (token_hash);


--
-- Name: ix_mood_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mood_master_id ON public.mood_master USING btree (id);


--
-- Name: ix_mood_master_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mood_master_tenant_id ON public.mood_master USING btree (tenant_id);


--
-- Name: ix_moq_rules_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_moq_rules_id ON public.moq_rules USING btree (id);


--
-- Name: ix_newsletter_subscribers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_newsletter_subscribers_id ON public.newsletter_subscribers USING btree (id);


--
-- Name: ix_newsletter_tenant_subscribed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_newsletter_tenant_subscribed ON public.newsletter_subscribers USING btree (tenant_id, subscribed_at);


--
-- Name: ix_order_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_items_id ON public.order_items USING btree (id);


--
-- Name: ix_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: ix_order_items_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_items_quote_id ON public.order_items USING btree (quote_id);


--
-- Name: ix_order_status_history_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_status_history_id ON public.order_status_history USING btree (id);


--
-- Name: ix_order_status_history_order_changed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_status_history_order_changed ON public.order_status_history USING btree (order_id, changed_at);


--
-- Name: ix_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_id ON public.orders USING btree (id);


--
-- Name: ix_orders_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_quote_id ON public.orders USING btree (quote_id);


--
-- Name: ix_orders_tenant_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_tenant_created ON public.orders USING btree (tenant_id, created_at);


--
-- Name: ix_orders_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_tenant_status ON public.orders USING btree (tenant_id, status);


--
-- Name: ix_payment_attempts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payment_attempts_id ON public.payment_attempts USING btree (id);


--
-- Name: ix_payment_attempts_razorpay_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_payment_attempts_razorpay_order_id ON public.payment_attempts USING btree (razorpay_order_id);


--
-- Name: ix_pending_ai_actions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pending_ai_actions_id ON public.pending_ai_actions USING btree (id);


--
-- Name: ix_pending_ai_actions_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pending_ai_actions_tenant_id ON public.pending_ai_actions USING btree (tenant_id);


--
-- Name: ix_pending_ai_actions_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pending_ai_actions_tenant_status ON public.pending_ai_actions USING btree (tenant_id, status);


--
-- Name: ix_pile_height_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pile_height_master_id ON public.pile_height_master USING btree (id);


--
-- Name: ix_pile_height_master_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pile_height_master_tenant_id ON public.pile_height_master USING btree (tenant_id);


--
-- Name: ix_pricing_rules_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pricing_rules_id ON public.pricing_rules USING btree (id);


--
-- Name: ix_production_timelines_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_production_timelines_id ON public.production_timelines USING btree (id);


--
-- Name: ix_project_gallery_images_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_project_gallery_images_item_id ON public.project_gallery_images USING btree (project_gallery_item_id);


--
-- Name: ix_project_gallery_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_project_gallery_items_id ON public.project_gallery_items USING btree (id);


--
-- Name: ix_promo_codes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promo_codes_id ON public.promo_codes USING btree (id);


--
-- Name: ix_promo_codes_tenant_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promo_codes_tenant_code ON public.promo_codes USING btree (tenant_id, code);


--
-- Name: ix_promo_redemptions_code_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promo_redemptions_code_customer ON public.promo_redemptions USING btree (promo_code_id, customer_id);


--
-- Name: ix_promo_redemptions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promo_redemptions_id ON public.promo_redemptions USING btree (id);


--
-- Name: ix_quotes_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quotes_customer_id ON public.quotes USING btree (customer_id);


--
-- Name: ix_quotes_customer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quotes_customer_status ON public.quotes USING btree (customer_id, status);


--
-- Name: ix_quotes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quotes_id ON public.quotes USING btree (id);


--
-- Name: ix_quotes_request_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quotes_request_group_id ON public.quotes USING btree (request_group_id);


--
-- Name: ix_quotes_rug_catalog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quotes_rug_catalog_id ON public.quotes USING btree (rug_catalog_id);


--
-- Name: ix_quotes_tenant_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quotes_tenant_created ON public.quotes USING btree (tenant_id, created_at);


--
-- Name: ix_quotes_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_quotes_tenant_status ON public.quotes USING btree (tenant_id, status);


--
-- Name: ix_refresh_tokens_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refresh_tokens_id ON public.refresh_tokens USING btree (id);


--
-- Name: ix_refresh_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: ix_refresh_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refresh_tokens_user ON public.refresh_tokens USING btree (user_type, user_id, revoked_at);


--
-- Name: ix_rug_catalog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rug_catalog_id ON public.rug_catalog USING btree (id);


--
-- Name: ix_rug_catalog_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rug_catalog_material_id ON public.rug_catalog USING btree (material_id);


--
-- Name: ix_rug_catalog_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rug_catalog_slug ON public.rug_catalog USING btree (slug);


--
-- Name: ix_rug_catalog_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rug_catalog_tenant_id ON public.rug_catalog USING btree (tenant_id);


--
-- Name: ix_rug_images_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rug_images_id ON public.rug_images USING btree (id);


--
-- Name: ix_rug_images_rug_catalog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rug_images_rug_catalog_id ON public.rug_images USING btree (rug_catalog_id);


--
-- Name: ix_rug_journey_steps_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rug_journey_steps_tenant_id ON public.rug_journey_steps USING btree (tenant_id);


--
-- Name: ix_rug_journey_steps_tenant_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rug_journey_steps_tenant_sort ON public.rug_journey_steps USING btree (tenant_id, sort_order);


--
-- Name: ix_showcase_videos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_showcase_videos_id ON public.showcase_videos USING btree (id);


--
-- Name: ix_space_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_space_master_id ON public.space_master USING btree (id);


--
-- Name: ix_space_master_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_space_master_tenant_id ON public.space_master USING btree (tenant_id);


--
-- Name: ix_staff_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_staff_users_id ON public.staff_users USING btree (id);


--
-- Name: ix_tenants_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tenants_id ON public.tenants USING btree (id);


--
-- Name: ix_testimonials_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_testimonials_id ON public.testimonials USING btree (id);


--
-- Name: ix_trade_enquiries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_trade_enquiries_id ON public.trade_enquiries USING btree (id);


--
-- Name: ix_trade_enquiries_tenant_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_trade_enquiries_tenant_created ON public.trade_enquiries USING btree (tenant_id, created_at);


--
-- Name: ix_trade_enquiries_tenant_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_trade_enquiries_tenant_read ON public.trade_enquiries USING btree (tenant_id, is_read);


--
-- Name: ix_weave_type_master_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_weave_type_master_id ON public.weave_type_master USING btree (id);


--
-- Name: ix_weave_type_master_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_weave_type_master_tenant_id ON public.weave_type_master USING btree (tenant_id);


--
-- Name: ix_workshop_photos_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshop_photos_id ON public.workshop_photos USING btree (id);


--
-- Name: ux_orders_razorpay_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_orders_razorpay_payment_id ON public.orders USING btree (razorpay_payment_id);


--
-- Name: ai_chat_messages ai_chat_messages_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_users(id);


--
-- Name: ai_chat_messages ai_chat_messages_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: announcement_messages announcement_messages_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_messages
    ADD CONSTRAINT announcement_messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: api_clients api_clients_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_clients
    ADD CONSTRAINT api_clients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: catalog_size_master catalog_size_master_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_size_master
    ADD CONSTRAINT catalog_size_master_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: collection_displays collection_displays_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_displays
    ADD CONSTRAINT collection_displays_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: custom_rug_page_images custom_rug_page_images_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_rug_page_images
    ADD CONSTRAINT custom_rug_page_images_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: customers customers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: email_templates email_templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: faqs faqs_rug_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_rug_catalog_id_fkey FOREIGN KEY (rug_catalog_id) REFERENCES public.rug_catalog(id) ON DELETE CASCADE;


--
-- Name: faqs faqs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: homepage_enquiries homepage_enquiries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_enquiries
    ADD CONSTRAINT homepage_enquiries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: inventory_transactions inventory_transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: materials materials_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: mcp_catalog_upload_grants mcp_catalog_upload_grants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_catalog_upload_grants
    ADD CONSTRAINT mcp_catalog_upload_grants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: mcp_oauth_authorization_codes mcp_oauth_authorization_codes_staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_authorization_codes
    ADD CONSTRAINT mcp_oauth_authorization_codes_staff_user_id_fkey FOREIGN KEY (staff_user_id) REFERENCES public.staff_users(id);


--
-- Name: mcp_oauth_authorization_codes mcp_oauth_authorization_codes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_authorization_codes
    ADD CONSTRAINT mcp_oauth_authorization_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: mcp_oauth_tokens mcp_oauth_tokens_staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_tokens
    ADD CONSTRAINT mcp_oauth_tokens_staff_user_id_fkey FOREIGN KEY (staff_user_id) REFERENCES public.staff_users(id);


--
-- Name: mcp_oauth_tokens mcp_oauth_tokens_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_oauth_tokens
    ADD CONSTRAINT mcp_oauth_tokens_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: mood_master mood_master_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_master
    ADD CONSTRAINT mood_master_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: moq_rules moq_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moq_rules
    ADD CONSTRAINT moq_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: newsletter_subscribers newsletter_subscribers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: orders orders_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: orders orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: payment_attempts payment_attempts_customer_id_hint_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_customer_id_hint_fkey FOREIGN KEY (customer_id_hint) REFERENCES public.customers(id);


--
-- Name: payment_attempts payment_attempts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: payment_attempts payment_attempts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: pending_ai_actions pending_ai_actions_created_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_ai_actions
    ADD CONSTRAINT pending_ai_actions_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES public.staff_users(id);


--
-- Name: pending_ai_actions pending_ai_actions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_ai_actions
    ADD CONSTRAINT pending_ai_actions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: pile_height_master pile_height_master_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pile_height_master
    ADD CONSTRAINT pile_height_master_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: pricing_rules pricing_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: production_timelines production_timelines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_timelines
    ADD CONSTRAINT production_timelines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: project_gallery_images project_gallery_images_project_gallery_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_gallery_images
    ADD CONSTRAINT project_gallery_images_project_gallery_item_id_fkey FOREIGN KEY (project_gallery_item_id) REFERENCES public.project_gallery_items(id) ON DELETE CASCADE;


--
-- Name: project_gallery_items project_gallery_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_gallery_items
    ADD CONSTRAINT project_gallery_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: promo_codes promo_codes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: promo_redemptions promo_redemptions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: promo_redemptions promo_redemptions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: promo_redemptions promo_redemptions_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id);


--
-- Name: quotes quotes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: quotes quotes_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: quotes quotes_revised_from_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_revised_from_quote_id_fkey FOREIGN KEY (revised_from_quote_id) REFERENCES public.quotes(id);


--
-- Name: quotes quotes_rug_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_rug_catalog_id_fkey FOREIGN KEY (rug_catalog_id) REFERENCES public.rug_catalog(id);


--
-- Name: quotes quotes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: refresh_tokens refresh_tokens_replaced_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_replaced_by_id_fkey FOREIGN KEY (replaced_by_id) REFERENCES public.refresh_tokens(id);


--
-- Name: rug_catalog rug_catalog_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_catalog
    ADD CONSTRAINT rug_catalog_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: rug_catalog rug_catalog_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_catalog
    ADD CONSTRAINT rug_catalog_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: rug_images rug_images_rug_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_images
    ADD CONSTRAINT rug_images_rug_catalog_id_fkey FOREIGN KEY (rug_catalog_id) REFERENCES public.rug_catalog(id);


--
-- Name: rug_journey_steps rug_journey_steps_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rug_journey_steps
    ADD CONSTRAINT rug_journey_steps_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: showcase_videos showcase_videos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcase_videos
    ADD CONSTRAINT showcase_videos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: space_master space_master_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_master
    ADD CONSTRAINT space_master_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff_users staff_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_users
    ADD CONSTRAINT staff_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: testimonials testimonials_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: trade_enquiries trade_enquiries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_enquiries
    ADD CONSTRAINT trade_enquiries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: weave_type_master weave_type_master_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weave_type_master
    ADD CONSTRAINT weave_type_master_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: workshop_photos workshop_photos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_photos
    ADD CONSTRAINT workshop_photos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- PostgreSQL database dump complete
--

\unrestrict GujbQzswfHlBQuPxkJGBwg362VR2KLW4mzILmJF9kihWlUu6oex3FQKK9yvPeCy

