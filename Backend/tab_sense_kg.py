# import os
# import time
# import hashlib
# import networkx as nx
# from sentence_transformers import SentenceTransformer, util
# from pyvis.network import Network
# import matplotlib.pyplot as plt


# class TabSenseKG:
#     """
#     Knowledge Graph builder for TabSense.
#     Nodes: Tabs, Entities
#     Edges:
#       - contains (Tab → Entity)
#       - semantically_related (Entity ↔ Entity)
#     """

#     def __init__(self, model_name="all-MiniLM-L6-v2", similarity_threshold=0.65):
#         self.graph = nx.Graph()
#         self.snapshots = []
#         self.similarity_threshold = similarity_threshold
#         self.snapshot_count = 0

#         self.model = SentenceTransformer(model_name)

#         os.makedirs("outputs", exist_ok=True)
#         print(f"✅ TabSenseKG initialized | model={model_name}, threshold={similarity_threshold}")

#     # -------------------------------------------------
#     # Utility helpers
#     # -------------------------------------------------
#     @staticmethod
#     def _hash_id(text: str) -> str:
#         return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]

#     @staticmethod
#     def _normalize_entity(text: str) -> str:
#         return text.strip().lower()

#     # -------------------------------------------------
#     # Add a tab to the graph
#     # -------------------------------------------------
#     def add_tab(self, tab: dict):
#         """
#         Expected tab dict:
#         {
#           "tab_id": "...",           # optional
#           "title": "...",
#           "url": "...",
#           "summary": "...",
#           "raw_text": "...",
#           "entities": [
#               {"text": "AI", "type": "Technology"}
#           ]
#         }
#         """

#         start = time.time()

#         title = tab.get("title", "Untitled")
#         url = tab.get("url", "")
#         summary = tab.get("summary", "")
#         raw_text = tab.get("raw_text", "")

#         # Stable tab node ID
#         tab_node_id = f"tab::{self._hash_id(url or title)}"

#         # Add tab node
#         self.graph.add_node(
#             tab_node_id,
#             label=title,
#             type="Tab",
#             url=url,
#             summary=summary,
#             raw_text=raw_text
#         )

#         # Process entities
#         raw_entities = tab.get("entities", [])
#         entity_nodes = []

#         for ent in raw_entities:
#             if not isinstance(ent, dict):
#                 continue

#             name = self._normalize_entity(ent.get("text", ""))
#             if not name:
#                 continue

#             entity_type = ent.get("type", "concept")
#             entity_id = f"entity::{self._hash_id(name)}"

#             if not self.graph.has_node(entity_id):
#                 self.graph.add_node(
#                     entity_id,
#                     label=name,
#                     type="Entity",
#                     entity_type=entity_type
#                 )

#             # Tab → Entity edge
#             self.graph.add_edge(
#                 tab_node_id,
#                 entity_id,
#                 relation="contains",
#                 weight=1.0
#             )

#             entity_nodes.append(entity_id)

#         print(f"🧠 Added tab '{title}' with {len(entity_nodes)} entities")

#         # Semantic enrichment
#         self._add_semantic_links(entity_nodes)

#         # Snapshot
#         self.snapshots.append(self.graph.copy())
#         print(f"⏱️ Done in {time.time() - start:.3f}s")

#     # -------------------------------------------------
#     # Semantic similarity between entities
#     # -------------------------------------------------
#     def _add_semantic_links(self, new_entity_ids):
#         existing_entities = [
#             n for n, d in self.graph.nodes(data=True)
#             if d.get("type") == "Entity" and n not in new_entity_ids
#         ]

#         if not existing_entities:
#             return

#         # Collect text for embeddings
#         texts = {}
#         for eid in new_entity_ids + existing_entities:
#             texts[eid] = self.graph.nodes[eid]["label"]

#         embeddings = {
#             eid: self.model.encode(text, convert_to_tensor=True)
#             for eid, text in texts.items()
#         }

#         for e_new in new_entity_ids:
#             for e_old in existing_entities:
#                 sim = util.cos_sim(embeddings[e_new], embeddings[e_old]).item()

#                 if sim >= self.similarity_threshold:
#                     self.graph.add_edge(
#                         e_new,
#                         e_old,
#                         relation="semantically_related",
#                         weight=round(sim, 3)
#                     )
#                     print(f"   🔗 {texts[e_new]} ↔ {texts[e_old]} (sim={sim:.2f})")

#     # -------------------------------------------------
#     # Graph stats
#     # -------------------------------------------------
#     def stats(self):
#         print("\n📊 Graph Stats")
#         print(f"Nodes: {self.graph.number_of_nodes()}")
#         print(f"Edges: {self.graph.number_of_edges()}")
#         print(f"Density: {nx.density(self.graph):.4f}")

#     # -------------------------------------------------
#     # Frontend-ready JSON export
#     # -------------------------------------------------
#     def export_json(self):
#         nodes = []
#         edges = []

#         for node_id, data in self.graph.nodes(data=True):
#             nodes.append({
#                 "id": node_id,
#                 "label": data.get("label"),
#                 "type": data.get("type"),
#                 "entity_type": data.get("entity_type"),
#                 "url": data.get("url"),
#                 "summary": data.get("summary")
#             })

#         for u, v, d in self.graph.edges(data=True):
#             edges.append({
#                 "source": u,
#                 "target": v,
#                 "relation": d.get("relation"),
#                 "weight": d.get("weight", 1.0)
#             })

#         return {
#             "nodes": nodes,
#             "edges": edges
#         }

#     # -------------------------------------------------
#     # Interactive visualization (PyVis)
#     # -------------------------------------------------
#     def visualize(self, filename="outputs/tabSenseKG.html"):
#         net = Network(height="650px", width="100%", bgcolor="#ffffff", notebook=False)

#         for node_id, data in self.graph.nodes(data=True):
#             if data["type"] == "Tab":
#                 color = "#6A5ACD"
#                 title = f"<b>{data['label']}</b><br>{data.get('summary','')}<br><a href='{data.get('url','#')}' target='_blank'>Open</a>"
#             else:
#                 color = "#FFA500"
#                 title = f"<b>{data['label']}</b><br>Type: {data.get('entity_type')}"

#             net.add_node(
#                 node_id,
#                 label=data["label"],
#                 title=title,
#                 color=color
#             )

#         for u, v, d in self.graph.edges(data=True):
#             style = "dashed" if d.get("relation") == "semantically_related" else "solid"
#             net.add_edge(
#                 u,
#                 v,
#                 title=f"{d.get('relation')} | weight={d.get('weight')}",
#                 width=0.6 if style == "solid" else 0.3
#             )

#         net.save_graph(filename)
#         print(f"📁 Graph saved to {filename}")


import os
import time
import hashlib
import networkx as nx
from sentence_transformers import SentenceTransformer, util
from pyvis.network import Network
import matplotlib.pyplot as plt


class TabSenseKG:
    """
    Knowledge Graph builder for TabSense.

    Nodes:
      - Tab
      - Entity

    Edges:
      - contains (Tab → Entity)
      - semantically_related (Entity ↔ Entity)
    """

    def __init__(self, model_name="all-MiniLM-L6-v2", similarity_threshold=0.65):
        self.graph = nx.Graph()
        self.snapshots = []
        self.similarity_threshold = similarity_threshold

        self.model = SentenceTransformer(model_name)

        os.makedirs("outputs", exist_ok=True)
        print(
            f"✅ TabSenseKG initialized | model={model_name}, "
            f"threshold={similarity_threshold}"
        )

    # -------------------------------------------------
    # Utility helpers
    # -------------------------------------------------
    @staticmethod
    def _hash_id(text: str) -> str:
        return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]

    @staticmethod
    def _normalize_label(text: str) -> str:
        return text.strip()

    # -------------------------------------------------
    # Add a tab to the graph
    # -------------------------------------------------
    def add_tab(self, tab: dict):
        """
        Expected tab dict:
        {
          "title": "...",
          "url": "...",
          "summary": "...",
          "raw_text": "...",
          "entities": [
              {"name": "AI", "type": "Technology"}
          ]
        }
        """

        start = time.time()

        title = tab.get("title", "Untitled")
        url = tab.get("url", "")
        summary = tab.get("summary", "")
        raw_text = tab.get("raw_text", "")

        # Stable tab node ID
        tab_node_id = f"tab::{self._hash_id(url or title)}"

        # Add / update tab node
        self.graph.add_node(
            tab_node_id,
            label=title,
            type="Tab",
            url=url,
            summary=summary,
            raw_text=raw_text
        )

        # -----------------------------
        # Entity normalization (FIXED)
        # -----------------------------
        raw_entities = tab.get("entities", [])
        entity_node_ids = []

        for ent in raw_entities:
            if not isinstance(ent, dict):
                continue

            # Accept BOTH schemas: name OR text
            label = (
                ent.get("name")
                or ent.get("text")
            )

            if not label:
                continue

            label = self._normalize_label(label)
            entity_type = ent.get("type", "concept")

            entity_id = f"entity::{self._hash_id(label.lower())}"

            # Create entity node if new
            if not self.graph.has_node(entity_id):
                self.graph.add_node(
                    entity_id,
                    label=label,
                    type="Entity",
                    entity_type=entity_type
                )

            # Tab → Entity edge
            self.graph.add_edge(
                tab_node_id,
                entity_id,
                relation="contains",
                weight=1.0
            )

            entity_node_ids.append(entity_id)

        print(f"🧠 Added tab '{title}' with {len(entity_node_ids)} entities")

        # Semantic enrichment
        self._add_semantic_links(entity_node_ids)

        # Snapshot
        self.snapshots.append(self.graph.copy())
        print(f"⏱️ Done in {time.time() - start:.3f}s")

    # -------------------------------------------------
    # Semantic similarity between entities
    # -------------------------------------------------
    def _add_semantic_links(self, new_entity_ids):
        existing_entities = [
            n for n, d in self.graph.nodes(data=True)
            if d.get("type") == "Entity" and n not in new_entity_ids
        ]

        if not new_entity_ids or not existing_entities:
            return

        texts = {}
        for eid in new_entity_ids + existing_entities:
            texts[eid] = self.graph.nodes[eid]["label"]

        embeddings = {
            eid: self.model.encode(text, convert_to_tensor=True)
            for eid, text in texts.items()
        }

        for e_new in new_entity_ids:
            for e_old in existing_entities:
                sim = util.cos_sim(
                    embeddings[e_new],
                    embeddings[e_old]
                ).item()

                if sim >= self.similarity_threshold:
                    self.graph.add_edge(
                        e_new,
                        e_old,
                        relation="semantically_related",
                        weight=round(sim, 3)
                    )
                    print(
                        f"   🔗 {texts[e_new]} ↔ {texts[e_old]} "
                        f"(sim={sim:.2f})"
                    )

    # -------------------------------------------------
    # Graph stats
    # -------------------------------------------------
    def stats(self):
        print("\n📊 Graph Stats")
        print(f"Nodes: {self.graph.number_of_nodes()}")
        print(f"Edges: {self.graph.number_of_edges()}")
        print(f"Density: {nx.density(self.graph):.4f}")

    # -------------------------------------------------
    # Frontend-ready JSON export
    # -------------------------------------------------
    def export_json(self):
        nodes = []
        edges = []

        for node_id, data in self.graph.nodes(data=True):
            nodes.append({
                "id": node_id,
                "label": data.get("label"),
                "type": data.get("type"),
                "entity_type": data.get("entity_type"),
                "url": data.get("url"),
                "summary": data.get("summary")
            })

        for u, v, d in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "relation": d.get("relation"),
                "weight": d.get("weight", 1.0)
            })

        return {
            "nodes": nodes,
            "edges": edges
        }

    # -------------------------------------------------
    # Interactive visualization (PyVis)
    # -------------------------------------------------
    def visualize(self, filename="outputs/tabSenseKG.html"):
        net = Network(
            height="650px",
            width="100%",
            bgcolor="#ffffff",
            notebook=False
        )

        for node_id, data in self.graph.nodes(data=True):
            if data["type"] == "Tab":
                color = "#6A5ACD"
                title = (
                    f"<b>{data['label']}</b><br>"
                    f"{data.get('summary','')}<br>"
                    f"<a href='{data.get('url','#')}' target='_blank'>Open</a>"
                )
            else:
                color = "#FFA500"
                title = (
                    f"<b>{data['label']}</b><br>"
                    f"Type: {data.get('entity_type')}"
                )

            net.add_node(
                node_id,
                label=data["label"],
                title=title,
                color=color
            )

        for u, v, d in self.graph.edges(data=True):
            net.add_edge(
                u,
                v,
                title=f"{d.get('relation')} | weight={d.get('weight')}",
                width=0.6 if d.get("relation") == "contains" else 0.3
            )

        net.save_graph(filename)
        print(f"📁 Graph saved to {filename}")
