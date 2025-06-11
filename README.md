# 💄 Skin‑Sage AI  
*Personalized Skincare Recommendation SaaS powered by AI*

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/liorohan10s-projects/v0-cosmetic-saa-s-application)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/fs3CAJNmuxd)

Skin‑Sage AI is an intelligent, open‑source SaaS platform that helps users receive **personalized skincare recommendations**, comprehensive **skin analysis**, and **custom routines**, all based on a facial scan and personal preferences. Combining Computer Vision, NLP, and hybrid recommendation techniques, it’s built to enhance both user experience and brand integration.

---

## 🧠 Key Features

- **Facial Skin Issue Detection**  
  Fine‑tuned **YOLOv8** model scans user’s face to detect skin concerns such as acne, pigmentation, dryness/oiliness, and redness.

- **User Profile Customization**  
  Users input:
  - Skin Type (e.g. oily, dry, sensitive)
  - Age
  - Preferred & avoided ingredients
  - Key skin issues
  - Budget range

- **Hybrid Recommendation System**  
  Product selection uses:
  1. **Content-based filtering** via cosine similarity on ingredient profiles  
  2. **Collaborative-style ranking** using K‑Nearest Neighbors (KNN) to match user preferences

- **AI-driven Analysis & Routine**  
  Leveraging the **Gemini AI API**, Skin‑Sage generates:
  - Natural‑language skin health analysis  
  - Custom **AM/PM skincare routines** tailored to detected issues and product recommendations

- **Downloadable PDF Report**  
  Exports a professional report featuring:
  - Detected skin condition visualizations
  - Product recommendations and ingredients
  - Full skincare routine and usage instructions

---

Project is live at:

**[https://vercel.com/liorohan10s-projects/v0-cosmetic-saa-s-application](https://vercel.com/liorohan10s-projects/v0-cosmetic-saa-s-application)**
