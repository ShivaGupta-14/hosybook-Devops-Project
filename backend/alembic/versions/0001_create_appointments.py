from alembic import op
import sqlalchemy as sa

revision = "0001_create_appointments"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=15), nullable=False),
        sa.Column("doctor", sa.String(length=120), nullable=False),
        sa.Column("department", sa.String(length=40), nullable=False),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("time_slot", sa.String(length=5), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="BOOKED"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_appointments_appointment_date", "appointments", ["appointment_date"])


def downgrade():
    op.drop_index("ix_appointments_appointment_date", table_name="appointments")
    op.drop_table("appointments")
