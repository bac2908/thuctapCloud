FROM postgres:15-alpine

# Run schema first, then optional seed data on first container start
COPY init.sql /docker-entrypoint-initdb.d/01-init.sql
COPY schema /docker-entrypoint-initdb.d/schema
COPY seeds/seed.sql /docker-entrypoint-initdb.d/02-seed.sql
