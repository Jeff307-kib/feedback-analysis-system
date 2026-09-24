import logging
from pyabsa import AspectSentimentTripletExtraction as ASTE
import warnings

# Suppress warnings from PyABSA / Transformers
warnings.filterwarnings("ignore")

logging.info("Loading PyABSA Pre-trained ASTE Model (This may take a minute on first startup)...")
try:
    # Initialize the predictor globally so it only loads once into memory.
    triplet_extractor = ASTE.AspectSentimentTripletExtractor(checkpoint='english')
    logging.info("PyABSA ASTE Model loaded successfully.")
except Exception as e:
    logging.error(f"Failed to load PyABSA model: {e}")
    triplet_extractor = None

def analyze_text(text: str) -> list[dict]:
    """
    Analyzes a given text and extracts [Aspect, Opinion, Sentiment] triplets.
    Returns a list of dictionaries.
    """
    if not text or not str(text).strip():
        return []
        
    text = str(text)
    results = []
    
    if triplet_extractor:
        try:
            # PyABSA inference
            res = triplet_extractor.predict(text)
            
            # The exact format of `res` depends on the PyABSA version.
            # Typically it returns a dictionary with 'Triplets'
            triplets = res.get('Triplets', []) if isinstance(res, dict) else res
            
            # PyABSA might return strings like "Negative", "Positive", "Neutral" or "NEG", "POS", "NEU"
            sentiment_map = {
                "POS": "Positive", "POSITIVE": "Positive", 
                "NEG": "Negative", "NEGATIVE": "Negative", 
                "NEU": "Neutral", "NEUTRAL": "Neutral"
            }
            
            for item in triplets:
                # Handle varying triplet formats from PyABSA
                # Format 1: ['aspect', 'opinion', 'sentiment']
                if isinstance(item, list) or isinstance(item, tuple):
                    if len(item) >= 3:
                        aspect = str(item[0])
                        opinion = str(item[1])
                        sentiment_raw = str(item[2]).upper()
                        sentiment = sentiment_map.get(sentiment_raw, sentiment_raw.capitalize())
                        
                        results.append({
                            "aspect": aspect,
                            "opinion": opinion,
                            "sentiment": sentiment
                        })
                # Format 2: {'Aspect': '...', 'Opinion': '...', 'Polarity': '...'} or lowercase versions
                elif isinstance(item, dict):
                    aspect = str(item.get('Aspect') or item.get('aspect') or 'general')
                    opinion = str(item.get('Opinion') or item.get('opinion') or '')
                    sentiment_raw = str(item.get('Polarity') or item.get('sentiment') or 'Neutral').upper()
                    sentiment = sentiment_map.get(sentiment_raw, sentiment_raw.capitalize())
                    
                    results.append({
                        "aspect": aspect,
                        "opinion": opinion,
                        "sentiment": sentiment
                    })
        except Exception as e:
            logging.error(f"Error during PyABSA predict on text '{text[:20]}...': {e}")
            
    # Fallback Mechanism:
    # If the model failed to extract any triplets (or model failed to load),
    # we still need to record the feedback in the system so it's not "lost".
    if not results:
        results.append({
            "aspect": "general",
            "opinion": "no specific opinion detected",
            "sentiment": "Neutral"
        })
        
    return results
