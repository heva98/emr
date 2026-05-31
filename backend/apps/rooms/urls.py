from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('departments', views.DepartmentViewSet, basename='department')
router.register('rooms', views.RoomViewSet, basename='room')
router.register('assignments', views.DoctorRoomAssignmentViewSet, basename='assignment')
router.register('doctors', views.DoctorListViewSet, basename='doctor')

app_name = 'rooms'
urlpatterns = [
    path('', include(router.urls)),
]
