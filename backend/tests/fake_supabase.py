"""Cliente Supabase en memoria para tests de servicios (select/eq/in_/order/insert/update/delete)."""

import uuid
from types import SimpleNamespace


class _Query:
    def __init__(self, db, name):
        self.db = db
        self.name = name
        self.filters = []
        self.op = "select"
        self.body = None
        self._single = False
        self._order = None

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def in_(self, col, vals):
        vals = list(vals)
        self.filters.append(lambda r: r.get(col) in vals)
        return self

    def gt(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r.get(col) > val)
        return self

    def gte(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r.get(col) >= val)
        return self

    def lte(self, col, val):
        self.filters.append(lambda r: r.get(col) is not None and r.get(col) <= val)
        return self

    def is_(self, col, val):
        self.filters.append(lambda r: r.get(col) is None if val == "null" else r.get(col) == val)
        return self

    @property
    def not_(self):
        outer = self

        class _Not:
            def is_(self, col, val):
                outer.filters.append(
                    lambda r: r.get(col) is not None if val == "null" else r.get(col) != val
                )
                return outer

        return _Not()

    def order(self, col, desc=False):
        self._order = (col, desc)
        return self

    def limit(self, _n):
        return self

    def single(self):
        self._single = True
        return self

    def insert(self, body):
        self.op, self.body = "insert", body
        return self

    def update(self, body):
        self.op, self.body = "update", body
        return self

    def upsert(self, body, **_k):
        self.op, self.body = "insert", body
        return self

    def delete(self):
        self.op = "delete"
        return self

    def _rows(self):
        rows = self.db.tables.setdefault(self.name, [])
        return [r for r in rows if all(f(r) for f in self.filters)]

    def execute(self):
        rows = self.db.tables.setdefault(self.name, [])
        if self.op == "insert":
            hook = self.db.insert_hooks.get(self.name)
            if hook:
                hook(self.body)
            row = {"id": str(uuid.uuid4()), **self.body}
            rows.append(row)
            return SimpleNamespace(data=[row])
        if self.op == "update":
            hit = self._rows()
            for r in hit:
                r.update(self.body)
            return SimpleNamespace(data=hit)
        if self.op == "delete":
            hit = self._rows()
            self.db.tables[self.name] = [r for r in rows if r not in hit]
            return SimpleNamespace(data=hit)
        hit = [dict(r) for r in self._rows()]
        if self._order:
            col, desc = self._order
            hit.sort(key=lambda r: (r.get(col) is None, r.get(col)), reverse=desc)
        if self._single:
            return SimpleNamespace(data=hit[0] if hit else None)
        return SimpleNamespace(data=hit)


class FakeSupabase:
    def __init__(self, tables=None):
        self.tables = {
            k: [{"id": str(uuid.uuid4()), **r} for r in v] for k, v in (tables or {}).items()
        }
        self.insert_hooks = {}

    def table(self, name):
        return _Query(self, name)
