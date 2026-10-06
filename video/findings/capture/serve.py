"""A static server for the filming viewer and the frames: http.server with a deep listen queue (the stock one's
backlog of 5 resets Chrome's parallel module requests, and a scene then never builds).
  python3 serve.py <dir> <port>"""
import functools, http.server, sys


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


d, port = sys.argv[1], int(sys.argv[2])
Server(("127.0.0.1", port), functools.partial(Quiet, directory=d)).serve_forever()
