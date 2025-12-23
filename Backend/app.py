# backend/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from tab_sense_kg import TabSenseKG

app = FastAPI()
kg = TabSenseKG()

class TabPayload(BaseModel):
    title: str
    url: str
    summary: str
    raw_text: str
    entities: list

@app.post("/add_tab")
def add_tab(tab: TabPayload):
    kg.add_tab(tab.dict())
    return {"status": "ok"}

@app.get("/graph")
def get_graph():
    return kg.export_json()
