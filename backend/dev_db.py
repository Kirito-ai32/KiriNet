from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple
from uuid import uuid4
from pymongo.errors import DuplicateKeyError


def _matches_value(doc_value: Any, query_value: Any) -> bool:
    if isinstance(query_value, dict):
        for op, operand in query_value.items():
            if op == "$ne":
                if doc_value == operand:
                    return False
            elif op == "$all":
                if not isinstance(doc_value, list):
                    return False
                if not all(item in doc_value for item in operand):
                    return False
            else:
                return False
        return True

    if isinstance(doc_value, list):
        return query_value in doc_value

    return doc_value == query_value


def _matches_query(document: Dict[str, Any], query: Optional[Dict[str, Any]]) -> bool:
    if not query:
        return True

    for key, value in query.items():
        if key.startswith("$"):
            return False
        if not _matches_value(document.get(key), value):
            return False
    return True


class InMemoryCursor:
    def __init__(self, documents: List[Dict[str, Any]]):
        self._documents = documents
        self._index = 0

    def sort(self, field: str, direction: int = 1) -> "InMemoryCursor":
        reverse = direction == -1
        self._documents = sorted(
            self._documents,
            key=lambda item: item.get(field),
            reverse=reverse,
        )
        return self

    def limit(self, value: int) -> "InMemoryCursor":
        self._documents = self._documents[:value]
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        if length is None:
            return deepcopy(self._documents)
        return deepcopy(self._documents[:length])

    def __aiter__(self) -> "InMemoryCursor":
        self._index = 0
        return self

    async def __anext__(self) -> Dict[str, Any]:
        if self._index >= len(self._documents):
            raise StopAsyncIteration
        value = deepcopy(self._documents[self._index])
        self._index += 1
        return value


class InMemoryCollection:
    def __init__(self):
        self._documents: List[Dict[str, Any]] = []
        self._unique_fields: set[str] = set()

    async def create_index(
        self,
        key: Any,
        unique: bool = False,
        sparse: bool = False,
        **_: Any,
    ):
        field = None

        if isinstance(key, str):
            field = key
        elif isinstance(key, list) and key:
            first_key = key[0]
            if isinstance(first_key, tuple) and len(first_key) >= 1:
                field = first_key[0]

        if unique and field:
            self._unique_fields.add(field)

        return f"{field or 'index'}_idx"

    def _validate_unique_constraints(self, record: Dict[str, Any]) -> None:
        for field in self._unique_fields:
            if field not in record:
                continue

            value = record.get(field)
            for existing in self._documents:
                if existing.get(field) == value:
                    raise DuplicateKeyError(
                        f"Duplicate value for unique index '{field}': {value}"
                    )

    async def insert_one(self, document: Dict[str, Any]):
        record = deepcopy(document)
        self._validate_unique_constraints(record)
        record.setdefault("_id", str(uuid4()))
        self._documents.append(record)
        return type("InsertOneResult", (), {"inserted_id": record["_id"]})()

    async def find_one(
        self,
        query: Optional[Dict[str, Any]] = None,
        sort: Optional[Iterable[Tuple[str, int]]] = None,
    ) -> Optional[Dict[str, Any]]:
        matches = [doc for doc in self._documents if _matches_query(doc, query)]
        if sort:
            for field, direction in reversed(list(sort)):
                matches = sorted(
                    matches,
                    key=lambda item: item.get(field),
                    reverse=direction == -1,
                )
        if not matches:
            return None
        return deepcopy(matches[0])

    async def update_one(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
        upsert: bool = False,
    ):
        target_index = None
        for index, document in enumerate(self._documents):
            if _matches_query(document, query):
                target_index = index
                break

        if target_index is None:
            if not upsert:
                return type(
                    "UpdateResult",
                    (),
                    {"matched_count": 0, "modified_count": 0, "upserted_id": None},
                )()

            new_document: Dict[str, Any] = {"_id": str(uuid4())}
            for key, value in query.items():
                if not isinstance(value, dict):
                    new_document[key] = deepcopy(value)
            self._apply_update(new_document, update)
            self._validate_unique_constraints(new_document)
            self._documents.append(new_document)
            return type(
                "UpdateResult",
                (),
                {"matched_count": 0, "modified_count": 0, "upserted_id": new_document["_id"]},
            )()

        original = deepcopy(self._documents[target_index])
        self._apply_update(self._documents[target_index], update)
        modified = 1 if self._documents[target_index] != original else 0
        return type(
            "UpdateResult",
            (),
            {"matched_count": 1, "modified_count": modified, "upserted_id": None},
        )()

    def _apply_update(self, document: Dict[str, Any], update: Dict[str, Any]) -> None:
        for op, payload in update.items():
            if op == "$set":
                for key, value in payload.items():
                    document[key] = deepcopy(value)
            elif op == "$addToSet":
                for key, value in payload.items():
                    current = document.setdefault(key, [])
                    if not isinstance(current, list):
                        current = [current]
                        document[key] = current
                    if value not in current:
                        current.append(deepcopy(value))

    def find(self, query: Optional[Dict[str, Any]] = None) -> InMemoryCursor:
        data = [deepcopy(doc) for doc in self._documents if _matches_query(doc, query)]
        return InMemoryCursor(data)


class InMemoryDatabase:
    def __init__(self):
        self._collections: Dict[str, InMemoryCollection] = {}

    def __getitem__(self, name: str) -> InMemoryCollection:
        if name not in self._collections:
            self._collections[name] = InMemoryCollection()
        return self._collections[name]

    def __getattr__(self, name: str) -> InMemoryCollection:
        return self[name]


class InMemoryClient:
    def close(self) -> None:
        return None


def create_in_memory_database() -> tuple[InMemoryClient, InMemoryDatabase]:
    client = InMemoryClient()
    db = InMemoryDatabase()

    db["conversations"]._documents.append(
        {
            "_id": str(uuid4()),
            "id": str(uuid4()),
            "type": "global",
            "participants": [],
            "name": "KiriNet Global",
            "created_at": datetime.utcnow(),
            "last_message": None,
            "last_message_time": None,
        }
    )

    return client, db
