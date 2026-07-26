#!/usr/bin/env python3
"""
Generate a sample MeInspect PDF report that matches the exact format
produced by the app's ReportPage.tsx component.
"""

import subprocess
import os

# ---------------------------------------------------------------------------
# Image assets – Unsplash small
# ---------------------------------------------------------------------------
IMGS = {
    # Exterior / cover
    "ext1": "https://images.unsplash.com/photo-1546870518-fd056f6294f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "ext2": "https://images.unsplash.com/photo-1681752939271-d2fddc8e7aaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "ext3": "https://images.unsplash.com/photo-1640877268187-2fa6b2ed7a5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    # Living Room
    "lr1": "https://images.unsplash.com/photo-1637747022660-12ce5ce4e420?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "lr2": "https://images.unsplash.com/photo-1637747019989-fec01a8d70fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "lr3": "https://images.unsplash.com/photo-1654520015092-b9b4ddf2e7c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    # Kitchen
    "kc1": "https://images.unsplash.com/photo-1502005097973-6a7082348e28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "kc2": "https://images.unsplash.com/photo-1610177534644-34d881503b83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "kc3": "https://images.unsplash.com/photo-1671197244266-73129c97c096?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    # Master Bedroom
    "mb1": "https://images.unsplash.com/photo-1587985064135-0366536eab42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "mb2": "https://images.unsplash.com/photo-1562438668-bcf0ca6578f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "mb3": "https://images.unsplash.com/photo-1651132205872-091b35e72b15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    # Bedroom 2
    "bd2a": "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "bd2b": "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    # Master Bathroom
    "mba1": "https://images.unsplash.com/photo-1661107259637-4e1c55462428?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "mba2": "https://images.unsplash.com/photo-1642755622932-d1e0cb783dc5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    # Balcony
    "bal1": "https://images.unsplash.com/photo-1637074230744-55d9824eed89?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "bal2": "https://images.unsplash.com/photo-1509485087514-0ee54374c6c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    # Hallway
    "hal1": "https://images.unsplash.com/photo-1719474815675-70b264f18962?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "hal2": "https://images.unsplash.com/photo-1637747020120-74c5d5cbb4c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    # Bathroom 2
    "ba2a": "https://images.unsplash.com/photo-1576698483491-8c43f0862543?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
    "ba2b": "https://images.unsplash.com/photo-1644421439741-712c7fde7e95?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600",
}

REPORT_ID    = "A7F2C9B1"
REPORT_HASH  = "9e4a2f1b8c3d7e0a1f4b9c2d5e8f3a6b"
TIMESTAMP    = "16 Jul 2026 10:32:14"
GPS          = "25.088422, 55.139742"
IP_ADDRESS   = "192.168.1.45"
INSPECTOR    = "Ahmed Al Rashidi"
PAGE_TOTAL   = 7   # Cover + Disclaimer + 4 rooms + Signatures

A4_WIDTH     = 794
A4_HEIGHT    = 1040

# ---------------------------------------------------------------------------
# Helper – condition badge (matches app getConditionBg + getConditionLabel)
# ---------------------------------------------------------------------------
COND_STYLES = {
    "very_good": "background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;",
    "good":      "background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#166534;",
    "fair":      "background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;",
    "poor":      "background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b;",
    "na":        "background:#f8fafc;color:#94a3b8;border:1px dashed #cbd5e1;",
}
COND_LABELS = {
    "very_good": "Very Good",
    "good":      "Good",
    "fair":      "Fair",
    "poor":      "Poor",
    "na":        "N/A",
}

def cond_badge(key):
    style = COND_STYLES.get(key, COND_STYLES["na"])
    label = COND_LABELS.get(key, "N/A")
    return f'<span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:8px;font-weight:600;{style}">{label}</span>'

def photo_thumb(url, ts="16 Jul 2026 10:35:00"):
    return f'''
    <div style="position:relative;">
      <img src="{url}" alt="photo" crossorigin="anonymous"
           style="width:100px;height:75px;object-fit:cover;border-radius:6px;
                  border:1px solid #e2e8f0;display:block;" />
      <div style="font-size:6px;color:#94a3b8;text-align:center;margin-top:2px;">{ts}</div>
    </div>'''

# ---------------------------------------------------------------------------
# Shared page-header / page-footer (matches PageHeader / PageFooter in app)
# ---------------------------------------------------------------------------
PAGE_HEADER = f"""
<div style="border-bottom:1.5px solid #2563eb;padding:6px 30px;display:flex;
            align-items:center;justify-content:space-between;background:#ffffff;
            font-size:8px;color:#64748b;">
  <div style="display:flex;align-items:center;gap:6px;">
    <img src="file:///workspace/public/meinspect-logo.png" alt="MeInspect" style="width:20px;height:20px;object-fit:contain;border-radius:4px;" />
    <span style="font-weight:700;color:#1e293b;font-size:9px;">MeInspect</span>
  </div>
  <div style="display:flex;align-items:center;gap:12px;">
    <span style="font-family:monospace;font-weight:600;">🔖 RPT-{REPORT_ID}</span>
    <span style="font-family:monospace;font-size:7.5px;color:#94a3b8;">⏱ {TIMESTAMP}</span>
    <span style="font-family:monospace;font-size:6.5px;color:#94a3b8;">🔒 {REPORT_HASH[:16]}…</span>
  </div>
</div>"""

def page_footer(page_num):
    return f"""
<div style="border-top:1px solid #e2e8f0;padding:5px 30px;display:flex;
            justify-content:space-between;align-items:center;font-size:7.5px;
            color:#94a3b8;background:#f8fafc;margin-top:auto;flex-shrink:0;">
  <div style="display:flex;gap:12px;align-items:center;">
    <span>📍 GPS: {GPS}</span>
    <span>🌐 IP: {IP_ADDRESS}</span>
  </div>
  <div style="font-weight:600;">Page {page_num} of {PAGE_TOTAL}</div>
</div>"""

# ---------------------------------------------------------------------------
# Info row compact (matches InfoRowCompact helper)
# ---------------------------------------------------------------------------
def info_row(label, value):
    return f"""
    <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;">
      <span style="font-size:8px;font-weight:600;color:#94a3b8;text-transform:uppercase;flex-shrink:0;">{label}</span>
      <span style="font-size:9px;font-weight:600;color:#334155;text-align:right;">{value}</span>
    </div>"""

# ---------------------------------------------------------------------------
# Mini stat card (matches MiniStat helper)
# ---------------------------------------------------------------------------
def mini_stat(label, value, color):
    return f"""
    <div style="text-align:center;padding:4px;background:#ffffff;border-radius:6px;border:1px solid #f1f5f9;">
      <div style="font-size:10px;font-weight:800;color:{color};">{value}</div>
      <div style="font-size:7px;font-weight:600;color:#94a3b8;text-transform:uppercase;">{label}</div>
    </div>"""

# ---------------------------------------------------------------------------
# PAGE 1 — Cover Page  (matches the "Cover Page" div in ReportPage.tsx)
# ---------------------------------------------------------------------------
PAGE_COVER = f"""
<div style="page-break-after:always;display:flex;flex-direction:column;
            background:#ffffff;">
  {PAGE_HEADER}

  <!-- Blue title bar -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);
              padding:18px 40px 16px;text-align:center;">
    <h1 style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;
               line-height:1.2;margin-bottom:2px;">Property Condition Report</h1>
    <div style="color:rgba(255,255,255,0.75);font-size:10px;font-weight:500;">
      Residential Apartment — Condition Assessment
    </div>
  </div>

  <!-- Property name & address -->
  <div style="padding:14px 40px 0;text-align:center;">
    <h2 style="font-size:18px;font-weight:800;color:#1e293b;margin-bottom:2px;">
      Marina Heights — Unit 1204
    </h2>
    <p style="font-size:11px;color:#64748b;font-weight:500;">Dubai Marina, Dubai</p>
  </div>

  <!-- Cover photo -->
  <div style="padding:10px 40px;text-align:center;">
    <img src="{IMGS['ext2']}" alt="Property exterior" crossorigin="anonymous"
         style="max-width:380px;width:100%;height:auto;max-height:180px;object-fit:contain;
                border-radius:10px;border:1px solid #e2e8f0;display:block;margin:0 auto;" />
    <div style="font-size:8px;color:#94a3b8;margin-top:4px;">
      📷 {TIMESTAMP}
    </div>
  </div>

  <!-- Property Details compact grid -->
  <div style="padding:6px 40px 0;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
                padding:10px 14px;margin-bottom:10px;">
      <h3 style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;
                 letter-spacing:0.8px;margin-bottom:6px;">Property Details</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px 16px;">
        {info_row("Type","Residential Apartment")}
        {info_row("Area","Dubai Marina")}
        {info_row("City","Dubai")}
        {info_row("Building","Marina Heights Tower A")}
        {info_row("Unit","1204 (12th Floor)")}
        {info_row("Makani","4523781234")}
        {info_row("Area (sqft)","1,850")}
        {info_row("Beds","3")}
        {info_row("Baths","3")}
        {info_row("Furnished","Yes")}
      </div>
    </div>

    <!-- Landlord + Tenant boxes -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div style="background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);
                  border:1px solid #fde68a;border-radius:8px;padding:8px 12px;">
        <div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:4px;">🏢 Landlord</div>
        <div style="font-size:10px;line-height:1.6;color:#78350f;">
          <div><span style="font-weight:600;">Name:</span> Mohammed Al Sayed</div>
          <div><span style="font-weight:600;">Phone:</span> +971 50 234 5678</div>
          <div><span style="font-weight:600;">Email:</span> m.alsayed@example.ae</div>
        </div>
      </div>
      <div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);
                  border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;">
        <div style="font-size:9px;font-weight:700;color:#1e40af;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:4px;">👤 Tenant</div>
        <div style="font-size:10px;line-height:1.6;color:#1e3a8a;">
          <div><span style="font-weight:600;">Name:</span> Sarah Johnson</div>
          <div><span style="font-weight:600;">Phone:</span> +971 55 876 4321</div>
          <div><span style="font-weight:600;">Email:</span> s.johnson@example.com</div>
        </div>
      </div>
    </div>

    <!-- Summary + Tenancy boxes -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;">
        <div style="font-size:9px;font-weight:700;color:#166534;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:6px;">📊 Inspection Summary</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          {mini_stat("Rooms","5","#2563eb")}
          {mini_stat("Items","47/53","#059669")}
          {mini_stat("Good","38","#0891b2")}
          {mini_stat("Issues","2","#dc2626")}
        </div>
      </div>
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:8px 12px;">
        <div style="font-size:9px;font-weight:700;color:#6b21a8;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:6px;">📄 Tenancy Details</div>
        <div style="font-size:10px;line-height:1.8;color:#581c87;">
          {info_row("Lease Start","17 Jul 2026")}
          {info_row("Lease End","16 Jul 2027")}
          {info_row("Contract","EJ-2026-7841235")}
        </div>
      </div>
    </div>
  </div>

  {page_footer(1)}
</div>"""

# ---------------------------------------------------------------------------
# PAGE 2 — Disclaimer Page
# ---------------------------------------------------------------------------
PAGE_DISCLAIMER = f"""
<div style="page-break-after:always;display:flex;flex-direction:column;
            background:#ffffff;">
  {PAGE_HEADER}
  <div style="padding:16px 40px;flex:1;">
    <div style="margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #2563eb;">
      <h2 style="font-size:13px;font-weight:800;color:#1e293b;">
        Disclaimer &amp; Terms / إخلاء المسؤولية والشروط
      </h2>
    </div>

    <!-- English -->
    <div style="margin-bottom:10px;">
      <h3 style="font-size:9.5px;font-weight:700;color:#1e3a8a;margin-bottom:4px;
                 text-transform:uppercase;letter-spacing:0.5px;">ENGLISH</h3>
      <div style="background:#f8fafc;border:1px solid #dbeafe;border-radius:8px;
                  padding:10px 12px;font-size:8px;line-height:1.65;color:#334155;">
        <p style="margin-bottom:5px;"><strong>1. Purpose &amp; Scope:</strong> This Property Condition Report ("Report") has been prepared using the MeInspect application ("Application") for informational and documentation purposes only. The Report provides a general assessment of the observable condition of the property at the date and time of inspection. It does not constitute a structural survey, engineering assessment, legal opinion, or valuation.</p>
        <p style="margin-bottom:5px;"><strong>2. Limitations:</strong> The inspection is limited to visually accessible areas and items. Concealed, inaccessible, or underground components are excluded. The inspector does not move furniture, lift flooring, or inspect inside walls, ceilings, or enclosed spaces unless otherwise stated.</p>
        <p style="margin-bottom:5px;"><strong>3. No Warranty:</strong> The Report does not imply any warranty or guarantee regarding the condition, fitness for purpose, or safety of the property. MeInspect and the inspector make no representations that the property is free from defects not identified in this Report.</p>
        <p style="margin-bottom:5px;"><strong>4. Liability:</strong> To the maximum extent permitted by applicable law, MeInspect, its directors, employees, and agents shall not be liable for any direct, indirect, incidental, or consequential loss or damage arising from reliance on this Report. The total liability of MeInspect shall not exceed the fee paid for this inspection.</p>
        <p style="margin-bottom:5px;"><strong>5. Digital Integrity:</strong> This Report contains a cryptographic hash and geolocation metadata to verify its authenticity. Any alteration of this document invalidates its authenticity. The digital signatures appended herein constitute legally binding consent by all signing parties.</p>
        <p style="margin-bottom:5px;"><strong>6. Governing Law:</strong> This Report and any disputes arising from it shall be governed by the laws of the United Arab Emirates. Any disputes shall be subject to the exclusive jurisdiction of the courts of the UAE.</p>
        <p><strong>7. Privacy:</strong> Personal data collected in this Report is processed in accordance with UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection. Data is used solely for property inspection documentation and will not be shared with third parties without consent.</p>
      </div>
    </div>

    <!-- Arabic -->
    <div>
      <h3 style="font-size:9.5px;font-weight:700;color:#1e3a8a;margin-bottom:4px;
                 direction:rtl;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">العربية</h3>
      <div style="background:#f8fafc;border:1px solid #dbeafe;border-radius:8px;
                  padding:10px 12px;font-size:8px;line-height:1.75;color:#334155;
                  direction:rtl;text-align:right;">
        <p style="margin-bottom:5px;"><strong>١. الغرض والنطاق:</strong> تم إعداد تقرير حالة العقار هذا ("التقرير") باستخدام تطبيق MeInspect ("التطبيق") لأغراض المعلومات والتوثيق فحسب. يقدّم التقرير تقييمًا عامًا للحالة الظاهرية للعقار في تاريخ ووقت الفحص، ولا يُعدّ مسحًا هيكليًا أو تقييمًا هندسيًا أو رأيًا قانونيًا أو تقييمًا للقيمة السوقية.</p>
        <p style="margin-bottom:5px;"><strong>٢. القيود:</strong> يقتصر الفحص على المناطق والعناصر المرئية والمتاحة. تُستثنى الأجزاء المخفية أو غير القابلة للوصول أو تحت الأرض. لا يقوم المفتش بتحريك الأثاث أو رفع الأرضيات أو فحص داخل الجدران والأسقف والمساحات المغلقة إلا إذا نُصَّ على ذلك.</p>
        <p style="margin-bottom:5px;"><strong>٣. لا ضمان:</strong> لا يعني التقرير أي ضمان أو كفالة تتعلق بحالة العقار أو صلاحيته أو سلامته. لا يُقدّم MeInspect والمفتش أي تأكيدات بخلو العقار من عيوب لم يُشر إليها في هذا التقرير.</p>
        <p style="margin-bottom:5px;"><strong>٤. المسؤولية:</strong> في أقصى الحدود التي يسمح بها القانون المعمول به، لن يتحمل MeInspect أو مديروه أو موظفوه أو وكلاؤه أي مسؤولية عن خسائر أو أضرار مباشرة أو غير مباشرة أو عرضية أو تبعية ناجمة عن الاعتماد على هذا التقرير.</p>
        <p style="margin-bottom:5px;"><strong>٥. النزاهة الرقمية:</strong> يتضمن هذا التقرير تجزئة تشفيرية وبيانات تعريف جغرافية للتحقق من صحته. أي تعديل على هذه الوثيقة يُبطل أصالتها. تُشكّل التوقيعات الرقمية المرفقة موافقة قانونية ملزمة من جميع الأطراف الموقّعة.</p>
        <p><strong>٦. القانون الحاكم:</strong> يخضع هذا التقرير وأي نزاعات تنشأ عنه لقوانين دولة الإمارات العربية المتحدة، وتختص محاكم الدولة حصرًا بالنظر في أي نزاعات تتعلق به.</p>
      </div>
    </div>
  </div>
  {page_footer(2)}
</div>"""

# ---------------------------------------------------------------------------
# Rooms data – matches the data structure from InspectionForm rooms
# ---------------------------------------------------------------------------
ROOMS = [
    {
        "name": "Living Room & Dining",
        "icon": "🛋️",
        "page": 3,
        "items": [
            ("Flooring (Porcelain Tile)", "very_good", "No scratches or cracks. Clean and polished.", [("lr1","16 Jul 2026 10:40:00"), ("lr2","16 Jul 2026 10:41:00")]),
            ("Walls & Painting", "good", "Fresh coat of paint. Minor scuff near sofa.", [("lr3","16 Jul 2026 10:42:00")]),
            ("Ceiling & Cornices", "good", "No cracks. LED downlights all functional.", []),
            ("Windows & Glazing", "very_good", "Double-glazed, fully functional, no chips.", []),
            ("A/C Unit & Remote", "very_good", "Cooling tested — 18°C reached. Remote works.", []),
            ("Electrical Sockets", "good", "All 6 sockets tested and functional.", []),
            ("Balcony Door & Track", "good", "Slides smoothly. No rust on track.", [("bal1","16 Jul 2026 10:45:00")]),
            ("Curtains & Rails", "good", "Blackout curtains in good condition.", []),
        ],
        "notes": "Living area and dining zone in good overall condition. Pre-existing minor scuff on wall documented.",
    },
    {
        "name": "Kitchen",
        "icon": "🍳",
        "page": 4,
        "items": [
            ("Upper Cabinets", "good", "All hinges functional. No delamination.", [("kc1","16 Jul 2026 11:05:00")]),
            ("Lower Cabinets & Drawers", "good", "Soft-close drawers working. Minor scratch on door.", [("kc2","16 Jul 2026 11:06:00")]),
            ("Countertop (Marble)", "very_good", "No chips or stains. Polished surface.", [("kc3","16 Jul 2026 11:07:00")]),
            ("Sink & Tap (Mixer)", "good", "No drips. Hot and cold water confirmed.", []),
            ("Gas Hob (4-burner)", "good", "All 4 burners ignite. No gas leak detected.", []),
            ("Built-in Oven", "very_good", "Thermostat verified at 180°C. Door seal intact.", []),
            ("Extractor Hood", "good", "All 3 speed settings functional. Filters clean.", []),
            ("Fridge-Freezer", "good", "Cooling normal. No odour. Both compartments clean.", []),
            ("Dishwasher", "good", "Full cycle completed without error.", []),
            ("Splash-back Tiles", "good", "No cracked or loose tiles observed.", []),
        ],
        "notes": "",
    },
    {
        "name": "Master Bedroom",
        "icon": "🛏️",
        "page": 5,
        "items": [
            ("Flooring (Engineered Wood)", "very_good", "No gaps or warping. Polished and clean.", [("mb1","16 Jul 2026 11:25:00"), ("mb2","16 Jul 2026 11:26:00")]),
            ("Walls & Painting", "good", "Even finish. No marks.", []),
            ("Ceiling & Coving", "good", "No cracks or water stains.", []),
            ("Windows & Blinds", "good", "Motorised blinds operational.", [("mb3","16 Jul 2026 11:28:00")]),
            ("King-Size Bed Frame", "good", "Sturdy. No squeaking. Slats all present.", []),
            ("Built-in Wardrobes", "good", "2-panel sliding. All hangers present.", []),
            ("Bedside Tables (×2)", "good", "No damage. Drawers slide properly.", []),
            ("A/C Split Unit", "very_good", "Cooling confirmed. Filter clean.", []),
        ],
        "notes": "",
    },
    {
        "name": "Master Bathroom (En-Suite)",
        "icon": "🚿",
        "page": 6,
        "items": [
            ("Floor Tiles", "very_good", "Non-slip. No cracks or loose tiles.", [("mba1","16 Jul 2026 11:35:00")]),
            ("Wall Tiles", "good", "No chips. Grout clean.", [("mba2","16 Jul 2026 11:36:00")]),
            ("Double Vanity & Basin", "good", "Both basins drain freely. No stains.", []),
            ("Walk-in Shower Enclosure", "good", "Glass door closes properly. No water ingress.", []),
            ("Bathtub (Freestanding)", "good", "No chips. Drain clear. Taps functional.", []),
            ("Hot Water Supply", "very_good", "Hot water within 30 seconds. Temp stable.", []),
            ("Toilet & Flush", "very_good", "Dual flush working. No leaks at base.", []),
            ("Exhaust Fan", "good", "Extracts well. Minimal noise.", []),
            ("Heated Towel Rail", "good", "Heats uniformly. Switch functional.", []),
        ],
        "notes": "",
    },
    {
        "name": "Balcony",
        "icon": "🌅",
        "page": 7,
        "items": [
            ("Balcony Tiles", "good", "Non-slip. No cracks.", [("bal1","16 Jul 2026 12:05:00"), ("bal2","16 Jul 2026 12:06:00")]),
            ("Railing & Balustrade", "good", "Secure. No rust. Height compliant.", []),
            ("Balcony Door Track", "good", "Slides freely. Weather seal intact.", []),
            ("Drain / Waterproofing", "good", "Drain clear. No pooling observed.", []),
        ],
        "notes": "Marina waterfront view fully intact. No visible structural concerns on balcony slab.",
    },
]

def render_room_page(room):
    items_html = ""
    for (name, cond, comment, photos) in room["items"]:
        photos_html = ""
        if photos:
            photos_html = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">'
            for (img_key, ts) in photos:
                if img_key in IMGS:
                    photos_html += photo_thumb(IMGS[img_key], ts)
            photos_html += '</div>'
        items_html += f"""
        <div style="padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid #f1f5f9;">
          <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:2px;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-weight:600;font-size:10px;color:#334155;">{name}</span>
                {cond_badge(cond)}
              </div>
              {'<div style="font-size:9px;color:#64748b;margin-top:2px;">'+comment+'</div>' if comment else ''}
            </div>
          </div>
          {photos_html}
        </div>"""

    notes_html = ""
    if room.get("notes"):
        notes_html = f"""
        <div style="margin-top:8px;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;
                    border-radius:8px;font-size:9px;color:#7c2d12;">
          <strong>Room Notes:</strong> {room['notes']}
        </div>"""

    return f"""
<div style="page-break-after:always;display:flex;flex-direction:column;
            background:#ffffff;">
  {PAGE_HEADER}
  <div style="padding:16px 40px;flex:1;">
    <!-- Room section header matching app's ReportSection component -->
    <div style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:6px;
                  border-bottom:2px solid #e2e8f0;position:relative;">
        <div style="position:absolute;bottom:-2px;left:0;width:40px;height:2px;
                    background:#ea580c;border-radius:1px;"></div>
        <div style="width:22px;height:22px;background:#ea580c22;border-radius:6px;
                    display:flex;align-items:center;justify-content:center;font-size:12px;">
          {room['icon']}
        </div>
        <h3 style="font-size:12px;font-weight:700;color:#1e293b;letter-spacing:-0.2px;">
          {room['name']} Assessment
        </h3>
      </div>
    </div>

    <!-- Items table matching app's room items rendering -->
    <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);
                  border-bottom:1px solid #e2e8f0;padding:8px 14px;
                  display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">{room['icon']}</span>
          <div style="font-weight:700;font-size:12px;color:#1e293b;">{room['name']}</div>
        </div>
      </div>
      <div style="padding:10px 14px;">
        {items_html}
      </div>
    </div>
    {notes_html}
  </div>
  {page_footer(room['page'])}
</div>"""

# ---------------------------------------------------------------------------
# PAGE LAST — Signatures Page
# ---------------------------------------------------------------------------
PAGE_SIGNATURES = f"""
<div style="display:flex;flex-direction:column;background:#ffffff;">
  {PAGE_HEADER}
  <div style="padding:16px 40px;flex:1;">
    <div style="margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #2563eb;">
      <h2 style="font-size:13px;font-weight:800;color:#1e293b;">
        Digital Signatures &amp; Legal Declaration
      </h2>
    </div>

    <!-- Legal Declaration matching app's Signatures page -->
    <div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);
                border:1.5px solid #93c5fd;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
      <div style="font-size:9.5px;font-weight:700;color:#1e40af;margin-bottom:6px;
                  text-transform:uppercase;letter-spacing:0.5px;">⚖️ Legal Declaration / إقرار قانوني</div>
      <p style="font-size:8px;line-height:1.7;color:#1e3a8a;margin-bottom:6px;">
        By signing below, all parties confirm that they have read, understood, and agree to the contents
        of this Property Condition Report. The signatories acknowledge that:
      </p>
      <ul style="font-size:8px;line-height:1.8;color:#1e3a8a;padding-left:14px;margin-bottom:6px;">
        <li>The information contained in this Report accurately reflects the condition of the property as
          observed at the time of inspection on <strong>{TIMESTAMP}</strong>.</li>
        <li>This Report constitutes a legally binding record of the property's condition at move-in / move-out
          and may be used in any dispute resolution, mediation, or legal proceedings.</li>
        <li>Any party who signs this document digitally does so with full understanding that the digital
          signature carries the same legal weight as a handwritten signature under UAE Federal Law No. 1
          of 2006 on Electronic Commerce and Transactions.</li>
        <li>The Report hash code printed in every page header serves as a tamper-evident seal; any
          modification to the document will invalidate this hash.</li>
      </ul>
      <p style="font-size:8px;line-height:1.7;color:#1e3a8a;direction:rtl;text-align:right;
                border-top:1px solid #bfdbfe;padding-top:6px;margin-top:4px;">
        بالتوقيع أدناه، يُقرّ جميع الأطراف بأنهم قرأوا محتوى هذا التقرير وفهموه ووافقوا عليه، وأن التوقيع
        الرقمي يحمل نفس القيمة القانونية للتوقيع بخط اليد وفقًا لقانون الإمارات العربية المتحدة الاتحادي رقم
        1 لسنة 2006 بشأن المعاملات والتجارة الإلكترونية.
      </p>
    </div>

    <!-- Signature blocks (3 columns matching app's grid) -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
      <!-- Tenant -->
      <div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:10px;
                  text-align:center;background:#fafafa;">
        <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;
                    margin-bottom:6px;letter-spacing:0.5px;">Tenant</div>
        <div style="height:50px;display:flex;align-items:center;justify-content:center;
                    font-family:cursive;font-size:18px;color:#1e3a8a;">Sarah J.</div>
        <div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:4px;">
          <div style="font-size:8.5px;font-weight:700;color:#1e293b;">Sarah Johnson</div>
          <div style="font-size:7px;color:#64748b;margin-top:1px;">{TIMESTAMP}</div>
        </div>
      </div>
      <!-- Landlord -->
      <div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:10px;
                  text-align:center;background:#fafafa;">
        <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;
                    margin-bottom:6px;letter-spacing:0.5px;">Landlord</div>
        <div style="height:50px;display:flex;align-items:center;justify-content:center;
                    font-family:cursive;font-size:18px;color:#1e3a8a;">M. Al Sayed</div>
        <div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:4px;">
          <div style="font-size:8.5px;font-weight:700;color:#1e293b;">Mohammed Al Sayed</div>
          <div style="font-size:7px;color:#64748b;margin-top:1px;">{TIMESTAMP}</div>
        </div>
      </div>
      <!-- Inspector -->
      <div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:10px;
                  text-align:center;background:#fafafa;">
        <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;
                    margin-bottom:6px;letter-spacing:0.5px;">Inspector</div>
        <div style="height:50px;display:flex;align-items:center;justify-content:center;
                    font-family:cursive;font-size:18px;color:#1e3a8a;">A. Al Rashidi</div>
        <div style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:4px;">
          <div style="font-size:8.5px;font-weight:700;color:#1e293b;">{INSPECTOR}</div>
          <div style="font-size:7px;color:#64748b;margin-top:1px;">{TIMESTAMP}</div>
        </div>
      </div>
    </div>

    <!-- Metadata summary (matches app's report metadata footer) -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
                padding:8px 12px;font-size:7.5px;color:#64748b;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
        <span><strong>Report ID:</strong> RPT-{REPORT_ID}</span>
        <span><strong>Inspection Date:</strong> {TIMESTAMP}</span>
        <span><strong>Inspector:</strong> {INSPECTOR}</span>
        <span><strong>IP:</strong> {IP_ADDRESS}</span>
        <span><strong>GPS:</strong> {GPS}</span>
        <span><strong>Hash:</strong> {REPORT_HASH[:20]}…</span>
      </div>
    </div>
  </div>
  {page_footer(PAGE_TOTAL)}
</div>"""

# ---------------------------------------------------------------------------
# Full HTML document
# ---------------------------------------------------------------------------
rooms_html = "\n".join(render_room_page(r) for r in ROOMS)

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Marina Heights Tower A Unit 1204, Dubai Marina - Mohammed Al Sayed - {TIMESTAMP.split(',')[0]}</title>
<style>
  /* Reset */
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    color: #1e293b;
    background: #ffffff;
    width: {A4_WIDTH}px;
    margin: 0 auto;
  }}
  @media print {{
    body {{ padding: 0; }}
    * {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  }}
</style>
</head>
<body>
{PAGE_COVER}
{PAGE_DISCLAIMER}
{rooms_html}
{PAGE_SIGNATURES}
</body>
</html>"""

# ---------------------------------------------------------------------------
# Write HTML
# ---------------------------------------------------------------------------
html_path = "/workspace/scripts/sample-report.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"HTML written to {html_path}  ({len(HTML):,} bytes)")
print("Now generating PDF...")

# ---------------------------------------------------------------------------
# Generate PDF with headless Chromium
# ---------------------------------------------------------------------------
pdf_filename = f"Marina-Heights-Tower-A-Unit-1204-Dubai-Marina-Mohammed-Al-Sayed-{TIMESTAMP.split(',')[0].replace(' ', '-')}.pdf"
pdf_path = "/workspace/chat/" + pdf_filename
result = subprocess.run([
    "/usr/bin/chromium",
    "--no-sandbox",
    "--headless",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--run-all-compositor-stages-before-draw",
    "--print-to-pdf=" + pdf_path,
    "--print-to-pdf-no-header",
    "--virtual-time-budget=30000",
    html_path
], capture_output=True, text=True, timeout=120)

print("STDOUT:", result.stdout[:500])
print("STDERR:", result.stderr[:500])
print("Return code:", result.returncode)

if os.path.exists(pdf_path):
    size = os.path.getsize(pdf_path)
    print(f"✅ PDF generated: {pdf_path} ({size:,} bytes)")
    # Copy to dist and public
    import shutil
    for dest in [
        "/workspace/public/sample-inspection-report.pdf",
        "/workspace/dist/sample-inspection-report.pdf",
    ]:
        shutil.copy2(pdf_path, dest)
        print(f"   Copied to {dest}")
else:
    print("❌ PDF file not found!")
