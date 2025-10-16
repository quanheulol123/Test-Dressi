from django.urls import path
from . import views  # make sure this points to the same app

urlpatterns = [
    path('signup/', views.signup, name='signup'),
]
