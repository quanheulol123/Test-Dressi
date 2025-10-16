from detectron2.config import get_cfg
from detectron2.engine import DefaultPredictor
from detectron2 import model_zoo
import cv2
import numpy as np

# --- Setup predictor once ---
cfg = get_cfg()
cfg.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"))
cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = 0.5
cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml")
cfg.MODEL.DEVICE = "cpu"  # force CPU
predictor = DefaultPredictor(cfg)

def segment_clothing(image_path: str):
    """Return masks for clothing items in an image."""
    img = cv2.imread(image_path)
    outputs = predictor(img)
    masks = outputs["instances"].pred_masks.cpu().numpy()
    classes = outputs["instances"].pred_classes.cpu().numpy()
    return masks, classes

def visualise_masks(image_path: str, masks: np.ndarray):
    """Draw masks on image for quick visualisation."""
    img = cv2.imread(image_path)
    for mask in masks:
        color = np.random.randint(0, 255, (1, 3), dtype=int)
        img[mask] = color
    return img  # returns as numpy array; you can save or convert to base64
