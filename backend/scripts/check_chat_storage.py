"""Check that chat conversations and messages can be saved and read back in the REAL database — then undo it.

Everything happens inside one transaction that is ROLLED BACK at the end, so nothing is left behind and no
existing data is touched. Uses a synthetic guest conversation with fixed test text (no health details).
Prints counts and ids only — never the connection URL or password.

Run from the backend folder:
    .venv\\Scripts\\python.exe -m scripts.check_chat_storage
"""
from __future__ import annotations

import sys
import uuid

from sqlalchemy import func, select

from app.core.config import Settings
from app.db.models import Conversation, Message
from app.db.session import build_engine


def main() -> int:
    settings = Settings()  # type: ignore[call-arg]
    engine = build_engine(settings.database_url)
    try:
        with engine.connect() as conn:
            outer = conn.begin()
            try:
                from sqlalchemy.orm import Session

                session = Session(bind=conn, join_transaction_mode="create_savepoint")
                before = session.scalar(select(func.count()).select_from(Message))
                conv = Conversation(guest_id=uuid.uuid4(), title="storage check", language="en")
                conv.messages = [
                    Message(role="user", message_text="storage check: question"),
                    Message(role="assistant", message_text="storage check: answer"),
                ]
                session.add(conv)
                session.flush()
                print("[1] saved   : conversation + 2 messages (inside a transaction)")

                session.expire_all()
                found = session.get(Conversation, conv.id)
                texts = [m.message_text for m in found.messages] if found else []
                print(f"[2] read back: {len(texts)} messages")
                # Same transaction → same server timestamp, so compare without relying on order.
                ok = sorted(texts) == ["storage check: answer", "storage check: question"]
                session.close()
            finally:
                outer.rollback()
                print("[3] rolled back: nothing was kept")
            with engine.connect() as check:
                after = check.scalar(select(func.count()).select_from(Message))
            print(f"[4] message count before={before} after={after} (must be equal)")
            ok = ok and before == after
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED: {type(exc).__module__}.{type(exc).__name__} [SQLSTATE {getattr(exc, 'sqlstate', None) or getattr(getattr(exc, 'orig', None), 'sqlstate', None)}]")
        return 1
    finally:
        engine.dispose()
    print("RESULT:", "chat storage works" if ok else "MISMATCH — see above")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
