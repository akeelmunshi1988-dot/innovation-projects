# Local PostgreSQL

The local FastAPI backend uses PostgreSQL 14 on port `5434`:

```text
postgresql+psycopg://dreamrugsapp@127.0.0.1:5434/dreamrugscreation
```

Port 5434 is intentionally used because another local service reserves 5432.

Control the database from the backend directory:

```bash
./local_postgres_ctl.sh start
./local_postgres_ctl.sh status
./local_postgres_ctl.sh stop
```

Apply future schema changes with:

```bash
./venv/bin/alembic upgrade head
```

The previous `rug_manufacture.db` SQLite file remains as an import backup. The running application no longer reads it.
