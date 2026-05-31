from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Department, DoctorRoomAssignment, Room
from .serializers import (
    DepartmentSerializer,
    DoctorRoomAssignmentSerializer,
    DoctorSerializer,
    RoomSerializer,
)

User = get_user_model()


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer

    def get_queryset(self):
        qs = Room.objects.select_related('department').prefetch_related('assignments__doctor')

        dept = self.request.query_params.get('department')
        floor = self.request.query_params.get('floor')
        is_available = self.request.query_params.get('is_available')
        is_active = self.request.query_params.get('is_active')

        if dept:
            qs = qs.filter(department_id=dept)
        if floor:
            qs = qs.filter(floor__iexact=floor)
        if is_available is not None:
            qs = qs.filter(is_available=is_available.lower() == 'true')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')

        return qs

    @action(detail=False, methods=['get'], url_path='available')
    def available(self, request):
        qs = self.get_queryset().filter(is_active=True, is_available=True)
        return Response(RoomSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch'], url_path='toggle-availability')
    def toggle_availability(self, request, pk=None):
        room = self.get_object()
        room.is_available = not room.is_available
        room.save(update_fields=['is_available'])
        return Response(RoomSerializer(room).data)


class DoctorRoomAssignmentViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = DoctorRoomAssignmentSerializer

    def get_queryset(self):
        qs = DoctorRoomAssignment.objects.select_related(
            'doctor', 'room__department', 'assigned_by'
        )
        date_str = self.request.query_params.get('date')
        doctor = self.request.query_params.get('doctor')
        dept = self.request.query_params.get('department')

        if date_str:
            qs = qs.filter(assigned_date=date_str)
        if doctor:
            qs = qs.filter(doctor_id=doctor)
        if dept:
            qs = qs.filter(room__department_id=dept)

        return qs

    @action(detail=False, methods=['get'], url_path='today')
    def today(self, request):
        today = timezone.now().date()
        qs = self.get_queryset().filter(is_active=True, assigned_date=today)
        return Response(DoctorRoomAssignmentSerializer(qs, many=True).data)

    def destroy(self, request, *args, **kwargs):
        assignment = self.get_object()
        assignment.is_active = False
        assignment.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DoctorListViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = DoctorSerializer

    def get_queryset(self):
        return User.objects.filter(role='DOCTOR', is_active=True).order_by('first_name', 'last_name')
