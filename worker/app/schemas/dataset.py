from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    dataset_id: int
