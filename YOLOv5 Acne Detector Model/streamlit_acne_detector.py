import streamlit as st
import torch
import cv2
import numpy as np
import os
import pathlib
from datetime import datetime
from PIL import Image
import io

def load_model():
    """Load the YOLOv5 model with acne detection weights"""
    try:
        # Apply PosixPath fix for Windows
        posix_backup = pathlib.PosixPath
        pathlib.PosixPath = pathlib.WindowsPath
        
        try:
            # Define model path
            weights_path = os.path.abspath('yolo_acne_detection/acne_localization4/weights/best.pt')
            weights_path = weights_path.replace('\\', '/')
            
            # Load the model using torch.hub
            model = torch.hub.load('ultralytics/yolov5', 'custom', 
                                 path=weights_path,
                                 force_reload=True,
                                 trust_repo=True)
            
            # Set model parameters
            model.conf = 0.25  # Confidence threshold
            model.iou = 0.45   # NMS IoU threshold
            model.eval()
            return model
            
        finally:
            # Restore original PosixPath
            pathlib.PosixPath = posix_backup

    except Exception as e:
        st.error(f"Error loading model: {str(e)}")
        raise

def process_image(model, image):
    """Run inference on the image and return results"""
    try:
        # Convert to RGB if needed
        if len(image.shape) == 2:  # Grayscale
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:  # RGBA
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        
        # Run inference
        results = model(image)
        return results
    except Exception as e:
        st.error(f"Error during inference: {str(e)}")
        return None

def draw_predictions(image, results):
    """Draw predictions on the image"""
    try:
        # Create a copy for drawing
        img_draw = image.copy()
        
        # Draw each detection
        for *box, conf, cls in results.pred[0]:
            # Get box coordinates
            x1, y1, x2, y2 = map(int, box)
            
            # Get class name
            class_name = results.names[int(cls)]
            
            # Draw rectangle
            cv2.rectangle(img_draw, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Add label
            label = f"{class_name}: {conf:.2f}"
            cv2.putText(img_draw, label, (x1, y1-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        return img_draw
        
    except Exception as e:
        st.error(f"Error drawing predictions: {str(e)}")
        return image

def main():
    st.set_page_config(page_title="Acne Detection System", layout="wide")
    
    # Title and description
    st.title("Acne Detection System")
    st.write("Upload an image to detect and analyze acne lesions.")
    
    # Load model
    try:
        model = load_model()
        st.success("Model loaded successfully!")
    except Exception as e:
        st.error("Failed to load model. Please check the model path and try again.")
        return
    
    # File uploader
    uploaded_file = st.file_uploader("Choose an image...", type=['jpg', 'jpeg', 'png'])
    
    if uploaded_file is not None:
        try:
            # Create predictions directory
            os.makedirs('predictions', exist_ok=True)
            
            # Read image
            image_bytes = uploaded_file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Display original image
            st.subheader("Original Image")
            st.image(image_rgb, channels="RGB", use_column_width=True)
            
            # Process image
            with st.spinner('Processing image...'):
                results = process_image(model, image_rgb)
            
            if results is not None and len(results.pred[0]) > 0:
                # Draw predictions
                output_image = draw_predictions(image_rgb, results)
                
                # Display results
                st.subheader("Detection Results")
                st.image(output_image, channels="RGB", use_column_width=True)
                
                # Save image
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_filename = os.path.join('predictions', 
                                             f'prediction_{timestamp}_{uploaded_file.name}')
                
                cv2.imwrite(output_filename, 
                           cv2.cvtColor(output_image, cv2.COLOR_RGB2BGR))
                
                # Display detection information
                st.subheader("Detection Details")
                st.write(f"Found {len(results.pred[0])} acne lesions")
                
                # Create a table of detections
                detection_data = []
                for *box, conf, cls in results.pred[0]:
                    class_name = results.names[int(cls)]
                    detection_data.append({
                        "Class": class_name,
                        "Confidence": f"{conf:.2f}",
                        "Location": f"[{int(box[0])}, {int(box[1])}, {int(box[2])}, {int(box[3])}]"
                    })
                
                if detection_data:
                    st.table(detection_data)
                
                # Add download button for the processed image
                with open(output_filename, 'rb') as file:
                    btn = st.download_button(
                        label="Download Processed Image",
                        data=file,
                        file_name=f"processed_{uploaded_file.name}",
                        mime="image/jpeg"
                    )
            else:
                st.warning("No acne lesions detected in the image.")
                
        except Exception as e:
            st.error(f"Error processing image: {str(e)}")

if __name__ == "__main__":
    main()
