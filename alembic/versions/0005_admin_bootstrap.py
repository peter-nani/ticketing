"""Persist one-time, expiring administrator bootstrap credentials."""

from alembic import op
import sqlalchemy as sa

revision = "0005_admin_bootstrap"
down_revision = "0004_comment_images"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_bootstrap_credentials",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("admin_bootstrap_credentials")
