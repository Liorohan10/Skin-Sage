import google.generativeai as genai
import os
import json
from typing import List, Dict, Optional
from datetime import datetime

class GeminiAI:
    def __init__(self, api_key: str = None):
        """Initialize Gemini AI service."""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("Gemini API key must be provided")
        
        genai.configure(api_key=self.api_key)
        
        # Use the latest Gemini model
        try:
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            print("✅ Gemini AI service initialized with gemini-2.0-flash-exp model")
        except Exception as e:
            print(f"Failed to initialize gemini-2.0-flash-exp, falling back to gemini-pro: {e}")
            self.model = genai.GenerativeModel('gemini-pro')
        
        # Create logs directory
        self.logs_dir = "logs"
        os.makedirs(self.logs_dir, exist_ok=True)

    def generate_ai_product_recommendations(self, user_profile: Dict, product_database: List[Dict], logic_recommendations: List[Dict]) -> List[Dict]:
        """Generate AI-enhanced product recommendations."""
        try:
            self._log_interaction('product_recommendations_request', user_profile, "Requesting AI product recommendations", metadata={
                'logic_recommendations_count': len(logic_recommendations),
                'product_database_size': len(product_database),
                'preferences': {
                    'age_group': user_profile.get('ageRange'),
                    'skin_concerns': user_profile.get('concerns'),
                    'skin_type': user_profile.get('skinType'),
                    'price_range': user_profile.get('budget'),
                    'ingredients': user_profile.get('preferredIngredients'),
                    'avoid_ingredients': user_profile.get('avoidIngredients')
                }
            })
            
            # Format products for AI analysis
            formatted_products = self._format_products_for_ai(logic_recommendations)
            
            prompt = f"""
            You are an expert skincare consultant with access to a comprehensive product database. Based on the user profile and product database, recommend the most suitable skincare products.

            User Profile:
            - Skin Type: {user_profile.get('skinType', 'Unknown')}
            - Age Range: {user_profile.get('ageRange', 'Unknown')}
            - Skin Concerns: {', '.join(user_profile.get('concerns', []))}
            - Preferred Ingredients: {', '.join(user_profile.get('preferredIngredients', []))}
            - Ingredients to Avoid: {', '.join(user_profile.get('avoidIngredients', []))}
            - Budget Range: {user_profile.get('budget', 'Unknown')}
            
            Available Products (from logic-based filtering):
            {formatted_products}
            
            Please analyze these products and recommend the top 5-10 most suitable ones for this user. For each recommendation, provide:
            1. Product name (exact match from the list)
            2. Detailed reasoning for why this product suits the user
            3. How it addresses their specific concerns
            
            Return your response as a JSON array with this format:
            [
              {{
                "name": "exact product name from list",
                "reasoning": "detailed explanation of why this product is perfect for the user"
              }}
            ]
            """
            
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Parse AI response
            ai_recommendations = self._parse_ai_recommendations(response_text, logic_recommendations)
            
            self._log_interaction('product_recommendations_success', user_profile, "AI product recommendations completed", 
                                response={'recommendations_count': len(ai_recommendations), 'recommendations': ai_recommendations[:5]},
                                metadata={'total_recommendations': len(ai_recommendations)})
            
            return ai_recommendations
            
        except Exception as e:
            self._log_interaction('product_recommendations_error', user_profile, "AI product recommendations failed", 
                                error=str(e), error_traceback=str(e))
            print(f"AI recommendation generation failed: {e}")
            return []

    def generate_skincare_routine(self, user_profile: Dict, recommended_products: List[Dict], acne_detected: bool = False) -> Dict:
        """Generate a personalized skincare routine using specific recommended products."""
        try:
            self._log_interaction('routine_generation_request', user_profile, "Requesting enhanced AI routine generation", metadata={
                'acne_detected': acne_detected,
                'recommendations_count': len(recommended_products),
                'has_image_insights': False,
                'image_analysis_quality': 'none',
                'available_products': [p.get('name', 'Unknown') for p in recommended_products[:10]]
            })
            
            # Categorize products for better routine building
            product_categories = self._categorize_products(recommended_products)
            
            # Format products for AI with categories
            formatted_products = self._format_products_for_routine_ai(recommended_products, product_categories)
            
            prompt = f"""
            You are a professional dermatologist creating a personalized skincare routine. You MUST use specific products from the available products list by their exact names.

            User Profile:
            - Skin Type: {user_profile.get('skinType', 'Unknown')}
            - Age Range: {user_profile.get('ageRange', 'Unknown')}
            - Skin Concerns: {', '.join(user_profile.get('concerns', []))}
            - Preferred Ingredients: {', '.join(user_profile.get('preferredIngredients', []))}
            - Ingredients to Avoid: {', '.join(user_profile.get('avoidIngredients', []))}
            - Acne Detected: {acne_detected}

            Available Products by Category:
            {formatted_products}

            Create a comprehensive skincare routine using ONLY the products listed above. 
            
            CRITICAL REQUIREMENTS:
            1. Use [SPECIFIC PRODUCT NAME from the list] in your instructions
            2. Provide detailed application instructions
            3. Explain timing and frequency
            4. Include product-specific benefits
            5. Each step must reference a specific product by its exact name
            6. Provide realistic timing for each step
            7. Include tips for application technique

            Return your response as JSON with this exact format:
            {{
              "morning": [
                {{
                  "step": "Cleanse",
                  "instruction": "Use [EXACT PRODUCT NAME FROM LIST] to gently cleanse your face for 60 seconds with lukewarm water. Massage in circular motions, focusing on the T-zone if you have combination skin. Rinse thoroughly and pat dry with a clean towel.",
                  "product_name": "exact product name from list",
                  "timing": "60 seconds",
                  "frequency": "daily",
                  "tips": "Focus on gentle circular motions, avoid harsh scrubbing"
                }}
              ],
              "evening": [
                {{
                  "step": "Cleanse", 
                  "instruction": "Use [EXACT PRODUCT NAME FROM LIST] to remove the day's impurities, makeup, and sunscreen. Double cleanse if wearing heavy makeup or sunscreen.",
                  "product_name": "exact product name from list",
                  "timing": "60 seconds",
                  "frequency": "daily",
                  "tips": "Take extra time to ensure all impurities are removed"
                }}
              ],
              "weekly": [
                {{
                  "step": "Exfoliate",
                  "instruction": "Use [EXACT PRODUCT NAME FROM LIST] once weekly to remove dead skin cells and improve texture. Start with once per week and adjust based on skin tolerance.",
                  "product_name": "exact product name from list",
                  "timing": "5-10 minutes",
                  "frequency": "weekly",
                  "tips": "Always follow with moisturizer and use sunscreen the next day"
                }}
              ]
            }}
            
            IMPORTANT: Every step must include a specific product name from the available products list. Do not create generic steps without specific products.
            """
            
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Parse and enhance routine
            routine = self._parse_ai_routine(response_text, recommended_products)
            
            self._log_interaction('routine_generation_success', user_profile, "Enhanced AI routine generation completed", 
                                response={
                                    'morning_steps': len(routine.get('morning', [])),
                                    'evening_steps': len(routine.get('evening', [])),
                                    'weekly_steps': len(routine.get('weekly', [])),
                                    'routine_type': 'profile_based',
                                    'product_integration_success': self._count_product_matches(routine, recommended_products),
                                    'routine_preview': {
                                        'morning': [step.get('step', 'Unknown') for step in routine.get('morning', [])[:3]],
                                        'evening': [step.get('step', 'Unknown') for step in routine.get('evening', [])[:3]]
                                    }
                                })
            
            return routine
            
        except Exception as e:
            self._log_interaction('routine_generation_error', user_profile, "AI routine generation failed", 
                                error=str(e), error_traceback=str(e))
            print(f"AI routine generation failed: {e}")
            return self._generate_fallback_routine(user_profile, recommended_products, acne_detected)

    def generate_skin_analysis(self, user_profile: Dict, acne_detections: List = None) -> str:
        """Generate comprehensive skin analysis using AI."""
        try:
            self._log_interaction('skin_analysis_request', user_profile, "Requesting enhanced AI skin analysis", metadata={
                'has_acne_detections': bool(acne_detections and len(acne_detections) > 0),
                'acne_detections_count': len(acne_detections) if acne_detections else 0,
                'has_image_insights': False,
                'image_analysis_quality': 'none'
            })
            
            acne_info = ""
            if acne_detections and len(acne_detections) > 0:
                acne_info = f"\n\nACNE DETECTION RESULTS:\nOur AI detected {len(acne_detections)} areas of concern in your facial image:\n"
                for i, detection in enumerate(acne_detections[:5]):  # Limit to 5 detections
                    acne_info += f"- {detection.get('class', 'Acne lesion')} (confidence: {detection.get('confidence', 0):.2f})\n"
                acne_info += "\nPlease incorporate these findings into your analysis."

            prompt = f"""
            You are a board-certified dermatologist providing a comprehensive skin consultation. Analyze the patient's profile and provide professional insights.

            PATIENT PROFILE:
            - Skin Type: {user_profile.get('skinType', 'Unknown')}
            - Age Range: {user_profile.get('ageRange', 'Unknown')}
            - Primary Concerns: {', '.join(user_profile.get('concerns', []))}
            - Preferred Ingredients: {', '.join(user_profile.get('preferredIngredients', []))}
            - Ingredients to Avoid: {', '.join(user_profile.get('avoidIngredients', []))}
            - Budget Considerations: {user_profile.get('budget', 'Unknown')}
            {acne_info}

            Provide a detailed, professional skin analysis that includes:
            1. Current skin condition assessment
            2. Underlying causes of their concerns
            3. How their age and skin type affect their needs
            4. Ingredient recommendations and why they work
            5. Lifestyle factors that may impact their skin
            6. Expected timeline for improvements
            7. Professional advice for long-term skin health

            Write in a warm, professional tone as if speaking directly to the patient during a consultation.
            """
            
            response = self.model.generate_content(prompt)
            analysis = response.text
            
            self._log_interaction('skin_analysis_success', user_profile, "Enhanced AI skin analysis completed", 
                                response={
                                    'analysis_length': len(analysis),
                                    'analysis_preview': analysis[:200] + "...",
                                    'analysis_type': 'profile_based'
                                })
            
            return analysis
            
        except Exception as e:
            self._log_interaction('skin_analysis_error', user_profile, "AI skin analysis failed", 
                                error=str(e), error_traceback=str(e))
            print(f"AI skin analysis failed: {e}")
            return self._generate_fallback_analysis(user_profile, acne_detections)

    def _format_products_for_ai(self, products: List[Dict]) -> str:
        """Format products for AI analysis."""
        formatted = ""
        for i, product in enumerate(products[:30], 1):  # Limit to prevent token overflow
            formatted += f"{i}. {product.get('name', 'Unknown')} ({product.get('brand', 'Unknown Brand')})\n"
            formatted += f"   Price: {product.get('price', 'Unknown')}\n"
            formatted += f"   Suitable for: {product.get('suitableFor', 'Unknown')}\n"
            formatted += f"   Key ingredients: {product.get('ingredients', 'Unknown')}\n"
            formatted += f"   Description: {product.get('description', 'No description')[:100]}...\n\n"
        return formatted

    def _format_products_for_routine_ai(self, products: List[Dict], categories: Dict) -> str:
        """Format products by category for routine generation."""
        formatted = ""
        
        for category, product_list in categories.items():
            if product_list:
                formatted += f"\n{category.upper()}:\n"
                for product in product_list[:3]:  # Limit per category
                    formatted += f"- {product.get('name', 'Unknown')}\n"
                    formatted += f"  Price: {product.get('price', 'Unknown')}\n"
                    formatted += f"  Ingredients: {product.get('ingredients', 'Unknown')}\n\n"
        
        return formatted

    def _categorize_products(self, products: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize products for better routine organization."""
        categories = {
            'cleansers': [],
            'toners': [],
            'serums': [],
            'moisturizers': [],
            'sunscreens': [],
            'treatments': [],
            'masks': []
        }
        
        for product in products:
            name = product.get('name', '').lower()
            category = product.get('category', '').lower()
            
            if any(keyword in name or keyword in category for keyword in ['cleanser', 'wash', 'foam']):
                categories['cleansers'].append(product)
            elif any(keyword in name or keyword in category for keyword in ['toner', 'essence']):
                categories['toners'].append(product)
            elif any(keyword in name or keyword in category for keyword in ['serum', 'concentrate']):
                categories['serums'].append(product)
            elif any(keyword in name or keyword in category for keyword in ['moisturizer', 'cream', 'lotion']):
                categories['moisturizers'].append(product)
            elif any(keyword in name or keyword in category for keyword in ['sunscreen', 'spf', 'sun protection']):
                categories['sunscreens'].append(product)
            elif any(keyword in name or keyword in category for keyword in ['mask', 'peel']):
                categories['masks'].append(product)
            else:
                categories['treatments'].append(product)
        
        return categories

    def _parse_ai_recommendations(self, response_text: str, logic_recommendations: List[Dict]) -> List[Dict]:
        """Parse AI recommendations and match with actual products."""
        try:
            # Clean response text
            cleaned_text = response_text.strip()
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            
            # Parse JSON
            ai_recs = json.loads(cleaned_text)
            
            # Match AI recommendations with actual products
            matched_recommendations = []
            for ai_rec in ai_recs:
                ai_name = ai_rec.get('name', '').lower()
                
                # Find matching product from logic recommendations
                for logic_product in logic_recommendations:
                    logic_name = logic_product.get('name', '').lower()
                    
                    # Fuzzy matching
                    if (ai_name in logic_name or logic_name in ai_name or 
                        any(word in logic_name for word in ai_name.split() if len(word) > 3)):
                        
                        # Create enhanced product with AI reasoning
                        enhanced_product = logic_product.copy()
                        enhanced_product['ai_reasoning'] = ai_rec.get('reasoning', '')
                        
                        # Update match reasons with AI insights
                        if 'matchReasons' not in enhanced_product:
                            enhanced_product['matchReasons'] = []
                        enhanced_product['matchReasons'].insert(0, ai_rec.get('reasoning', ''))
                        
                        matched_recommendations.append(enhanced_product)
                        break
            
            return matched_recommendations
            
        except Exception as e:
            print(f"Error parsing AI recommendations: {e}")
            return logic_recommendations[:10]  # Fallback to logic recommendations

    def _parse_ai_routine(self, response_text: str, recommended_products: List[Dict]) -> Dict:
        """Parse AI routine response and match products."""
        try:
            # Clean response text
            cleaned_text = response_text.strip()
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            
            # Parse JSON
            routine_data = json.loads(cleaned_text)
            
            # Enhance routine steps with actual product objects
            enhanced_routine = {}
            
            for period in ['morning', 'evening', 'weekly']:
                if period in routine_data:
                    enhanced_steps = []
                    for step in routine_data[period]:
                        enhanced_step = step.copy()
                        
                        # Find matching product
                        product_name = step.get('product_name', '')
                        if product_name:
                            matching_product = self._find_matching_product(product_name, recommended_products)
                            if matching_product:
                                enhanced_step['product'] = matching_product
                        
                        enhanced_steps.append(enhanced_step)
                    
                    enhanced_routine[period] = enhanced_steps
            
            return enhanced_routine
            
        except Exception as e:
            print(f"Error parsing AI routine: {e}")
            return self._generate_fallback_routine(None, recommended_products, False)

    def _find_matching_product(self, product_name: str, products: List[Dict]) -> Optional[Dict]:
        """Find matching product from the list."""
        product_name_lower = product_name.lower()
        
        # Try exact match first
        for product in products:
            if product.get('name', '').lower() == product_name_lower:
                return product
        
        # Try partial match
        for product in products:
            product_name_in_list = product.get('name', '').lower()
            if (product_name_lower in product_name_in_list or 
                product_name_in_list in product_name_lower or
                any(word in product_name_in_list for word in product_name_lower.split() if len(word) > 3)):
                return product
        
        return None

    def _count_product_matches(self, routine: Dict, products: List[Dict]) -> int:
        """Count how many routine steps have matched products."""
        count = 0
        for period in ['morning', 'evening', 'weekly']:
            if period in routine:
                for step in routine[period]:
                    if isinstance(step, dict) and step.get('product'):
                        count += 1
        return count

    def _generate_fallback_routine(self, user_profile: Dict, products: List[Dict], acne_detected: bool) -> Dict:
        """Generate fallback routine when AI fails."""
        # Categorize products
        categories = self._categorize_products(products)
        
        morning_routine = []
        evening_routine = []
        
        # Morning routine
        if categories['cleansers']:
            morning_routine.append({
                'step': 'Cleanse',
                'instruction': f"Use {categories['cleansers'][0]['name']} to gently cleanse your face with lukewarm water for 60 seconds.",
                'product': categories['cleansers'][0]
            })
        
        if categories['serums']:
            morning_routine.append({
                'step': 'Treat',
                'instruction': f"Apply {categories['serums'][0]['name']} to target your specific skin concerns.",
                'product': categories['serums'][0]
            })
        
        if categories['moisturizers']:
            morning_routine.append({
                'step': 'Moisturize',
                'instruction': f"Apply {categories['moisturizers'][0]['name']} to hydrate and protect your skin barrier.",
                'product': categories['moisturizers'][0]
            })
        
        if categories['sunscreens']:
            morning_routine.append({
                'step': 'Protect',
                'instruction': f"Apply {categories['sunscreens'][0]['name']} for broad-spectrum sun protection.",
                'product': categories['sunscreens'][0]
            })
        
        # Evening routine
        if categories['cleansers']:
            evening_routine.append({
                'step': 'Cleanse',
                'instruction': f"Use {categories['cleansers'][0]['name']} to remove the day's impurities and prepare for treatments.",
                'product': categories['cleansers'][0]
            })
        
        if len(categories['serums']) > 1:
            evening_routine.append({
                'step': 'Treat',
                'instruction': f"Apply {categories['serums'][1]['name']} for overnight skin repair and regeneration.",
                'product': categories['serums'][1]
            })
        
        if categories['moisturizers']:
            evening_routine.append({
                'step': 'Moisturize',
                'instruction': f"Apply {categories['moisturizers'][0]['name']} for overnight hydration and repair.",
                'product': categories['moisturizers'][0]
            })
        
        return {
            'morning': morning_routine,
            'evening': evening_routine,
            'weekly': []
        }

    def _generate_fallback_analysis(self, user_profile: Dict, acne_detections: List = None) -> str:
        """Generate fallback skin analysis."""
        skin_type = user_profile.get('skinType', 'Unknown')
        age_range = user_profile.get('ageRange', 'Unknown')
        concerns = user_profile.get('concerns', [])
        
        analysis = f"Based on your {skin_type} skin type and age range ({age_range}), "
        
        if concerns:
            analysis += f"your primary concerns include {', '.join(concerns)}. "
        
        if acne_detections and len(acne_detections) > 0:
            analysis += f"Our AI analysis detected {len(acne_detections)} areas requiring attention. "
        
        analysis += "We recommend maintaining a consistent skincare routine with products specifically chosen for your skin's unique needs."
        
        return analysis

    def _log_interaction(self, interaction_type: str, user_profile: Dict, query: str, 
                        response: Dict = None, error: str = None, error_traceback: str = None, 
                        metadata: Dict = None):
        """Log AI interactions for debugging and improvement."""
        try:
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'interaction_type': interaction_type,
                'user_profile': user_profile,
                'query': query,
                'response': response,
                'error': error,
                'error_traceback': error_traceback,
                'metadata': metadata or {}
            }
            
            # Create log file name based on date
            log_file = f"gemini_ai_interactions_{datetime.now().strftime('%Y%m%d')}.json"
            log_path = os.path.join(self.logs_dir, log_file)
            
            # Load existing logs or create new list
            if os.path.exists(log_path):
                with open(log_path, 'r', encoding='utf-8') as f:
                    logs = json.load(f)
            else:
                logs = []
            
            # Add new entry
            logs.append(log_entry)
            
            # Save updated logs
            with open(log_path, 'w', encoding='utf-8') as f:
                json.dump(logs, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            print(f"Failed to log interaction: {e}")