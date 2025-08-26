import os
import statistics
import json
from recommendation import ProductRecommender

# Price tiers in INR
TIERS = {
    'budget': (400, 1700),
    'mid': (1700, 4200),
    'premium': (4200, 6800),
    'mixed': (400, 6800),
}


def summarize(label, prices, pr):
    if not prices:
        return {
            'label': label,
            'count': 0,
            'median': None,
            'in_range': 0,
            'out_of_range': 0,
            'min': None,
            'max': None,
        }
    lo, hi = pr
    in_range = sum(1 for p in prices if p is not None and lo <= p <= hi)
    out_range = len([p for p in prices if p is not None]) - in_range
    return {
        'label': label,
        'count': len(prices),
        'median': statistics.median(prices),
        'in_range': in_range,
        'out_of_range': out_range,
        'min': min(prices),
        'max': max(prices),
    }


def main():
    rec = ProductRecommender()
    results = {}
    for label, pr in TIERS.items():
        prefs = {
            'age_group': '25-34',
            'skin_concerns': ['Acne', 'Oiliness'],
            'skin_type': 'Oily',
            'price_range': list(pr),
            'ingredients': ['Salicylic Acid'],
            'avoid_ingredients': ['Fragrance'],
            'use_ai_enhancement': False,
        }
        recs = rec.recommend(prefs, num_recommendations=10)
        # Extract numeric prices from formatted string like "₹1234"
        prices = []
        for r in recs:
            price_str = str(r.get('price', '')).replace('₹', '').replace(',', '').strip()
            try:
                prices.append(float(price_str))
            except Exception:
                pass
        results[label] = summarize(label, prices, pr)
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
