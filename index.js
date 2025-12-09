const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const moment = require('moment');

admin.initializeApp();
const db = admin.firestore();

// ============================================
// EMAIL CONFIGURATION
// ============================================
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || 'your-email@gmail.com',
    pass: functions.config().email?.password || 'your-app-password'
  }
});

// ============================================
// 1. TRIGGER: Send Email on New Bill
// ============================================
exports.sendBillEmail = functions.firestore
  .document('bills/{billId}')
  .onCreate(async (snap, context) => {
    const bill = snap.data();
    const billId = context.params.billId;

    try {
      // Get shop settings
      const shopDoc = await db.collection('shop').doc('settings').get();
      const shop = shopDoc.data() || { name: 'My Store' };

      const mailOptions = {
        from: `${shop.name} <noreply@billingsoft.com>`,
        to: shop.email,
        subject: `New Sale - Bill #${billId.slice(-6).toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">New Sale Notification</h2>
            <p>A new sale has been completed:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Bill ID:</strong> ${billId.slice(-6).toUpperCase()}</p>
              <p><strong>Date:</strong> ${moment(bill.createdAt).format('MMM DD, YYYY HH:mm')}</p>
              <p><strong>Items:</strong> ${bill.items.length}</p>
              <p><strong>Total:</strong> ₹${bill.total.toFixed(2)}</p>
              <p><strong>Payment:</strong> ${bill.paymentMethod}</p>
            </div>
            <h3>Items:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #e5e7eb;">
                  <th style="padding: 8px; text-align: left;">Product</th>
                  <th style="padding: 8px; text-align: center;">Qty</th>
                  <th style="padding: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${bill.items.map(item => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `
      };

      await mailTransport.sendMail(mailOptions);
      console.log('Email sent for bill:', billId);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  });

// ============================================
// 2. TRIGGER: Low Stock Alert
// ============================================
exports.lowStockAlert = functions.firestore
  .document('products/{productId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const threshold = 10;

    // Check if product just went below threshold
    if (oldData.quantity > threshold && newData.quantity <= threshold) {
      try {
        const shopDoc = await db.collection('shop').doc('settings').get();
        const shop = shopDoc.data() || {};

        if (!shop.email) return;

        const mailOptions = {
          from: 'BillingSoft Alerts <noreply@billingsoft.com>',
          to: shop.email,
          subject: `⚠️ Low Stock Alert: ${newData.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h2 style="color: #92400e; margin-top: 0;">Low Stock Alert</h2>
                <p>The following product is running low on stock:</p>
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p><strong>Product:</strong> ${newData.name}</p>
                  <p><strong>Current Stock:</strong> ${newData.quantity} units</p>
                  <p><strong>SKU:</strong> ${newData.sku || 'N/A'}</p>
                  <p><strong>Price:</strong> ₹${newData.price.toFixed(2)}</p>
                </div>
                <p>Please restock this item soon to avoid running out.</p>
              </div>
            </div>
          `
        };

        await mailTransport.sendMail(mailOptions);
        console.log('Low stock alert sent for:', newData.name);
      } catch (error) {
        console.error('Error sending low stock alert:', error);
      }
    }
  });

// ============================================
// 3. SCHEDULED: Daily Sales Report
// ============================================
exports.dailySalesReport = functions.pubsub
  .schedule('0 20 * * *') // Every day at 8 PM
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      const today = moment().startOf('day').toISOString();
      const tomorrow = moment().endOf('day').toISOString();

      // Get today's bills
      const billsSnapshot = await db.collection('bills')
        .where('createdAt', '>=', today)
        .where('createdAt', '<=', tomorrow)
        .get();

      const bills = billsSnapshot.docs.map(doc => doc.data());
      const totalSales = bills.reduce((sum, bill) => sum + bill.total, 0);
      const totalItems = bills.reduce((sum, bill) => sum + bill.items.reduce((s, i) => s + i.quantity, 0), 0);

      // Get shop settings
      const shopDoc = await db.collection('shop').doc('settings').get();
      const shop = shopDoc.data() || {};

      if (!shop.email) {
        console.log('No email configured for daily report');
        return null;
      }

      const mailOptions = {
        from: 'BillingSoft Reports <noreply@billingsoft.com>',
        to: shop.email,
        subject: `Daily Sales Report - ${moment().format('MMM DD, YYYY')}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Daily Sales Report</h2>
            <p>${moment().format('dddd, MMMM DD, YYYY')}</p>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
              <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold;">₹${totalSales.toFixed(2)}</div>
                <div style="opacity: 0.9;">Total Sales</div>
              </div>
              <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold;">${bills.length}</div>
                <div style="opacity: 0.9;">Transactions</div>
              </div>
              <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold;">${totalItems}</div>
                <div style="opacity: 0.9;">Items Sold</div>
              </div>
            </div>

            ${bills.length > 0 ? `
              <h3>Recent Transactions</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #e5e7eb;">
                    <th style="padding: 8px; text-align: left;">Time</th>
                    <th style="padding: 8px; text-align: center;">Items</th>
                    <th style="padding: 8px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${bills.slice(-10).reverse().map(bill => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${moment(bill.createdAt).format('HH:mm')}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${bill.items.length}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${bill.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>No transactions today.</p>'}
          </div>
        `
      };

      await mailTransport.sendMail(mailOptions);
      console.log('Daily report sent successfully');
    } catch (error) {
      console.error('Error sending daily report:', error);
    }
    return null;
  });

// ============================================
// 4. API: Advanced Analytics
// ============================================
exports.getAnalytics = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { startDate, endDate } = data;
  const start = startDate || moment().subtract(30, 'days').toISOString();
  const end = endDate || moment().toISOString();

  try {
    // Get bills in date range
    const billsSnapshot = await db.collection('bills')
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .orderBy('createdAt', 'desc')
      .get();

    const bills = billsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate analytics
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.total, 0);
    const totalTransactions = bills.length;
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Product analysis
    const productSales = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        if (!productSales[item.name]) {
          productSales[item.name] = { quantity: 0, revenue: 0 };
        }
        productSales[item.name].quantity += item.quantity;
        productSales[item.name].revenue += item.price * item.quantity;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily revenue trend
    const dailyRevenue = {};
    bills.forEach(bill => {
      const date = moment(bill.createdAt).format('YYYY-MM-DD');
      dailyRevenue[date] = (dailyRevenue[date] || 0) + bill.total;
    });

    const revenueTrend = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Payment method distribution
    const paymentMethods = {};
    bills.forEach(bill => {
      paymentMethods[bill.paymentMethod] = (paymentMethods[bill.paymentMethod] || 0) + 1;
    });

    // Hour-wise sales
    const hourWiseSales = Array(24).fill(0);
    bills.forEach(bill => {
      const hour = moment(bill.createdAt).hour();
      hourWiseSales[hour] += bill.total;
    });

    return {
      summary: {
        totalRevenue,
        totalTransactions,
        avgTransactionValue,
        dateRange: { start, end }
      },
      topProducts,
      revenueTrend,
      paymentMethods,
      hourWiseSales
    };
  } catch (error) {
    console.error('Error generating analytics:', error);
    throw new functions.https.HttpsError('internal', 'Error generating analytics');
  }
});

// ============================================
// 5. API: Generate PDF Receipt
// ============================================
exports.generateReceipt = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { billId } = data;

  try {
    const billDoc = await db.collection('bills').doc(billId).get();
    if (!billDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Bill not found');
    }

    const bill = billDoc.data();
    const shopDoc = await db.collection('shop').doc('settings').get();
    const shop = shopDoc.data() || { name: 'My Store' };

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      return { pdf: pdfBuffer.toString('base64') };
    });

    // Header
    doc.fontSize(20).text(shop.name, { align: 'center' });
    if (shop.address) doc.fontSize(10).text(shop.address, { align: 'center' });
    if (shop.phone) doc.text(`Tel: ${shop.phone}`, { align: 'center' });
    if (shop.gstNumber) doc.text(`GST: ${shop.gstNumber}`, { align: 'center' });

    doc.moveDown();
    doc.fontSize(12).text(`Bill #: ${billId.slice(-8).toUpperCase()}`);
    doc.text(`Date: ${moment(bill.createdAt).format('MMM DD, YYYY HH:mm')}`);
    doc.text(`Payment: ${bill.paymentMethod}`);

    doc.moveDown();
    doc.fontSize(10);

    // Table header
    const tableTop = 200;
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Price', 370, tableTop);
    doc.text('Amount', 450, tableTop);

    // Items
    let y = tableTop + 20;
    bill.items.forEach(item => {
      doc.text(item.name, 50, y);
      doc.text(item.quantity.toString(), 300, y);
      doc.text(`₹${item.price.toFixed(2)}`, 370, y);
      doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, y);
      y += 20;
    });

    // Totals
    y += 20;
    doc.text(`Subtotal: ₹${bill.subtotal.toFixed(2)}`, 370, y);
    y += 20;
    if (bill.gstApplied) {
      doc.text(`GST (18%): ₹${bill.tax.toFixed(2)}`, 370, y);
      y += 20;
    }
    doc.fontSize(12).text(`Total: ₹${bill.total.toFixed(2)}`, 370, y, { bold: true });

    doc.end();

    return { success: true, message: 'PDF generated' };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new functions.https.HttpsError('internal', 'Error generating receipt');
  }
});

// ============================================
// 6. SCHEDULED: Weekly Backup
// ============================================
exports.weeklyBackup = functions.pubsub
  .schedule('0 2 * * 0') // Every Sunday at 2 AM
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      const collections = ['products', 'bills', 'users', 'shop'];
      const backup = {
        timestamp: moment().toISOString(),
        data: {}
      };

      for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName).get();
        backup.data[collectionName] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Store backup
      await db.collection('backups').add(backup);

      // Delete old backups (keep last 4 weeks)
      const oldBackups = await db.collection('backups')
        .where('timestamp', '<', moment().subtract(28, 'days').toISOString())
        .get();

      const batch = db.batch();
      oldBackups.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      console.log('Weekly backup completed successfully');
    } catch (error) {
      console.error('Error creating backup:', error);
    }
    return null;
  });

// ============================================
// 7. API: Restore from Backup
// ============================================
exports.restoreBackup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify admin role
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'Admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can restore backups');
  }

  const { backupId } = data;

  try {
    const backupDoc = await db.collection('backups').doc(backupId).get();
    if (!backupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Backup not found');
    }

    const backup = backupDoc.data();
    const batch = db.batch();

    // Restore each collection
    for (const [collectionName, documents] of Object.entries(backup.data)) {
      for (const doc of documents) {
        const { id, ...data } = doc;
        const docRef = db.collection(collectionName).doc(id);
        batch.set(docRef, data, { merge: true });
      }
    }

    await batch.commit();

    return { success: true, message: 'Backup restored successfully' };
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw new functions.https.HttpsError('internal', 'Error restoring backup');
  }
});

// ============================================
// 8. API: Export Data
// ============================================
exports.exportData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { collection, format } = data;

  try {
    const snapshot = await db.collection(collection).get();
    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (format === 'csv') {
      // Convert to CSV
      if (documents.length === 0) return { data: '' };

      const headers = Object.keys(documents[0]).join(',');
      const rows = documents.map(doc =>
        Object.values(doc).map(val =>
          typeof val === 'object' ? JSON.stringify(val) : val
        ).join(',')
      );

      return { data: [headers, ...rows].join('\n') };
    }

    return { data: JSON.stringify(documents, null, 2) };
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new functions.https.HttpsError('internal', 'Error exporting data');
  }
});
