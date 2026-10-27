"""The Alembic migration must produce exactly the schema the ORM models describe."""
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.db.base import Base

BACKEND = Path(__file__).resolve().parents[1]


def _config(url: str) -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "migrations"))
    cfg.attributes["database_url"] = url
    cfg.attributes["configure_logger"] = False
    return cfg


def test_upgrade_matches_models_and_downgrade_is_clean(tmp_path):
    url = f"sqlite+pysqlite:///{(tmp_path / 'migrate.db').as_posix()}"
    cfg = _config(url)
    command.upgrade(cfg, "head")

    engine = create_engine(url)
    try:
        insp = inspect(engine)
        assert set(insp.get_table_names()) == set(Base.metadata.tables) | {"alembic_version"}
        for name, table in Base.metadata.tables.items():
            assert {c["name"] for c in insp.get_columns(name)} == {c.name for c in table.columns}, name
            model_indexes = {ix.name for ix in table.indexes}
            assert {ix["name"] for ix in insp.get_indexes(name)} == model_indexes, name
            assert {fk["name"] for fk in insp.get_foreign_keys(name)} == {fk.name for fk in table.foreign_key_constraints}, name

        command.downgrade(cfg, "base")
        assert set(inspect(engine).get_table_names()) == {"alembic_version"}
    finally:
        engine.dispose()
