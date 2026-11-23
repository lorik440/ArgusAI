import torch

# get running device for models
def get_device():
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"

DEVICE=get_device()
