import { Hono } from "hono";
import type { Client } from "@sdk/server-types";
import { tables, buckets } from "@generated";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

function getEnv(): "staging" | "production" {
  // ENVIRONMENT is bound via wrangler.toml [vars]
  // Access it through the Hono context's env in route handlers,
  // but for static calls we default to 'production' for safety.
  return "production";
}

function tryParse(json: string | null | undefined): any {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

/**
 * Verify that the authenticated user owns the given inspection.
 * Returns the inspection row if authorized, or sends an error response and returns null.
 */
async function requireOwnership(
  edgespark: Client<typeof tables>,
  userId: string,
  inspectionId: string
): Promise<any | null> {
  const rows = await edgespark.db
    .select()
    .from(tables.inspections)
    .where(
      and(
        eq(tables.inspections.id, inspectionId),
        eq(tables.inspections.userId, userId)
      )
    );
  if (rows.length === 0) return null;
  return rows[0];
}

export async function createApp(edgespark: Client<typeof tables>): Promise<Hono> {
  const app = new Hono();

  // Global error handler
  app.onError((err, c) => {
    console.error("[API] error:", err);
    return c.json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  });

  // ==================== USER PROFILE ENDPOINTS ====================
  // Authenticated endpoints — use edgespark.auth.user for identity

  // Save/update user profile (phone, location) — authenticated
  app.post('/api/user/profile', async (c) => {
    const userId = edgespark.auth.user!.id;
    const userEmail = edgespark.auth.user!.email || '';
    const { name, phone, location } = await c.req.json();

    const existing = await edgespark.db.select().from(tables.users)
      .where(eq(tables.users.id, userId));

    if (existing.length > 0) {
      await edgespark.db.update(tables.users).set({
        name: name !== undefined ? name : existing[0].name,
        phone: phone !== undefined ? phone : existing[0].phone,
        location: location !== undefined ? location : existing[0].location,
        email: userEmail || existing[0].email,
        updatedAt: new Date().toISOString(),
      }).where(eq(tables.users.id, userId));
    } else {
      // Create user record if it doesn't exist yet
      await edgespark.db.insert(tables.users).values({
        id: userId,
        email: userEmail,
        name: name || edgespark.auth.user!.name || '',
        phone: phone || '',
        location: location || '',
      });
    }
    return c.json({ success: true });
  });

  // Delete user account and all associated data
  app.delete('/api/user/account', async (c) => {
    if (!edgespark.auth.user) return c.json({ error: 'Unauthorized' }, 401);
    const userId = edgespark.auth.user!.id;

    try {
      // Delete all inspections for this user (cascade should handle related data)
      await edgespark.db.delete(tables.inspections)
        .where(eq(tables.inspections.userId, userId));

      // Delete the user profile record
      await edgespark.db.delete(tables.users)
        .where(eq(tables.users.id, userId));

      console.log(`[ACCOUNT] Deleted account and all data for user: ${userId}`);
      return c.json({ success: true, message: 'Account and all associated data deleted successfully' });
    } catch (err) {
      console.error('[ACCOUNT] Error deleting account:', err);
      return c.json({ error: 'Failed to delete account' }, 500);
    }
  });

  // Get own user profile — authenticated
  app.get('/api/user/profile', async (c) => {
    const userId = edgespark.auth.user!.id;
    const result = await edgespark.db.select().from(tables.users)
      .where(eq(tables.users.id, userId));
    if (result.length === 0) return c.json({ data: null });
    return c.json({ data: result[0] });
  });

  // ==================== INSPECTION ENDPOINTS ====================
  // All /api/* routes enforce authentication via Youbase.
  // Additional ownership checks prevent IDOR.

  // List inspections for authenticated user
  app.get('/api/inspections', async (c) => {
    const userId = edgespark.auth.user!.id;
    const inspections = await edgespark.db.select().from(tables.inspections)
      .where(eq(tables.inspections.userId, userId));
    return c.json({ data: inspections });
  });

  // Get single inspection — ownership check
  app.get('/api/inspections/:id', async (c) => {
    const userId = edgespark.auth.user!.id;
    const id = c.req.param('id');
    const row = await requireOwnership(edgespark, userId, id);
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json({ data: row });
  });

  // Create inspection
  app.post('/api/inspections', async (c) => {
    const data = await c.req.json();
    const userId = edgespark.auth.user!.id;

    const inspection = await edgespark.db.insert(tables.inspections).values({
      id: data.id,
      userId,
      propertyType: data.propertyType || 'apartment',
      status: data.status || 'draft',
      generalNotes: data.generalNotes || '',
      propertyData: JSON.stringify(data.property || {}),
      tenantData: JSON.stringify(data.tenant || {}),
      landlordData: JSON.stringify(data.landlord || {}),
      agentData: JSON.stringify(data.agent || {}),
      tenancyData: JSON.stringify(data.tenancy || {}),
      roomsData: JSON.stringify(data.rooms || []),
      propertyItems: JSON.stringify(data.propertyItems || []),
      signatures: JSON.stringify(data.signatures || []),
      overallPhotos: JSON.stringify(data.overallPhotos || []),
      // Payment status cannot be set directly via API for security reasons.
      paymentData: JSON.stringify({ paid: false }),
      reportGenerated: data.reportGenerated ? 1 : 0,
      pdfUrl: data.pdfUrl || '',
    }).returning();

    return c.json({ data: inspection[0] }, 201);
  });

  // Update inspection — ownership check
  app.put('/api/inspections/:id', async (c) => {
    const userId = edgespark.auth.user!.id;
    const id = c.req.param('id');
    const data = await c.req.json();

    // Ownership check
    const existing = await requireOwnership(edgespark, userId, id);
    if (!existing) return c.json({ error: 'Inspection not found' }, 404);

    const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.generalNotes !== undefined) updateData.generalNotes = data.generalNotes;
    if (data.property !== undefined) updateData.propertyData = JSON.stringify(data.property);
    if (data.tenant !== undefined) updateData.tenantData = JSON.stringify(data.tenant);
    if (data.landlord !== undefined) updateData.landlordData = JSON.stringify(data.landlord);
    if (data.agent !== undefined) updateData.agentData = JSON.stringify(data.agent);
    if (data.tenancy !== undefined) updateData.tenancyData = JSON.stringify(data.tenancy);
    if (data.rooms !== undefined) updateData.roomsData = JSON.stringify(data.rooms);
    if (data.propertyItems !== undefined) updateData.propertyItems = JSON.stringify(data.propertyItems);
    if (data.signatures !== undefined) updateData.signatures = JSON.stringify(data.signatures);
    if (data.overallPhotos !== undefined) updateData.overallPhotos = JSON.stringify(data.overallPhotos);
    // Payment status cannot be set directly via API for security reasons.
    // It must be updated via Stripe webhook or internal logic.
    if (data.reportGenerated !== undefined) updateData.reportGenerated = data.reportGenerated ? 1 : 0;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
    if (data.pdfUrl !== undefined) updateData.pdfUrl = data.pdfUrl;

    await edgespark.db.update(tables.inspections).set(updateData)
      .where(eq(tables.inspections.id, id));
    return c.json({ success: true });
  });

  // Delete inspection — ownership check
  app.delete('/api/inspections/:id', async (c) => {
    const userId = edgespark.auth.user!.id;
    const id = c.req.param('id');

    // Ownership check
    const existing = await requireOwnership(edgespark, userId, id);
    if (!existing) return c.json({ error: 'Inspection not found' }, 404);

    await edgespark.db.delete(tables.inspections).where(
      and(
        eq(tables.inspections.id, id),
        eq(tables.inspections.userId, userId)
      )
    );
    return c.json({ success: true });
  });

  // ==================== EMAIL ENDPOINTS ====================

  // Send inspection report email via Resend API
  app.post('/api/send-email', async (c) => {
    if (!edgespark.auth.user) return c.json({ error: 'Unauthorized' }, 401);
    const { to, subject, html, from } = await c.req.json();
    if (!to || !subject || !html) {
      return c.json({ error: 'to, subject, and html are required' }, 400);
    }

    // Validate email format(s)
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const recipientList = Array.isArray(to) ? to : [to];
    const invalidEmails = recipientList.filter((email: string) => !EMAIL_REGEX.test(email));
    if (invalidEmails.length > 0) {
      return c.json({ error: `Invalid email address(es): ${invalidEmails.join(', ')}` }, 400);
    }

    // Check HTML payload size — Resend enforces a ~10MB limit for the full request
    // Base64 images in HTML can balloon the payload; we reject anything over 8MB to be safe
    const htmlBytes = new TextEncoder().encode(html).length;
    const MAX_HTML_BYTES = 8 * 1024 * 1024; // 8 MB
    if (htmlBytes > MAX_HTML_BYTES) {
      return c.json({
        error: `Email content too large (${(htmlBytes / (1024 * 1024)).toFixed(1)} MB). Please compress images before sending. Maximum allowed: 8 MB.`,
      }, 413);
    }

    const apiKey = edgespark.secret.get('RESEND_API_KEY');
    if (!apiKey) {
      return c.json({ error: 'Email service not configured (RESEND_API_KEY missing)' }, 500);
    }

    const fromEmail = edgespark.secret.get('FROM_EMAIL') || from || 'MeInspect <hello@meinspect.com>';
    const recipients = recipientList;

    try {
      const results: { email: string; success: boolean; id?: string; error?: string }[] = [];

      for (const recipient of recipients) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [recipient],
              subject,
              html,
            }),
          });

          const data = await res.json() as any;
          if (res.ok) {
            results.push({ email: recipient, success: true, id: data.id });
          } else {
            console.error(`[EMAIL] Resend error for ${recipient}:`, data);
            results.push({ email: recipient, success: false, error: data.message || data.error || 'Send failed' });
          }
        } catch (err) {
          console.error(`[EMAIL] Network error for ${recipient}:`, err);
          results.push({
            email: recipient,
            success: false,
            error: err instanceof Error ? err.message : 'Network error',
          });
        }
      }

      const allSuccess = results.every(r => r.success);
      const firstError = results.find(r => !r.success)?.error || '';
      return c.json({
        success: allSuccess,
        results,
        sentCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length,
        error: allSuccess ? undefined : firstError,
      });
    } catch (err) {
      return c.json({
        error: err instanceof Error ? err.message : 'Email sending failed',
      }, 500);
    }
  });

  // ==================== INSPECTION HISTORY SYNC ====================

  // Sync all inspection data from backend (full sync)
  app.get('/api/sync/inspections', async (c) => {
    const userId = edgespark.auth.user!.id;

    const inspections = await edgespark.db.select().from(tables.inspections)
      .where(eq(tables.inspections.userId, userId));

    // Parse JSON fields back to objects
    const parsed = inspections.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      propertyType: row.propertyType,
      status: row.status,
      generalNotes: row.generalNotes,
      reportGenerated: row.reportGenerated,
      pdfUrl: row.pdfUrl || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
      property: tryParse(row.propertyData),
      tenant: tryParse(row.tenantData),
      landlord: tryParse(row.landlordData),
      agent: tryParse(row.agentData),
      tenancy: tryParse(row.tenancyData),
      rooms: tryParse(row.roomsData),
      propertyItems: tryParse(row.propertyItems),
      signatures: tryParse(row.signatures),
      overallPhotos: tryParse(row.overallPhotos),
      payment: tryParse(row.paymentData),
    }));

    return c.json({ data: parsed, count: parsed.length });
  });

  // Batch sync: upload multiple inspections from frontend
  app.post('/api/sync/push', async (c) => {
    const userId = edgespark.auth.user!.id;
    const { inspections: items } = await c.req.json();
    if (!Array.isArray(items)) return c.json({ error: 'inspections array required' }, 400);

    let created = 0;
    let updated = 0;

    for (const inspection of items) {
      try {
        // Check if inspection belongs to this user
        const existing = await edgespark.db.select().from(tables.inspections)
          .where(
            and(
              eq(tables.inspections.id, inspection.id),
              eq(tables.inspections.userId, userId)
            )
          );

        const updateData: Record<string, any> = {
          status: inspection.status,
          generalNotes: inspection.generalNotes || '',
          propertyType: inspection.propertyType || 'apartment',
          propertyData: JSON.stringify(inspection.property || {}),
          tenantData: JSON.stringify(inspection.tenant || {}),
          landlordData: JSON.stringify(inspection.landlord || {}),
          agentData: JSON.stringify(inspection.agent || {}),
          tenancyData: JSON.stringify(inspection.tenancy || {}),
          roomsData: JSON.stringify(inspection.rooms || []),
          propertyItems: JSON.stringify(inspection.propertyItems || []),
          signatures: JSON.stringify(inspection.signatures || []),
          overallPhotos: JSON.stringify(inspection.overallPhotos || []),
          // Payment status cannot be pushed from client for security reasons.
          reportGenerated: inspection.reportGenerated ? 1 : 0,
          pdfUrl: inspection.pdfUrl || '',
          updatedAt: new Date().toISOString(),
        };
        if (inspection.completedAt) updateData.completedAt = inspection.completedAt;

        if (existing.length > 0) {
          await edgespark.db.update(tables.inspections)
            .set(updateData)
            .where(eq(tables.inspections.id, inspection.id));
          updated++;
        } else {
          await edgespark.db.insert(tables.inspections).values({
            id: inspection.id,
            userId,
            ...updateData,
            createdAt: inspection.createdAt || new Date().toISOString(),
          });
          created++;
        }
      } catch (err) {
        console.warn(`Failed to sync inspection ${inspection.id}:`, err);
      }
    }

    return c.json({ success: true, created, updated });
  });

  // ==================== STORAGE ENDPOINTS (PDF & Photos) ====================

  // Get presigned upload URL for PDF report — ownership check
  app.post('/api/upload/pdf', async (c) => {
    const { inspectionId } = await c.req.json();
    if (!inspectionId) return c.json({ error: 'inspectionId required' }, 400);

    const userId = edgespark.auth.user!.id;
    const row = await requireOwnership(edgespark, userId, inspectionId);
    if (!row) return c.json({ error: 'Inspection not found' }, 404);

    const path = `reports/${userId}/${inspectionId}.pdf`;
    const { uploadUrl, expiresAt } = await edgespark.storage
      .from(buckets.meinspect_reports)
      .createPresignedPutUrl(path, 3600);

    // Update the inspection record with the pdf URL path
    await edgespark.db.update(tables.inspections)
      .set({ pdfUrl: path, updatedAt: new Date().toISOString() })
      .where(eq(tables.inspections.id, inspectionId));

    return c.json({ uploadUrl, path, expiresAt });
  });

  // Get presigned download URL for PDF report — ownership check
  app.get('/api/download/pdf/:inspectionId', async (c) => {
    const userId = edgespark.auth.user!.id;
    const inspectionId = c.req.param('inspectionId');

    const row = await requireOwnership(edgespark, userId, inspectionId);
    if (!row) return c.json({ error: 'Not found' }, 404);

    const path = (row as any).pdfUrl;
    if (!path) return c.json({ error: 'PDF not available for this inspection' }, 404);

    const { downloadUrl, expiresAt } = await edgespark.storage
      .from(buckets.meinspect_reports)
      .createPresignedGetUrl(path, 3600);

    return c.json({ downloadUrl, expiresAt });
  });

  // Get presigned upload URL for a photo — ownership check
  app.post('/api/upload/photo', async (c) => {
    const { inspectionId, photoId, contentType } = await c.req.json();
    if (!inspectionId || !photoId) return c.json({ error: 'inspectionId and photoId required' }, 400);

    const userId = edgespark.auth.user!.id;
    const row = await requireOwnership(edgespark, userId, inspectionId);
    if (!row) return c.json({ error: 'Inspection not found' }, 404);

    const ext = (contentType || 'image/jpeg').includes('png') ? 'png' : 'jpg';
    const path = `photos/${userId}/${inspectionId}/${photoId}.${ext}`;

    const { uploadUrl, expiresAt } = await edgespark.storage
      .from(buckets.meinspect_reports)
      .createPresignedPutUrl(path, 3600);

    return c.json({ uploadUrl, path, expiresAt });
  });

  // Get presigned download URL for a photo — ownership check via path prefix
  app.get('/api/download/photo', async (c) => {
    const userId = edgespark.auth.user!.id;
    const path = c.req.query('path');
    if (!path) return c.json({ error: 'path query param required' }, 400);

    // Verify the path belongs to this user
    if (!path.startsWith(`photos/${userId}/`) && !path.startsWith(`reports/${userId}/`)) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const { downloadUrl, expiresAt } = await edgespark.storage
      .from(buckets.meinspect_reports)
      .createPresignedGetUrl(path, 3600);

    return c.json({ downloadUrl, expiresAt });
  });

  // Batch get presigned download URLs for multiple photos — ownership check
  app.post('/api/download/photos', async (c) => {
    const userId = edgespark.auth.user!.id;
    const { paths } = await c.req.json();
    if (!Array.isArray(paths)) return c.json({ error: 'paths array required' }, 400);

    const urls = await Promise.all(
      paths.map(async (path: string) => {
        try {
          // Verify each path belongs to this user
          if (!path.startsWith(`photos/${userId}/`) && !path.startsWith(`reports/${userId}/`)) {
            return { path, ok: false, error: 'Access denied' };
          }
          const { downloadUrl, expiresAt } = await edgespark.storage
            .from(buckets.meinspect_reports)
            .createPresignedGetUrl(path, 3600);
          return { path, downloadUrl, expiresAt, ok: true };
        } catch {
          return { path, ok: false };
        }
      })
    );

    return c.json({ urls });
  });

  // ==================== PAYMENT ENDPOINTS ====================

  // Create checkout session
  app.post('/api/checkout', async (c) => {
    const userId = edgespark.auth.user!.id;
    const { amount, currency = 'AED', inspectionId, discountCode, discountAmount } = await c.req.json();

    // Check if user is a tester
    const userRows = await edgespark.db.select().from(tables.users).where(eq(tables.users.id, userId));
    const isTester = userRows.length > 0 && userRows[0].isTester === 1;
    const freeCredits = userRows.length > 0 ? (userRows[0].freeInspections ?? 0) : 0;

    if (isTester) {
      const sessionId = `tester_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const order = await edgespark.db.insert(tables.orders).values({
        environment: getEnv(),
        userId,
        inspectionId: inspectionId || null,
        amount: amount || 0,
        currency,
        status: 'paid',
        paidAt: Math.floor(Date.now() / 1000),
        type: 'one_time',
        provider: 'tester',
        providerSessionId: sessionId,
        discountCode: 'TESTER_PROVISION',
        discountAmount: amount || 0,
      }).returning();

      return c.json({
        success: true,
        sessionId,
        orderId: order[0].id,
        status: 'paid',
        message: 'Tester payment processed successfully (Free)',
      });
    }

    // Real Stripe Integration
    const stripeKey = edgespark.secret.get('STRIPE_SECRET_KEY');
    const priceId = edgespark.secret.get('STRIPE_PRICE_ID');

    // ---- FREE CREDITS CHECK ----
    // If the user has admin-granted free inspection credits, use one now
    // before charging Stripe.
    if (freeCredits > 0) {
      const sessionId = `credit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const order = await edgespark.db.insert(tables.orders).values({
        environment: getEnv(),
        userId,
        inspectionId: inspectionId || null,
        amount: 0,
        currency,
        status: 'paid',
        paidAt: Math.floor(Date.now() / 1000),
        type: 'one_time',
        provider: 'admin_credit',
        providerSessionId: sessionId,
        discountCode: 'ADMIN_CREDIT',
        discountAmount: amount || 199,
      }).returning();

      // Deduct one credit
      await edgespark.db.update(tables.users)
        .set({ freeInspections: freeCredits - 1 })
        .where(eq(tables.users.id, userId));

      console.log(`[CHECKOUT] Used 1 admin credit for user ${userId}. Remaining: ${freeCredits - 1}`);

      // Mark inspection as paid immediately
      if (inspectionId) {
        await edgespark.db.update(tables.inspections)
          .set({ payment: JSON.stringify({ paid: true, sessionId, provider: 'admin_credit' }) })
          .where(eq(tables.inspections.id, inspectionId));
      }

      return c.json({
        success: true,
        sessionId,
        orderId: order[0].id,
        status: 'paid',
        message: 'Free inspection credit used successfully.',
      });
    }
    // ---- END FREE CREDITS CHECK ----

    if (!stripeKey || !priceId) {
      return c.json({ error: 'Stripe is not fully configured (missing key or price ID)' }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });

    // Validate discount and calculate final amount
    const BASE_PRICE = 199;
    const VALID_DISCOUNT_CODES: Record<string, { type: 'percent' | 'fixed'; value: number }> = {
      'WELCOME20': { type: 'percent', value: 20 },
      'LAUNCH50': { type: 'fixed', value: 50 },
      'MEINSPECT10': { type: 'percent', value: 10 },
      'INSPECTOR': { type: 'fixed', value: 100 },
      'FREE_REPORT': { type: 'percent', value: 100 },
    };

    let finalAmount = BASE_PRICE;
    if (discountCode) {
      const offer = VALID_DISCOUNT_CODES[discountCode.toUpperCase()];
      if (offer) {
        const discount = offer.type === 'percent' ? Math.round(BASE_PRICE * offer.value / 100) : offer.value;
        finalAmount = Math.max(0, BASE_PRICE - discount);
      }
    }

    // If final amount is 0, process as free report
    if (finalAmount === 0) {
      const sessionId = `free_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const order = await edgespark.db.insert(tables.orders).values({
        environment: getEnv(),
        userId,
        inspectionId: inspectionId || null,
        amount: 0,
        currency,
        status: 'paid',
        paidAt: Math.floor(Date.now() / 1000),
        type: 'one_time',
        provider: 'discount',
        providerSessionId: sessionId,
        discountCode: discountCode || 'FREE_PROMO',
        discountAmount: BASE_PRICE,
      }).returning();

      return c.json({
        success: true,
        sessionId,
        orderId: order[0].id,
        status: 'paid',
        message: 'Free report processed successfully',
      });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: 'Property Inspection Report',
                description: discountCode ? `Discount applied: ${discountCode}` : undefined,
              },
              unit_amount: finalAmount * 100, // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        invoice_creation: {
          enabled: true,
        },
        success_url: `${c.req.header('origin')}/report/${inspectionId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${c.req.header('origin')}/report/${inspectionId}?payment=cancel`,
        metadata: {
          userId,
          inspectionId: inspectionId || '',
          reportId: inspectionId || '', // Explicitly adding reportId as requested
        },
      });

      // Record the order
      const order = await edgespark.db.insert(tables.orders).values({
        environment: getEnv(),
        userId,
        inspectionId: inspectionId || null,
        amount: finalAmount,
        currency,
        status: 'pending',
        type: 'one_time',
        provider: 'stripe',
        providerSessionId: session.id,
        discountCode: discountCode || null,
        discountAmount: BASE_PRICE - finalAmount,
      }).returning();

      return c.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        orderId: order[0].id,
        status: 'pending',
      });
    } catch (err: any) {
      console.error('[STRIPE] error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // Verify payment status — ownership check
  app.get('/api/checkout/:sessionId', async (c) => {
    const userId = edgespark.auth.user!.id;
    const sessionId = c.req.param('sessionId');
    
    // First check our DB
    const result = await edgespark.db.select().from(tables.orders)
      .where(
        and(
          eq(tables.orders.providerSessionId, sessionId),
          eq(tables.orders.userId, userId)
        )
      );
    
    if (result.length === 0) return c.json({ error: 'Session not found' }, 404);
    
    let order = result[0];

    // If still pending and it's a Stripe session, check Stripe status directly
    if (order.status === 'pending' && order.provider === 'stripe') {
      const stripeKey = edgespark.secret.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.payment_status === 'paid') {
            // Update our DB
            const updated = await edgespark.db.update(tables.orders)
              .set({ 
                status: 'paid', 
                paidAt: Math.floor(Date.now() / 1000) 
              })
              .where(eq(tables.orders.id, order.id))
              .returning();
            
            order = updated[0];
            
            // Also update the inspection
            if (order.inspectionId) {
              const inspectionRows = await edgespark.db.select().from(tables.inspections)
                .where(eq(tables.inspections.id, order.inspectionId));
              
              if (inspectionRows.length > 0) {
                const currentData = tryParse(inspectionRows[0].paymentData as string);
                await edgespark.db.update(tables.inspections)
                  .set({
                    paymentData: JSON.stringify({ ...currentData, paid: true, sessionId: session.id })
                  })
                  .where(eq(tables.inspections.id, order.inspectionId));
              }
            }
          }
        } catch (err) {
          console.error('[STRIPE] status check error:', err);
        }
      }
    }

    return c.json({ data: order });
  });

  // ==================== STRIPE WEBHOOK ====================

  app.post('/api/webhooks/stripe', async (c) => {
    const signature = c.req.header('stripe-signature');
    const signingSecret = edgespark.secret.get('StripeSigningSecret');
    
    if (!signature || !signingSecret) {
      console.warn('[WEBHOOK] Missing signature or secret');
      return c.json({ error: 'Missing signature or secret' }, 400);
    }

    const stripeKey = edgespark.secret.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('[WEBHOOK] STRIPE_SECRET_KEY not configured');
      return c.json({ error: 'Stripe not configured' }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });

    try {
      const body = await c.req.text();
      const event = stripe.webhooks.constructEvent(body, signature, signingSecret);

      console.log(`[WEBHOOK] Received event: ${event.type}`);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const reportId = session.metadata?.reportId || session.metadata?.inspectionId;
        const userId = session.metadata?.userId;
        
        console.log(`[WEBHOOK] Checkout completed for report: ${reportId}, user: ${userId}`);

        if (reportId) {
          // Mark as paid in orders table
          await edgespark.db.update(tables.orders)
            .set({ 
              status: 'paid', 
              paidAt: Math.floor(Date.now() / 1000) 
            })
            .where(eq(tables.orders.providerSessionId, session.id));
            
          // Also update the inspection status
          const inspectionRows = await edgespark.db.select().from(tables.inspections)
            .where(eq(tables.inspections.id, reportId));
            
          if (inspectionRows.length > 0) {
            const currentData = tryParse(inspectionRows[0].payment as string);
            await edgespark.db.update(tables.inspections)
              .set({
                payment: JSON.stringify({ ...currentData, paid: true, sessionId: session.id })
              })
              .where(eq(tables.inspections.id, reportId));
            
            console.log(`[WEBHOOK] Successfully marked report ${reportId} as paid`);

            // Send payment success notification
            if (userId) {
              const userRows = await edgespark.db.select().from(tables.users).where(eq(tables.users.id, userId));
              if (userRows.length > 0) {
                const user = userRows[0];
                const amount = session.amount_total ? session.amount_total / 100 : 199;
                const currency = session.currency?.toUpperCase() || 'AED';
                
                // Trigger notification logic (internal call or direct helper)
                const subject = `Payment Successful: MeInspect Report (RPT-${reportId.slice(0, 8).toUpperCase()})`;
                const html = `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                      <div style="width: 64px; height: 64px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <span style="font-size: 32px;">✅</span>
                      </div>
                      <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Payment Received</h1>
                      <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Thank you for your purchase</p>
                    </div>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
                        Hi ${user.name || 'there'},<br/><br/>
                        We've successfully received your payment of <strong>${currency} ${amount}</strong> for the property inspection report.
                      </p>
                      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                          <span style="color: #64748b; font-size: 12px;">Report ID</span>
                          <span style="color: #1e293b; font-size: 12px; font-weight: 600;">RPT-${reportId.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #64748b; font-size: 12px;">Amount Paid</span>
                          <span style="color: #1e293b; font-size: 12px; font-weight: 600;">${currency} ${amount}</span>
                        </div>
                      </div>
                    </div>
                    <div style="text-align: center;">
                      <a href="${c.req.url.split('/api')[0]}/report/${reportId}" 
                         style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        Access Your Report
                      </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
                      MeInspect — Property Condition Reports for Landlords, Tenants & Inspectors
                    </p>
                  </div>
                `;
                await sendNotificationEmail(edgespark, user.email, subject, html);
                console.log(`[WEBHOOK] Sent payment success notification to ${user.email}`);
              }
            }
          }
        }
      }

      return c.json({ received: true });
    } catch (err: any) {
      console.error('[WEBHOOK] error:', err.message);
      return c.json({ error: `Webhook Error: ${err.message}` }, 400);
    }
  });

  // Get user's payment history
  app.get('/api/orders', async (c) => {
    const userId = edgespark.auth.user!.id;
    const orders = await edgespark.db.select().from(tables.orders)
      .where(eq(tables.orders.userId, userId));
    return c.json({ data: orders });
  });

  // Get invoice URL for an order
  app.get('/api/orders/:id/invoice', async (c) => {
    const userId = edgespark.auth.user!.id;
    const orderId = parseInt(c.req.param('id'));
    
    const result = await edgespark.db.select().from(tables.orders)
      .where(
        and(
          eq(tables.orders.id, orderId),
          eq(tables.orders.userId, userId)
        )
      );
      
    if (result.length === 0) return c.json({ error: 'Order not found' }, 404);
    const order = result[0];
    
    if (order.provider !== 'stripe' || !order.providerSessionId) {
      return c.json({ error: 'Invoice not available for this order' }, 400);
    }
    
    const stripeKey = edgespark.secret.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return c.json({ error: 'Stripe not configured' }, 500);
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });
    
    try {
      // Retrieve the session to get the invoice ID
      const session = await stripe.checkout.sessions.retrieve(order.providerSessionId, {
        expand: ['invoice'],
      });
      
      const invoice = session.invoice as Stripe.Invoice;
      if (!invoice || !invoice.hosted_invoice_url) {
        return c.json({ error: 'Invoice not yet generated' }, 404);
      }
      
      return c.json({ url: invoice.hosted_invoice_url });
    } catch (err: any) {
      console.error('[STRIPE] invoice error:', err);
      return c.json({ error: err.message }, 500);
    }
  });

  // ==================== ADMIN ENDPOINTS ====================
  // All admin endpoints require admin privileges

  const requireAdmin = async (c: any) => {
    const userId = edgespark.auth.user?.id;
    if (!userId) return false;
    
    // Check if user is admin in DB or is the owner email
    const userRows = await edgespark.db.select().from(tables.users).where(eq(tables.users.id, userId));
    const isAdmin = userRows.length > 0 && (userRows[0].isTester === 1 || edgespark.auth.user?.email === 'aalekh.dxb@gmail.com');
    return isAdmin;
  };

  // Create payment price
  app.post('/api/admin/prices', async (c) => {
    if (!await requireAdmin(c)) return c.json({ error: 'Unauthorized' }, 403);
    
    const { name, amount, currency = 'AED', type = 'one_time' } = await c.req.json();
    const env = getEnv();

    const row = await edgespark.db.insert(tables.paymentPrices).values({
      environment: env,
      name,
      amount,
      currency,
      type,
      provider: 'stripe',
    }).returning();

    return c.json({ data: row[0] }, 201);
  });

  // List payment prices
  app.get('/api/admin/prices', async (c) => {
    if (!await requireAdmin(c)) return c.json({ error: 'Unauthorized' }, 403);
    
    const env = getEnv();
    const prices = await edgespark.db.select().from(tables.paymentPrices)
      .where(eq(tables.paymentPrices.environment, env));
    return c.json({ data: prices });
  });

  // Set user as tester
  app.post('/api/admin/set-tester', async (c) => {
    if (!await requireAdmin(c)) return c.json({ error: 'Unauthorized' }, 403);
    
    const { email, isTester } = await c.req.json();
    await edgespark.db.update(tables.users)
      .set({ isTester: isTester ? 1 : 0 })
      .where(eq(tables.users.email, email));
    return c.json({ success: true, message: `User ${email} tester status set to ${isTester}` });
  });

  // ==================== ADMIN CREDIT ENDPOINTS ====================
  // Protected by X-Admin-Secret header — no user session required.
  // Set ADMIN_SECRET via: edgespark secret set ADMIN_SECRET <your-password>

  const requireAdminSecret = (c: any): boolean => {
    const provided = c.req.header('X-Admin-Secret');
    const expected = edgespark.secret.get('ADMIN_SECRET');
    if (!expected) {
      // If no secret is configured, fall back to checking owner email
      return edgespark.auth.user?.email === 'aalekh.dxb@gmail.com';
    }
    return provided === expected;
  };

  // GET /api/public/admin/users — list all users with their free inspection credits
  app.get('/api/public/admin/users', async (c) => {
    if (!requireAdminSecret(c)) return c.json({ error: 'Unauthorized' }, 403);
    const q = c.req.query('q') || '';
    let rows;
    if (q) {
      // Simple case-insensitive filter; SQLite LIKE is case-insensitive for ASCII
      rows = await edgespark.db.select().from(tables.users);
      rows = rows.filter((u: any) =>
        u.email?.toLowerCase().includes(q.toLowerCase()) ||
        u.name?.toLowerCase().includes(q.toLowerCase())
      );
    } else {
      rows = await edgespark.db.select().from(tables.users);
    }
    // Count total inspections per user
    const enriched = await Promise.all(rows.map(async (u: any) => {
      const inspectionCount = await edgespark.db.select().from(tables.inspections)
        .where(eq(tables.inspections.userId, u.id));
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        location: u.location,
        isTester: u.isTester,
        freeInspections: u.freeInspections ?? 0,
        totalInspections: inspectionCount.length,
        createdAt: u.createdAt,
      };
    }));
    return c.json({ data: enriched });
  });

  // POST /api/public/admin/grant-credits — grant N free inspection credits to a user
  app.post('/api/public/admin/grant-credits', async (c) => {
    if (!requireAdminSecret(c)) return c.json({ error: 'Unauthorized' }, 403);
    const { email, count = 1 } = await c.req.json();
    if (!email) return c.json({ error: 'email is required' }, 400);
    const n = Math.max(1, Math.min(100, parseInt(count, 10) || 1));

    const userRows = await edgespark.db.select().from(tables.users)
      .where(eq(tables.users.email, email));
    if (userRows.length === 0) return c.json({ error: `No user found with email: ${email}` }, 404);

    const user = userRows[0];
    const newBalance = (user.freeInspections ?? 0) + n;
    await edgespark.db.update(tables.users)
      .set({ freeInspections: newBalance })
      .where(eq(tables.users.email, email));

    console.log(`[ADMIN] Granted ${n} free inspection(s) to ${email}. New balance: ${newBalance}`);
    return c.json({
      success: true,
      email,
      granted: n,
      newBalance,
      message: `Granted ${n} free inspection(s) to ${email}. Balance is now ${newBalance}.`,
    });
  });

  // POST /api/public/admin/revoke-credits — remove N credits from a user
  app.post('/api/public/admin/revoke-credits', async (c) => {
    if (!requireAdminSecret(c)) return c.json({ error: 'Unauthorized' }, 403);
    const { email, count = 1 } = await c.req.json();
    if (!email) return c.json({ error: 'email is required' }, 400);
    const n = Math.max(1, parseInt(count, 10) || 1);

    const userRows = await edgespark.db.select().from(tables.users)
      .where(eq(tables.users.email, email));
    if (userRows.length === 0) return c.json({ error: `No user found with email: ${email}` }, 404);

    const user = userRows[0];
    const newBalance = Math.max(0, (user.freeInspections ?? 0) - n);
    await edgespark.db.update(tables.users)
      .set({ freeInspections: newBalance })
      .where(eq(tables.users.email, email));

    return c.json({
      success: true,
      email,
      revoked: n,
      newBalance,
      message: `Removed ${n} credit(s) from ${email}. Balance is now ${newBalance}.`,
    });
  });

  // ==================== NOTIFICATION ENDPOINTS ====================

  // Helper to send notification emails via Resend
  async function sendNotificationEmail(edgespark: any, to: string, subject: string, html: string): Promise<boolean> {
    const apiKey = edgespark.secret.get('RESEND_API_KEY');
    if (!apiKey) {
      console.warn('[NOTIFICATIONS] RESEND_API_KEY not configured');
      return false;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: edgespark.secret.get('FROM_EMAIL') || 'MeInspect <hello@meinspect.com>',
          to: [to],
          subject,
          html,
        }),
      });
      return res.ok;
    } catch (err) {
      console.error('[NOTIFICATIONS] Failed to send email:', err);
      return false;
    }
  }

  // Welcome email — sent after successful signup
  app.post('/api/notifications/welcome', async (c) => {
    if (!edgespark.auth.user) return c.json({ error: 'Unauthorized' }, 401);
    const { name, email } = await c.req.json();
    if (!email) return c.json({ error: 'email is required' }, 400);

    const subject = 'Welcome to MeInspect!';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Welcome to MeInspect</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Professional Property Condition Reports</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi ${name || 'there'},<br/><br/>
            Thank you for joining MeInspect! You can now create professional property condition reports with timestamped photos, detailed assessments, and digital signatures.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${typeof c !== 'undefined' ? c.req.url.split('/api')[0] : 'https://meinspect.ae'}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Get Started
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect — Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;

    const sent = await sendNotificationEmail(edgespark, email, subject, html);
    return c.json({ success: sent });
  });

  // Report completion email — sent after report is generated
  app.post('/api/notifications/report-complete', async (c) => {
    if (!edgespark.auth.user) return c.json({ error: 'Unauthorized' }, 401);
    const { email, name, reportName, reportId } = await c.req.json();
    if (!email || !reportId) return c.json({ error: 'email and reportId are required' }, 400);

    const shortId = reportId.slice(0, 8).toUpperCase();
    const subject = `MeInspect Report Ready: ${reportName || 'Property Report'} (RPT-${shortId})`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Report Ready</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Your property condition report has been generated</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi ${name || 'there'},<br/><br/>
            Your property condition report <strong>${reportName || 'Property Report'}</strong> (RPT-${shortId}) is ready for review.
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">Report ID</p>
            <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 4px 0 0 0;">RPT-${shortId}</p>
          </div>
        </div>
        <div style="text-align: center;">
          <a href="${typeof c !== 'undefined' ? c.req.url.split('/api')[0] : 'https://meinspect.ae'}/report/${reportId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Report
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect — Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;

    const sent = await sendNotificationEmail(edgespark, email, subject, html);
    return c.json({ success: sent });
  });

  // Payment success notification email
  app.post('/api/notifications/payment-success', async (c) => {
    if (!edgespark.auth.user) return c.json({ error: 'Unauthorized' }, 401);
    const { email, name, amount, currency, reportId } = await c.req.json();
    if (!email || !reportId) return c.json({ error: 'email and reportId are required' }, 400);

    const subject = `Payment Successful: MeInspect Report (RPT-${reportId.slice(0, 8).toUpperCase()})`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 64px; height: 64px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <span style="font-size: 32px;">✅</span>
          </div>
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Payment Received</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Thank you for your purchase</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi ${name || 'there'},<br/><br/>
            We've successfully received your payment of <strong>${currency || 'AED'} ${amount || '500'}</strong> for the property inspection report.
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b; font-size: 12px;">Report ID</span>
              <span style="color: #1e293b; font-size: 12px; font-weight: 600;">RPT-${reportId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-size: 12px;">Amount Paid</span>
              <span style="color: #1e293b; font-size: 12px; font-weight: 600;">${currency || 'AED'} ${amount || '500'}</span>
            </div>
          </div>
        </div>
        <div style="text-align: center;">
          <a href="${typeof c !== 'undefined' ? c.req.url.split('/api')[0] : 'https://meinspect.ae'}/report/${reportId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Access Your Report
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect — Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;

    const sent = await sendNotificationEmail(edgespark, email, subject, html);
    return c.json({ success: sent });
  });

  // Password changed notification email
  app.post('/api/notifications/password-changed', async (c) => {
    if (!edgespark.auth.user) return c.json({ error: 'Unauthorized' }, 401);
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'email is required' }, 400);

    const subject = 'MeInspect — Your Password Has Been Changed';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Password Changed</h1>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi,<br/><br/>
            Your MeInspect password has been successfully changed. If you did not make this change, please contact our support team immediately.
          </p>
        </div>
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 13px; margin: 0;">
            <strong>Security tip:</strong> If you didn't change your password, someone else may have accessed your account. Change your password again and enable two-factor authentication if available.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect — Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;

    const sent = await sendNotificationEmail(edgespark, email, subject, html);
    return c.json({ success: sent });
  });

  return app;
}
