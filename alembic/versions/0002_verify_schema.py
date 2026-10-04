"""Verify the schema tracked by the restored legacy Alembic baseline."""

from alembic import op
from sqlalchemy import inspect

revision = "0002_verify_schema"
down_revision = "51480192261f"
branch_labels = None
depends_on = None

EXPECTED_COLUMNS = {
    "users": {"id", "email", "hashed_password", "full_name", "role", "is_active", "created_at", "updated_at"},
    "tickets": {"id", "title", "description", "status", "priority", "category", "reporter_id", "assignee_id", "created_at", "updated_at", "resolved_at", "is_deleted"},
    "comments": {"id", "ticket_id", "author_id", "content", "created_at"},
    "attachments": {"id", "ticket_id", "file_path", "filename", "mime_type", "uploaded_by", "uploaded_at"},
}


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    existing_tables = set(inspector.get_table_names())
    missing_tables = set(EXPECTED_COLUMNS) - existing_tables
    if missing_tables:
        raise RuntimeError(f"Database is missing application tables: {sorted(missing_tables)}")

    for table, expected_columns in EXPECTED_COLUMNS.items():
        actual_columns = {column["name"] for column in inspector.get_columns(table)}
        missing_columns = expected_columns - actual_columns
        if missing_columns:
            raise RuntimeError(f"Database table {table} is missing columns: {sorted(missing_columns)}")


def downgrade() -> None:
    # This validation revision makes no schema changes.
    pass
