import sqlite3
import psycopg2
from psycopg2.extras import execute_values

# ---- config ----
SQLITE_PATH = r"E:\Antigravity\backend\sts.db"
PG_CONFIG = {
    "host": "127.0.0.1",
    "port": 5432,
    "dbname": "sts",
    "user": "postgres",
    "password": "password",
}

SKIP_TABLES = {"sqlite_sequence"}

# ---- เชื่อมต่อ ----
sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_conn.row_factory = sqlite3.Row
sqlite_cur = sqlite_conn.cursor()

pg_conn = psycopg2.connect(**PG_CONFIG)
pg_conn.autocommit = False
pg_cur = pg_conn.cursor()

# ---- ดึง table order จาก SQLite (เรียงตาม foreign key dependency) ----
sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
all_tables = [row[0] for row in sqlite_cur.fetchall() if row[0] not in SKIP_TABLES]

# จัดลำดับ table ที่ต้อง insert ก่อน
PRIORITY_TABLES = [
    "role",
    "school", 
    "student",
    "student_per_term",
    "student_guardian",
    "student_profile",
    "attendance",
    "attendance2",
    "dropout_student",
]

# เรียง: priority ก่อน แล้วตามด้วยที่เหลือ
ordered_tables = PRIORITY_TABLES + [t for t in all_tables if t not in PRIORITY_TABLES]

print(f"พบ {len(all_tables)} tables\n")

# ---- helper: สร้าง table ใน PostgreSQL จาก SQLite schema ----
def get_pg_type(sqlite_type: str) -> str:
    sqlite_type = sqlite_type.upper()
    if "INT" in sqlite_type:
        return "BIGINT"
    if any(t in sqlite_type for t in ["VARCHAR", "TEXT", "CHAR", "CLOB"]):
        return "TEXT"
    if any(t in sqlite_type for t in ["REAL", "FLOAT", "DOUBLE"]):
        return "DOUBLE PRECISION"
    if any(t in sqlite_type for t in ["BLOB", "NONE", ""]):
        return "TEXT"
    if any(t in sqlite_type for t in ["DATETIME", "TIMESTAMP"]):
        return "TIMESTAMP"
    if "BOOL" in sqlite_type:
        return "BOOLEAN"
    return "TEXT"

def create_table_if_not_exists(table: str):
    sqlite_cur.execute(f'PRAGMA table_info("{table}")')
    columns = sqlite_cur.fetchall()
    if not columns:
        return

    col_defs = []
    for col in columns:
        col_name = col[1]
        col_type = col[2] or "TEXT"
        pg_type = get_pg_type(col_type)
        is_pk = col[5] == 1

        if is_pk:
            col_defs.append(f'"{col_name}" BIGINT PRIMARY KEY')
        else:
            col_defs.append(f'"{col_name}" {pg_type}')

    create_sql = f'CREATE TABLE IF NOT EXISTS "{table}" ({", ".join(col_defs)})'
    pg_cur.execute(create_sql)
    pg_conn.commit()

# ---- migrate ทีละ table ----
# ปิด foreign key checks ชั่วคราว
pg_cur.execute("SET session_replication_role = replica;")
pg_conn.commit()

for table in ordered_tables:
    try:
        sqlite_cur.execute(f'SELECT * FROM "{table}"')
        rows = sqlite_cur.fetchall()
        columns = [desc[0] for desc in sqlite_cur.description]

        # สร้าง table ถ้ายังไม่มี
        create_table_if_not_exists(table)

        if not rows:
            print(f"  [{table}] ไม่มีข้อมูล ข้ามไป")
            continue

        col_str = ", ".join([f'"{c}"' for c in columns])
        values = [tuple(row) for row in rows]

        pg_cur.execute(f'DELETE FROM "{table}"')
        execute_values(
            pg_cur,
            f'INSERT INTO "{table}" ({col_str}) VALUES %s ON CONFLICT DO NOTHING',
            values,
        )
        pg_conn.commit()
        print(f"  [{table}] ✅ migrate สำเร็จ {len(rows)} rows")

    except Exception as e:
        pg_conn.rollback()
        print(f"  [{table}] ❌ ERROR: {e}")

# เปิด foreign key checks กลับ
pg_cur.execute("SET session_replication_role = DEFAULT;")
pg_conn.commit()

# ---- sync sequences ----
print("\nSync sequences...")
for table in ordered_tables:
    try:
        pg_cur.execute(f"""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = '{table}' AND column_default LIKE 'nextval%'
        """)
        seq_col = pg_cur.fetchone()
        if seq_col:
            pg_cur.execute(f"""
                SELECT setval(
                    pg_get_serial_sequence('"{table}"', '{seq_col[0]}'),
                    COALESCE((SELECT MAX("{seq_col[0]}") FROM "{table}"), 1)
                )
            """)
            pg_conn.commit()
            print(f"  [{table}] sequence synced")
    except Exception as e:
        pg_conn.rollback()
        print(f"  [{table}] sequence error: {e}")

sqlite_conn.close()
pg_cur.close()
pg_conn.close()
print("\nเสร็จสิ้น!")