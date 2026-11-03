-- DEV SETUP 00: extensions
-- Production keeps pgvector and pg_trgm in the "public" schema (the schema dump
-- references "public"."vector" and "public"."gin_trgm_ops"), so we mirror that.
-- Run this BEFORE 01_schema.sql, on the DEV project only.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists vector with schema public;
create extension if not exists pg_trgm with schema public;
