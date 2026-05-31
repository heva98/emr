from django.apps import AppConfig


class CashierConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.cashier"

    def ready(self):
        from django.db.models.signals import post_save

        from apps.opd.models import Referral
        from apps.cashier.models import Invoice
        from apps.cashier.billing_service import generate_invoice_items

        def _referral_cashier(sender, instance, created, **kwargs):
            if not created or instance.referred_to != 'CASHIER':
                return
            visit = instance.consultation.visit
            Invoice.objects.get_or_create(
                visit=visit,
                defaults={
                    'patient': visit.patient,
                    'created_by': instance.consultation.doctor,
                },
            )
            generate_invoice_items(visit.id)

        post_save.connect(
            _referral_cashier,
            sender=Referral,
            dispatch_uid='cashier_referral_to_invoice',
        )
