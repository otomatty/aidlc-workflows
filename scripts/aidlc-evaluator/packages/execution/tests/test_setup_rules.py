"""Tests for setup_rules() rules-subdir selection (local source)."""

from __future__ import annotations

from pathlib import Path

from aidlc_runner.config import RunnerConfig
from aidlc_runner.runner import setup_rules


def _make_local_source(root: Path) -> Path:
    """Create a fake rules source with both English and Japanese subtrees."""
    en = root / "aidlc-rules" / "aws-aidlc-rules"
    ja = root / "ja" / "aidlc-rules" / "aws-aidlc-rules"
    en.mkdir(parents=True)
    ja.mkdir(parents=True)
    (en / "core-workflow.md").write_text("english rules\n", encoding="utf-8")
    (ja / "core-workflow.md").write_text("日本語ルール\n", encoding="utf-8")
    return root


def test_setup_rules_local_defaults_to_english(tmp_path: Path):
    source = _make_local_source(tmp_path / "src")
    run_folder = tmp_path / "run"
    run_folder.mkdir()

    config = RunnerConfig()
    config.aidlc.rules_source = "local"
    config.aidlc.rules_local_path = str(source)

    rules_dest = setup_rules(run_folder, config)

    content = (rules_dest / "aws-aidlc-rules" / "core-workflow.md").read_text(
        encoding="utf-8"
    )
    assert content == "english rules\n"


def test_setup_rules_local_selects_japanese_subdir(tmp_path: Path):
    source = _make_local_source(tmp_path / "src")
    run_folder = tmp_path / "run"
    run_folder.mkdir()

    config = RunnerConfig()
    config.aidlc.rules_source = "local"
    config.aidlc.rules_local_path = str(source)
    config.aidlc.rules_subdir = "ja/aidlc-rules"

    rules_dest = setup_rules(run_folder, config)

    # Always staged under the run folder's "aidlc-rules" dir, regardless of source subdir.
    assert rules_dest == run_folder / "aidlc-rules"
    content = (rules_dest / "aws-aidlc-rules" / "core-workflow.md").read_text(
        encoding="utf-8"
    )
    assert content == "日本語ルール\n"
