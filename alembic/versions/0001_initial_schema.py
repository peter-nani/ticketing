"""Create the initial ticketing schema.

If a database was initialized with SQLAlchemy create_all before migrations were
introduced, this revision records the baseline after confirming all modeled
tables and columns are already present.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "51480192261f"
down_revision = None
branch_labels = None
depends_on = None

APP_TABLES = {
    "users": {"id", "email", "hashed_password", "full_name", "role", "is_active", "created_at", "updated_at"},
    "tickets": {"id", "title", "description", "status", "priority", "category", "reporter_id", "assignee_id", "created_at", "updated_at", "resolved_at", "is_deleted"},
    "comments": {"id", "ticket_id", "author_id", "content", "created_at"},
    "attachments": {"id", "ticket_id", "file_path", "filename", "mime_type", "uploaded_by", "uploaded_at"},
}


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(inspect(bind).get_table_names()) & set(APP_TABLES)
    if existing:
        if existing != set(APP_TABLES):
            raise RuntimeError(f"Refusing to baseline a partial schema: found {sorted(existing)}")
        for table, required_columns in APP_TABLES.items():
            found_columns = {column["name"] for column in inspect(bind).get_columns(table)}
            missing = required_columns - found_columns
            if missing:
                raise RuntimeError(f"Cannot baseline {table}; missing columns: {sorted(missing)}")
        return

    role = sa.Enum("ADMIN", "AGENT", "CUSTOMER", name="userrole")
    ticket_status = sa.Enum("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", name="ticketstatus")
    ticket_priority = sa.Enum("LOW", "MEDIUM", "HIGH", "URGENT", name="ticketpriority")
    ticket_category = sa.Enum("BUG", "FEATURE_REQUEST", "IT_SUPPORT", name="ticketcategory")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("role", role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_id", "users", ["id"])

    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("status", ticket_status, nullable=False),
        sa.Column("priority", ticket_priority, nullable=False),
        sa.Column("category", ticket_category, nullable=False),
        sa.Column("reporter_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assignee_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=True, server_default=sa.false()),
    )
    op.create_index("ix_tickets_id", "tickets", ["id"])

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_comments_id", "comments", ["id"])

    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id"), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_attachments_id", "attachments", ["id"])


def downgrade() -> None:
    # This baseline may have adopted an existing production database. Removing
    # it must never drop user and ticket data, so the baseline is intentionally
    # irreversible; future forward revisions should provide targeted downgrades.
    pass
