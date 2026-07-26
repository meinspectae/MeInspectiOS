(async () => {
  const now = new Date().toISOString();
  const IMG = {
    ext: 'https://images.unsplash.com/photo-1546870518-fd056f6294f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
    lr1: 'https://images.unsplash.com/photo-1637747022660-12ce5ce4e420?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
    lr2: 'https://images.unsplash.com/photo-1637747019989-fec01a8d70fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
    kc1: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
    kc2: 'https://images.unsplash.com/photo-1610177534644-34d881503b83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
    mb1: 'https://images.unsplash.com/photo-1587985064135-0366536eab42?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
    mb2: 'https://images.unsplash.com/photo-1562438668-bcf0ca6578f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
  };
  const photo = (id, url) => ({ id, url, timestamp: now, gpsLat: 25.0805, gpsLng: 55.1403 });
  const item = (id, name, condition, comments, photos) => ({
    id, name, category: 'general', condition, comments: comments || '', photos: photos || [], checked: true,
  });
  const room = (id, name, icon, items, overallComments) => ({
    id, name, type: name.toLowerCase().replace(/\s+/g, '_'), icon, items, overallComments: overallComments || '', overallCondition: 'good',
  });

  const inspection = {
    id: 'dummy-qa-report-001',
    propertyType: 'apartment',
    status: 'completed',
    property: {
      type: 'apartment', makaniNumber: '4523781234', area: 'Dubai Marina', city: 'Dubai',
      buildingName: 'Marina Heights Tower A', unitNumber: '1204', totalAreaSqft: 1850,
      bedrooms: 3, bathrooms: 3, furnished: true, specialFeatures: [],
    },
    tenant: { name: 'Sarah Johnson', phone: '+971 55 876 4321', email: 's.johnson@example.com' },
    landlord: { name: 'Mohammed Al Sayed', phone: '+971 50 234 5678', email: 'm.alsayed@example.ae' },
    tenancy: { leaseStartDate: '2026-07-09', leaseEndDate: '2027-07-08', contractNumber: 'TC-88213' },
    rooms: [
      room('r1', 'Living Room', '🛋️', [
        item('r1i1', 'Flooring', 'good', 'Minor scuff near the window.', [photo('p1', IMG.lr1)]),
        item('r1i2', 'Walls & Paint', 'very_good', '', [photo('p2', IMG.lr2)]),
        item('r1i3', 'Windows', 'good', ''),
        item('r1i4', 'AC Unit', 'fair', 'Slight noise on high setting.'),
      ], 'Overall in good shape, ready for move-in.'),
      room('r2', 'Kitchen', '🍳', [
        item('r2i1', 'Cabinets', 'good', '', [photo('p3', IMG.kc1)]),
        item('r2i2', 'Countertop', 'very_good', '', [photo('p4', IMG.kc2)]),
        item('r2i3', 'Sink & Plumbing', 'good', ''),
        item('r2i4', 'Appliances', 'fair', 'Oven door handle loose.'),
      ], ''),
      room('r3', 'Master Bedroom', '🛏️', [
        item('r3i1', 'Flooring', 'very_good', '', [photo('p5', IMG.mb1)]),
        item('r3i2', 'Wardrobe', 'good', '', [photo('p6', IMG.mb2)]),
        item('r3i3', 'Windows', 'good', ''),
      ], ''),
      room('r4', 'Bedroom 2', '🛏️', [
        item('r4i1', 'Flooring', 'good'),
        item('r4i2', 'Walls & Paint', 'good'),
        item('r4i3', 'Windows', 'fair', 'Screen slightly torn.'),
      ], ''),
      room('r5', 'Master Bathroom', '🚿', [
        item('r5i1', 'Tiles', 'good'),
        item('r5i2', 'Shower', 'very_good'),
        item('r5i3', 'Vanity', 'good'),
      ], ''),
      room('r6', 'Balcony', '🌆', [
        item('r6i1', 'Flooring', 'good'),
        item('r6i2', 'Railing', 'very_good'),
      ], ''),
      room('r7', 'Hallway', '🚪', [
        item('r7i1', 'Flooring', 'good'),
        item('r7i2', 'Lighting', 'good'),
      ], ''),
    ],
    propertyItems: [],
    generalNotes: 'Dummy QA inspection generated for report layout verification.',
    overallPhotos: [photo('cover1', IMG.ext)],
    signatures: [
      { dataUrl: '', signedAt: now, role: 'tenant', name: 'Sarah Johnson' },
      { dataUrl: '', signedAt: now, role: 'landlord', name: 'Mohammed Al Sayed' },
      { dataUrl: '', signedAt: now, role: 'inspector', name: 'Ahmed Hassan' },
    ],
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    meta: {
      inspectorId: 'insp-qa-1', inspectorName: 'Ahmed Hassan', inspectorEmail: 'ahmed@meinspect.com',
      ipAddress: '91.73.49.22', location: { latitude: 25.0805, longitude: 55.1403 },
      deviceInfo: 'QA-Automation', appVersion: '1.0.0',
    },
    reportGenerated: false,
    payment: { paid: true, amount: 199, currency: 'AED', method: 'card' },
  };

  const persistValue = JSON.stringify({
    state: {
      inspections: [inspection],
      currentInspection: inspection,
      currentStep: 0,
      currentRoomIndex: 0,
      lastSyncTime: null,
      deletedIds: [],
    },
    version: 0,
  });

  const authUser = { id: 'qa-dummy-user', email: 'qa.dummy@meinspecttest.com', name: 'QA Tester' };
  localStorage.setItem('meinspect-auth', JSON.stringify({ state: { user: authUser }, version: 0 }));

  const dbReq = indexedDB.open('keyval-store', 1);
  await new Promise((resolve, reject) => {
    dbReq.onupgradeneeded = () => {
      dbReq.result.createObjectStore('keyval');
    };
    dbReq.onsuccess = resolve;
    dbReq.onerror = reject;
  });
  const db = dbReq.result;
  await new Promise((resolve, reject) => {
    const tx = db.transaction('keyval', 'readwrite');
    tx.objectStore('keyval').put(persistValue, 'propinspect-storage');
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  return 'INJECTED:' + inspection.id;
})()
