# quiz/models.py
from django.db import models
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField

class OutfitCache(models.Model):
    query = models.CharField(max_length=255, unique=True)
    image = models.CharField(max_length=500)
    tags = models.JSONField(default=list)  # <- JSONField handles lists properly
    created_at = models.DateTimeField(auto_now_add=True)

from django.utils import timezone
from datetime import timedelta

def prune_old_outfits(days=30):
    cutoff = timezone.now() - timedelta(days=days)
    OutfitCache.objects.filter(created_at__lt=cutoff).delete()
