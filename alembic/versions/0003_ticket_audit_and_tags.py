"""Add ticket tags and immutable attribute audit events."""

from alembic import op
import sqlalchemy as sa

revision = "0003_ticket_audit_tags"
down_revision = "0002_verify_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("tags", sa.JSON(), nullable=True))
    op.execute("UPDATE tickets SET tags = '[]' WHERE tags IS NULL")
    op.alter_column("tickets", "tags", nullable=False)
    op.create_table(
        "ticket_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ticket_audit_logs_ticket_id", "ticket_audit_logs", ["ticket_id"])
    op.create_index("ix_ticket_audit_logs_user_id", "ticket_audit_logs", ["user_id"])
    op.create_table(
        "ticket_tags",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=48), nullable=False, unique=True),
        sa.Column("color", sa.String(length=16), nullable=False, server_default="#607d8b"),
    )
    op.create_index("ix_ticket_tags_id", "ticket_tags", ["id"])
    op.create_index("ix_ticket_tags_name", "ticket_tags", ["name"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_ticket_tags_name", table_name="ticket_tags")
    op.drop_index("ix_ticket_tags_id", table_name="ticket_tags")
    op.drop_table("ticket_tags")
    op.drop_index("ix_ticket_audit_logs_user_id", table_name="ticket_audit_logs")
    op.drop_index("ix_ticket_audit_logs_ticket_id", table_name="ticket_audit_logs")
    op.drop_table("ticket_audit_logs")
    op.drop_column("tickets", "tags")
