"""Offline checks: no browser, private recordings, or paid API calls."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


class PipelineTests(unittest.TestCase):
    def test_capture_failure_survives_later_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = Path(tmp) / 'python3'
            fake.write_text('#!/bin/sh\n[ "$2" != bad ]\n')
            fake.chmod(0o755)
            env = dict(os.environ, PATH=tmp + os.pathsep + os.environ['PATH'])
            runner = ROOT / 'capture/run_all.sh'
            self.assertEqual(subprocess.run(['sh', runner, 'bad', 'good'], env=env, capture_output=True).returncode, 1)
            self.assertEqual(subprocess.run(['sh', runner, 'good'], env=env, capture_output=True).returncode, 0)

    def test_retempo_does_not_require_credentials(self):
        with tempfile.TemporaryDirectory() as tmp:
            common = types.ModuleType('common')
            common.private_dir = lambda *args: tmp
            def forbidden_key():
                self.fail('offline mode requested credentials')
            common.elevenlabs_key = forbidden_key
            spec = importlib.util.spec_from_file_location('findings_tts', ROOT / 'audio/tts.py')
            module = importlib.util.module_from_spec(spec)
            with patch.dict(sys.modules, common=common, requests=types.ModuleType('requests')), patch.object(sys, 'argv', ['tts.py', '--retempo']):
                spec.loader.exec_module(module)
                for beat in module.cfg['beats']:
                    (Path(tmp) / (beat['id'] + '.raw.json')).write_text('{}')
                with patch.object(module, 'write_beat') as write:
                    module.main()
                    self.assertEqual(write.call_count, len(module.cfg['beats']))


if __name__ == '__main__':
    unittest.main()
