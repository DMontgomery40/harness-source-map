#!/usr/bin/env python3
"""Export the exact requested OpenCode family from a read-only SQLite snapshot."""
import json
import pathlib
import sqlite3
import sys


def export_family(database, session_id):
    db = sqlite3.connect(pathlib.Path(database).resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    db.execute('BEGIN')
    sessions = db.execute('''WITH RECURSIVE family(id) AS (
      SELECT id FROM session WHERE id = ? UNION
      SELECT s.id FROM session s JOIN family f ON s.parent_id = f.id)
      SELECT s.* FROM session s JOIN family f ON s.id = f.id ORDER BY s.time_created, s.id''', (session_id,)).fetchall()
    exports = []
    for record in sessions:
        row = dict(record)
        info = {target: row[source] for source, target in (
            ('id', 'id'), ('parent_id', 'parentID'), ('project_id', 'projectID'),
            ('directory', 'directory'), ('title', 'title'), ('version', 'version'),
            ('slug', 'slug'), ('workspace_id', 'workspaceID')) if row.get(source) is not None}
        info['time'] = {key: row['time_' + key] for key in ('created', 'updated', 'compacting', 'archived') if row.get('time_' + key) is not None}
        messages = []
        for message in db.execute('SELECT * FROM message WHERE session_id = ? ORDER BY id', (row['id'],)):
            data = json.loads(message['data'])
            data.update(id=message['id'], sessionID=row['id'])
            parts = []
            for part in db.execute('SELECT * FROM part WHERE session_id = ? AND message_id = ? ORDER BY id', (row['id'], message['id'])):
                value = json.loads(part['data'])
                value.update(id=part['id'], sessionID=row['id'], messageID=message['id'])
                parts.append(value)
            messages.append({'info': data, 'parts': parts})
        exports.append({'info': info, 'messages': messages})
    db.close()
    return exports


if __name__ == '__main__':
    print(json.dumps(export_family(sys.argv[1], sys.argv[2])))
