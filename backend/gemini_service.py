import google.generativeai as genai
import os
import json
import datetime
import traceback
import re  # For regular expression pattern matching
from typing import Dict, List, Optional
from dotenv import load_dotenv
import base64
from PIL import Image
import io

# Load environment variables
load_dotenv()

class GeminiAIService:
    def __init__(self):
        """Initialize Gemini AI service with API key."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            raise ValueError("Please set a valid GEMINI_API_KEY in your .env file")
        
        genai.configure(api_key=api_key)
        
        # Try different model names in order of preference
        model_names = [
            'gemini-2.5-pro',       # Latest Pro model with advanced capabilities
            'gemini-2.0-flash-exp',  # Experimental model with advanced vision
            'gemini-1.5-pro',       # High-quality Pro model with vision
            'gemini-1.5-flash',     # Fallback to 1.5 flash with vision
            'gemini-pro-vision',    # Legacy vision model
            'gemini-pro'            # Text-only fallback
        ]
        
        self.model = None
        for model_name in model_names:
            try:
                self.model = genai.GenerativeModel(model_name)
                print(f"✅ Gemini AI service initialized with {model_name} model")
                break
            except Exception as e:
                print(f"Failed to load {model_name}: {e}")
                continue
        
        if not self.model:
            raise ValueError("Failed to initialize any Gemini model")

    def generate_skin_analysis(self, user_profile: Dict, acne_detections: List = None, image_insights: Dict = None) -> str:
        """Generate highly detailed and personalized skin analysis using Gemini Pro with comprehensive context."""
        try:
            # Prepare comprehensive context for AI with all available data
            context = f"""
            You are an expert dermatologist conducting a comprehensive skin consultation. You have access to:
            
            PATIENT PROFILE:
            - Skin Type: {user_profile.get('skinType', 'Unknown')}
            - Age: {user_profile.get('ageRange', 'Unknown')}
            - Primary Concerns: {', '.join(user_profile.get('concerns', []))}
            - Preferred Ingredients: {', '.join(user_profile.get('preferredIngredients', []))}
            - Ingredients to Avoid: {', '.join(user_profile.get('avoidIngredients', []))}
            - Budget Range: {user_profile.get('budget', 'Unknown')}
            """

            # Add CV/YOLO detection results if available
            if acne_detections and len(acne_detections) > 0:
                context += f"""
                
                COMPUTER VISION ANALYSIS:
                - AI Acne Detection: {len(acne_detections)} active acne lesions detected
                - Acne Distribution: Areas of concern identified across facial regions
                - Severity Assessment: Active breakouts requiring targeted treatment
                """

            # Add detailed image insights if available
            if image_insights:
                context += f"""
                
                VISUAL EXAMINATION FINDINGS:
                - Skin Texture: {image_insights.get('texture', 'Not analyzed')}
                - Pore Visibility: {image_insights.get('pores', 'Not analyzed')}
                - Pigmentation: {image_insights.get('pigmentation', 'Not analyzed')}
                - Oil Distribution: {image_insights.get('oil_distribution', 'Not analyzed')}
                - Overall Skin Health: {image_insights.get('overall_health', 'Not analyzed')}
                """

            prompt = f"""
            {context}

            Based on this comprehensive data, provide a detailed professional skin analysis that addresses:

            1. DETAILED SKIN CONDITION ASSESSMENT:
            - Analyze the specific combination of their skin type, age, and detected issues
            - Explain how the computer vision findings align with their reported concerns
            - Discuss the relationship between their skin type and current manifestations

            2. PERSONALIZED INSIGHTS:
            - Address their specific ingredient preferences and explain why these work for their condition
            - Explain potential triggers or factors contributing to their current skin state
            - Provide age-specific considerations for their skin journey

            3. PROFESSIONAL OBSERVATIONS:
            - Comment on the severity and distribution of detected skin issues
            - Explain what the visual analysis reveals about their skin barrier function
            - Identify priority areas that need immediate attention

            4. ENCOURAGING GUIDANCE:
            - Acknowledge their proactive approach to skincare
            - Explain realistic expectations and timeline for improvement
            - Provide reassurance about the treatability of their concerns

            Write this as a detailed consultation note - be specific, avoid generic statements, and reference the actual data provided. Keep the tone professional yet encouraging, as if speaking directly to the patient during an office visit.
            """

            response = self.model.generate_content(prompt)
            # Clean up any asterisks that might appear
            cleaned_text = response.text.replace('*', '').replace('#', '').strip()
            return cleaned_text

        except Exception as e:
            print(f"Error generating detailed skin analysis: {e}")
            return self._fallback_skin_analysis(user_profile, acne_detections)

    def generate_skincare_routine(self, user_profile: Dict, recommended_products: List[Dict], acne_detected: bool = False, image_insights: Dict = None) -> Dict:
        """Generate highly personalized skincare routine with explicit product integration."""
        try:
            # Prepare detailed product information for AI
            products_by_category = self._categorize_products(recommended_products)
            
            # Debug: Print categorized products
            print(f"DEBUG: Categorized products:")
            for category, prods in products_by_category.items():
                if prods:
                    print(f"  {category}: {len(prods)} products")
                    for prod in prods[:2]:  # Show first 2 products in each category
                        print(f"    - {prod.get('name', 'Unknown')}")
            
            # Prepare comprehensive context
            context = f"""
            You are creating a personalized skincare routine for a patient with:
            
            PATIENT PROFILE:
            - Skin Type: {user_profile.get('skinType', 'Unknown')}
            - Age: {user_profile.get('ageRange', 'Unknown')}
            - Primary Concerns: {', '.join(user_profile.get('concerns', []))}
            - Preferred Ingredients: {', '.join(user_profile.get('preferredIngredients', []))}
            - Avoid Ingredients: {', '.join(user_profile.get('avoidIngredients', []))}
            - Budget: {user_profile.get('budget', 'Unknown')}
            {"- ACNE DETECTED: Active acne lesions found in skin scan" if acne_detected else ""}
            
            AVAILABLE PRODUCTS BY CATEGORY:
            """

            # Add categorized products
            for category, products in products_by_category.items():
                context += f"\n{category.upper()}:\n"
                for product in products:
                    context += f"- {product.get('name', 'Unknown')} | Brand: {product.get('brand', 'Unknown')} | Price: ₹{product.get('price', 'N/A')} | For: {product.get('suitableFor', 'All skin types')}\n"

            # Add image insights if available
            if image_insights:
                context += f"""
                
                VISUAL EXAMINATION FINDINGS:
                - Skin needs immediate attention for: {image_insights.get('priority_areas', 'General care')}
                - Visible conditions requiring treatment: {image_insights.get('visible_conditions', 'None specified')}
                - Recommended focus areas: {image_insights.get('focus_areas', 'Maintenance')}
                """

            prompt = f"""
            {context}

            You are creating a personalized skincare routine with step-by-step instructions using the SPECIFIC PRODUCTS listed above. Your goal is to create a routine that tells the user exactly what to do with each recommended product.

            IMPORTANT: 
            1. Use ONLY the products from the AVAILABLE PRODUCTS list above
            2. Create detailed ACTIONS and INSTRUCTIONS for each product
            3. Match products to appropriate routine steps based on their type and ingredients

            Use this format for each step:
            "Action (Timing): Use [SPECIFIC PRODUCT NAME from the list above] by [detailed instructions on how to apply]. [Explain why this specific product helps their skin concerns]."

            Example format:
            "Cleanse (60 seconds): Use the CeraVe Foaming Facial Cleanser by applying a small amount to damp skin, massage gently in circular motions for 60 seconds focusing on the T-zone, then rinse thoroughly. This gentle cleanser removes overnight oil buildup without stripping your combination skin."

            Create a comprehensive morning and evening skincare routine using ONLY the recommended products listed above:

            REQUIRED FORMAT:
            
            ```json
            {{
              "morningRoutine": [
                "Cleanse (60 seconds): Use [EXACT PRODUCT NAME from list] by applying to damp skin, massaging gently for 60 seconds, then rinse thoroughly. This [specific product] helps [why it's good for their skin type/concerns].",
                "Tone (30 seconds): Apply [EXACT PRODUCT NAME from list] using a cotton pad or clean hands, gently patting onto skin. This [specific product] [benefits for their skin].",
                "Treat (Wait 1 minute): Apply 2-3 drops of [EXACT PRODUCT NAME from list] focusing on areas of concern. This serum addresses [specific concerns] with [key ingredients].",
                "Moisturize (Wait 2 minutes): Apply [EXACT PRODUCT NAME from list] using upward motions across face and neck. This moisturizer provides [specific benefits for their skin type].",
                "Protect (Apply 15 mins before sun): Apply [EXACT PRODUCT NAME from list] generously using the two-finger rule. This sunscreen offers [specific protection level and benefits]."
              ],
              "nightRoutine": [
                "Double Cleanse (60 seconds): First use [EXACT PRODUCT NAME from list] on dry skin for 30 seconds, then follow with [EXACT PRODUCT NAME from list] for thorough cleansing.",
                "Tone (30 seconds): Apply [EXACT PRODUCT NAME from list] with gentle patting motions to prepare skin for night treatments.",
                "Treat (Wait 1 minute): Apply [EXACT PRODUCT NAME from list] focusing on skin repair and [specific concerns]. This product contains [key ingredients] for overnight treatment.",
                "Moisturize (Wait 2 minutes): Apply [EXACT PRODUCT NAME from list] in gentle upward strokes. This night formula supports skin repair with [specific ingredients].",
                "Eye Care (Before bed): Apply [EXACT PRODUCT NAME from list] around the orbital bone using ring finger if available in product list."
              ]
            }}
            ```

            CRITICAL REQUIREMENTS:
            - Use ONLY products from the AVAILABLE PRODUCTS list provided above
            - Match products to steps based on their category (cleanser for cleansing, serum for treatment, etc.)
            - If no product in a category is available, use the closest suitable product and explain the substitution
            - Include specific product names in EVERY step
            - Explain why each specific product benefits their {user_profile.get('skinType', 'Unknown')} skin type
            - Address their specific concerns: {', '.join(user_profile.get('concerns', []))}
            - Include detailed application instructions for each product
            """
            response = self.model.generate_content(prompt)
            return self._parse_ai_routine(response.text, recommended_products)

        except Exception as e:
            print(f"Error generating personalized routine: {e}")
            return self._fallback_routine(user_profile, recommended_products, acne_detected)

    def analyze_skin_image(self, image_data: bytes, user_profile: Dict) -> Dict:
        """Analyze skin image using Gemini Vision and provide comprehensive structured insights."""
        try:
            # Convert image data to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Enhanced context with detailed analysis requirements
            context = f"""
            You are an expert dermatologist with advanced training in visual skin analysis. You are examining a facial photograph for detailed skin assessment.

            PATIENT BACKGROUND:
            - Self-reported skin type: {user_profile.get('skinType', 'Unknown')}
            - Age range: {user_profile.get('ageRange', 'Unknown')}
            - Primary concerns: {', '.join(user_profile.get('concerns', []))}
            - Preferred ingredients: {', '.join(user_profile.get('preferredIngredients', []))}
            - Ingredients to avoid: {', '.join(user_profile.get('avoidIngredients', []))}
            - Budget consideration: {user_profile.get('budget', 'Unknown')}
            """

            prompt = f"""
            {context}

            Please conduct a comprehensive visual examination of this facial skin image. Provide detailed observations in the following structured format:

            OVERALL SKIN ASSESSMENT:
            [Describe the general condition, health, and appearance of the skin]

            SKIN TYPE VERIFICATION:
            [Compare what you observe with their self-reported skin type - does it align? What do you actually see?]

            DETAILED OBSERVATIONS:
            - Texture: [smooth, rough, uneven, porous, etc.]
            - Pore visibility: [size, distribution, congestion level]
            - Oil distribution: [T-zone, cheeks, overall sebum levels]
            - Pigmentation: [evenness, dark spots, discoloration areas]
            - Acne/blemishes: [count, severity, distribution, types]
            - Signs of aging: [fine lines, wrinkles, elasticity]
            - Inflammation: [redness, irritation, sensitivity signs]
            - Barrier health: [hydration levels, dryness, flaking]

            CONCERN VALIDATION:
            [Address each of their stated concerns - do you see evidence of these issues? Rate severity]

            PRIORITY TREATMENT AREAS:
            [Identify the 2-3 most important areas that need immediate attention]

            PROFESSIONAL INSIGHTS:
            [What does this visual examination tell you about their skincare routine effectiveness, lifestyle factors, or potential underlying issues?]

            INGREDIENT COMPATIBILITY:
            [Based on what you observe, comment on their ingredient preferences and what they should avoid]

            Provide specific, detailed observations rather than generic descriptions. Reference actual visual evidence from the image.
            """

            response = self.model.generate_content([prompt, image])
            
            # Parse the structured response into a dictionary
            analysis_text = response.text.replace('*', '').replace('#', '').strip()
            
            # Extract structured insights (simplified parsing - could be enhanced with regex)
            insights = self._parse_image_analysis(analysis_text)
            
            # Return both the full text and structured insights
            return {
                'full_analysis': analysis_text,
                'structured_insights': insights,
                'analysis_quality': 'detailed_vision_analysis'
            }

        except Exception as e:
            print(f"Error analyzing skin image: {e}")
            return {
                'full_analysis': self._fallback_skin_analysis(user_profile, None),
                'structured_insights': {},
                'analysis_quality': 'fallback'
            }

    def _parse_image_analysis(self, analysis_text: str) -> Dict:
        """Parse the structured analysis into key insights for routine generation."""
        insights = {}
        
        try:
            # Simple keyword extraction (could be enhanced with more sophisticated NLP)
            text_lower = analysis_text.lower()
            
            # Extract texture information
            if 'rough' in text_lower or 'uneven' in text_lower:
                insights['texture'] = 'rough_uneven'
            elif 'smooth' in text_lower:
                insights['texture'] = 'smooth'
            else:
                insights['texture'] = 'mixed'
            
            # Extract pore information
            if 'large pore' in text_lower or 'enlarged pore' in text_lower:
                insights['pores'] = 'enlarged'
            elif 'clogged' in text_lower or 'congested' in text_lower:
                insights['pores'] = 'congested'
            else:
                insights['pores'] = 'normal'
            
            # Extract oil information
            if 'oily' in text_lower or 'sebum' in text_lower or 'greasy' in text_lower:
                insights['oil_distribution'] = 'oily_areas_detected'
            elif 'dry' in text_lower or 'dehydrated' in text_lower:
                insights['oil_distribution'] = 'dry_areas_detected'
            else:
                insights['oil_distribution'] = 'balanced'
            
            # Extract pigmentation issues
            if 'dark spot' in text_lower or 'hyperpigmentation' in text_lower or 'discoloration' in text_lower:
                insights['pigmentation'] = 'uneven_pigmentation'
            else:
                insights['pigmentation'] = 'even_toned'
            
            # Extract priority areas
            priority_areas = []
            if 'acne' in text_lower or 'blemish' in text_lower:
                priority_areas.append('acne_treatment')
            if 'hydration' in text_lower or 'moisture' in text_lower:
                priority_areas.append('hydration')
            if 'pigmentation' in text_lower or 'dark spot' in text_lower:
                priority_areas.append('pigmentation')
            
            insights['priority_areas'] = ', '.join(priority_areas) if priority_areas else 'general_care'
            
            # Overall health assessment
            if 'healthy' in text_lower and 'good' in text_lower:
                insights['overall_health'] = 'good_condition'
            elif 'concern' in text_lower or 'issue' in text_lower:
                insights['overall_health'] = 'needs_attention'
            else:
                insights['overall_health'] = 'moderate_condition'
                
        except Exception as e:
            print(f"Error parsing image analysis: {e}")
        
        return insights

    def generate_routine_from_image(self, image_data: bytes, user_profile: Dict, recommended_products: List[Dict]) -> Dict:
        """Generate skincare routine based on image analysis with natural AI approach."""
        try:
            # Convert image data to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Prepare product information for AI
            products_info = []
            for product in recommended_products[:10]:  # Limit to top 10 products
                products_info.append({
                    'name': product.get('name', ''),
                    'description': product.get('description', '')[:100],
                    'ingredients': product.get('ingredients', '')[:100],
                    'suitable_for': product.get('suitableFor', ''),
                    'price': product.get('price', '')
                })

            context = f"""
            You're looking at someone's face and creating a personalized skincare routine based on what you can see.

            About this person:
            - Skin Type: {user_profile.get('skinType', 'Unknown')}
            - Age: {user_profile.get('ageRange', 'Unknown')}
            - Concerns: {', '.join(user_profile.get('concerns', []))}
            - Budget: {user_profile.get('budget', 'Unknown')}

            Available Products:
            {json.dumps(products_info, indent=2)}
            """

            prompt = f"""
            {context}

            Based on what you can see in this image and what you know about this person, create a personalized skincare routine using the available products.

            Create both morning and evening routines. Use the product names from the list and explain why each step is important based on what you observe.

            Format like this:
            MORNING ROUTINE:
            1. [Step] - [Instructions based on what you see]
            2. [Step] - [Instructions based on what you see]

            EVENING ROUTINE:
            1. [Step] - [Instructions based on what you see]
            2. [Step] - [Instructions based on what you see]

            Focus on what this person's skin actually needs based on your visual assessment.
            """

            response = self.model.generate_content([prompt, image])
            return self._parse_ai_routine(response.text, recommended_products)

        except Exception as e:
            print(f"Error generating routine from image: {e}")
            return self._fallback_routine(user_profile, recommended_products, False)

    def _parse_ai_routine(self, ai_response: str, products: List[Dict]) -> Dict:
        """Parse AI response into structured routine format."""
        try:
            print(f"Parsing AI response: {ai_response[:200]}...")  # Debug log
            
            # Clean up the entire response to remove any asterisks
            ai_response = ai_response.replace('**', '').replace('*', '')
            
            routine = {
                'morning': [],
                'evening': [],
                'weekly': []
            }
            
            # Handle case where the response might be in JSON format
            try:
                # Check if response is valid JSON
                if ai_response.strip().startswith('{') and ai_response.strip().endswith('}'):
                    json_routine = json.loads(ai_response)
                    
                    # Extract routine sections from JSON
                    if 'morningRoutine' in json_routine and isinstance(json_routine['morningRoutine'], list):
                        for i, step in enumerate(json_routine['morningRoutine']):
                            if isinstance(step, str):
                                # No need to clean up markdown formatting here as it's already done
                                
                                # Determine step name and instruction
                                step_name = f"Step {i+1}"
                                instruction = step
                                
                                # Look for common step name patterns with timing info
                                # Example: "Cleanse (60 seconds): Use..."
                                step_pattern = r"^([A-Za-z\s]+)(\([^)]+\))?:(.+)$"
                                match = re.search(step_pattern, step)
                                if match:
                                    action = match.group(1).strip()
                                    timing = match.group(2) or ""  # This will be like "(60 seconds)" or ""
                                    action_with_timing = f"{action} {timing}".strip()
                                    step_name = action_with_timing
                                    instruction = match.group(3).strip()
                                else:
                                    # Fall back to simple splitting
                                    step_patterns = ["Cleanse:", "Tone:", "Treat:", "Moisturize:", "Protect:", "Double Cleanse:", "Hydrate:"]
                                    for pattern in step_patterns:
                                        if pattern in step:
                                            parts = step.split(':', 1)
                                            if len(parts) == 2:
                                                step_name = parts[0].strip()
                                                instruction = parts[1].strip()
                                                break
                                
                                # Match with a product
                                matched_product = self._match_product_to_step(instruction, products)
                                
                                routine_step = {
                                    'step': step_name,
                                    'instruction': instruction,
                                    'product': matched_product
                                }
                                
                                routine['morning'].append(routine_step)
                                print(f"Added step to morning from JSON: {step_name}")
                                
                    # Same for evening routine
                    if 'nightRoutine' in json_routine and isinstance(json_routine['nightRoutine'], list):
                        for i, step in enumerate(json_routine['nightRoutine']):
                            if isinstance(step, str):
                                # Clean up markdown formatting
                                step = step.replace('**', '').replace('*', '')
                                
                                # Determine step name and instruction
                                step_name = f"Step {i+1}"
                                instruction = step
                                
                                # Look for common step name patterns with timing info
                                # Example: "Double Cleanse (60 seconds): Use..."
                                step_pattern = r"^([A-Za-z\s]+)(\([^)]+\))?:(.+)$"
                                match = re.search(step_pattern, step)
                                if match:
                                    action = match.group(1).strip()
                                    timing = match.group(2) or ""  # This will be like "(60 seconds)" or ""
                                    action_with_timing = f"{action} {timing}".strip()
                                    step_name = action_with_timing
                                    instruction = match.group(3).strip()
                                else:
                                    # Fall back to simple splitting
                                    step_patterns = ["Double Cleanse:", "Cleanse:", "Tone:", "Treat:", "Moisturize:", "Optional:", "Hydrate:"]
                                    for pattern in step_patterns:
                                        if pattern in step:
                                            parts = step.split(':', 1)
                                            if len(parts) == 2:
                                                step_name = parts[0].strip()
                                                instruction = parts[1].strip()
                                                break
                                
                                # Match with a product
                                matched_product = self._match_product_to_step(instruction, products)
                                
                                routine_step = {
                                    'step': step_name,
                                    'instruction': instruction,
                                    'product': matched_product
                                }
                                
                                routine['evening'].append(routine_step)
                                print(f"Added step to evening from JSON: {step_name}")
                    
                    # If we successfully processed JSON, return the routine
                    if routine['morning'] or routine['evening']:
                        return routine
            except json.JSONDecodeError:
                # Not valid JSON, continue with text parsing
                print("Response is not valid JSON, parsing as text")
            except Exception as e:
                print(f"Error parsing JSON routine: {e}")

            # Split response into lines and process as text
            lines = ai_response.split('\n')
            current_section = None

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Identify section headers with broader matching
                line_upper = line.upper()
                if any(term in line_upper for term in ['MORNING ROUTINE', 'MORNING:', 'AM ROUTINE', 'DAYTIME']):
                    current_section = 'morning'
                    continue
                elif any(term in line_upper for term in ['EVENING ROUTINE', 'EVENING:', 'PM ROUTINE', 'NIGHT ROUTINE', 'NIGHTTIME']):
                    current_section = 'evening'
                    continue
                elif any(term in line_upper for term in ['WEEKLY TREATMENT', 'WEEKLY:', 'WEEKLY ROUTINE', 'OCCASIONAL']):
                    current_section = 'weekly'
                    continue

                # Parse steps with different formats:
                # 1. Numbered (1., 2., etc.)
                # 2. Bullet points (-, •)
                # 3. Step prefix (Step 1:, Step 2:)
                # 4. Action prefixes (Cleanse:, Tone:, etc.)
                if current_section and (
                    any(line.startswith(f"{i}.") for i in range(1, 10)) or
                    line.startswith(('- ', '• ', '* ')) or
                    line.lower().startswith(('step ', 'cleanse', 'tone', 'treat', 'moistur', 'protect', 'apply', 'double cleanse', 'exfoliate', 'mask'))
                ):
                    # Clean up the line
                    cleaned_line = line
                    
                    # Remove bullets and numbers
                    if any(line.startswith(f"{i}.") for i in range(1, 10)):
                        cleaned_line = line[line.index('.')+1:].strip()
                    elif any(line.startswith(prefix) for prefix in ['- ', '• ', '* ']):
                        cleaned_line = line[2:].strip()
                    
                    # Determine step name and instruction
                    step_name = f"Step {len(routine[current_section]) + 1}"
                    instruction = cleaned_line
                    
                    # Handle colon-separated format (e.g., "Cleanse: Use gentle cleanser")
                    if ':' in cleaned_line and not cleaned_line.startswith('http'):  # Avoid URLs
                        parts = cleaned_line.split(':', 1)
                        if len(parts) == 2:
                            potential_name = parts[0].strip()
                            if len(potential_name) < 30:  # Avoid using long text as step name
                                step_name = potential_name
                                instruction = parts[1].strip()
                    
                    # Handle dash-separated format (e.g., "Cleanse - Use gentle cleanser")
                    elif ' - ' in cleaned_line:
                        parts = cleaned_line.split(' - ', 1)
                        if len(parts) == 2:
                            potential_name = parts[0].strip()
                            if len(potential_name) < 30:  # Avoid using long text as step name
                                step_name = potential_name
                                instruction = parts[1].strip()
                    
                    # Try to match with a product
                    matched_product = self._match_product_to_step(instruction, products)
                    
                    routine_step = {
                        'step': step_name.strip(),
                        'instruction': instruction.strip(),
                        'product': matched_product
                    }
                    
                    routine[current_section].append(routine_step)
                    print(f"Added step to {current_section}: {step_name}")  # Debug log

            print(f"Parsed routine: Morning={len(routine['morning'])}, Evening={len(routine['evening'])}, Weekly={len(routine['weekly'])}")  # Debug log
            
            # If parsing failed, use fallback
            if not routine['morning'] and not routine['evening']:
                print("AI parsing failed, using fallback routine")
                return self._fallback_routine({}, products, False)
            
            # Ensure the structure is consistent
            for section in ['morning', 'evening', 'weekly']:
                for step in routine[section]:
                    # Ensure step has all required fields
                    if not step.get('step'):
                        step['step'] = 'Step'
                    if not step.get('instruction'):
                        step['instruction'] = 'Apply product as directed'
            
            return routine

        except Exception as e:
            print(f"Error parsing AI routine: {e}")
            return self._fallback_routine({}, products, False)

    def _match_product_to_step(self, step_text: str, products: List[Dict]) -> Optional[Dict]:
        """Try to match a routine step with a specific product."""
        if not products or not step_text:
            return None
            
        step_lower = step_text.lower()
        
        # First, try to find products mentioned in brackets like "Use [Product Name]"
        import re
        bracket_pattern = r'\[([^\]]+)\]'
        bracket_matches = re.findall(bracket_pattern, step_text)
        
        for bracket_text in bracket_matches:
            bracket_lower = bracket_text.lower()
            for product in products:
                if not product.get('name'):
                    continue
                product_name = product.get('name', '').lower()
                if product_name in bracket_lower or bracket_lower in product_name:
                    print(f"Bracket match found: '{product_name}' matches '{bracket_text}'")
                    return product
        
        # Second, try to find exact product name mentions
        for product in products:
            if not product.get('name'):
                continue
                
            product_name = product.get('name', '').lower()
            
            # Direct product name match (highest priority)
            if product_name in step_lower:
                print(f"Direct match found: '{product_name}' in step '{step_text[:30]}...'")
                return product
                
            # Check if significant words from product name are in the step
            product_words = [word for word in product_name.split() if len(word) > 3]
            for word in product_words:
                if word in step_lower:
                    print(f"Word match found: '{word}' from '{product_name}' in step '{step_text[:30]}...'")
                    return product
        
        # Product type keywords - comprehensive with categories
        product_categories = {
            'cleanser': ['cleanse', 'wash', 'clean', 'foam', 'gel cleanser', 'face wash', 'cleansing', 'purifying', 'micellar'],
            'moisturizer': ['moisturiz', 'hydrat', 'cream', 'lotion', 'moisture', 'hydrating', 'emollient'],
            'serum': ['serum', 'essence', 'treatment', 'concentrate', 'booster', 'ampoule'],
            'sunscreen': ['sunscreen', 'spf', 'sun protection', 'sunblock', 'uv protection', 'uva', 'uvb'],
            'toner': ['toner', 'astringent', 'mist', 'refresher', 'essence', 'balancing'],
            'exfoliant': ['exfoliat', 'scrub', 'peel', 'aha', 'bha', 'acid', 'enzymatic', 'glycolic'],
            'mask': ['mask', 'pack', 'treatment mask', 'sheet mask', 'clay mask', 'overnight mask'],
            'eye cream': ['eye cream', 'eye serum', 'eye gel', 'under eye', 'dark circles', 'eye area'],
            'face oil': ['face oil', 'facial oil', 'oil blend', 'nourishing oil'],
            'acne treatment': ['acne', 'spot', 'blemish', 'salicylic', 'benzoyl', 'tea tree', 'pimple']
        }
        
        # Active ingredients for more targeted matching
        active_ingredients = {
            'retinol': ['retinol', 'retinal', 'retinoid', 'vitamin a', 'retinoic'],
            'vitamin c': ['vitamin c', 'ascorbic acid', 'l-ascorbic', 'brightening'],
            'niacinamide': ['niacinamide', 'vitamin b3', 'nicotinamide'],
            'hyaluronic acid': ['hyaluronic', 'sodium hyaluronate', 'hydrating'],
            'peptides': ['peptide', 'amino acid', 'protein complex'],
            'ceramides': ['ceramide', 'skin barrier', 'lipid']
        }

        # Find the best matching product using a more sophisticated scoring system
        best_match = None
        best_score = 0
        
        # First determine what category of product we're looking for
        step_category = None
        for category, keywords in product_categories.items():
            if any(keyword in step_lower for keyword in keywords):
                step_category = category
                break
                
        # Look for any specific active ingredients mentioned
        step_ingredients = []
        for ingredient, keywords in active_ingredients.items():
            if any(keyword in step_lower for keyword in keywords):
                step_ingredients.append(ingredient)
        
        print(f"Step category: {step_category}, Step ingredients: {step_ingredients}")
        
        for product in products:
            if not product:
                continue
                
            product_name = product.get('name', '').lower()
            product_desc = product.get('description', '').lower()
            product_ingredients = product.get('ingredients', '').lower()
            product_text = f"{product_name} {product_desc} {product_ingredients}"
            
            # Start with a base score
            score = 0
            
            # Category matching (most important)
            if step_category:
                # Check if product name or description contains the category
                category_keywords = product_categories.get(step_category, [])
                if any(keyword in product_name for keyword in category_keywords):
                    score += 10  # Strong match in name
                elif any(keyword in product_desc for keyword in category_keywords):
                    score += 5   # Good match in description
                    
            # Active ingredient matching
            for ingredient in step_ingredients:
                ingredient_keywords = active_ingredients.get(ingredient, [])
                if any(keyword in product_text for keyword in ingredient_keywords):
                    score += 3
            
            # Product type matching based on common patterns in names
            if step_category:
                if step_category.lower() in product_name.lower():
                    score += 8  # Direct category match in name
            
            # Specific concern matching
            if 'acne' in step_lower and ('acne' in product_text or 'blemish' in product_text):
                score += 3
            if 'aging' in step_lower and ('anti-aging' in product_text or 'wrinkle' in product_text):
                score += 3
            if 'sensitive' in step_lower and 'sensitive' in product_text:
                score += 3
                
            # Special handling for specific step types
            if 'cleanse' in step_lower and 'cleanser' in product_name:
                score += 5
            if ('moisturize' in step_lower or 'hydrate' in step_lower) and ('moisturizer' in product_name or 'cream' in product_name):
                score += 5
            if 'spf' in step_lower and 'spf' in product_name:
                score += 5
            
            if score > best_score:
                best_score = score
                best_match = product
                print(f"New best match: {product_name} with score {score}")
        
        # Return the best match if score is reasonable
        if best_score >= 5:
            return best_match
        elif products:  # Fallback to recommended products
            # Try to find a product that matches the step category
            if step_category:
                for product in products:
                    product_name = product.get('name', '').lower()
                    if any(keyword in product_name for keyword in product_categories.get(step_category, [])):
                        print(f"Category fallback match: {product_name}")
                        return product
            
            # Default to first product as last resort
            print(f"No good match found, using first product as fallback")
            return products[0]
        else:
            return None

    def _fallback_skin_analysis(self, user_profile: Dict, acne_detections: List = None) -> str:
        """Fallback skin analysis when AI is unavailable."""
        skin_type = user_profile.get('skinType', 'Unknown')
        concerns = user_profile.get('concerns', [])
        age_range = user_profile.get('ageRange', 'Unknown')

        analysis = f"Based on your {skin_type.lower()} skin type and {age_range} age range, your skin profile indicates specific care requirements. "
        
        if concerns:
            analysis += f"Your main concerns of {', '.join(concerns)} are common for your skin type and can be effectively addressed with targeted care. "
        
        if skin_type.lower() == 'oily':
            analysis += "Oily skin typically produces excess sebum, which can lead to enlarged pores and occasional breakouts. This skin type often benefits from oil-controlling ingredients while maintaining proper hydration. "
        elif skin_type.lower() == 'dry':
            analysis += "Dry skin lacks adequate moisture and may feel tight or rough. This condition requires intensive hydration and barrier repair to restore skin health and comfort. "
        elif skin_type.lower() == 'sensitive':
            analysis += "Sensitive skin reacts easily to environmental factors and certain ingredients. A gentle approach with minimal, fragrance-free formulations is typically most beneficial. "
        elif skin_type.lower() == 'combination':
            analysis += "Combination skin presents different needs across facial zones, with oiliness typically in the T-zone and normal to dry areas elsewhere. This requires a balanced skincare approach. "

        if acne_detections:
            analysis += f"Our AI skin scan detected {len(acne_detections)} areas of concern on your face, indicating active skin issues that benefit from targeted treatment. "

        analysis += "Understanding your skin's unique characteristics is the first step toward achieving healthier, more balanced skin."

        return analysis

    def _fallback_routine(self, user_profile: Dict, products: List[Dict], acne_detected: bool) -> Dict:
        """Fallback routine generation when AI is unavailable."""
        return {
            'morning': [
                {'step': 'Cleanse (60 seconds)', 'instruction': 'Wash your face with lukewarm water, apply a small amount of gentle cleanser to damp skin, and massage in circular motions for 60 seconds. Focus on areas with excess oil. Rinse thoroughly and pat dry with a clean towel.', 'product': None},
                {'step': 'Tone (30 seconds)', 'instruction': 'Apply toner using a cotton pad or clean hands, gently patting onto skin to balance pH levels and prepare your skin for treatment products. Avoid the delicate eye area.', 'product': None},
                {'step': 'Treat (Wait 1 minute)', 'instruction': 'Apply 2-3 drops of treatment serum targeting your specific skin concerns. Gently pat into skin using your fingertips and allow to absorb completely before the next step.', 'product': None},
                {'step': 'Moisturize (Wait 2 minutes)', 'instruction': 'Apply a lightweight moisturizer using upward motions across your face and neck. This creates a protective barrier and locks in hydration from previous steps.', 'product': None},
                {'step': 'Protect (Apply 15 mins before sun)', 'instruction': 'Apply broad-spectrum sunscreen with at least SPF 30 using the two-finger rule for adequate coverage. Reapply every 2 hours when exposed to sunlight.', 'product': None}
            ],
            'evening': [
                {'step': 'Double Cleanse (60 seconds)', 'instruction': 'Start with an oil cleanser massaged onto dry skin for 30 seconds to dissolve makeup and sunscreen. Rinse, then follow with a water-based cleanser for another 30 seconds to remove remaining impurities.', 'product': None},
                {'step': 'Tone (30 seconds)', 'instruction': 'Apply toner with gentle patting motions to restore your skin\'s pH balance after cleansing and prepare it for nighttime treatments.', 'product': None},
                {'step': 'Treat (Wait 1 minute)', 'instruction': 'Apply evening treatment products focusing on skin repair and regeneration. For active ingredients like retinol, use a pea-sized amount and allow 15-20 minutes for full absorption.' if not acne_detected else 'Apply acne treatment products targeting breakouts. Use a small amount on affected areas and allow to dry completely before the next step.', 'product': None},
                {'step': 'Moisturize (Wait 2 minutes)', 'instruction': 'Apply a richer night moisturizer or cream using gentle upward strokes. Night formulations support your skin\'s natural repair process while you sleep.', 'product': None},
                {'step': 'Eye Care (Before bed)', 'instruction': 'If using eye cream, gently tap around the orbital bone using your ring finger. This addresses specific concerns like dark circles or fine lines in the delicate eye area.', 'product': None}
            ],
            'weekly': [
                {'step': 'Exfoliate (2-3 times per week)', 'instruction': 'Use a gentle chemical or physical exfoliant to remove dead skin cells and improve skin texture. Apply to clean, dry skin and follow product instructions for timing.', 'product': None},
                {'step': 'Face Mask (Once per week)', 'instruction': 'Apply a hydrating or treatment mask suited to your skin type. Leave on for the recommended time, then rinse thoroughly with lukewarm water.', 'product': None}
            ]
        }

    def generate_ai_product_recommendations(self, user_profile: Dict, product_database: List[Dict], logic_recommendations: List[Dict] = None) -> List[Dict]:
        """Generate AI-powered product recommendations using the product database."""
        try:
            # Prepare product database summary for AI
            product_summary = self._prepare_product_database_summary(product_database)
            
            # Prepare user context
            user_context = f"""
            User Profile:
            - Skin Type: {user_profile.get('skinType', 'Unknown')}
            - Age Range: {user_profile.get('ageRange', 'Unknown')}
            - Skin Concerns: {', '.join(user_profile.get('concerns', []))}
            - Preferred Ingredients: {', '.join(user_profile.get('preferredIngredients', []))}
            - Ingredients to Avoid: {', '.join(user_profile.get('avoidIngredients', []))}
            - Budget Range: {user_profile.get('budget', 'Unknown')}
            """
            
            # Include logic-based recommendations if available
            logic_context = ""
            if logic_recommendations:
                logic_products = [f"- {prod['name']} ({prod['brand']})" for prod in logic_recommendations[:10]]
                logic_context = f"""
                
                Logic-Based Recommendations (for reference):
                {chr(10).join(logic_products)}
                """
            
            prompt = f"""
            You are an expert skincare consultant with access to a comprehensive product database. Based on the user profile and product database, recommend the most suitable skincare products.

            {user_context}
            {logic_context}

            Available Products Database (sample of {len(product_database)} products):
            {product_summary}

            Instructions:
            1. Analyze the user's skin type, concerns, and preferences
            2. Consider the logic-based recommendations but don't just copy them
            3. Select 15-20 diverse products from the database that best match the user's needs
            4. Prioritize products with ingredients that address their specific concerns
            5. Ensure variety across categories (cleanser, moisturizer, serum, sunscreen, etc.)
            6. Consider budget constraints and ingredient preferences/avoidances
            7. Provide brief reasoning for each recommendation

            Return your response as a JSON array with this exact format:
            [
                {{
                    "product_name": "exact product name from database",
                    "brand": "brand name",
                    "reason": "why this product is recommended (2-3 sentences)",
                    "category": "product category (cleanser/moisturizer/serum/etc)",
                    "priority": "high/medium/low",
                    "price_value": "budget/mid-range/premium"
                }}
            ]

            Focus on products that genuinely address the user's concerns and provide real value.
            """

            # Log the prompt being sent to Gemini
            self._log_gemini_interaction(
                interaction_type="product_recommendations_prompt",
                prompt=prompt,
                metadata={
                    "user_profile": user_profile,
                    "product_database_size": len(product_database),
                    "logic_recommendations_count": len(logic_recommendations) if logic_recommendations else 0
                }
            )

            response = self.model.generate_content(prompt)
            
            # Log the raw response
            self._log_gemini_interaction(
                interaction_type="product_recommendations_response",
                prompt="Response received",
                response=response.text,
                metadata={"response_length": len(response.text)}
            )
            
            # Parse AI response
            try:
                ai_recommendations_json = self._extract_json_from_response(response.text)
                ai_recommendations = json.loads(ai_recommendations_json)
                
                # Log successful parsing
                self._log_gemini_interaction(
                    interaction_type="product_recommendations_parsed",
                    prompt="JSON parsing successful",
                    response=f"Parsed {len(ai_recommendations)} recommendations",
                    metadata={"recommendations_count": len(ai_recommendations)}
                )
                
                # Validate and format AI recommendations
                formatted_ai_recs = self._format_ai_recommendations(ai_recommendations, product_database)
                
                # Log final formatted recommendations
                self._log_gemini_interaction(
                    interaction_type="product_recommendations_formatted",
                    prompt="Recommendations formatted successfully",
                    response=f"Formatted {len(formatted_ai_recs)} recommendations",
                    metadata={
                        "formatted_count": len(formatted_ai_recs),
                        "sample_recommendations": [rec.get("name", "Unknown") for rec in formatted_ai_recs[:3]]
                    }
                )
                
                print(f"✅ AI generated {len(formatted_ai_recs)} product recommendations")
                return formatted_ai_recs
                
            except (json.JSONDecodeError, KeyError) as parse_error:
                # Log parsing error
                self._log_gemini_interaction(
                    interaction_type="product_recommendations_parse_error",
                    prompt="Failed to parse AI response",
                    error=parse_error,
                    metadata={"raw_response_preview": response.text[:500]}
                )
                print(f"Error parsing AI recommendations: {parse_error}")
                return []
                
        except Exception as e:
            # Log general error
            self._log_gemini_interaction(
                interaction_type="product_recommendations_general_error",
                prompt="General error in AI recommendations",
                error=e,
                metadata={"user_profile": user_profile}
            )
            print(f"Error generating AI product recommendations: {e}")
            return []

    def _prepare_product_database_summary(self, product_database: List[Dict], max_products: int = 100) -> str:
        """Prepare a summary of the product database for AI analysis."""
        try:
            # Select a diverse sample of products
            sample_products = product_database[:max_products] if len(product_database) > max_products else product_database
            
            summary_lines = []
            for i, product in enumerate(sample_products):
                product_line = f"{i+1}. {product.get('product_name', 'Unknown')} by {product.get('brand', 'Unknown')}"
                
                # Add key details
                details = []
                if product.get('skin_type'):
                    details.append(f"Skin Type: {product['skin_type']}")
                if product.get('active_ingredients'):
                    ingredients = product['active_ingredients'][:100] + "..." if len(str(product['active_ingredients'])) > 100 else product['active_ingredients']
                    details.append(f"Ingredients: {ingredients}")
                if product.get('price'):
                    details.append(f"Price: ₹{product['price']}")
                if product.get('product_benefits'):
                    benefits = product['product_benefits'][:80] + "..." if len(str(product['product_benefits'])) > 80 else product['product_benefits']
                    details.append(f"Benefits: {benefits}")
                
                if details:
                    product_line += f" | {' | '.join(details)}"
                
                summary_lines.append(product_line)
            
            return "\n".join(summary_lines)
            
        except Exception as e:
            print(f"Error preparing product database summary: {e}")
            return "Product database unavailable"

    def _extract_json_from_response(self, response_text: str) -> str:
        """Extract JSON from AI response text."""
        # Remove markdown code blocks if present
        text = response_text.strip()
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()
        
        # Find JSON array boundaries
        start_bracket = text.find('[')
        end_bracket = text.rfind(']')
        
        if start_bracket != -1 and end_bracket != -1:
            return text[start_bracket:end_bracket + 1]
        else:
            raise ValueError("No valid JSON array found in response")

    def _format_ai_recommendations(self, ai_recommendations: List[Dict], product_database: List[Dict]) -> List[Dict]:
        """Format AI recommendations to match the expected product format."""
        formatted_recommendations = []
        
        # Create a lookup for products by name
        product_lookup = {prod.get('product_name', '').lower(): prod for prod in product_database}
        
        for ai_rec in ai_recommendations:
            try:
                product_name = ai_rec.get('product_name', '').lower()
                
                # Find matching product in database
                matching_product = None
                for db_name, db_product in product_lookup.items():
                    if product_name in db_name or db_name in product_name:
                        matching_product = db_product
                        break
                
                if matching_product:
                    # Format to match expected recommendation format
                    formatted_product = {
                        'name': matching_product.get('product_name', 'Unknown Product'),
                        'description': f"{ai_rec.get('reason', 'AI recommended')} | {matching_product.get('about_item', '')[:150]}...",
                        'price': f"₹{matching_product.get('price', 0)}" if matching_product.get('price') else 'Price not available',
                        'ingredients': matching_product.get('active_ingredients', 'Ingredients not listed'),
                        'suitableFor': matching_product.get('skin_type', 'All skin types'),
                        'brand': matching_product.get('brand', 'Unknown Brand'),
                        'rating': matching_product.get('rating', 'No rating'),
                        'image': matching_product.get('product_image', ''),
                        'link': matching_product.get('link_href', ''),
                        'ai_reasoning': ai_rec.get('reason', 'AI recommended'),
                        'ai_category': ai_rec.get('category', 'general'),
                        'ai_priority': ai_rec.get('priority', 'medium'),
                        'matchReasons': [
                            f"AI Recommended: {ai_rec.get('reason', 'Expert selection')}",
                            f"Category: {ai_rec.get('category', 'skincare')}",
                            f"Priority: {ai_rec.get('priority', 'medium')} for your needs"
                        ]
                    }
                    formatted_recommendations.append(formatted_product)
                    
            except Exception as e:
                print(f"Error formatting AI recommendation: {e}")
                continue
        
        return formatted_recommendations

    def _log_gemini_interaction(self, interaction_type, prompt, response=None, error=None, metadata=None):
        """Log Gemini AI interactions to JSON file for debugging"""
        try:
            log_entry = {
                "timestamp": datetime.datetime.now().isoformat(),
                "interaction_type": interaction_type,
                "prompt": prompt[:1000] + "..." if len(str(prompt)) > 1000 else str(prompt),  # Truncate long prompts
                "response": response[:2000] + "..." if response and len(str(response)) > 2000 else response,  # Truncate long responses
                "error": str(error) if error else None,
                "error_traceback": traceback.format_exc() if error else None,
                "metadata": metadata or {}
            }
            
            # Create logs directory if it doesn't exist
            logs_dir = "logs"
            if not os.path.exists(logs_dir):
                os.makedirs(logs_dir)
            
            # Generate filename with date
            date_str = datetime.datetime.now().strftime("%Y%m%d")
            log_file = os.path.join(logs_dir, f"gemini_detailed_interactions_{date_str}.json")
            
            # Read existing logs or create new list
            existing_logs = []
            if os.path.exists(log_file):
                try:
                    with open(log_file, 'r', encoding='utf-8') as f:
                        existing_logs = json.load(f)
                except Exception:
                    existing_logs = []
            
            # Append new log entry
            existing_logs.append(log_entry)
            
            # Keep only last 50 entries to prevent file from getting too large
            if len(existing_logs) > 50:
                existing_logs = existing_logs[-50:]
            
            # Write back to file
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(existing_logs, f, indent=2, ensure_ascii=False)
            
            print(f"🔍 Gemini interaction logged to {log_file}")
            
        except Exception as log_error:
            print(f"Failed to log Gemini interaction: {log_error}")

    def _categorize_products(self, products: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize products by type for better routine integration."""
        categories = {
            'cleansers': [],
            'toners': [],
            'serums': [],
            'moisturizers': [],
            'sunscreens': [],
            'treatments': [],
            'masks': [],
            'eye_products': [],
            'oils': [],
            'others': []
        }
        
        # Define comprehensive keyword mappings for product categories
        category_keywords = {
            'cleansers': ['cleanser', 'wash', 'foam', 'purifying', 'cleansing', 'gel cleanser', 'micellar', 'face wash'],
            'toners': ['toner', 'mist', 'astringent', 'essence', 'water', 'balancing', 'prep'],
            'serums': ['serum', 'concentrate', 'ampoule', 'booster', 'treatment serum', 'intensive', 'elixir'],
            'moisturizers': ['moisturizer', 'hydrator', 'cream', 'lotion', 'emulsion', 'gel cream', 'hydrating cream'],
            'sunscreens': ['sunscreen', 'spf', 'uv', 'sun block', 'sun protection', 'sunblock', 'uva', 'uvb'],
            'treatments': ['treatment', 'acne', 'spot', 'pimple', 'blemish', 'retinol', 'exfoliat', 'acid', 'aha', 'bha', 'peeling'],
            'masks': ['mask', 'pack', 'sleeping', 'sheet mask', 'clay mask', 'treatment mask', 'face pack'],
            'eye_products': ['eye cream', 'eye serum', 'eye gel', 'eye treatment', 'under eye'],
            'oils': ['oil', 'face oil', 'facial oil', 'oil blend', 'cleansing oil']
        }
        
        # Track already categorized products
        categorized_products = set()
        
        # First pass - categorize products by exact matches in name
        for product in products:
            if not product:
                continue
                
            product_id = id(product)  # Use object id as unique identifier
            if product_id in categorized_products:
                continue
                
            product_name = product.get('name', '').lower()
            
            # Try to find a direct category match in the name first (highest priority)
            categorized = False
            for category, keywords in category_keywords.items():
                # Check if any category keyword appears as a whole word in product name
                if any(keyword in product_name for keyword in keywords):
                    categories[category].append(product)
                    categorized_products.add(product_id)
                    categorized = True
                    break
                    
            if categorized:
                continue
        
        # Second pass - use more comprehensive text matching for uncategorized products
        for product in products:
            if not product:
                continue
                
            product_id = id(product)
            if product_id in categorized_products:
                continue
            
            product_name = product.get('name', '').lower()
            product_description = product.get('description', '').lower()
            product_ingredients = product.get('ingredients', '').lower()
            
            # Combine all text for better category matching
            product_text = f"{product_name} {product_description} {product_ingredients}"
            
            categorized = False
            for category, keywords in category_keywords.items():
                if any(keyword in product_text for keyword in keywords):
                    categories[category].append(product)
                    categorized_products.add(product_id)
                    categorized = True
                    break
                    
            # If still not categorized, put in others
            if not categorized:
                categories['others'].append(product)
                categorized_products.add(product_id)
                
        # Print category statistics for debugging
        print(f"Product categorization: {', '.join([f'{cat}: {len(prods)}' for cat, prods in categories.items() if prods])}")
                
        # Remove empty categories and return
        return {k: v for k, v in categories.items() if v}
        
        # Remove empty categories
        return {k: v for k, v in categories.items() if v}

    def _parse_ai_routine_with_products(self, ai_response: str, products: List[Dict]) -> Dict:
        """Enhanced parsing that ensures product mapping and provides fallbacks."""
        try:
            print(f"Parsing enhanced AI routine response...")
            
            routine = {
                'morning': [],
                'evening': [],
                'weekly': []
            }

            # Split response into lines and process
            lines = ai_response.split('\n')
            current_section = None
            
            # Create product lookup for better matching
            product_lookup = {}
            for product in products:
                name = product.get('name', '')
                # Create multiple lookup keys
                product_lookup[name.lower()] = product
                # Also index by first few words
                words = name.split()[:3]
                if len(words) >= 2:
                    key = ' '.join(words).lower()
                    product_lookup[key] = product

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Identify section headers
                line_upper = line.upper()
                if 'MORNING ROUTINE' in line_upper:
                    current_section = 'morning'
                    continue
                elif 'EVENING ROUTINE' in line_upper:
                    current_section = 'evening'
                    continue
                elif 'WEEKLY' in line_upper:
                    current_section = 'weekly'
                    continue

                # Parse numbered steps with detailed product information
                if current_section and (line.startswith(('1.', '2.', '3.', '4.', '5.', '6.')) or line.startswith('- ')):
                    step_info = self._parse_routine_step_with_product(line, product_lookup)
                    if step_info:
                        routine[current_section].append(step_info)
                        print(f"Added enhanced step to {current_section}: {step_info['step']}")

            # Ensure minimum routine structure with fallbacks
            routine = self._ensure_routine_completeness(routine, products)
            
            print(f"Enhanced routine parsed: Morning={len(routine['morning'])}, Evening={len(routine['evening'])}, Weekly={len(routine['weekly'])}")
            return routine

        except Exception as e:
            print(f"Error parsing enhanced AI routine: {e}")
            return self._fallback_routine({}, products, False)

    def _parse_routine_step_with_product(self, line: str, product_lookup: Dict) -> Optional[Dict]:
        """Parse a single routine step and match it with a specific product."""
        try:
            # Remove numbering
            if line.startswith(('1.', '2.', '3.', '4.', '5.', '6.')):
                line = line[2:].strip()
            elif line.startswith('- '):
                line = line[2:].strip()
            
            # Look for product names in the line
            matched_product = None
            for product_key, product in product_lookup.items():
                if product_key in line.lower():
                    matched_product = product
                    break
            
            # Extract step name and instructions
            parts = line.split(' - ', 1)
            if len(parts) >= 2:
                step_name = parts[0].strip()
                instruction = parts[1].strip()
            else:
                step_name = f"Step {line[:20]}..."
                instruction = line
            
            return {
                'step': step_name,
                'instruction': instruction,
                'product': matched_product,
                'product_matched': matched_product is not None
            }
            
        except Exception as e:
            print(f"Error parsing routine step: {e}")
            return None

    def _ensure_routine_completeness(self, routine: Dict, products: List[Dict]) -> Dict:
        """Ensure routine has minimum required steps with product fallbacks."""
        try:
            # Categorize available products
            categorized = self._categorize_products(products)
            
            # Ensure morning routine has minimum steps
            if len(routine['morning']) < 3:
                routine['morning'] = self._create_fallback_routine('morning', categorized)
            
            # Ensure evening routine has minimum steps  
            if len(routine['evening']) < 3:
                routine['evening'] = self._create_fallback_routine('evening', categorized)
            
            # Add weekly treatments if missing
            if len(routine['weekly']) == 0 and (categorized.get('masks') or categorized.get('treatments')):
                routine['weekly'] = self._create_weekly_treatments(categorized)
            
            return routine
            
        except Exception as e:
            print(f"Error ensuring routine completeness: {e}")
            return routine

    def _create_fallback_routine(self, routine_type: str, categorized_products: Dict) -> List[Dict]:
        """Create fallback routine steps when AI parsing fails."""
        if routine_type == 'morning':
            steps = [
                ('Cleanser', 'cleansers', 'Gently massage onto damp skin, rinse thoroughly'),
                ('Serum', 'serums', 'Apply 2-3 drops, pat gently into skin'),  
                ('Moisturizer', 'moisturizers', 'Apply evenly, allow to absorb'),
                ('Sunscreen', 'sunscreens', 'Apply generously 15 minutes before sun exposure')
            ]
        else:  # evening
            steps = [
                ('Cleanser', 'cleansers', 'Double cleanse to remove impurities'),
                ('Treatment', 'treatments', 'Apply to target specific concerns'),
                ('Serum', 'serums', 'Apply treatment serum for overnight repair'),
                ('Moisturizer', 'moisturizers', 'Apply night moisturizer for hydration')
            ]
        
        routine_steps = []
        for step_name, category, default_instruction in steps:
            products = categorized_products.get(category, [])
            product = products[0] if products else None
            
            routine_steps.append({
                'step': step_name,
                'instruction': f"{default_instruction} {'- ' + product.get('name', 'Product') if product else ''}",
                'product': product,
                'product_matched': product is not None,
                'fallback_generated': True
            })
        
        return routine_steps

    def _create_weekly_treatments(self, categorized_products: Dict) -> List[Dict]:
        """Create weekly treatment steps."""
        treatments = []
        
        if categorized_products.get('masks'):
            mask = categorized_products['masks'][0]
            treatments.append({
                'step': 'Weekly Mask Treatment',
                'instruction': f"Apply {mask.get('name', 'face mask')} once per week for 10-15 minutes, then rinse off",
                'product': mask,
                'product_matched': True
            })
        
        if categorized_products.get('treatments'):
            treatment = categorized_products['treatments'][0]
            treatments.append({
                'step': 'Spot Treatment',
                'instruction': f"Use {treatment.get('name', 'treatment')} on problem areas 2-3 times per week",
                'product': treatment,
                'product_matched': True
            })
        
        return treatments
