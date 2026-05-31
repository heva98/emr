from datetime import date

from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.patients.models import PatientVisit
from apps.patients.serializers import PatientDetailSerializer, PatientVisitSerializer
from .models import Consultation, Referral, Triage
from .serializers import (
    ConsultationSerializer,
    QueueVisitSerializer,
    ReferralSerializer,
    TriageSerializer,
)


class TriageViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Triage.objects.select_related('visit__patient', 'recorded_by')
    serializer_class = TriageSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filterset_fields = ['visit']


class ConsultationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Consultation.objects.select_related('visit__patient', 'doctor', 'room')
    serializer_class = ConsultationSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filterset_fields = ['visit']

    @action(detail=True, methods=['get'], url_path='referrals')
    def referrals(self, request, pk=None):
        consultation = self.get_object()
        qs = consultation.referrals.all()
        return Response(ReferralSerializer(qs, many=True).data)


class ReferralViewSet(
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Referral.objects.select_related('consultation__visit')
    serializer_class = ReferralSerializer


class QueueView(generics.ListAPIView):
    serializer_class = QueueVisitSerializer

    def get_queryset(self):
        return (
            PatientVisit.objects.filter(
                visit_date=date.today(),
                status__in=[
                    PatientVisit.Status.WAITING,
                    PatientVisit.Status.TRIAGE_DONE,
                ],
            )
            .select_related('patient', 'triage', 'consultation__doctor')
            .order_by(F('triage_level').asc(nulls_last=True), 'created_at')
        )


class OPDStatsView(APIView):
    def get(self, request):
        today = date.today()
        visits = PatientVisit.objects.filter(visit_date=today)
        return Response({
            'waiting': visits.filter(status=PatientVisit.Status.WAITING).count(),
            'triage_done': visits.filter(status=PatientVisit.Status.TRIAGE_DONE).count(),
            'with_doctor': visits.filter(status=PatientVisit.Status.WITH_DOCTOR).count(),
            'completed_today': visits.filter(status=PatientVisit.Status.COMPLETED).count(),
        })


class VisitContextView(APIView):
    """Returns all data needed to render the consultation page for a given visit."""

    def get(self, request, visit_id):
        visit = get_object_or_404(
            PatientVisit.objects.select_related('patient'),
            pk=visit_id,
        )

        triage_data = None
        try:
            triage_data = TriageSerializer(visit.triage).data
        except Triage.DoesNotExist:
            pass

        consultation_data = None
        try:
            consultation_data = ConsultationSerializer(visit.consultation).data
        except Consultation.DoesNotExist:
            pass

        previous_visits = PatientVisitSerializer(
            visit.patient.visits.exclude(pk=visit.pk)
            .select_related('created_by')
            .order_by('-visit_date', '-created_at')[:10],
            many=True,
        ).data

        return Response({
            'visit': PatientVisitSerializer(visit).data,
            'patient': PatientDetailSerializer(visit.patient).data,
            'triage': triage_data,
            'consultation': consultation_data,
            'previous_visits': list(previous_visits),
        })


# ── ICD-10 static search ───────────────────────────────────────────────────────

_ICD10_CODES = [
    {"code": "A00", "description": "Cholera"},
    {"code": "A01", "description": "Typhoid and paratyphoid fevers"},
    {"code": "A06", "description": "Amoebiasis"},
    {"code": "A09", "description": "Other gastroenteritis and colitis of infectious origin"},
    {"code": "A15", "description": "Respiratory tuberculosis"},
    {"code": "A36", "description": "Diphtheria"},
    {"code": "A37", "description": "Whooping cough"},
    {"code": "A40", "description": "Streptococcal sepsis"},
    {"code": "A41", "description": "Other sepsis"},
    {"code": "A46", "description": "Erysipelas"},
    {"code": "A49", "description": "Bacterial infection of unspecified site"},
    {"code": "A63", "description": "Other predominantly sexually transmitted diseases"},
    {"code": "A75", "description": "Typhus fever"},
    {"code": "A77", "description": "Spotted fever"},
    {"code": "A82", "description": "Rabies"},
    {"code": "A90", "description": "Dengue fever"},
    {"code": "A91", "description": "Dengue haemorrhagic fever"},
    {"code": "B00", "description": "Herpesviral infections (herpes simplex)"},
    {"code": "B01", "description": "Varicella (chickenpox)"},
    {"code": "B02", "description": "Zoster (herpes zoster / shingles)"},
    {"code": "B05", "description": "Measles"},
    {"code": "B06", "description": "Rubella"},
    {"code": "B15", "description": "Acute hepatitis A"},
    {"code": "B16", "description": "Acute hepatitis B"},
    {"code": "B18", "description": "Chronic viral hepatitis"},
    {"code": "B20", "description": "HIV disease"},
    {"code": "B50", "description": "Plasmodium falciparum malaria"},
    {"code": "B54", "description": "Unspecified malaria"},
    {"code": "B65", "description": "Schistosomiasis (bilharziasis)"},
    {"code": "B76", "description": "Hookworm diseases"},
    {"code": "B77", "description": "Ascariasis"},
    {"code": "B86", "description": "Scabies"},
    {"code": "B87", "description": "Myiasis"},
    {"code": "C18", "description": "Malignant neoplasm of colon"},
    {"code": "C22", "description": "Malignant neoplasm of liver"},
    {"code": "C34", "description": "Malignant neoplasm of bronchus and lung"},
    {"code": "C50", "description": "Malignant neoplasm of breast"},
    {"code": "C53", "description": "Malignant neoplasm of cervix uteri"},
    {"code": "C61", "description": "Malignant neoplasm of prostate"},
    {"code": "C67", "description": "Malignant neoplasm of bladder"},
    {"code": "D50", "description": "Iron deficiency anaemia"},
    {"code": "D51", "description": "Vitamin B12 deficiency anaemia"},
    {"code": "D64", "description": "Other anaemias"},
    {"code": "E03", "description": "Other hypothyroidism"},
    {"code": "E05", "description": "Thyrotoxicosis (hyperthyroidism)"},
    {"code": "E10", "description": "Type 1 diabetes mellitus"},
    {"code": "E11", "description": "Type 2 diabetes mellitus"},
    {"code": "E11.9", "description": "Type 2 diabetes mellitus without complications"},
    {"code": "E14", "description": "Unspecified diabetes mellitus"},
    {"code": "E43", "description": "Unspecified severe protein-energy malnutrition"},
    {"code": "E46", "description": "Unspecified protein-energy malnutrition"},
    {"code": "E55", "description": "Vitamin D deficiency"},
    {"code": "E66", "description": "Obesity"},
    {"code": "E86", "description": "Volume depletion (dehydration)"},
    {"code": "E87", "description": "Other disorders of fluid, electrolyte and acid-base balance"},
    {"code": "F10", "description": "Mental disorders due to use of alcohol"},
    {"code": "F20", "description": "Schizophrenia"},
    {"code": "F32", "description": "Depressive episode"},
    {"code": "F33", "description": "Recurrent depressive disorder"},
    {"code": "F40", "description": "Phobic anxiety disorders"},
    {"code": "F41", "description": "Other anxiety disorders"},
    {"code": "G35", "description": "Multiple sclerosis"},
    {"code": "G40", "description": "Epilepsy"},
    {"code": "G43", "description": "Migraine"},
    {"code": "G44", "description": "Other headache syndromes"},
    {"code": "G45", "description": "Transient cerebral ischaemic attacks"},
    {"code": "G62", "description": "Other polyneuropathies"},
    {"code": "H10", "description": "Conjunctivitis"},
    {"code": "H25", "description": "Senile cataract"},
    {"code": "H40", "description": "Glaucoma"},
    {"code": "H52", "description": "Disorders of refraction and accommodation"},
    {"code": "H60", "description": "Otitis externa"},
    {"code": "H65", "description": "Nonsuppurative otitis media"},
    {"code": "H66", "description": "Suppurative and unspecified otitis media"},
    {"code": "I10", "description": "Essential (primary) hypertension"},
    {"code": "I20", "description": "Angina pectoris"},
    {"code": "I21", "description": "Acute myocardial infarction"},
    {"code": "I25", "description": "Chronic ischaemic heart disease"},
    {"code": "I26", "description": "Pulmonary embolism"},
    {"code": "I48", "description": "Atrial fibrillation and flutter"},
    {"code": "I50", "description": "Heart failure"},
    {"code": "I63", "description": "Cerebral infarction (ischaemic stroke)"},
    {"code": "I64", "description": "Stroke, not specified as haemorrhage or infarction"},
    {"code": "I83", "description": "Varicose veins of lower extremities"},
    {"code": "J00", "description": "Acute nasopharyngitis (common cold)"},
    {"code": "J01", "description": "Acute sinusitis"},
    {"code": "J02", "description": "Acute pharyngitis"},
    {"code": "J03", "description": "Acute tonsillitis"},
    {"code": "J04", "description": "Acute laryngitis and tracheitis"},
    {"code": "J06", "description": "Acute upper respiratory infections, multiple sites"},
    {"code": "J11", "description": "Influenza, virus not identified"},
    {"code": "J18", "description": "Pneumonia, unspecified organism"},
    {"code": "J20", "description": "Acute bronchitis"},
    {"code": "J30", "description": "Vasomotor and allergic rhinitis"},
    {"code": "J32", "description": "Chronic sinusitis"},
    {"code": "J35", "description": "Chronic diseases of tonsils and adenoids"},
    {"code": "J40", "description": "Bronchitis, not specified as acute or chronic"},
    {"code": "J42", "description": "Unspecified chronic bronchitis"},
    {"code": "J44", "description": "COPD (chronic obstructive pulmonary disease)"},
    {"code": "J45", "description": "Asthma"},
    {"code": "J47", "description": "Bronchiectasis"},
    {"code": "J80", "description": "Acute respiratory distress syndrome"},
    {"code": "K02", "description": "Dental caries"},
    {"code": "K05", "description": "Gingivitis and periodontal diseases"},
    {"code": "K21", "description": "Gastro-oesophageal reflux disease (GERD)"},
    {"code": "K25", "description": "Gastric ulcer"},
    {"code": "K26", "description": "Duodenal ulcer"},
    {"code": "K29", "description": "Gastritis and duodenitis"},
    {"code": "K35", "description": "Acute appendicitis"},
    {"code": "K37", "description": "Unspecified appendicitis"},
    {"code": "K40", "description": "Inguinal hernia"},
    {"code": "K44", "description": "Diaphragmatic hernia"},
    {"code": "K57", "description": "Diverticular disease of intestine"},
    {"code": "K59", "description": "Other functional intestinal disorders"},
    {"code": "K70", "description": "Alcoholic liver disease"},
    {"code": "K74", "description": "Fibrosis and cirrhosis of liver"},
    {"code": "K80", "description": "Cholelithiasis (gallstones)"},
    {"code": "K85", "description": "Acute pancreatitis"},
    {"code": "K92", "description": "Other diseases of digestive system"},
    {"code": "L01", "description": "Impetigo"},
    {"code": "L02", "description": "Cutaneous abscess, furuncle and carbuncle"},
    {"code": "L03", "description": "Cellulitis"},
    {"code": "L04", "description": "Acute lymphadenitis"},
    {"code": "L20", "description": "Atopic dermatitis"},
    {"code": "L23", "description": "Allergic contact dermatitis"},
    {"code": "L30", "description": "Other and unspecified dermatitis"},
    {"code": "L40", "description": "Psoriasis"},
    {"code": "L50", "description": "Urticaria"},
    {"code": "L60", "description": "Nail disorders"},
    {"code": "M05", "description": "Seropositive rheumatoid arthritis"},
    {"code": "M06", "description": "Other rheumatoid arthritis"},
    {"code": "M10", "description": "Gout"},
    {"code": "M15", "description": "Polyarthrosis"},
    {"code": "M16", "description": "Coxarthrosis (osteoarthritis of hip)"},
    {"code": "M17", "description": "Gonarthrosis (osteoarthritis of knee)"},
    {"code": "M25", "description": "Other joint disorders"},
    {"code": "M40", "description": "Kyphosis and lordosis"},
    {"code": "M47", "description": "Spondylosis"},
    {"code": "M51", "description": "Other intervertebral disc disorders"},
    {"code": "M54", "description": "Dorsalgia (back pain)"},
    {"code": "M75", "description": "Shoulder lesions"},
    {"code": "M79", "description": "Other soft tissue disorders"},
    {"code": "N17", "description": "Acute kidney failure"},
    {"code": "N18", "description": "Chronic kidney disease (CKD)"},
    {"code": "N20", "description": "Calculus of kidney and ureter (kidney stone)"},
    {"code": "N30", "description": "Cystitis"},
    {"code": "N39", "description": "Other disorders of urinary system (UTI)"},
    {"code": "N40", "description": "Hyperplasia of prostate (BPH)"},
    {"code": "N41", "description": "Inflammatory diseases of prostate"},
    {"code": "N70", "description": "Salpingitis and oophoritis"},
    {"code": "N76", "description": "Other inflammation of vagina and vulva"},
    {"code": "N80", "description": "Endometriosis"},
    {"code": "N83", "description": "Noninflammatory disorders of ovary"},
    {"code": "O00", "description": "Ectopic pregnancy"},
    {"code": "O10", "description": "Pre-existing hypertension complicating pregnancy"},
    {"code": "O14", "description": "Pre-eclampsia"},
    {"code": "O20", "description": "Haemorrhage in early pregnancy"},
    {"code": "O42", "description": "Premature rupture of membranes"},
    {"code": "O80", "description": "Single spontaneous delivery"},
    {"code": "O82", "description": "Single delivery by caesarean section"},
    {"code": "P07", "description": "Disorders related to short gestation and low birth weight"},
    {"code": "R00", "description": "Abnormalities of heart beat"},
    {"code": "R04", "description": "Haemorrhage from respiratory passages"},
    {"code": "R05", "description": "Cough"},
    {"code": "R06", "description": "Abnormalities of breathing"},
    {"code": "R07", "description": "Pain in throat and chest"},
    {"code": "R10", "description": "Abdominal and pelvic pain"},
    {"code": "R11", "description": "Nausea and vomiting"},
    {"code": "R17", "description": "Unspecified jaundice"},
    {"code": "R19", "description": "Other digestive symptoms and signs"},
    {"code": "R20", "description": "Disturbances of skin sensation"},
    {"code": "R21", "description": "Rash and other nonspecific skin eruption"},
    {"code": "R25", "description": "Abnormal involuntary movements"},
    {"code": "R30", "description": "Pain associated with micturition"},
    {"code": "R42", "description": "Dizziness and giddiness"},
    {"code": "R50", "description": "Fever of unknown origin"},
    {"code": "R51", "description": "Headache"},
    {"code": "R52", "description": "Pain, unspecified"},
    {"code": "R53", "description": "Malaise and fatigue"},
    {"code": "R55", "description": "Syncope and collapse"},
    {"code": "R60", "description": "Oedema, not elsewhere classified"},
    {"code": "R63", "description": "Symptoms and signs concerning food and fluid intake"},
    {"code": "R68", "description": "Other general symptoms and signs"},
    {"code": "S00", "description": "Superficial injury of head"},
    {"code": "S01", "description": "Open wound of head"},
    {"code": "S06", "description": "Intracranial injury"},
    {"code": "S20", "description": "Superficial injury of thorax"},
    {"code": "S30", "description": "Superficial injury of abdomen"},
    {"code": "S40", "description": "Superficial injury of shoulder and upper arm"},
    {"code": "S52", "description": "Fracture of forearm"},
    {"code": "S62", "description": "Fracture at wrist and hand level"},
    {"code": "S80", "description": "Superficial injury of lower leg"},
    {"code": "S82", "description": "Fracture of lower leg"},
    {"code": "S92", "description": "Fracture of foot"},
    {"code": "T14", "description": "Injury of unspecified body region"},
    {"code": "T36", "description": "Poisoning by systemic antibiotics"},
    {"code": "T39", "description": "Poisoning by non-opioid analgesics"},
    {"code": "T63", "description": "Toxic effects of contact with venomous animals"},
    {"code": "T78", "description": "Adverse effects, not elsewhere classified"},
    {"code": "Z00", "description": "General examination, persons without complaint"},
    {"code": "Z03", "description": "Medical observation for suspected diseases ruled out"},
    {"code": "Z08", "description": "Follow-up after treatment for malignant neoplasms"},
    {"code": "Z11", "description": "Screening for infectious and parasitic diseases"},
    {"code": "Z12", "description": "Screening for malignant neoplasms"},
    {"code": "Z23", "description": "Encounter for immunization"},
    {"code": "Z34", "description": "Supervision of normal pregnancy"},
    {"code": "Z38", "description": "Liveborn infants"},
    {"code": "Z51", "description": "Encounter for other aftercare"},
    {"code": "Z71", "description": "Dietary counselling"},
    {"code": "Z79", "description": "Long-term (current) medication use"},
    {"code": "Z87", "description": "Personal history of other conditions"},
    {"code": "Z96", "description": "Presence of other functional implants"},
]


class ICD10SearchView(APIView):
    def get(self, request):
        q = request.query_params.get('q', '').strip().lower()
        if not q:
            return Response([])
        results = [
            c for c in _ICD10_CODES
            if q in c['code'].lower() or q in c['description'].lower()
        ][:10]
        return Response(results)
