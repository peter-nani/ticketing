"""Add optional image files to ticket comments."""

from alembic import op
import sqlalchemy as sa

revision = "0004_comment_images"
down_revision = "0003_ticket_audit_tags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("comments", sa.Column("image_path", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("comments", "image_path")
