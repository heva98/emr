from apps.cashier.models import Invoice, InvoiceItem, ServiceCatalog


def generate_invoice_items(visit_id):
    """
    Rebuild auto-generated line items for a visit's invoice from completed
    lab orders, pharmacy dispensings, and consultation, then recalculate totals.
    """
    from apps.laboratory.models import LabOrderItem
    from apps.pharmacy.models import Dispensing
    from apps.opd.models import Consultation

    try:
        invoice = Invoice.objects.get(
            visit_id=visit_id,
            status__in=[Invoice.Status.DRAFT, Invoice.Status.ISSUED],
        )
    except Invoice.DoesNotExist:
        return

    # Rebuild auto-generated items from scratch
    invoice.items.filter(reference_type__in=[
        InvoiceItem.ReferenceType.LAB,
        InvoiceItem.ReferenceType.PHARMACY,
        InvoiceItem.ReferenceType.CONSULTATION,
    ]).delete()

    # Lab items — RESULTED or VERIFIED order items
    lab_items = (
        LabOrderItem.objects
        .filter(order__visit_id=visit_id, status__in=['RESULTED', 'VERIFIED'])
        .select_related('test')
    )
    for item in lab_items:
        catalog = ServiceCatalog.objects.filter(
            name=item.test.name,
            service_type=ServiceCatalog.ServiceType.LAB,
            is_active=True,
        ).first()
        unit_price = catalog.unit_price if catalog else item.test.price
        InvoiceItem.objects.create(
            invoice=invoice,
            description=item.test.name,
            service_catalog=catalog,
            quantity=1,
            unit_price=unit_price,
            reference_type=InvoiceItem.ReferenceType.LAB,
            reference_id=item.id,
        )

    # Pharmacy items — all dispensings for this visit
    dispensings = (
        Dispensing.objects
        .filter(prescription_item__prescription__visit_id=visit_id)
        .select_related('prescription_item__drug', 'stock_item')
    )
    for d in dispensings:
        InvoiceItem.objects.create(
            invoice=invoice,
            description=d.prescription_item.drug.name,
            service_catalog=None,
            quantity=d.quantity_dispensed,
            unit_price=d.stock_item.selling_price,
            reference_type=InvoiceItem.ReferenceType.PHARMACY,
            reference_id=d.id,
        )

    # Consultation — use first active CONSULTATION service catalog entry
    try:
        consultation = Consultation.objects.get(visit_id=visit_id)
        catalog = ServiceCatalog.objects.filter(
            service_type=ServiceCatalog.ServiceType.CONSULTATION,
            is_active=True,
        ).first()
        if catalog:
            InvoiceItem.objects.create(
                invoice=invoice,
                description="Consultation",
                service_catalog=catalog,
                quantity=1,
                unit_price=catalog.unit_price,
                reference_type=InvoiceItem.ReferenceType.CONSULTATION,
                reference_id=consultation.id,
            )
    except Consultation.DoesNotExist:
        pass

    # Recalculate invoice totals
    subtotal = sum(i.subtotal for i in invoice.items.all())
    invoice.subtotal = subtotal
    invoice.total_amount = max(0, subtotal - invoice.discount_amount)
    invoice.balance_due = max(0, invoice.total_amount - invoice.amount_paid)
    invoice.save()
