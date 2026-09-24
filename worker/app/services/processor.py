import logging
from app.database import SessionLocal
from app.services.analyzer import analyze_text
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)

def process_dataset(dataset_id: int):
    logging.info(f"Starting processing for dataset_id: {dataset_id}")
    
    # Phase 1: Fetch data and close connection immediately
    with SessionLocal() as db:
        result = db.execute(text("SELECT id, review_text FROM reviews WHERE dataset_id = :dataset_id"), {"dataset_id": dataset_id})
        reviews = result.fetchall()
        
        if not reviews:
            logging.warning(f"No reviews found for dataset_id: {dataset_id}")
            db.execute(text("UPDATE datasets SET status = 'COMPLETED' WHERE id = :dataset_id"), {"dataset_id": dataset_id})
            db.commit()
            return
            
    logging.info(f"Found {len(reviews)} reviews. Starting NLP analysis in memory...")
    
    # Phase 2: Analyze in memory (Heavy CPU task, NO active DB connection held)
    results_to_insert = []
    for idx, review in enumerate(reviews):
        review_id = review[0]
        text_content = review[1]
        
        aspects_sentiments = analyze_text(text_content)
        
        for item in aspects_sentiments:
            results_to_insert.append({
                "review_id": review_id,
                "aspect": item["aspect"],
                "opinion": item["opinion"],
                "sentiment": item["sentiment"]
            })
            
        if (idx + 1) % 500 == 0:
            logging.info(f"Analyzed {idx + 1} / {len(reviews)} reviews...")
            
    # Phase 3: Batch insert into DB
    if results_to_insert:
        logging.info(f"Preparing to insert {len(results_to_insert)} results...")
        chunk_size = 2000
        
        # Open connection for batch insertions
        with SessionLocal() as db:
            try:
                for i in range(0, len(results_to_insert), chunk_size):
                    chunk = results_to_insert[i:i+chunk_size]
                    values_sql = []
                    params = {}
                    for idx, item in enumerate(chunk):
                        # Ensure string length limits just in case
                        aspect_val = str(item["aspect"])[:255]
                        opinion_val = str(item["opinion"])
                        sentiment_val = str(item["sentiment"])[:50]
                        
                        values_sql.append(f"(:r_{idx}, :a_{idx}, :o_{idx}, :s_{idx})")
                        params[f"r_{idx}"] = item["review_id"]
                        params[f"a_{idx}"] = aspect_val
                        params[f"o_{idx}"] = opinion_val
                        params[f"s_{idx}"] = sentiment_val
                        
                    query = f"INSERT INTO feedback_results (review_id, aspect, opinion, sentiment) VALUES {', '.join(values_sql)}"
                    db.execute(text(query), params)
                    db.commit()  # Commit each chunk safely
                    logging.info(f"Inserted chunk {i} to {i + len(chunk)}...")
                    
            except Exception as e:
                logging.error(f"Error during bulk insert: {e}")
                db.rollback()
                raise e
                
    # Phase 4: Update final dataset status
    with SessionLocal() as db:
        try:
            db.execute(text("UPDATE datasets SET status = 'COMPLETED' WHERE id = :dataset_id"), {"dataset_id": dataset_id})
            db.commit()
            logging.info(f"Successfully completed dataset_id: {dataset_id}")
        except Exception as e:
            logging.error(f"Error updating dataset status: {e}")
            db.rollback()
