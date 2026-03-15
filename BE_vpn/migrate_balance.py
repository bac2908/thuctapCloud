"""Migration script to add balance column and create topup_transactions table"""
import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.database import engine

def run_migration():
    with engine.connect() as conn:
        # Check if balance column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='balance'
        """))
        
        if not result.fetchone():
            print("Adding balance column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN balance BIGINT NOT NULL DEFAULT 0"))
            conn.commit()
            print("Balance column added successfully!")
        else:
            print("Balance column already exists.")

        # Check if topup_transactions table exists
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name='topup_transactions'
        """))
        
        if not result.fetchone():
            print("Creating topup_transactions table...")
            conn.execute(text("""
                CREATE TABLE topup_transactions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
                    amount BIGINT NOT NULL,
                    balance_before BIGINT NOT NULL DEFAULT 0,
                    balance_after BIGINT NOT NULL DEFAULT 0,
                    status VARCHAR NOT NULL DEFAULT 'pending',
                    provider VARCHAR NOT NULL DEFAULT 'momo',
                    description VARCHAR,
                    trans_id VARCHAR,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    completed_at TIMESTAMP WITH TIME ZONE
                )
            """))
            conn.execute(text("CREATE INDEX ix_topup_transactions_user_id ON topup_transactions(user_id)"))
            conn.execute(text("CREATE INDEX ix_topup_transactions_status ON topup_transactions(status)"))
            conn.execute(text("CREATE INDEX ix_topup_transactions_created_at ON topup_transactions(created_at)"))
            conn.commit()
            print("topup_transactions table created successfully!")
        else:
            print("topup_transactions table already exists.")

        print("Migration completed!")

if __name__ == "__main__":
    run_migration()
